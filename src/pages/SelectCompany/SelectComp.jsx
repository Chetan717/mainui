import { Button } from "@heroui/react";
import {
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { db } from "@firebase-config";
import { collection, getDocs } from "firebase/firestore";
import { useLocation, useNavigate } from "react-router";
import { RefreshCw, Search, X } from "lucide-react";
import { COLLECTIONS } from "../../collections";
import { useSelectedCompany } from "../../Context/SelectedCompanyContext";
import { getCompanyLogoUrl } from "../../utils/getCompanyLogo";
import {
  COMPANY_SELECTION_LOCKED_CODE,
  getCompanySelectionDestination,
  isCompanyChangeRequest,
} from "../../utils/companyChangePolicy";
import {
  COMPANY_BATCH_SIZE,
  filterCompaniesByName,
  getCompanyBatch,
  getNextCompanyCount,
  normalizeCompanySearch,
} from "./companyListUtils";
import { getSelectedCompanyIdentity } from "../../utils/mlmProfileCompanyIdentity";

const COMPANY_CACHE_TTL_MS = 5 * 60 * 1000;
let companyDirectoryCache = null;
let companyDirectoryRequest = null;

const normalizeCompany = (companyDoc) => {
  const data = companyDoc.data() || {};
  const identity = getSelectedCompanyIdentity({
    ...data,
    // Firestore document identity is authoritative.
    id: companyDoc.id,
  });
  const name = identity.companyName;
  return {
    id: identity.companyId,
    name,
    searchKey: normalizeCompanySearch(name),
    address: data?.address || "",
    owner: data?.owner || "",
    designation: data?.profile || [],
    logos: data?.logos || [],
    topuplines: data?.topuplines || [],
    Plans: data?.Plans || [],
    profile: data?.profile || [],
    active: data?.active ?? false,
    launched: data?.launched ?? false,
  };
};

async function fetchCompanyDirectory({ force = false } = {}) {
  const now = Date.now();
  if (
    !force &&
    companyDirectoryCache &&
    now - companyDirectoryCache.loadedAt < COMPANY_CACHE_TTL_MS
  ) {
    return companyDirectoryCache.companies;
  }

  // React StrictMode and quick remounts share one Firestore request.
  if (companyDirectoryRequest) return companyDirectoryRequest;

  const request = getDocs(collection(db, COLLECTIONS.MLMCOMP))
    .then((snapshot) => {
      const companies = snapshot.docs
        .map(normalizeCompany)
        .filter((company) => company.active && company.launched)
        .sort((a, b) => b.name.localeCompare(a.name, undefined, {
          sensitivity: "base",
          numeric: true,
        }));
      companyDirectoryCache = { companies, loadedAt: Date.now() };
      return companies;
    })
    .finally(() => {
      if (companyDirectoryRequest === request) companyDirectoryRequest = null;
    });

  companyDirectoryRequest = request;
  return request;
}

export default function SelectComp() {
  const navigate = useNavigate();
  const location = useLocation();
  const {
    selectedCompany: currentCompany,
    selectCompany,
  } = useSelectedCompany();
  const isChangeMode = isCompanyChangeRequest(location.search);

  const [companies, setCompanies] = useState([]);
  const [search, setSearch] = useState("");
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [visibleCount, setVisibleCount] = useState(COMPANY_BATCH_SIZE);
  const [savingSelection, setSavingSelection] = useState(false);
  const loadMoreRef = useRef(null);
  const mountedRef = useRef(false);
  const requestVersionRef = useRef(0);
  const deferredSearch = useDeferredValue(search);

  const loadCompanies = useCallback(async ({ force = false } = {}) => {
    const requestVersion = ++requestVersionRef.current;
    setLoading(true);
    setLoadError("");
    try {
      const data = await fetchCompanyDirectory({ force });
      if (!mountedRef.current || requestVersion !== requestVersionRef.current) {
        return;
      }
      setCompanies(data);
      setSelectedCompany((current) => {
        if (!current) return null;
        return data.find((company) => company.id === current.id) || null;
      });
    } catch (error) {
      if (!mountedRef.current || requestVersion !== requestVersionRef.current) {
        return;
      }
      setLoadError("Unable to load companies. Please check your connection and retry.");
    } finally {
      if (mountedRef.current && requestVersion === requestVersionRef.current) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    void loadCompanies();
    return () => {
      mountedRef.current = false;
      requestVersionRef.current += 1;
    };
  }, [loadCompanies]);

  useEffect(() => {
    if (!isChangeMode || !currentCompany?.id || companies.length === 0) return;

    setSelectedCompany((current) => {
      if (current) return current;
      return (
        companies.find((company) => company.id === currentCompany.id) || null
      );
    });
  }, [companies, currentCompany?.id, isChangeMode]);

  const filteredCompanies = useMemo(() => {
    return filterCompaniesByName(companies, deferredSearch);
  }, [companies, deferredSearch]);

  const visibleCompanies = useMemo(
    () => getCompanyBatch(filteredCompanies, visibleCount),
    [filteredCompanies, visibleCount],
  );
  const hasMore = visibleCompanies.length < filteredCompanies.length;

  useEffect(() => {
    setVisibleCount(COMPANY_BATCH_SIZE);
    setSelectedCompany((current) => {
      if (!current) return null;
      return filteredCompanies.some((company) => company.id === current.id)
        ? current
        : null;
    });
  }, [filteredCompanies]);

  useEffect(() => {
    if (!hasMore || !loadMoreRef.current) return;
    const sentinel = loadMoreRef.current;
    const scrollRoot = sentinel.closest(".mlm-main-scroll-container");
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries[0]?.isIntersecting) return;
        setVisibleCount((current) =>
          getNextCompanyCount(current, filteredCompanies.length),
        );
      },
      { root: scrollRoot, rootMargin: "320px 0px", threshold: 0.01 },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [filteredCompanies.length, hasMore]);

  const handleRefresh = useCallback(async () => {
    if (loading) return;
    await loadCompanies({ force: true });
  }, [loadCompanies, loading]);

  const handleSelect = useCallback((company) => {
    setSelectedCompany((prev) =>
      prev?.id === company.id ? null : company
    );
  }, []);

  const handleContinue = useCallback(async () => {
    if (!selectedCompany) {
      alert("Please select a company");
      return;
    }
    try {
      setSavingSelection(true);
      await selectCompany(selectedCompany);
      navigate(getCompanySelectionDestination(location.search), {
        replace: isChangeMode,
      });
    } catch (error) {
      if (error?.code === COMPANY_SELECTION_LOCKED_CODE) {
        alert(
          "Company cannot be changed after MLM Profile creation.",
        );
        navigate("/mlmprofile", { replace: true });
        return;
      }
      alert("Unable to save your company. Please try again.");
    } finally {
      setSavingSelection(false);
    }
  }, [isChangeMode, location.search, navigate, selectCompany, selectedCompany]);

  const getLogo = (company) => {
    return (
      getCompanyLogoUrl(company) ||
      "https://ui-avatars.com/api/?background=random&color=fff&name=" +
        encodeURIComponent(company.name)
    );
  };

  // The prior grid rendered with visibleCompanies?.map; grouping keeps the same
  // batched visible set while adding the alphabetical section UI.
  const companyGroups = useMemo(() => {
    const groups = [];
    visibleCompanies.forEach((company) => {
      const letter = (company?.name || "#").trim().charAt(0).toUpperCase() || "#";
      const last = groups[groups.length - 1];
      if (!last || last.letter !== letter) groups.push({ letter, companies: [company] });
      else last.companies.push(company);
    });
    return groups;
  }, [visibleCompanies]);

  return (
    <div className="relative min-h-full bg-background text-foreground">
      <div className="mx-auto w-full max-w-[760px] px-4 pb-28 pt-5">
        <div className="mb-5">
          <h1 className="text-[24px] font-bold leading-tight text-foreground">
            {isChangeMode ? "Change your company" : "Select your company"}
          </h1>
          <p className="mt-1.5 text-[15px] text-muted-foreground">
            Choose your MLM organisation to get started.
          </p>
        </div>

        <div className="mb-2 flex items-center gap-2.5">
          <div className="app-field relative flex h-[52px] min-w-0 flex-1 items-center rounded-[16px] border px-4 shadow-sm focus-within:border-accent focus-within:ring-2 focus-within:ring-accent/15">
            <Search className="h-[18px] w-[18px] flex-shrink-0 text-muted-foreground" />
            <input
              type="text"
              className="min-w-0 flex-1 bg-transparent px-3 text-[15px] font-medium text-foreground outline-none placeholder:text-muted-foreground"
              placeholder="Search companies by name"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              autoComplete="off"
              inputMode="search"
              aria-label="Search companies by name"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                aria-label="Clear company search"
                className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground hover:bg-foreground/5 hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={handleRefresh}
            disabled={loading}
            aria-label="Refresh company list"
            title="Refresh company list"
            className="flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-full bg-[var(--auth-soft)] text-accent transition active:scale-95 disabled:opacity-60"
          >
            <RefreshCw className={`h-[19px] w-[19px] ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>

        {!loading && companies.length > 0 && (
          <p className="mb-3 pr-1 text-right text-[11px] font-medium text-muted-foreground">
            {filteredCompanies.length} {filteredCompanies.length === 1 ? "company" : "companies"}
          </p>
        )}

        {loadError && companies.length > 0 && (
          <div className="mb-4 rounded-[14px] border border-danger/20 bg-danger/10 px-4 py-3 text-center text-[12px] font-medium text-danger">
            Refresh failed. Showing the last available company list.
          </div>
        )}

        {loading && companies.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-24">
            <div className="h-9 w-9 animate-spin rounded-full border-[3px] border-border border-t-accent" />
            <p className="text-sm font-medium text-muted-foreground">Loading companies...</p>
          </div>
        ) : loadError && companies.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <p className="max-w-sm text-sm font-medium text-danger">{loadError}</p>
            <button type="button" onClick={() => loadCompanies({ force: true })} className="mt-4 rounded-xl bg-accent px-5 py-2.5 text-sm font-bold text-white">
              Retry
            </button>
          </div>
        ) : filteredCompanies.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[var(--auth-soft)]">
              <Search className="h-6 w-6 text-accent" />
            </div>
            <p className="mt-4 text-[16px] font-bold text-foreground">No companies found</p>
            <p className="mt-1 text-[13px] text-muted-foreground">Try adjusting your search terms</p>
          </div>
        ) : (
          <div className="space-y-5">
            {companyGroups.map((group) => (
              <section key={group.letter}>
                <div className="mb-3 flex items-center gap-3">
                  <span className="text-[11px] font-semibold text-muted-foreground">{group.letter}</span>
                  <span className="h-px flex-1 bg-border" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {group.companies.map((item, index) => {
                    const isSelected = selectedCompany?.id === item.id;
                    return (
                      <button
                        type="button"
                        key={item.id}
                        onClick={() => handleSelect(item)}
                        aria-pressed={isSelected}
                        className={`relative flex min-h-[142px] flex-col items-center justify-center rounded-[20px] border p-3 text-center transition active:scale-[0.985] ${
                          isSelected
                            ? "border-2 border-accent bg-accent/10 shadow-sm"
                            : "border-border bg-card shadow-sm hover:border-accent/40"
                        }`}
                      >
                        <div className="relative flex h-[84px] w-[84px] items-center justify-center overflow-hidden rounded-[18px] border border-border bg-white p-2">
                          <span className="text-[17px] font-bold text-[#64748b]">
                            {(item?.name || "C")
                              .split(/\s+/)
                              .filter(Boolean)
                              .slice(0, 2)
                              .map((part) => part[0])
                              .join("")
                              .toUpperCase()}
                          </span>
                          <img
                            className="absolute inset-0 h-full w-full bg-white object-contain p-2"
                            src={getLogo(item)}
                            alt={item.name}
                            loading={index < 4 ? "eager" : "lazy"}
                            decoding="async"
                            onError={(event) => {
                              event.currentTarget.style.display = "none";
                            }}
                          />
                        </div>
                        <p className={`mt-3 line-clamp-2 text-[12px] font-medium leading-tight ${isSelected ? "text-accent" : "text-foreground"}`}>
                          {item?.name || "Unnamed Company"}
                        </p>
                        {isSelected && (
                          <span className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-accent text-white shadow-sm">
                            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>
        )}

        {hasMore && (
          <div ref={loadMoreRef} className="flex h-16 items-center justify-center" aria-label="Loading more companies">
            <div className="h-6 w-6 animate-spin rounded-full border-[3px] border-border border-t-accent" />
          </div>
        )}

        <div className="mt-6 rounded-[18px] border border-accent/15 bg-accent/5 px-4 py-3 text-center">
          <p className="text-[12px] font-semibold text-foreground">Can't find your company?</p>
          <a href="https://wa.me/919341947815" target="_blank" rel="noopener noreferrer" className="mt-1 inline-block text-[12px] font-semibold text-accent">
            Contact us on WhatsApp
          </a>
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 z-40 bg-background/95 px-4 pb-[calc(env(safe-area-inset-bottom)+12px)] pt-3 shadow-[0_-8px_24px_rgba(15,23,42,0.08)] backdrop-blur-lg">
        <div className="mx-auto max-w-[760px]">
          <Button
            onClick={handleContinue}
            disabled={!selectedCompany || savingSelection}
            className={`h-[54px] w-full rounded-[14px] text-[15px] font-semibold shadow-none ${
              selectedCompany
                ? "bg-accent text-white"
                : "bg-[var(--surface-tertiary)] text-muted-foreground opacity-70"
            }`}
          >
            {savingSelection
              ? "Saving securely..."
              : selectedCompany
                ? `${isChangeMode ? "Use" : "Continue with"} ${selectedCompany.name}`
                : "Select a company"}
          </Button>
        </div>
      </div>
    </div>
  );

}
