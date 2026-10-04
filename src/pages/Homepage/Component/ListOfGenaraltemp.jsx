import React, { useState, useEffect, useCallback, useMemo, memo } from "react";
import { useGeneralData } from "../../../Context/GeneralContext";
import { useNavigate } from "react-router";
import { ArrowUpRight } from "@gravity-ui/icons";
import {
  Award,
  Banknote,
  Cake,
  Dumbbell,
  Gift,
  Handshake,
  Heart,
  ImageIcon,
  Lightbulb,
  Medal,
  Monitor,
  PackageOpen,
  Plane,
  Quote,
  Sparkles,
  Sunrise,
  Trophy,
  Users,
} from "lucide-react";
import {
  preloadImage,
  markImageSeen,
  seenImages,
  isNewTemplate,
} from "./templateCacheUtils";
import { hasMlmProfileInStorage } from "../../../utils/companyStorage";
import { useSelectedCompany } from "../../../Context/SelectedCompanyContext";
import { rememberEditorBackTarget } from "../../../utils/editorNavigation";
import { getTemplateTypeDisplayName } from "./homeTemplatePresentation";
import {
  EVERYDAY_MOMENT_ENTRIES,
  isEverydayMomentType,
} from "../../../utils/everydayMoments";
import { buildEverydayMomentsAllTemplatesPath } from "../../../utils/allTemplatesNavigation";

const profileCreate = "/prcrete.webp";

const ImageWithSkeleton = React.memo(({ src, alt, className }) => {
  const alreadySeen = seenImages.has(src);
  const [loaded, setLoaded] = useState(alreadySeen);
  return (
    // bg-muted/50 persists so there is never a white blank — not even when
    // the browser is pulling an already-seen image out of disk cache.
    <div className="relative w-full h-full bg-muted/50">
      {!loaded && (
        <div className="absolute inset-0 bg-muted/50 rounded-xl overflow-hidden">
          <div className="absolute inset-0 shimmer-bar" />
        </div>
      )}
      <img
        src={src}
        alt={alt}
        className={`${className} ${loaded ? "opacity-100" : "opacity-0"}`}
        style={loaded ? undefined : { transition: "opacity 0.15s" }}
        loading="lazy"
        decoding="async"
        onLoad={() => {
          markImageSeen(src);
          setLoaded(true);
        }}
      />
    </div>
  );
});

function CreateProfileModal({ onConfirm, onDismiss }) {
  return (
    <div
      className="fixed inset-0 z-70 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onDismiss}
    >
      <div
        className="bg-[#d4e4f8] w-full sm:max-w-sm rounded-t-3xl sm:rounded-3xl border border-border shadow-2xl p-6 pb-10 sm:pb-6"
        onClick={(e) => e.stopPropagation()}
      >
        <img
          src={profileCreate}
          alt="create profile"
          className={` rounded-xl`}
          decoding="auto"
        />
        <button
          onClick={onConfirm}
          className="w-full py-3.5 mt-5 rounded-2xl text-white font-bold text-[14px] shadow-lg shadow-accent/20 "
          style={{
            background: "linear-gradient(135deg,#2F80EA 0%,#236FDE 48%,#1454C5 100%)",
          }}
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

function DesignationSelectModal({
  designations,
  loading,
  onSelect,
  onDismiss,
}) {
  const [search, setSearch] = useState("");
  const list = Array.isArray(designations) ? designations : [];
  const filteredList = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return list;

    return list.filter((item) => {
      const name = String(item?.profilename || item?.name || "").toLowerCase();
      return name.includes(query);
    });
  }, [list, search]);

  return (
    <div
      className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm px-3 sm:px-0"
      onClick={onDismiss}
    >
      <div
        className="w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl border border-border bg-background shadow-2xl p-4 sm:p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-semibold text-foreground">
              Select Rank
            </h3>
            <p className="text-sm text-muted-foreground">
              Choose the Rank for this banner.
            </p>
          </div>
          <button
            onClick={onDismiss}
            className="text-sm font-medium text-muted-foreground"
          >
            Close
          </button>
        </div>

        <div className="mb-3">
          <label className="sr-only" htmlFor="designation-search">
            Search designation
          </label>
          <input
            id="designation-search"
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search designation"
            className="w-full rounded-2xl border border-border bg-background px-3 py-2.5 text-sm text-foreground shadow-sm outline-none ring-0 placeholder:text-muted-foreground"
          />
        </div>

        <div className="max-h-[60vh] overflow-y-auto space-y-2">
          {loading ? (
            <div className="rounded-2xl border border-dashed border-border bg-muted/30 px-4 py-6 text-center text-sm text-muted-foreground">
              Loading designations…
            </div>
          ) : filteredList.length > 0 ? (
            filteredList.map((item, index) => {
              const designationName =
                item?.profilename || item?.name || `Designation ${index + 1}`;
              const designationImage = item?.profileimage || item?.image || "";

              return (
                <button
                  key={`${designationName}-${index}`}
                  onClick={() =>
                    onSelect({
                      name: designationName,
                      image: designationImage,
                      profilename: designationName,
                      profileimage: designationImage,
                    })
                  }
                  className="w-full flex items-center gap-3 rounded-2xl border border-border bg-white/70 dark:bg-black/20 px-3 py-3 text-left shadow-sm"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">
                      {designationName}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Tap to use this designation
                    </p>
                  </div>
                </button>
              );
            })
          ) : (
            <div className="rounded-2xl border border-dashed border-border bg-muted/30 px-4 py-6 text-center text-sm text-muted-foreground">
              No designations found for this company.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function normalizeCompanyDesignations(company) {
  const source =
    [
      company?.profile,
      company?.designation,
      company?.designations,
      company?.ranks,
    ].find(Array.isArray) || [];

  return source
    .map((item) => {
      if (typeof item === "string") {
        const name = item.trim();
        return name
          ? { name, image: "", profilename: name, profileimage: "" }
          : null;
      }

      const name = String(
        item?.profilename ||
          item?.name ||
          item?.designation ||
          item?.rankName ||
          "",
      ).trim();
      const image = String(
        item?.profileimage || item?.image || item?.rankImage || "",
      ).trim();

      return name
        ? { ...item, name, image, profilename: name, profileimage: image }
        : null;
    })
    .filter(Boolean);
}

const TEMPLATE_SECTION_ICON_BY_TYPE = {
  Today_Trending: Sparkles,
  Product: PackageOpen,
  Motivational: Lightbulb,
  Rank_Promotion: Trophy,
  Rank_Promotion_B: Medal,
  Bonanza: Gift,
  Domestic_Trip: Plane,
  Welcome_Closing: Handshake,
  Training: Monitor,
  Meeting: Users,
  General_Meeting: Users,
  Achievements: Award,
  Anniversary_Birthday: Cake,
  Income: Banknote,
  ThankYou_Banner_B: Heart,
  ThankYou_Birthday_Anniversary: Heart,
  Capping: Trophy,
  Good_Morning: Sunrise,
  Sport: Dumbbell,
  Daily_Life: Sparkles,
  Greeting_Wishes: Heart,
  Health_Tips: Heart,
  Devotional_Spiritual: Sparkles,
  Leader_Quotes: Quote,
};

function TemplateSectionHeading({ type, label }) {
  const Icon = TEMPLATE_SECTION_ICON_BY_TYPE[type] || Sparkles;
  return (
    <div className="flex min-w-0 items-center gap-2.5">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent/10 text-accent">
        <Icon className="h-5 w-5" strokeWidth={1.8} />
      </span>
      <h2 className="truncate text-lg font-display font-bold text-foreground">
        {label}
      </h2>
    </div>
  );
}

const GENERAL_SELECT_TYPES = new Set([
  // "Trending",
  // "Today_Trending",
  "Festival",
  "Product",
  "Motivational",
  "Good_Morning",
  "Sport",
  "Daily_Life",
  "Devotional_Spiritual",
  "Leader_Quotes",
  "Health_Tips",
  "Greeting_Wishes",
  "ThankYou_Banner_B",
  "ThankYou_Birthday_Anniversary",
]);

const CIRCLE_TYPES = new Set([""]);

const SkeletonCard = React.memo(() => (
  <div className="rounded-2xl overflow-hidden bg-muted aspect-square w-full relative border border-border">
    <div className="absolute inset-0 shimmer-bar" />
  </div>
));

const CheckIcon = ({ size = "sm" }) => {
  const dim = size === "sm" ? "w-5 h-5" : "w-6 h-6";
  const icon = size === "sm" ? "w-3 h-3" : "w-3.5 h-3.5";
  return (
    <div
      className={`absolute top-2 right-2 ${dim} bg-accent rounded-full flex items-center justify-center shadow-md`}
    >
      <svg
        className={`${icon} text-white`}
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={3}
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
      </svg>
    </div>
  );
};

const NewBadge = () => (
  <div className="absolute top-2 left-2 z-10 flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-accent shadow-md pointer-events-none">
    <span className="relative flex h-1.5 w-1.5 shrink-0">
      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-70" />
      <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-white" />
    </span>
    <span className="text-[8px] font-bold text-white uppercase tracking-wide leading-none">
      New
    </span>
  </div>
);

function ListOfGenaraltemp({ templates, loading, searchQuery, companyName }) {
  const { selectedCompany, refreshCompany } = useSelectedCompany();
  const [selectedTemp, setSelectedTemp] = useState(null);
  const [profileModalPending, setProfileModalPending] = useState(null);
  const [designationModalPending, setDesignationModalPending] = useState(null);
  const [designationOptions, setDesignationOptions] = useState([]);
  const [designationLoading, setDesignationLoading] = useState(false);
  const navigate = useNavigate();
  const { selType: contextSelType, setSelType } = useGeneralData();

  const selType = useMemo(() => {
    if (contextSelType?.type) {
      return contextSelType;
    }
    try {
      const stored = localStorage.getItem("selType");
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  }, [contextSelType]);

  // Sync selType to localStorage as a side-effect, not inside useMemo
  useEffect(() => {
    if (contextSelType?.type) {
      try {
        localStorage.setItem("selType", JSON.stringify(contextSelType));
      } catch {}
    }
  }, [contextSelType]);

  const handleViewAll = useCallback(
    (group) => {
      const selttype = {
        MainType: group?.templates?.[0]?.MainType || group?.MainType || "General",
        type: group.type,
        id: group.templates?.[0]?.id,
        serial: group.templates?.[0]?.serial,
        ShowCaseForm: group.templates?.[0]?.ShowCaseForm,
        Subtype: group.templates?.[0]?.Subtype,
      };
      setSelType(selttype);
      navigate("/alltemp");
    },
    [navigate, setSelType],
  );

  const handleReset = useCallback(() => {
    const mlmProfile = JSON.parse(sessionStorage.getItem("mlmProfile"));
    const formDAta = {
      tab: "team",
      achiever: {
        title: "Mr.",
        name: "",
        achieverName: "",
        city: "",
        amount: "",
        image: "",
      },
      promoter: null,
      selectedLinks: mlmProfile?.topuplineURLs || [],
    };
    localStorage.setItem("mlmform", JSON.stringify(formDAta));
  }, []);

  const prepareEditorTemplate = useCallback(
    (item, selttype) => {
      const graphics = Array.isArray(item?.GraphicsLink)
        ? item.GraphicsLink.filter(Boolean).slice(0, 20)
        : [];

      if (graphics.length === 0) {
        sessionStorage.removeItem("editorTemplateSeed");
        return;
      }

      try {
        sessionStorage.setItem(
          "editorTemplateSeed",
          JSON.stringify({
            mainType: selttype.MainType || "",
            type: selttype.type || "",
            subType: selttype.Subtype || "",
            templateMainType: item?.MainType || "",
            templateType: item?.type || "",
            templateSubType: item?.Subtype || "",
            templateId: item?.id || "",
            serial: item?.serial || 0,
            companyId: selectedCompany?.id || "",
            items: graphics,
          }),
        );
      } catch {
        sessionStorage.removeItem("editorTemplateSeed");
      }

      // Begin downloading the first canvas background before navigation. The
      // editor's useImage request will reuse the browser cache.
      const firstImage = graphics.find(
        (graphic) => !graphic?.backgroundVideoUrl && graphic?.url,
      );
      if (firstImage?.url) preloadImage(firstImage.url);
    },
    [selectedCompany?.id],
  );

  const proceedWithTemplateSelection = useCallback(
    (selttype, designationSelection) => {
      if (designationSelection) {
        localStorage.setItem(
          "SelectedDesignation",
          JSON.stringify({
            name:
              designationSelection?.name ||
              designationSelection?.profilename ||
              "",
            image:
              designationSelection?.image ||
              designationSelection?.profileimage ||
              "",
            profilename:
              designationSelection?.profilename ||
              designationSelection?.name ||
              "",
            profileimage:
              designationSelection?.profileimage ||
              designationSelection?.image ||
              "",
          }),
        );
      } else {
        localStorage.removeItem("SelectedDesignation");
      }

      if (hasMlmProfileInStorage()) {
        const isDirectEditor =
          GENERAL_SELECT_TYPES.has(selttype.type) ||
          CIRCLE_TYPES.has(selttype.type);
        if (isDirectEditor) {
          rememberEditorBackTarget("/", selttype);
          navigate("/editor", { state: { editorBackTarget: "/" } });
        } else {
          navigate("/mlmform");
        }
      } else {
        setProfileModalPending(selttype);
      }
    },
    [navigate],
  );

  const handleImagePress = useCallback(
    (item, { includeAllSubtypes = false } = {}) => {
      setSelectedTemp(item);
      handleReset();
      const selttype = {
        MainType: item?.MainType || item?.MainType,
        id: item.id,
        type: item.type,
        serial: item.serial,
        ShowCaseForm: item.ShowCaseForm,
        Subtype: includeAllSubtypes ? "" : item.Subtype,
      };
      localStorage.removeItem("achieve_form");
      setSelType(selttype);
      localStorage.setItem("selType", JSON.stringify(selttype));
      prepareEditorTemplate(item, selttype);

      if (selttype.type === "ThankYou_Banner_B") {
        setDesignationModalPending(selttype);
        return;
      }

      proceedWithTemplateSelection(selttype);
    },
    [
      handleReset,
      prepareEditorTemplate,
      proceedWithTemplateSelection,
      setSelType,
    ],
  );

  // Refresh the authenticated user's company document when the designation
  // picker opens so backend changes are reflected immediately. Cached ranks
  // remain visible during refresh, and this effect intentionally depends only
  // on the company ID so refreshCompany() cannot trigger a refresh loop.
  useEffect(() => {
    if (!designationModalPending) return;

    let cancelled = false;
    const cachedDesignations = normalizeCompanyDesignations(selectedCompany);
    setDesignationOptions(cachedDesignations);
    setDesignationLoading(cachedDesignations.length === 0);

    const loadFreshDesignations = async () => {
      try {
        const company = await refreshCompany();
        if (cancelled) return;

        const freshDesignations = normalizeCompanyDesignations(company);
        if (freshDesignations.length > 0 || cachedDesignations.length === 0) {
          setDesignationOptions(freshDesignations);
        }
      } catch {
        // Keep the already loaded company ranks when an online refresh fails.
      } finally {
        if (!cancelled) setDesignationLoading(false);
      }
    };

    loadFreshDesignations();

    return () => {
      cancelled = true;
    };
  }, [designationModalPending, refreshCompany, selectedCompany?.id]);

  if (loading && (!templates || templates.length === 0)) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <div className="w-10 h-10 border-4 border-muted border-t-accent rounded-full animate-spin" />
        <p className="text-sm text-muted-foreground font-medium tracking-wide animate-pulse">
          Loading beautiful templates...
        </p>
      </div>
    );
  }

  const renderViewAllButton = (group) => (
    <button
      onClick={() => handleViewAll(group)}
      className="flex items-center gap-1 text-xs font-bold text-accent dark:text-white bg-accent/10 dark:bg-white/10 px-3 py-1.5 rounded-full"
    >
      View All
      <ArrowUpRight className="w-3 h-3" />
    </button>
  );

  const renderGroupTemplates = (group, displayName) => {
    const isCapping = group?.type === "Capping";
    const items = isCapping
      ? (group.templates || []).slice(0, 1)
      : group.templates || [];

    return (
      <div className="-mx-3 overflow-x-auto scroll-smooth snap-x snap-mandatory px-3 pb-2 hide-scrollbar scroll-gpu md:-mx-6 md:px-6">
        <div className="flex w-max min-w-full gap-3 pr-1">
          {items.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => handleImagePress(item)}
              className={`${
                isCapping ? "w-[72vw] min-w-[220px] max-w-[280px]" : "w-[118px]"
              } shrink-0 snap-start overflow-hidden rounded-[15px] border bg-white text-center shadow-[0_4px_14px_rgba(28,54,92,0.08)] transition-transform duration-150 active:scale-[0.985] dark:bg-[#111827] ${
                selectedTemp?.id === item?.id
                  ? "border-[#2F80EA] ring-2 ring-[#2F80EA]/20"
                  : "border-[#E4EAF3] dark:border-[#263146]"
              }`}
            >
              <div className="relative aspect-square w-full overflow-hidden bg-[#EAF1FB] dark:bg-[#172235]">
                {item?.image ? (
                  <ImageWithSkeleton
                    src={item.image}
                    className="h-full w-full object-cover"
                    alt={item.Subtype || displayName}
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-[#8ABAF2] dark:text-[#5F86B4]">
                    <ImageIcon className="h-4 w-4" strokeWidth={1.6} />
                  </div>
                )}
                {isNewTemplate(item.serial) ? <NewBadge /> : null}
              </div>

              <div className={`${isCapping ? "px-3 py-3" : "px-2.5 py-2.5"}`}>
                <p
                  className={`line-clamp-2 font-semibold text-[#20283A] dark:text-[#E4EAF4] ${
                    isCapping
                      ? "min-h-[18px] text-[12px] leading-[16px]"
                      : "min-h-[26px] text-[10px] leading-[13px]"
                  }`}
                >
                  {item?.Subtype || displayName}
                </p>
              </div>
            </button>
          ))}
        </div>
      </div>
    );
  };

  const visibleGroups = (Array.isArray(templates) ? templates : []).filter(
    (group) => Array.isArray(group?.templates) && group.templates.length > 0,
  );

  const everydayMomentCards = EVERYDAY_MOMENT_ENTRIES.map((entry) => {
    const group = visibleGroups.find(
      (candidate) => candidate?.type === entry.type,
    );
    const item = group?.templates?.[0] || null;
    return item ? { ...entry, group, item } : null;
  }).filter(Boolean);

  const regularGroups = visibleGroups.filter(
    (group) => !isEverydayMomentType(group?.type),
  );
  const noResults = Boolean(
    searchQuery &&
    regularGroups.length === 0 &&
    everydayMomentCards.length === 0,
  );

  return (
    <div className="flex w-full flex-col pb-[14px]">
      {noResults ? (
        <div className="flex flex-col items-center justify-center px-4 py-16 text-center">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-[#EAF1FB] text-[#8ABAF2] dark:bg-[#172235] dark:text-[#5F86B4]">
            <ImageIcon className="h-5 w-5" strokeWidth={1.6} />
          </div>
          <p className="text-[13px] font-semibold text-[#1C2433] dark:text-white">
            No templates found
          </p>
          <p className="mt-1 text-[10px] text-[#8A94A8] dark:text-[#8F9AAE]">
            Try a different keyword
          </p>
        </div>
      ) : (
        <div className="space-y-[18px]">
          {regularGroups.map((group) => {
            const displayName = getTemplateTypeDisplayName(group.type);
            return (
              <section key={group.type} className="min-w-0">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <TemplateSectionHeading
                    type={group.type}
                    label={displayName === "Training" ? "Seat Booking" : displayName}
                  />
                  {renderViewAllButton(group)}
                </div>
                {renderGroupTemplates(group, displayName)}
              </section>
            );
          })}

          {everydayMomentCards.length > 0 && (
            <section className="min-w-0">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-2.5">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent/10 text-accent">
                    <Sparkles className="h-5 w-5" strokeWidth={1.8} />
                  </span>
                  <h2 className="truncate text-lg font-display font-bold text-foreground">
                    Everyday Moments
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    navigate(buildEverydayMomentsAllTemplatesPath())
                  }
                  className="flex items-center gap-1 rounded-full bg-[#E8F5FD] px-3 py-1.5 text-[11px] font-semibold text-[#2F80EA] dark:bg-[#17314A] dark:text-[#74C8FF]"
                >
                  View All
                  <ArrowUpRight className="h-3 w-3" />
                </button>
              </div>

              <div className="-mx-3 overflow-x-auto scroll-smooth snap-x snap-mandatory px-3 pb-2 hide-scrollbar scroll-gpu md:-mx-6 md:px-6">
                <div className="flex w-max min-w-full gap-3 pr-1">
                  {everydayMomentCards.map(({ type, label, item }) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => handleImagePress(item)}
                      className={`w-[118px] shrink-0 snap-start overflow-hidden rounded-[15px] border bg-white text-center shadow-[0_4px_14px_rgba(28,54,92,0.08)] transition-transform duration-150 active:scale-[0.985] dark:bg-[#111827] ${
                        selectedTemp?.id === item?.id
                          ? "border-[#2F80EA] ring-2 ring-[#2F80EA]/20"
                          : "border-[#E4EAF3] dark:border-[#263146]"
                      }`}
                      aria-label={label}
                    >
                      <div className="relative aspect-square w-full overflow-hidden bg-[#EAF1FB] dark:bg-[#172235]">
                        {item?.image ? (
                          <ImageWithSkeleton
                            src={item.image}
                            className="h-full w-full object-cover"
                            alt={label}
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-[#8ABAF2] dark:text-[#5F86B4]">
                            <ImageIcon className="h-4 w-4" strokeWidth={1.6} />
                          </div>
                        )}
                        {isNewTemplate(item.serial) ? <NewBadge /> : null}
                      </div>
                      <div className="px-2.5 py-2.5">
                        <p className="line-clamp-2 min-h-[26px] text-[10px] font-semibold leading-[13px] text-[#20283A] dark:text-[#E4EAF4]">
                          {label}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </section>
          )}
        </div>
      )}

      {designationModalPending && (
        <DesignationSelectModal
          designations={designationOptions}
          loading={designationLoading}
          onSelect={(designation) => {
            setDesignationModalPending(null);
            proceedWithTemplateSelection(designationModalPending, designation);
          }}
          onDismiss={() => {
            setDesignationModalPending(null);
            localStorage.removeItem("SelectedDesignation");
          }}
        />
      )}

      {profileModalPending && (
        <CreateProfileModal
          onConfirm={() => {
            setProfileModalPending(null);
            navigate("/mlmprofile");
          }}
          onDismiss={() => setProfileModalPending(null)}
        />
      )}

      {loading && templates?.length > 0 && (
        <div className="flex justify-center py-4">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-[#DCE4EF] border-t-[#2F80EA] dark:border-[#2A3548] dark:border-t-[#70AFFF]" />
        </div>
      )}
    </div>
  );
}

export default ListOfGenaraltemp;
