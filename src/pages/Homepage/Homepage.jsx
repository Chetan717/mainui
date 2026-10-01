import Carosel from "./Component/Carosel";
import Festival from "./Component/Festival";
import ListOfGenaraltemp from "./Component/ListOfGenaraltemp";
import React, { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { useNavigate } from "react-router";
import {
  fetchGeneralTemplates,
  getTemplateCache,
  clearTemplateCache,
} from "./Component/Services/GeneralTemplateService";
import { useGeneralData } from "../../Context/GeneralContext";
import { hasMlmProfileInStorage } from "../../utils/companyStorage";
import {
  isDirectEditorTemplate,
  rememberEditorBackTarget,
} from "../../utils/editorNavigation";

const TOTAL_GROUPS    = 4;
const CACHE_TTL_MS    = 5 * 60 * 1000;
const PTR_THRESHOLD   = 72;
const PTR_MAX         = 100;
const SEEN_SERIAL_KEY = "mlm_seen_max_serial";
const profileCreate = "/prcrete.webp";

// ── Helpers ──────────────────────────────────────────────────────────────────
function getInitialState() {
  const cache = getTemplateCache();
  if (cache.size === 0) return { templates: [], groupIndex: 0 };

  const merged = [];
  const seen   = new Set();
  let loaded   = 0;

  for (let i = 0; i < TOTAL_GROUPS; i++) {
    const key   = `${i}__`;
    const entry = cache.get(key);
    if (!entry) break;
    const data =
      typeof entry.data !== "undefined" && Date.now() - entry.ts < CACHE_TTL_MS
        ? entry.data
        : null;
    if (!data) break;
    data.forEach((g) => {
      if (!seen.has(g.type)) { seen.add(g.type); merged.push(g); }
    });
    loaded = i + 1;
  }

  return { templates: merged, groupIndex: loaded };
}

function computeMaxSerial(groups) {
  let max = 0;
  groups.forEach((group) => {
    if (!Array.isArray(group.templates)) return;
    group.templates.forEach((t) => {
      const s = Number(t.serial) || 0;
      if (s > max) max = s;
    });
  });
  return max;
}

function getSeenSerial() {
  try { return Number(localStorage.getItem(SEEN_SERIAL_KEY)) || 0; }
  catch { return 0; }
}

function markSeen(maxSerial) {
  try { localStorage.setItem(SEEN_SERIAL_KEY, String(maxSerial)); }
  catch {}
}

// ── Pull indicator ────────────────────────────────────────────────────────────
function PullIndicator({ pullY, refreshing }) {
  const progress   = Math.min(pullY / PTR_THRESHOLD, 1);
  const show       = pullY > 0 || refreshing;
  const translateY = refreshing
    ? 56
    : Math.min(pullY * 0.6, PTR_MAX * 0.6);

  return (
    <div
      className="absolute left-0 right-0 flex justify-center pointer-events-none z-50"
      style={{
        top: 0,
        transform: `translateY(${translateY - 48}px)`,
        transition: refreshing ? "transform 0.2s ease" : "none",
        opacity: show ? 1 : 0,
      }}
    >
      <div
        className="w-10 h-10 rounded-full bg-background shadow-lg border border-border flex items-center justify-center"
        style={{ boxShadow: "0 2px 12px rgba(0,0,0,0.12)" }}
      >
        {refreshing ? (
          <svg className="w-5 h-5 text-accent animate-spin" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeOpacity="0.25" />
            <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
          </svg>
        ) : (
          <svg
            className="w-5 h-5 text-accent"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{
              transform: `rotate(${progress * 180}deg)`,
              transition: "transform 0.1s",
              color: progress >= 1 ? "var(--color-accent)" : "var(--color-foreground)",
              opacity: 0.5 + progress * 0.5,
            }}
          >
            <path d="M12 19V5M5 12l7-7 7 7" />
          </svg>
        )}
      </div>
    </div>
  );
}

// ── New-templates banner ──────────────────────────────────────────────────────
function NewTemplatesBanner({ onDismiss }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const id = setTimeout(() => setVisible(true), 80);
    return () => clearTimeout(id);
  }, []);

  const handleDismiss = () => {
    setVisible(false);
    setTimeout(onDismiss, 300);
  };

  return (
    <div
      className="mx-3 mb-1"
      style={{
        transform: visible ? "translateY(0)" : "translateY(-12px)",
        opacity: visible ? 1 : 0,
        transition: "transform 0.35s cubic-bezier(0.34,1.56,0.64,1), opacity 0.3s ease",
      }}
    >
      <div
        className="flex items-center gap-2.5 px-4 py-2.5 rounded-2xl border border-accent/25"
        style={{
          background: "linear-gradient(135deg, rgba(0,136,218,0.10) 0%, rgba(26,58,143,0.08) 100%)",
          boxShadow: "0 2px 12px rgba(0,136,218,0.12)",
        }}
      >
        <span className="relative flex h-2.5 w-2.5 shrink-0">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-60" />
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-accent" />
        </span>

        <p className="flex-1 text-[13px] font-semibold text-accent leading-tight">
          New templates added!{" "}
          <span className="font-medium text-foreground/70">Pull down to refresh.</span>
        </p>

        <button
          onClick={handleDismiss}
          className="shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
          aria-label="Dismiss"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="w-3.5 h-3.5">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
}

// ── Search Bar ────────────────────────────────────────────────────────────────
function SearchBar({ value, onChange }) {
  return (
    <div className="px-1">
      <div className="relative flex items-center">
        <svg
          className="absolute left-3 w-4 h-4 text-muted-foreground pointer-events-none"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.35-4.35" />
        </svg>
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Search templates..."
          maxLength={50}
          className="w-full pl-9 pr-9 py-2.5 rounded-xl  border border-accent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent/50 transition-all"
        />
        {value && (
          <button
            onClick={() => onChange("")}
            className="absolute right-3 flex items-center justify-center w-4 h-4 rounded-full bg-accent/20 hover:bg-accent/30 transition-colors"
            aria-label="Clear search"
          >
            <svg
              className="w-2.5 h-2.5 text-foreground"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
            >
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}

// ── Profile modal (shared for search navigation) ──────────────────────────────
function SearchProfileModal({ onConfirm, onDismiss }) {
  return (
    <div
      className="fixed inset-0 z-70 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onDismiss}
    >
      <div
        className="bg-[#d4e4f8] w-full sm:max-w-sm rounded-t-3xl sm:rounded-3xl border border-border shadow-2xl p-6 pb-10 sm:pb-6"
        onClick={(e) => e.stopPropagation()}
      >
        <img src={profileCreate} alt="create profile" className="rounded-xl" decoding="auto" />
        <button
          onClick={onConfirm}
          className="w-full py-3.5 mt-5 rounded-2xl text-white font-bold text-[14px] shadow-lg shadow-accent/20"
          style={{ background: "linear-gradient(135deg, #0088DA 0%, #0088DA 100%)" }}
        >
          Create Profile →
        </button>
        <button
          onClick={onDismiss}
          className="w-full py-2 mt-2 text-[12px] font-medium text-muted-foreground text-center"
        >
          Maybe later
        </button>
      </div>
    </div>
  );
}

// ── Search Suggestions Dropdown ───────────────────────────────────────────────
function SearchSuggestions({ results, searchQuery, onSelect, loading }) {
  if (!searchQuery.trim()) return null;

  if (loading && results.length === 0) {
    return (
      <div className="mx-1 rounded-2xl border border-border bg-background shadow-xl overflow-hidden">
        <div className="flex flex-col items-center py-10 gap-3">
          <div className="w-7 h-7 border-4 border-muted border-t-accent rounded-full animate-spin" />
          <p className="text-sm text-muted-foreground font-medium animate-pulse">Searching templates…</p>
        </div>
      </div>
    );
  }

  if (results.length === 0) {
    return (
      <div className="mx-1 rounded-2xl border border-border bg-background shadow-xl overflow-hidden">
        <div className="flex flex-col items-center py-10 text-center px-4">
          <div className="w-14 h-14 rounded-full bg-muted/40 border border-border flex items-center justify-center mb-3">
            <svg className="w-6 h-6 text-muted-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
            </svg>
          </div>
          <p className="text-sm font-bold text-foreground mb-1">No templates found</p>
          <p className="text-xs text-muted-foreground">Try a different keyword</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-1 rounded-2xl border border-border bg-background shadow-xl overflow-hidden">
      <div className="px-4 py-2.5 border-b border-border/60 flex items-center justify-between">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
          {results.length} template{results.length !== 1 ? "s" : ""} found
        </p>
      </div>
      <div className="max-h-[62vh] overflow-y-auto divide-y divide-border/40">
        {results.map((item) => {
          const displayName =
            item.Subtype || (item.type || "").replaceAll("_", " ");
          const categoryName = (item.type || "").replaceAll("_", " ");
          return (
            <button
              key={item.id}
              onClick={() => onSelect(item)}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/40 active:bg-muted/60 transition-colors text-left"
            >
              <div className="w-12 h-12 rounded-xl overflow-hidden shrink-0 border border-border bg-muted">
                <img
                  src={item.image}
                  alt={displayName}
                  className="w-full h-full object-cover"
                  loading="lazy"
                  decoding="async"
                />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground truncate leading-snug">
                  {displayName}
                </p>
                <p className="text-xs text-muted-foreground truncate mt-0.5">
                  {categoryName}
                </p>
              </div>
              <svg
                className="w-4 h-4 text-muted-foreground shrink-0"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M9 18l6-6-6-6" />
              </svg>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
function Homepage() {
  const { setHasNewTemplates, setSelType } = useGeneralData();
  const navigate = useNavigate();

  const initial                              = getInitialState();
  const [templates, setTemplates]            = useState(initial.templates);
  const [loading, setLoading]                = useState(false);
  const [refreshing, setRefreshing]          = useState(false);
  const [pullY, setPullY]                    = useState(0);
  const [showBanner, setShowBanner]          = useState(false);
  const [searchQuery, setSearchQuery]        = useState("");
  const [profileModalPending, setProfileModalPending] = useState(null);

  const loadingRef    = useRef(false);
  const refreshingRef = useRef(false);
  const groupIndexRef = useRef(initial.groupIndex);
  const maxSerialRef  = useRef(0);

  const touchStartY      = useRef(0);
  const touchStartScroll = useRef(0);
  const isPulling        = useRef(false);

  // ── Filter templates by search query ───────────────────────────────────────
  const filteredTemplates = useMemo(() => {
    if (!searchQuery.trim()) return templates;
    const q = searchQuery.trim().toLowerCase();
    return templates.filter((group) => {
      const typeName = (group.type || "").toLowerCase().replaceAll("_", " ");
      const matchesType = typeName.includes(q);
      const matchesSubtype = group.templates?.some((t) =>
        (t.Subtype || "").toLowerCase().includes(q)
      );
      return matchesType || matchesSubtype;
    });
  }, [templates, searchQuery]);

  // ── Flat list of matching items for the search dropdown ────────────────────
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.trim().toLowerCase();
    return filteredTemplates.flatMap((group) =>
      (group.templates || []).filter((t) => {
        const sub = (t.Subtype || "").toLowerCase();
        const typ = (group.type || "").toLowerCase().replaceAll("_", " ");
        return sub.includes(q) || typ.includes(q);
      })
    );
  }, [filteredTemplates, searchQuery]);

  // ── Navigation helper for search selection ─────────────────────────────────
  const handleSearchReset = useCallback(() => {
    localStorage.removeItem("mlmform");
    const mlmProfile = JSON.parse(sessionStorage.getItem("mlmProfile") || "{}");
    const formData = {
      tab: "team",
      achiever: { title: "Mr.", name: "", achieverName: "", city: "", amount: "", image: "" },
      promoter: null,
      selectedLinks: mlmProfile?.topuplineURLs || [],
    };
    localStorage.setItem("mlmform", JSON.stringify(formData));
  }, []);

  const handleSearchSelect = useCallback(
    (item) => {
      handleSearchReset();
      const selttype = {
        MainType: item?.MainType,
        id: item.id,
        type: item.type,
        serial: item.serial,
        ShowCaseForm: item.ShowCaseForm,
        Subtype: item.Subtype,
      };
      setSelType(selttype);
      localStorage.setItem("selType", JSON.stringify(selttype));
      if (hasMlmProfileInStorage()) {
        if (isDirectEditorTemplate(selttype.type)) {
          rememberEditorBackTarget("/", selttype);
          navigate("/editor", { state: { editorBackTarget: "/" } });
        } else {
          navigate("/mlmform");
        }
      } else {
        setProfileModalPending(selttype);
      }
    },
    [navigate, setSelType, handleSearchReset],
  );

  // ── Check for new templates after load ─────────────────────────────────────
  const checkForNew = useCallback((groups) => {
    const currentMax = computeMaxSerial(groups);
    maxSerialRef.current = Math.max(maxSerialRef.current, currentMax);
    const seen = getSeenSerial();

    if (maxSerialRef.current > seen && seen > 0) {
      setShowBanner(true);
      setHasNewTemplates(true);
    } else if (seen === 0) {
      markSeen(maxSerialRef.current);
    }
  }, [setHasNewTemplates]);

  const handleDismissBanner = useCallback(() => {
    setShowBanner(false);
    setHasNewTemplates(false);
    markSeen(maxSerialRef.current);
  }, [setHasNewTemplates]);

  // ── Load templates (paginated) ─────────────────────────────────────────────
  const loadTemplates = useCallback(async () => {
    if (loadingRef.current || groupIndexRef.current >= TOTAL_GROUPS) return;

    loadingRef.current = true;
    setLoading(true);

    const data = await fetchGeneralTemplates(groupIndexRef.current);

    setTemplates((prev) => {
      const existingTypes = new Set(prev.map((g) => g.type));
      const merged = [...prev, ...data.filter((g) => !existingTypes.has(g.type))];
      if (groupIndexRef.current === 0) checkForNew(merged);
      return merged;
    });

    groupIndexRef.current += 1;
    loadingRef.current    = false;
    setLoading(false);
  }, [checkForNew]);

  // ── Pull-to-refresh ────────────────────────────────────────────────────────
  const doRefresh = useCallback(async () => {
    if (refreshingRef.current) return;
    refreshingRef.current = true;
    setRefreshing(true);
    setShowBanner(false);
    setHasNewTemplates(false);
    setPullY(0);

    clearTemplateCache();
    setTemplates([]);
    groupIndexRef.current = 0;
    loadingRef.current    = false;
    maxSerialRef.current  = 0;

    const data = await fetchGeneralTemplates(0);
    setTemplates(data);
    groupIndexRef.current = 1;

    const newMax = computeMaxSerial(data);
    maxSerialRef.current = newMax;
    markSeen(newMax);

    setRefreshing(false);
    refreshingRef.current = false;
    setLoading(false);
  }, [setHasNewTemplates]);

  // ── Initial load ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (groupIndexRef.current < TOTAL_GROUPS) {
      loadTemplates();
    }
  }, []);

  // ── Infinite-scroll ────────────────────────────────────────────────────────
  useEffect(() => {
    const scrollEl = document.querySelector(".layout-scroll-container");
    if (!scrollEl) return;

    const handleScroll = () => {
      if (groupIndexRef.current >= TOTAL_GROUPS || loadingRef.current) return;
      const { scrollTop, scrollHeight, clientHeight } = scrollEl;
      if (scrollHeight - scrollTop <= clientHeight + 200) loadTemplates();
    };

    scrollEl.addEventListener("scroll", handleScroll, { passive: true });
    return () => scrollEl.removeEventListener("scroll", handleScroll);
  }, [loadTemplates]);

  // ── Touch pull-to-refresh ──────────────────────────────────────────────────
  useEffect(() => {
    const scrollEl = document.querySelector(".layout-scroll-container");
    if (!scrollEl) return;

    const onTouchStart = (e) => {
      if (refreshingRef.current) return;
      touchStartY.current      = e.touches[0].clientY;
      touchStartScroll.current = scrollEl.scrollTop;
      isPulling.current        = false;
    };

    const onTouchMove = (e) => {
      if (refreshingRef.current) return;
      const dy = e.touches[0].clientY - touchStartY.current;
      if (touchStartScroll.current <= 0 && dy > 0) {
        isPulling.current = true;
        const pulled = Math.min(dy * 0.5, PTR_MAX);
        setPullY(pulled);
        if (dy > 8) e.preventDefault();
      } else {
        if (isPulling.current) { isPulling.current = false; setPullY(0); }
      }
    };

    const onTouchEnd = () => {
      if (!isPulling.current) return;
      isPulling.current = false;
      if (pullY >= PTR_THRESHOLD * 0.5) {
        doRefresh();
      } else {
        setPullY(0);
      }
    };

    scrollEl.addEventListener("touchstart", onTouchStart, { passive: true });
    scrollEl.addEventListener("touchmove",  onTouchMove,  { passive: false });
    scrollEl.addEventListener("touchend",   onTouchEnd,   { passive: true });

    return () => {
      scrollEl.removeEventListener("touchstart", onTouchStart);
      scrollEl.removeEventListener("touchmove",  onTouchMove);
      scrollEl.removeEventListener("touchend",   onTouchEnd);
    };
  }, [doRefresh, pullY]);

  // ── Render ─────────────────────────────────────────────────────────────────
  const isSearching = searchQuery.trim().length > 0;

  return (
    <div className="flex flex-col w-full gap-3 relative">
      <PullIndicator pullY={pullY} refreshing={refreshing} />

      {showBanner && !isSearching && (
        <NewTemplatesBanner onDismiss={handleDismissBanner} />
      )}

      <SearchBar value={searchQuery} onChange={setSearchQuery} />

      {isSearching ? (
        <SearchSuggestions
          results={searchResults}
          searchQuery={searchQuery}
          onSelect={handleSearchSelect}
          loading={loading || refreshing}
        />
      ) : (
        <>
          <Carosel />
          <Festival />
          <ListOfGenaraltemp
            templates={filteredTemplates}
            loading={loading || refreshing}
            searchQuery={searchQuery}
          />
        </>
      )}

      {profileModalPending && (
        <SearchProfileModal
          onConfirm={() => {
            setProfileModalPending(null);
            navigate("/mlmprofile");
          }}
          onDismiss={() => setProfileModalPending(null)}
        />
      )}
    </div>
  );
}

export default Homepage;
