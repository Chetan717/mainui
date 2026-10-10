import Carosel from "./Homepage/Component/Carosel";
import Festival from "./Homepage/Component/Festival";
import ListOfGenaraltemp from "./Homepage/Component/ListOfGenaraltemp";
import React, {
  useEffect,
  useRef,
  useState,
  useCallback,
  useMemo,
} from "react";
import {
  fetchGeneralTemplates,
  clearTemplateCache,
  TEMPLATE_GROUP_COUNT,
} from "./Homepage/Component/Services/GeneralTemplateService";
import { clearTrendingCache } from "./Homepage/Component/Services/TTrend_templateService";
import { clearFestivalTemplateCache } from "./Homepage/Component/Services/Festival_template";
import { clearAllTemplateGraphicsCache } from "./Homepage/Component/Services/Alltemplateservice";
import { useGeneralData } from "../Context/GeneralContext";
import { useSelectedCompany } from "../Context/SelectedCompanyContext";
import {
  PAGE_REFRESH_EVENT,
  consumeRefreshAttempt,
  refreshLimitMessage,
} from "../utils/pageRefresh";
import { subscribeToCompanyTemplateInvalidation } from "../utils/companyTemplateState";
import {
  getHomeTemplateSearchText,
  getTemplateTypeDisplayName,
} from "./Homepage/Component/homeTemplatePresentation";
import { auth } from "../Firebase";
import { toast } from "@heroui/react";
import { useNavigate } from "react-router";
import {
  Banknote,
  Bell,
  Cake,
  ChevronDown,
  Gift,
  Heart,
  Medal,
  Monitor,
  PackageOpen,
  Moon,
  Search,
  Sparkles,
  Sun,
  Trophy,
  Volume2,
  X,
} from "lucide-react";
import { getUser, VERIFIED_USER_CHANGED_EVENT } from "../utils/authStorage";
import { MLM_PROFILE_CHANGED_EVENT } from "../utils/companyStorage";
import { RANK_PROMOTION_TYPES } from "../utils/templateTypeConfig";
import { EVERYDAY_MOMENTS_GROUP_KEY } from "../utils/everydayMoments";
import { HOME_CATEGORY_ITEMS, isEverydayCategory } from "./Homepage/Component/homeCategoryConfig";

const PULL_REFRESH_TRIGGER = 64;
const PULL_REFRESH_MAX = 96;
const PULL_REFRESH_ACTIVE_HEIGHT = 48;

const HOME_UI_TEMPLATE_TYPES = [
  "Today_Trending",
  "Latest_update",
  "Product",
  "Motivational",
  ...RANK_PROMOTION_TYPES,
  "Bonanza",
  "Domestic_Trip",
  "Welcome_Closing",
  "Training",
  "Meeting",
  "Achievements",
  "Income",
  "Anniversary_Birthday",
  "ThankYou_Banner_B",
  "ThankYou_Birthday_Anniversary",
  "Capping",
  "Good_Morning",
  "Sport",
  "Daily_Life",
  "Greeting_Wishes",
  "Health_Tips",
  "Devotional_Spiritual",
  "Leader_Quotes",
];

function getStoredUserName() {
  try {
    const mlmProfile = JSON.parse(sessionStorage.getItem("mlmProfile") || "{}");
    const appUser = getUser() || {};
    return mlmProfile?.fullName || mlmProfile?.name || appUser?.name || "";
  } catch {
    return getUser()?.name || "";
  }
}

function getStoredProfilePhoto() {
  try {
    const mlmProfile = JSON.parse(sessionStorage.getItem("mlmProfile") || "{}");
    const appUser = getUser() || {};
    return (
      mlmProfile?.profileImageURLs?.[0] ||
      mlmProfile?.profileImageURL ||
      mlmProfile?.photoURL ||
      appUser?.photoURL ||
      appUser?.profileImageURL ||
      ""
    );
  } catch {
    return "";
  }
}

const CATEGORY_ICON_BY_TYPE = {
  Today_Trending: Sparkles,
  Product: PackageOpen,
  Motivational: Volume2,
  Rank_Promotion: Trophy,
  Rank_Promotion_B: Medal,
  Bonanza: Gift,
  Domestic_Trip: Gift,
  Welcome_Closing: Trophy,
  Training: Monitor,
  Meeting: Monitor,
  General_Meeting: Monitor,
  Achievements: Medal,
  Anniversary_Birthday: Cake,
  Income: Banknote,
  ThankYou_Banner_B: Heart,
  ThankYou_Birthday_Anniversary: Heart,
  Capping: Sparkles,
};

const CATEGORY_LABEL_BY_TYPE = {
  Today_Trending: "Today Trending",
  Rank_Promotion: "Rank Promotion",
  Rank_Promotion_B: "Rank Promotion B",
  Domestic_Trip: "Domestic Trip",
  Welcome_Closing: "Welcome & Closing",
  General_Meeting: "General Meeting",
  Anniversary_Birthday: "Birthday & Anniversary",
  ThankYou_Banner_B: "Thank You Rank & Bonanza",
  ThankYou_Birthday_Anniversary: "Thank You Birthday & Anniversary",
};

const ALL_CATEGORIES = HOME_UI_TEMPLATE_TYPES.map((type) => ({
  type,
  label: CATEGORY_LABEL_BY_TYPE[type] || getTemplateTypeDisplayName(type),
  Icon: CATEGORY_ICON_BY_TYPE[type] || Sparkles,
}));

const TOP_CATEGORIES = ALL_CATEGORIES;

function SearchBar({ onClick, compact = false }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative flex w-full items-center border border-white/60 bg-white text-left shadow-[0_5px_16px_rgba(15,58,126,0.10)] transition-all duration-200 dark:border-[#33415A] dark:bg-[#172033] ${
        compact ? "h-[42px] rounded-[14px]" : "h-[42px] rounded-[16px]"
      }`}
      aria-label="Search templates"
    >
      <Search
        className={`pointer-events-none absolute text-[#8290A8] dark:text-[#A6B1C5] ${
          compact ? "left-3.5 h-[17px] w-[17px]" : "left-4 h-[19px] w-[19px]"
        }`}
        strokeWidth={2}
      />
      <span
        className={`font-medium text-[#8F9BB0] ${
          compact ? "pl-10 text-[13px]" : "pl-11 text-[14px]"
        }`}
      >
        Search templates
      </span>
    </button>
  );
}

function CategoryTickerLabel({ label }) {
  const shouldScroll = String(label || "").length > 10;

  if (!shouldScroll) {
    return (
      <span className="block w-full truncate text-[8px] font-medium leading-[10px] text-white/90">
        {label}
      </span>
    );
  }

  return (
    <span className="block w-full overflow-hidden text-[8px] font-medium leading-[10px] text-white/90">
      <span className="home-category-text-marquee flex w-max items-center whitespace-nowrap">
        <span className="pr-4">{label}</span>
        <span className="pr-4" aria-hidden="true">
          {label}
        </span>
      </span>
    </span>
  );
}

function HomeCategoryRail({ items, onOpen, compact = false }) {
  return (
    <div
      className={`grid transition-all duration-200 ease-out ${
        compact
          ? "grid-rows-[0fr] opacity-0 mt-0"
          : "grid-rows-[1fr] opacity-100 mt-2"
      }`}
      aria-hidden={compact}
    >
      <style>{`@keyframes homeCategoryTextMarquee {
        0%, 18% { transform: translateX(0); }
        82%, 100% { transform: translateX(-50%); }
      }
      .home-category-text-marquee { animation: homeCategoryTextMarquee 3s linear infinite; }
      @media (prefers-reduced-motion: reduce) {
        .home-category-text-marquee { animation: none; }
      }`}</style>
      <div className="min-h-0 overflow-hidden">
        <div className="hide-scrollbar scroll-gpu flex gap-1.5 overflow-x-auto px-0.5 pb-1 pt-1 scroll-smooth">
          {items.map(({ label, type, Icon }, index) => (
            <button
              data-home-category
              key={type}
              type="button"
              onClick={() => onOpen(type)}
              className="group flex w-[54px] shrink-0 flex-col items-center gap-1 rounded-[9px] px-0.5 py-0.5 text-center transition active:scale-[0.97]"
            >
              <span className="flex h-[27px] w-[27px] items-center justify-center rounded-[8px] border border-white/20 bg-white/10 text-white shadow-[0_3px_8px_rgba(8,54,126,0.08)] backdrop-blur-sm transition group-active:bg-white/20">
                <Icon className="h-[13px] w-[13px]" strokeWidth={1.8} />
              </span>
              <span className="w-[50px] overflow-hidden">
                <CategoryTickerLabel label={label} />
              </span>
              {index === 0 ? (
                <span className="h-[1.5px] w-5 rounded-full bg-white" />
              ) : (
                <span className="h-[1.5px] w-5 rounded-full bg-transparent" />
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function HomeHero({ onSearchClick, compact }) {
  const navigate = useNavigate();
  const [userName, setUserName] = useState(() => getStoredUserName());
  const [profilePhoto, setProfilePhoto] = useState(() =>
    getStoredProfilePhoto(),
  );

  useEffect(() => {
    const syncUser = () => {
      setUserName(getStoredUserName());
      setProfilePhoto(getStoredProfilePhoto());
    };
    window.addEventListener(MLM_PROFILE_CHANGED_EVENT, syncUser);
    window.addEventListener(VERIFIED_USER_CHANGED_EVENT, syncUser);
    return () => {
      window.removeEventListener(MLM_PROFILE_CHANGED_EVENT, syncUser);
      window.removeEventListener(VERIFIED_USER_CHANGED_EVENT, syncUser);
    };
  }, []);

  const initial = (userName || "M").trim().charAt(0).toUpperCase() || "M";

  return (
    <header
      className={`sticky  top-0 z-40 overflow-hidden bg-[linear-gradient(135deg,#2F80EA_0%,#236FDE_48%,#1454C5_100%)] text-white shadow-[0_5px_18px_rgba(26,75,148,0.10)] transition-all duration-200 ${
        compact ? "px-2 pb-3 pt-3" : "px-2 pb-4 pt-4"
      } md:px-4`}
    >
      <div className="pointer-events-none absolute -left-16 top-10 h-44 w-44 rounded-full bg-white/[0.045]" />
      <div className="pointer-events-none absolute -right-14 -top-20 h-48 w-48 rounded-full bg-[#0B52C7]/25" />

      <div className="relative mx-auto w-full max-w-7xl">
        <div className={`flex items-center ${compact ? "gap-2" : "gap-2.5"}`}>
          <button
            type="button"
            onClick={() => navigate("/profile")}
            aria-label="Open profile"
            className={`shrink-0 ml-1 overflow-hidden rounded-[15px] border-2 border-white/90 bg-white shadow-[0_5px_16px_rgba(7,53,131,0.18)] transition-all duration-200 ${
              compact ? "h-[42px] w-[42px]" : "h-[42px] w-[42px]"
            }`}
          >
            {profilePhoto ? (
              <img
                src={profilePhoto}
                alt={userName || "Profile"}
                className="h-full w-full object-contain"
              />
            ) : (
              <span
                className={`flex h-full w-full items-center justify-center font-bold text-[#F4B942] ${compact ? "text-[15px]" : "text-[18px]"}`}
              >
                {initial}
              </span>
            )}
          </button>

          <div className="w-full  flex-1">
            <SearchBar onClick={onSearchClick} compact={compact} />
          </div>
        </div>
      </div>
    </header>
  );
}

function HomeCategoriesSection({ items, onOpen, onSeeAll }) {
  return (
    <section className="mb-3 rounded-b-[18px] bg-[#F5F7FC] px-4 pb-2 pt-2.5 dark:bg-[#111827] md:px-6">
      <div className="mx-auto w-full max-w-7xl">
        <div className="mb-2 flex items-center justify-between gap-3">
          <h2 className="text-[15px] font-bold text-[#171D2B] dark:text-[#F8FAFC]">
            Categories
          </h2>
          <button
            type="button"
            onClick={onSeeAll}
            className="text-[11px] font-semibold text-[#0875F5] dark:text-[#70AFFF]"
          >
            See all
          </button>
        </div>

        <div className="hide-scrollbar -mx-1 overflow-x-auto px-1 pb-0.5 scroll-smooth">
          <div className="flex w-max min-w-full gap-4 pr-2">
            {items.map(({ type, label, Icon, ...item }) => (
              <button
                key={type}
                type="button"
                onClick={() => onOpen({ type, label, Icon, ...item })}
                className="flex w-[58px] shrink-0 flex-col items-center gap-1.5 text-center active:scale-[0.98]"
              >
                <span className="flex h-[42px] w-[42px] items-center justify-center rounded-full border border-[#E7ECF4] bg-white text-[#0875F5] shadow-[0_2px_8px_rgba(28,54,92,0.04)] dark:border-[#2A3548] dark:bg-[#1B2536] dark:text-[#70AFFF]">
                  <Icon className="h-[16px] w-[16px]" strokeWidth={1.9} />
                </span>
                <span className="w-[66px] truncate text-[10px] font-medium leading-[12px] text-[#5F6B80] dark:text-[#C4CDDB]">
                  {label}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function SectionHeader({ title, onSeeAll }) {
  return (
    <div className="mb-3 flex items-center justify-between gap-3">
      <h2 className="text-[13px] font-bold leading-5 text-[#161D2D] dark:text-white">
        {title}
      </h2>
      {onSeeAll ? (
        <button
          type="button"
          onClick={onSeeAll}
          className="shrink-0 text-[9px] font-semibold text-[#0875F5] dark:text-[#70AFFF]"
        >
          See all
        </button>
      ) : null}
    </div>
  );
}

function CategoryGrid({ items, onOpen, layout = "scroll" }) {
  const cards = items.map(({ label, type, Icon }) => (
    <button
      key={type}
      type="button"
      onClick={() => onOpen(type)}
      className={`flex flex-col items-center gap-2 text-center active:scale-[0.98] ${
        layout === "scroll" ? "w-[72px] shrink-0" : "w-full min-w-0"
      }`}
    >
      <span className="flex h-[50px] w-[50px] items-center justify-center rounded-full bg-white text-[#0875F5] shadow-[0_2px_10px_rgba(28,54,92,0.035)] dark:bg-[#171E2B] dark:text-[#70AFFF]">
        <Icon className="h-[18px] w-[18px]" strokeWidth={1.8} />
      </span>
      <span className="min-h-[22px] w-full max-w-[82px] text-[9px] font-medium leading-[11px] text-[#626D82] dark:text-[#B8C1D1]">
        {label}
      </span>
    </button>
  ));

  if (layout === "grid") {
    return (
      <div className="grid grid-cols-4 gap-x-2 gap-y-4 sm:grid-cols-5 md:grid-cols-8">
        {cards}
      </div>
    );
  }

  return (
    <div className="-mx-3 overflow-x-auto px-3 pb-1 hide-scrollbar scroll-gpu md:-mx-6 md:px-6">
      <div className="flex w-max min-w-full gap-4 pr-1">{cards}</div>
    </div>
  );
}

function ComingSoonCard() {
  return (
    <div className="mb-4 mt-6 rounded-[18px] border border-dashed border-[#DEE5EF] bg-transparent px-5 py-5 text-center dark:border-[#2A3445]">
      <div className="mx-auto flex h-9 w-9 items-center justify-center rounded-full bg-[#EAF3FF] text-[#0875F5] dark:bg-[#152B46] dark:text-[#70AFFF]">
        <Sparkles className="h-4 w-4" />
      </div>
      <h3 className="mt-3 text-[12px] font-semibold text-[#1A2232] dark:text-white">
        More templates coming soon
      </h3>
      <p className="mt-1 text-[9px] font-medium text-[#8A94A8] dark:text-[#8F9AAE]">
        New designs are added every week
      </p>
    </div>
  );
}

function Home() {
  const { selectedCompany, refreshCompany } = useSelectedCompany();
  const {
    cachedTemplates,
    setCachedTemplates,
    cachedGroupIndex,
    setCachedGroupIndex,
    setCachedFestivalData,
    setCachedTrending,
    templateDataVersion,
    setSelType,
  } = useGeneralData();
  const companyId = selectedCompany?.id || "";
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
  const [homeDataVersion, setHomeDataVersion] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [pullDistance, setPullDistance] = useState(0);
  const [pullRefreshing, setPullRefreshing] = useState(false);
  const [homeHeaderCompact, setHomeHeaderCompact] = useState(false);
  const homeRootRef = useRef(null);
  const loadingRef = useRef(false);
  const groupIndexRef = useRef(cachedGroupIndex);
  const loadTemplatesRef = useRef(null);
  const activeLoadTokenRef = useRef(null);
  const activeCompanyIdRef = useRef(companyId);
  const pullStartYRef = useRef(0);
  const pullStartXRef = useRef(0);
  const pullDistanceRef = useRef(0);
  const isPullingRef = useRef(false);
  activeCompanyIdRef.current = companyId;

  const loadTemplates = useCallback(async () => {
    if (
      !companyId ||
      loadingRef.current ||
      groupIndexRef.current >= TEMPLATE_GROUP_COUNT
    )
      return;

    const groupIndex = groupIndexRef.current;
    const loadToken = Symbol("home-template-load");
    activeLoadTokenRef.current = loadToken;
    loadingRef.current = true;
    setLoading(true);

    try {
      const data = await fetchGeneralTemplates(groupIndex, companyId);
      if (
        activeLoadTokenRef.current !== loadToken ||
        activeCompanyIdRef.current !== companyId
      ) {
        return;
      }

      setCachedTemplates((prev) => {
        const existingTypes = new Set(prev.map((g) => g.type));
        return [...prev, ...data.filter((g) => !existingTypes.has(g.type))];
      });

      groupIndexRef.current = groupIndex + 1;
      setCachedGroupIndex(groupIndexRef.current);
    } finally {
      if (activeLoadTokenRef.current === loadToken) {
        activeLoadTokenRef.current = null;
        loadingRef.current = false;
        setLoading(false);
      }
    }
  }, [companyId, setCachedTemplates, setCachedGroupIndex]);

  useEffect(() => {
    loadTemplatesRef.current = loadTemplates;
  }, [loadTemplates]);

  useEffect(() => {
    groupIndexRef.current = cachedGroupIndex;

    if (companyId && cachedTemplates.length === 0) loadTemplates();
  }, [cachedGroupIndex, cachedTemplates.length, companyId, loadTemplates]);

  useEffect(() => {
    const cancelObsoleteCompanyLoad = () => {
      // Ref updates are immediate, so a request for the previous company is
      // rejected even before React finishes rendering the new selection.
      activeLoadTokenRef.current = null;
      loadingRef.current = false;
      groupIndexRef.current = 0;
      setLoading(false);
      setSearchQuery("");
    };

    return subscribeToCompanyTemplateInvalidation(cancelObsoleteCompanyLoad);
  }, []);

  const refreshHomeData = useCallback(async () => {
    if (loadingRef.current) return;

    const loadToken = Symbol("home-template-refresh");
    activeLoadTokenRef.current = loadToken;
    loadingRef.current = true;
    setLoading(true);
    clearTemplateCache();
    clearTrendingCache();
    clearFestivalTemplateCache();
    clearAllTemplateGraphicsCache();
    setCachedTemplates([]);
    setCachedGroupIndex(0);
    setCachedFestivalData({});
    setCachedTrending(null);
    groupIndexRef.current = 0;

    // Remount the independently-loaded carousel and festival sections so they
    // perform the same fresh reads they perform when Home first opens.
    setHomeDataVersion((version) => version + 1);

    try {
      const company = await refreshCompany();
      const refreshedCompanyId = company?.id || "";
      if (
        !refreshedCompanyId ||
        activeLoadTokenRef.current !== loadToken ||
        activeCompanyIdRef.current !== refreshedCompanyId
      ) {
        return;
      }

      const data = await fetchGeneralTemplates(0, refreshedCompanyId);
      if (
        activeLoadTokenRef.current !== loadToken ||
        activeCompanyIdRef.current !== refreshedCompanyId
      ) {
        return;
      }
      setCachedTemplates(data);
      groupIndexRef.current = 1;
      setCachedGroupIndex(1);
    } finally {
      if (activeLoadTokenRef.current === loadToken) {
        activeLoadTokenRef.current = null;
        loadingRef.current = false;
        setLoading(false);
      }
    }
  }, [
    setCachedFestivalData,
    setCachedGroupIndex,
    setCachedTemplates,
    setCachedTrending,
    refreshCompany,
  ]);

  const runPullRefresh = useCallback(async () => {
    if (pullRefreshing || loadingRef.current) {
      pullDistanceRef.current = 0;
      setPullDistance(0);
      return;
    }

    const limit = consumeRefreshAttempt(auth.currentUser?.uid);
    if (!limit.allowed) {
      pullDistanceRef.current = 0;
      setPullDistance(0);
      toast.warning(refreshLimitMessage(limit.retryAfterMs));
      return;
    }

    setPullRefreshing(true);
    pullDistanceRef.current = PULL_REFRESH_ACTIVE_HEIGHT;
    setPullDistance(PULL_REFRESH_ACTIVE_HEIGHT);

    try {
      await refreshHomeData();
    } catch {
      toast.danger("Refresh failed. Please try again.");
    } finally {
      pullDistanceRef.current = 0;
      setPullDistance(0);
      setPullRefreshing(false);
    }
  }, [pullRefreshing, refreshHomeData]);

  useEffect(() => {
    const handlePageRefresh = (event) => {
      if (event.detail?.target !== "home") return;
      event.detail.handled = true;
      refreshHomeData()
        .then(() => event.detail?.complete?.())
        .catch((error) => event.detail?.complete?.(error));
    };

    window.addEventListener(PAGE_REFRESH_EVENT, handlePageRefresh);
    return () =>
      window.removeEventListener(PAGE_REFRESH_EVENT, handlePageRefresh);
  }, [refreshHomeData]);

  useEffect(() => {
    const scrollEl = homeRootRef.current?.closest(".mlm-main-scroll-container");
    if (!scrollEl) return;

    const resetPull = () => {
      isPullingRef.current = false;
      pullDistanceRef.current = 0;
      setPullDistance(0);
    };

    const handleTouchStart = (event) => {
      const touch = event.touches?.[0];
      if (
        !touch ||
        pullRefreshing ||
        loadingRef.current ||
        scrollEl.scrollTop > 1 ||
        event.target?.closest?.(
          "input, textarea, select, [contenteditable='true']",
        )
      ) {
        isPullingRef.current = false;
        return;
      }

      pullStartYRef.current = touch.clientY;
      pullStartXRef.current = touch.clientX;
      pullDistanceRef.current = 0;
      isPullingRef.current = true;
    };

    const handleTouchMove = (event) => {
      if (!isPullingRef.current) return;
      const touch = event.touches?.[0];
      if (!touch || scrollEl.scrollTop > 1) {
        resetPull();
        return;
      }

      const deltaY = touch.clientY - pullStartYRef.current;
      const deltaX = touch.clientX - pullStartXRef.current;
      if (deltaY <= 0) {
        pullDistanceRef.current = 0;
        setPullDistance(0);
        return;
      }
      if (Math.abs(deltaX) > deltaY) {
        resetPull();
        return;
      }

      event.preventDefault();
      const easedDistance = Math.min(PULL_REFRESH_MAX, deltaY * 0.55);
      pullDistanceRef.current = easedDistance;
      setPullDistance(easedDistance);
    };

    const handleTouchEnd = () => {
      if (!isPullingRef.current) return;
      const shouldRefresh = pullDistanceRef.current >= PULL_REFRESH_TRIGGER;
      isPullingRef.current = false;

      if (shouldRefresh) {
        void runPullRefresh();
      } else {
        pullDistanceRef.current = 0;
        setPullDistance(0);
      }
    };

    scrollEl.addEventListener("touchstart", handleTouchStart, {
      passive: true,
    });
    scrollEl.addEventListener("touchmove", handleTouchMove, {
      passive: false,
    });
    scrollEl.addEventListener("touchend", handleTouchEnd, { passive: true });
    scrollEl.addEventListener("touchcancel", resetPull, { passive: true });

    return () => {
      scrollEl.removeEventListener("touchstart", handleTouchStart);
      scrollEl.removeEventListener("touchmove", handleTouchMove);
      scrollEl.removeEventListener("touchend", handleTouchEnd);
      scrollEl.removeEventListener("touchcancel", resetPull);
    };
  }, [pullRefreshing, runPullRefresh]);

  useEffect(() => {
    const scrollEl = homeRootRef.current?.closest(".mlm-main-scroll-container");
    if (!scrollEl) return;

    const syncHeader = () => {
      const top = scrollEl.scrollTop;
      setHomeHeaderCompact((current) => (current ? top > 18 : top > 64));
    };

    syncHeader();
    scrollEl.addEventListener("scroll", syncHeader, { passive: true });
    return () => scrollEl.removeEventListener("scroll", syncHeader);
  }, []);

  useEffect(() => {
    const scrollEl = document.querySelector(".mlm-main-scroll-container");
    if (!scrollEl) return;

    const handleScroll = () => {
      if (groupIndexRef.current >= TEMPLATE_GROUP_COUNT || loadingRef.current)
        return;
      const { scrollTop, scrollHeight, clientHeight } = scrollEl;
      if (scrollHeight - scrollTop <= clientHeight + 200) {
        loadTemplatesRef.current();
      }
    };

    scrollEl.addEventListener("scroll", handleScroll);
    return () => scrollEl.removeEventListener("scroll", handleScroll);
  }, []);

  const selectedProfileGlob = useMemo(() => {
    try {
      return JSON.parse(sessionStorage.getItem("mlmProfile") || "{}");
    } catch {
      return {};
    }
  }, []);


  const openCategory = useCallback(
    (type) => {
      const group = cachedTemplates.find((entry) => entry?.type === type);
      const first = group?.templates?.[0];
      const selection = {
        MainType: first?.MainType || "General",
        type,
        id: first?.id || "",
        serial: first?.serial || 0,
        ShowCaseForm: first?.ShowCaseForm,
        Subtype: first?.Subtype || "",
      };
      setSelType(selection);
      try {
        localStorage.setItem("selType", JSON.stringify(selection));
      } catch {}
      navigate("/alltemp");
    },
    [cachedTemplates, navigate, setSelType],
  );

  const openCategoryItem = useCallback(
    (item) => {
      if (isEverydayCategory(item)) {
        navigate(`/alltemp?group=${encodeURIComponent(EVERYDAY_MOMENTS_GROUP_KEY)}`);
        return;
      }
      openCategory(item.type);
    },
    [navigate, openCategory],
  );

  const pullIndicatorHeight = pullRefreshing
    ? PULL_REFRESH_ACTIVE_HEIGHT
    : pullDistance;
  const pullLabel = pullRefreshing
    ? "Refreshing..."
    : pullDistance >= PULL_REFRESH_TRIGGER
      ? "Release to refresh"
      : "Pull to refresh";

  return (
    <div
      ref={homeRootRef}
      className="flex min-h-full w-full flex-col bg-[#F5F7FC] dark:bg-[#0B0F19]"
    >
      <HomeHero
        onSearchClick={() => navigate("/search")}
        compact={homeHeaderCompact}
      />

      <a
        href="https://wa.me/919341947815"
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Contact customer care on WhatsApp"
        title="Contact us on WhatsApp"
        className="fixed right-3 z-[60] flex h-[52px] w-[52px] items-center justify-center rounded-full bg-[#25D366] text-white shadow-[0_8px_24px_rgba(37,211,102,0.38)] transition-transform duration-150 active:scale-95 md:hidden"
        style={{ bottom: "calc(env(safe-area-inset-bottom) + 70px)" }}
      >
        <span className="pointer-events-none absolute inset-0 rounded-full ring-1 ring-white/25" />
        <svg
          aria-hidden="true"
          viewBox="0 0 32 32"
          className="relative h-[29px] w-[29px] fill-white"
        >
          <path d="M19.11 17.2c-.27-.14-1.6-.79-1.85-.88-.25-.09-.43-.14-.61.14-.18.27-.7.88-.86 1.06-.16.18-.32.2-.59.07-.27-.14-1.15-.42-2.19-1.35-.81-.72-1.36-1.61-1.52-1.88-.16-.27-.02-.42.12-.55.12-.12.27-.32.41-.48.14-.16.18-.27.27-.45.09-.18.05-.34-.02-.48-.07-.14-.61-1.47-.84-2.01-.22-.53-.45-.46-.61-.47h-.52c-.18 0-.48.07-.73.34-.25.27-.95.93-.95 2.26 0 1.33.98 2.62 1.11 2.8.14.18 1.92 2.93 4.65 4.11.65.28 1.16.45 1.55.57.65.21 1.24.18 1.71.11.52-.08 1.6-.65 1.83-1.29.23-.63.23-1.18.16-1.29-.07-.12-.25-.18-.52-.32Z" />
          <path d="M16.04 3.2c-7.04 0-12.76 5.72-12.76 12.76 0 2.25.59 4.45 1.71 6.38L3.2 28.8l6.61-1.73a12.7 12.7 0 0 0 6.22 1.58h.01c7.03 0 12.76-5.72 12.76-12.76 0-3.41-1.33-6.61-3.74-9.02A12.67 12.67 0 0 0 16.04 3.2Zm0 23.29h-.01a10.56 10.56 0 0 1-5.38-1.47l-.39-.23-3.92 1.03 1.05-3.82-.25-.39a10.58 10.58 0 1 1 8.9 4.88Z" />
        </svg>
      </a>

      <div
        className="flex w-full shrink-0 items-center justify-center overflow-hidden text-[10px] font-medium text-[#7F899D] dark:text-[#AAB4C5]"
        style={{
          height: `${pullIndicatorHeight}px`,
          opacity: pullRefreshing || pullDistance > 8 ? 1 : 0,
          transition:
            pullRefreshing || pullDistance === 0
              ? "height 180ms ease, opacity 160ms ease"
              : "none",
        }}
        aria-live="polite"
        aria-hidden={!pullRefreshing && pullDistance <= 8}
      >
        <div className="flex items-center gap-2">
          <span
            className={`h-3.5 w-3.5 rounded-full border-2 border-[#2F80EA]/20 border-t-[#2F80EA] ${
              pullRefreshing ? "animate-spin" : ""
            }`}
            style={
              pullRefreshing
                ? undefined
                : {
                    transform: `rotate(${Math.min(
                      270,
                      (pullDistance / PULL_REFRESH_TRIGGER) * 270,
                    )}deg)`,
                  }
            }
          />
          <span>{pullLabel}</span>
        </div>
      </div>

      <HomeCategoriesSection
        items={HOME_CATEGORY_ITEMS}
        onOpen={openCategoryItem}
        onSeeAll={() => navigate("/categories")}
      />

      <main className="mx-auto w-full max-w-7xl px-3 pb-7 pt-0 md:px-6">
        <section
          id="today-for-you"
          className="mb-[17px] scroll-mt-3"
          data-guide="home-carousel"
        >
          <Carosel
            key={`carousel-${companyId}-${templateDataVersion}-${homeDataVersion}`}
          />
        </section>

        <section className="mb-[17px]" data-guide="home-templates">
          <Festival
            key={`festival-${companyId}-${templateDataVersion}-${homeDataVersion}`}
          />
        </section>

        <section className="w-full">
          <ListOfGenaraltemp
            templates={cachedTemplates}
            loading={loading}
            searchQuery=""
            companyName={selectedProfileGlob?.companyName || ""}
          />
        </section>

        <ComingSoonCard />
      </main>
    </div>
  );
}

export default Home;
