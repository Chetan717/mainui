import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { collection, query, where, getDocs, doc, getDoc } from "firebase/firestore";
import { db } from "@firebase-config";
import { COLLECTIONS } from "../../../collections";
import genaral_template_json from "../../Homepage/Component/Services/genaral_template_firestore_data.json";
import { PAGE_REFRESH_EVENT } from "../../../utils/pageRefresh";
import { useSelectedCompany } from "../../../Context/SelectedCompanyContext";
import {
  AllTemplateGraphicsService,
  clearAllTemplateGraphicsCache,
} from "../../Homepage/Component/Services/Alltemplateservice";
import {
  EDITOR_TEMPLATE_SEED_KEY,
  getEditorGraphicSelectionKey,
} from "../../../utils/editorTemplateSelection";
import {
  findEditorItemBySelectionKey,
  getGeneralItemsForEditor,
  isEditorTemplateSeedForSelection,
  normalizeEditorTemplateFilter,
  prepareEditorItemsForSelection,
} from "../../../utils/editorTemplateList";
import {
  filterEverydayMomentItems,
  getEverydayMomentSubtypeKey,
  getEverydayMomentSubtypeOptions,
  groupEverydayMomentItemsBySubtype,
  isEverydayMomentType,
} from "../../../utils/everydayMoments";

const BATCH_SIZE = 20;

const PRESET_VIDEO_ITEMS = [];
const _editorTemplateCache = new Map();
const _preloadedCanvasAssets = new Set();
const _preloadingCanvasAssets = new Set();

function getCanvasAssetUrl(item) {
  return item?.url || item?.backgroundVideoUrl || item?.videoUrl || "";
}

function preloadCanvasAsset(item) {
  const src = getCanvasAssetUrl(item);
  if (
    !src ||
    item?.backgroundVideoUrl ||
    _preloadedCanvasAssets.has(src) ||
    _preloadingCanvasAssets.has(src)
  ) {
    return;
  }

  _preloadingCanvasAssets.add(src);
  const image = new window.Image();
  image.crossOrigin = "anonymous";
  image.decoding = "async";
  image.onload = () => {
    _preloadingCanvasAssets.delete(src);
    _preloadedCanvasAssets.add(src);
  };
  image.onerror = () => _preloadingCanvasAssets.delete(src);
  image.src = src;
}

function readEditorTemplateSeed({ type, subType, mainType, companyId }) {
  try {
    const raw = sessionStorage.getItem(EDITOR_TEMPLATE_SEED_KEY);
    if (!raw) return { items: [], selectedGraphicKey: "" };
    const seed = JSON.parse(raw);
    const sameSelection = isEditorTemplateSeedForSelection(seed, {
      type,
      subType,
      mainType,
      companyId,
    });

    if (!sameSelection || !Array.isArray(seed?.items)) {
      return { items: [], selectedGraphicKey: "" };
    }

    return {
      selectedGraphicKey: seed.selectedGraphicKey || "",
      items: seed.items.filter(Boolean).map((item) => ({
        ...item,
        _template: {
          id: seed.templateId || "",
          serial: seed.serial || 0,
          MainType: seed.templateMainType || seed.mainType || "",
          SelectType: seed.templateType || seed.type || "",
          type: seed.templateType || seed.type || "",
          Subtype: seed.templateSubType || seed.subType || "",
        },
      })),
    };
  } catch {
    return { items: [], selectedGraphicKey: "" };
  }
}

const SHIMMER_STYLE = `@keyframes shimmerSlide {
  0%   { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
}`;
const _shimmerStyleEl = (() => {
  if (typeof document === "undefined") return null;
  const el = document.createElement("style");
  el.textContent = SHIMMER_STYLE;
  document.head.appendChild(el);
  return el;
})();

function getSelType() {
  try {
    return JSON.parse(localStorage.getItem("selType")) || {};
  } catch {
    return {};
  }
}
function getMeetingHostMode() {
  try {
    const savedMeeting = localStorage.getItem("Meeting");
    const meetingData = savedMeeting ? JSON.parse(savedMeeting) : null;
    return meetingData?.hostMode || "";
  } catch {
    return "";
  }
}

function getCloseFilter() {
  try {
    return localStorage.getItem("close_filter") || "SP";
  } catch {
    return "SP";
  }
}

function cleanItem(item) {
  if (!item) return null;
  const { _template, ...clean } = item;
  return clean;
}

const SHIMMER_BG = {
  background: "linear-gradient(90deg,#e8e8e8 25%,#f5f5f5 37%,#e8e8e8 63%)",
  backgroundSize: "400% 100%",
  animation: "shimmerSlide 1.2s ease infinite",
};

function LazyImage({ src, alt }) {
  const wrapperRef = useRef(null);
  const [realSrc, setRealSrc] = useState(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setRealSrc(src);
          observer.disconnect();
        }
      },
      { rootMargin: "200px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [src]);

  return (
    <div
      ref={wrapperRef}
      className="absolute inset-0 w-full h-full overflow-hidden"
    >
      {!loaded && (
        <div className="absolute inset-0 bg-muted/40" style={SHIMMER_BG} />
      )}
      {realSrc && (
        <img
          src={realSrc}
          alt={alt}
          onLoad={() => setLoaded(true)}
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-200 ${
            loaded ? "opacity-100" : "opacity-0"
          }`}
        />
      )}
    </div>
  );
}

function LazyVideo({ src }) {
  const wrapperRef = useRef(null);
  const videoRef = useRef(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => setIsVisible(entry.isIntersecting),
      { rootMargin: "150px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !src) return;

    if (isVisible) {
      if (video.src !== src) video.src = src;
      const playPromise = video.play();
      if (playPromise && typeof playPromise.catch === "function") {
        playPromise.catch(() => {});
      }
    } else {
      video.pause();
      video.removeAttribute("src");
      video.load();
    }
  }, [isVisible, src]);

  return (
    <div ref={wrapperRef} className="absolute inset-0 w-full h-full">
      <video
        ref={videoRef}
        loop
        muted
        playsInline
        preload="none"
        className="absolute inset-0 w-full h-full object-cover"
      />
    </div>
  );
}

function EmptyState({ label, sublabel = "" }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 gap-3 text-muted-foreground">
      <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
        <rect
          x="3"
          y="3"
          width="30"
          height="30"
          rx="7"
          stroke="currentColor"
          strokeWidth="1.4"
          strokeDasharray="4 3"
        />
        <path
          d="M12 18h12M18 12v12"
          stroke="currentColor"
          strokeWidth="1.4"
          strokeLinecap="round"
        />
      </svg>
      <div className="text-center">
        <p className="text-xs font-semibold text-foreground/80">{label}</p>
        {sublabel ? (
          <p className="mt-1 text-[10px] font-medium text-muted-foreground">{sublabel}</p>
        ) : null}
      </div>
    </div>
  );
}

const LOADING_ITEMS = Array.from({ length: 12 }, (_, i) => i);

function LoadingGrid() {
  return (
    <div className="grid grid-cols-4 gap-2 sm:grid-cols-5 md:grid-cols-6">
      {LOADING_ITEMS.map((i) => (
        <div
          key={i}
          className="aspect-square rounded-xl overflow-hidden"
          style={{
            background:
              "linear-gradient(90deg,#e8e8e8 25%,#f5f5f5 37%,#e8e8e8 63%)",
            backgroundSize: "400% 100%",
            animation: `shimmerSlide 1.2s ease infinite`,
            animationDelay: `${i * 50}ms`,
          }}
        />
      ))}
    </div>
  );
}

function Tile({ item, isSelected, onSelect, isVideo }) {
  return (
    <button
      type="button"
      onPointerEnter={() => preloadCanvasAsset(item)}
      onPointerDown={() => preloadCanvasAsset(item)}
      onClick={() => onSelect(item)}
      className={`relative aspect-square overflow-hidden rounded-[14px] border-2 bg-[#edf1f7] dark:bg-[#1b2536] transition-all duration-150 focus:outline-none ${
        isSelected
          ? "border-[#2F80EA] shadow-[0_6px_16px_rgba(44,115,232,0.15)]"
          : "border-transparent hover:border-[#9ec3ff]"
      }`}
    >
      {isVideo && (item.backgroundVideoUrl || item.backgroundVideoUrl) ? (
        <LazyVideo src={item.backgroundVideoUrl || item.backgroundVideoUrl} />
      ) : item.suggestionImage ? (
        <LazyImage src={item.suggestionImage} alt="template" />
      ) : (
        <div className="w-full h-full bg-[#eaf0f8] dark:bg-[#223047] flex items-center justify-center">
          <svg
            width="18"
            height="18"
            viewBox="0 0 20 20"
            fill="none"
            className="text-[#9ec0f8]"
          >
            <rect
              x="2"
              y="2"
              width="16"
              height="16"
              rx="4"
              stroke="currentColor"
              strokeWidth="1.2"
            />
            <path
              d="M2 13l4-4 3 3 3-4 6 6"
              stroke="currentColor"
              strokeWidth="1.2"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      )}

      {isVideo && (
        <div className="absolute bottom-1 left-1 bg-black/60 backdrop-blur-sm rounded px-1 py-0.5">
          <svg width="8" height="8" viewBox="0 0 24 24" fill="white">
            <path d="M5 3l14 9-14 9V3z" />
          </svg>
        </div>
      )}

      {isSelected && (
        <div className="absolute right-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-[#2F80EA] shadow">
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
            <polyline
              points="1.5,5 4,7.5 8.5,2.5"
              stroke="white"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      )}
    </button>
  );
}

function TabBtn({ active, onClick, icon, label, count }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex flex-1 items-center justify-center gap-1.5 rounded-[14px] px-3 py-2 text-[12px] font-semibold transition-all duration-200 ${
        active
          ? "bg-white dark:bg-[#151d2b] text-[#111827] dark:text-white shadow-sm"
          : "text-[#667085] dark:text-[#b9c5d8] hover:text-[#2F80EA]"
      }`}
    >
      {icon}
      {label}
      {count != null && (
        <span
          className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${active ? "bg-[#d9e7ff] text-[#2F80EA]" : "bg-white/70 dark:bg-[#223047] text-[#667085] dark:text-[#b9c5d8]"}`}
        >
          {count}
        </span>
      )}
    </button>
  );
}

export default function ListOfTemplates({
  selected,
  setSelected,
  onTabChange,
}) {
  const { selectedCompany } = useSelectedCompany();
  const selType = getSelType();
  const filterCompany = normalizeEditorTemplateFilter(selectedCompany?.id);
  const filterType = normalizeEditorTemplateFilter(selType?.type);
  const rawFilterSubType = selType?.Subtype || "";
  const filterSubType = normalizeEditorTemplateFilter(selType?.Subtype);
  const filterCompanyId = filterCompany;
  const isEverydayMoments = isEverydayMomentType(filterType);

  const [allItems, setAllItems] = useState([]);
  const [visibleItems, setVisibleItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState("image");
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [categoryKey, setCategoryKey] = useState(() =>
    isEverydayMoments && filterSubType
      ? getEverydayMomentSubtypeKey(filterSubType)
      : "",
  );
  const [refreshRequestId, setRefreshRequestId] = useState(0);

  const [pendingSelectedKey, setPendingSelectedKey] = useState(null);
  const [meetingHostMode, setMeetingHostMode] = useState(() => getMeetingHostMode());
  const [closeFilter, setCloseFilter] = useState(() => getCloseFilter());

  const sentinelRef = useRef(null);
  const renderedCount = useRef(0);
  const refreshSequenceRef = useRef(0);
  const pendingRefreshRef = useRef(null);
  const selectedRef = useRef(selected);
  const selectedKeyRef = useRef("");
  const selectionScopeRef = useRef("");

  useEffect(() => {
    selectedRef.current = selected;
  }, [selected]);

  useEffect(() => {
    setCategoryOpen(false);
    setCategoryKey(
      isEverydayMoments && filterSubType
        ? getEverydayMomentSubtypeKey(filterSubType)
        : "",
    );
  }, [filterSubType, filterType, isEverydayMoments]);

  useEffect(() => {
    const handlePageRefresh = (event) => {
      if (event.detail?.target !== "editor-templates") return;
      event.detail.handled = true;

      _editorTemplateCache.clear();
      clearAllTemplateGraphicsCache();
      refreshSequenceRef.current += 1;
      const id = refreshSequenceRef.current;
      pendingRefreshRef.current = {
        id,
        complete: event.detail?.complete,
      };
      setLoading(true);
      setRefreshRequestId(id);
    };

    window.addEventListener(PAGE_REFRESH_EVENT, handlePageRefresh);
    return () => window.removeEventListener(PAGE_REFRESH_EVENT, handlePageRefresh);
  }, []);

  useEffect(() => {
    const handleStorage = (e) => {
      if (e.key === "Meeting") {
        setMeetingHostMode(getMeetingHostMode());
      }
      if (e.key === "close_filter") {
        setCloseFilter(getCloseFilter());
      }
    };
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  useEffect(() => {
    const finishRequestedRefresh = (error) => {
      if (pendingRefreshRef.current?.id !== refreshRequestId) return;
      const complete = pendingRefreshRef.current.complete;
      pendingRefreshRef.current = null;
      complete?.(error);
    };

    if (!filterType) {
      setLoading(false);
      finishRequestedRefresh();
      return;
    }

    async function fetchTemplates() {
      const mainTypeLower = String(selType?.MainType || "")
        .trim()
        .toLowerCase();

      const isGeneralTemplate =
        mainTypeLower === "general" || mainTypeLower === "genaral";
      const fetchSubType = isEverydayMoments ? "" : filterSubType;

      const editorSeed = readEditorTemplateSeed({
        type: filterType,
        subType: filterSubType,
        mainType: selType?.MainType,
        companyId: filterCompanyId,
      });
      const seededItems = editorSeed.items;
      const requestedSelectionKey =
        editorSeed.selectedGraphicKey || selType?.selectedGraphicKey || "";
      const selectionScope = `${filterType}__${filterSubType}__${selType?.MainType || ""}__${filterCompanyId}`;

      if (selectionScopeRef.current !== selectionScope) {
        selectionScopeRef.current = selectionScope;
        selectedKeyRef.current = requestedSelectionKey;
        setPendingSelectedKey(requestedSelectionKey || null);
      }

      if (seededItems.length > 0) {
        setAllItems(seededItems);
        renderedCount.current = Math.min(BATCH_SIZE, seededItems.length);
        setVisibleItems(seededItems.slice(0, BATCH_SIZE));

        const seededDefault =
          findEditorItemBySelectionKey(
            seededItems,
            selectedKeyRef.current || requestedSelectionKey,
          ) ||
          seededItems.find((item) => !item.backgroundVideoUrl) ||
          seededItems[0];
        const nextSeeded = cleanItem(seededDefault);
        const nextSeededKey = getEditorGraphicSelectionKey(seededDefault);
        selectedRef.current = nextSeeded;
        selectedKeyRef.current = nextSeededKey;
        setSelected(nextSeeded);
        setPendingSelectedKey(nextSeededKey || null);
        if (seededDefault?.backgroundVideoUrl) setActiveTab("video");
        setLoading(false);
      }

      // Festival cards already carry the selected template's GraphicsLink from
      // the six-day Home query. Do not query the whole Festival collection in
      // the editor. This keeps the editor scoped to one festival card and
      // avoids hundreds/thousands of unrelated graphics and Firestore reads.
      if (filterType === "Festival" && seededItems.length > 0) {
        const festivalCacheKey = `${filterType}__${filterSubType}__FestivalSelected__${filterCompanyId}__${meetingHostMode}__${closeFilter}__${selType?.id || ""}`;
        _editorTemplateCache.set(festivalCacheKey, [...seededItems]);
        finishRequestedRefresh();
        return;
      }

      const cacheSource = isEverydayMoments
        ? "EverydayAll"
        : isGeneralTemplate
          ? "General"
          : "MLM";
      const cacheSelectionId = filterType === "Festival" ? selType?.id || "" : "";
      const cacheKey = `${filterType}__${fetchSubType}__${cacheSource}__${filterCompanyId}__${meetingHostMode}__${closeFilter}__${cacheSelectionId}`;

      if (_editorTemplateCache?.has(cacheKey)) {
        const cachedItems = _editorTemplateCache.get(cacheKey);
        const preferredSelectionKey =
          selectedKeyRef.current || requestedSelectionKey;
        const filteredItems = prepareEditorItemsForSelection(
          cachedItems,
          preferredSelectionKey,
          seededItems,
          seededItems,
        );
        setAllItems(filteredItems);
        renderedCount.current = 0;

        const currentSelectedItem =
          findEditorItemBySelectionKey(filteredItems, preferredSelectionKey) ||
          filteredItems.find((i) => i.id === selectedRef.current?.id);
        const defaultItem =
          currentSelectedItem ||
          filteredItems.find((i) => !i.backgroundVideoUrl) ||
          filteredItems[0] ||
          null;

        const nextSelected = defaultItem ? cleanItem(defaultItem) : null;
        const nextSelectedKey = getEditorGraphicSelectionKey(defaultItem);
        selectedRef.current = nextSelected;
        selectedKeyRef.current = nextSelectedKey;
        setSelected(nextSelected);
        setPendingSelectedKey(nextSelectedKey || null);
        if (defaultItem?.backgroundVideoUrl) setActiveTab("video");

        const firstBatch = filteredItems.slice(0, BATCH_SIZE);
        setVisibleItems(firstBatch);
        renderedCount.current = firstBatch.length;
        setLoading(false);
        finishRequestedRefresh();
        return;
      }

      if (seededItems.length === 0) setLoading(true);
      setError(null);
      try {
        let items = [];

        if (isEverydayMoments) {
          const everydayTemplates = await AllTemplateGraphicsService(
            filterType,
            filterCompanyId,
          );
          items = everydayTemplates.flatMap((template) => {
            const graphics = Array.isArray(template?.GraphicsLink)
              ? template.GraphicsLink.filter(Boolean)
              : [];
            return graphics.map((graphic) => ({
              ...graphic,
              _template: template,
            }));
          });
        } else if (isGeneralTemplate) {
          if (filterType === "Festival") {
            // Festival editor must show only the festival card the user tapped.
            // Prefer bundled JSON (0 Firestore reads). If the app bundle is
            // older than a newly-added festival, fall back to one document read
            // by id instead of querying the complete Festival collection.
            let template = selType?.id
              ? genaral_template_json?.data?.[selType.id] || null
              : null;

            if (!template && selType?.id) {
              const snap = await getDoc(
                doc(db, COLLECTIONS.MLMTEMPLATE, String(selType.id)),
              );
              if (snap.exists()) {
                template = { id: snap.id, ...snap.data() };
              }
            } else if (template) {
              template = { id: selType.id, ...template };
            }

            if (
              template &&
              String(template.MainType || "").trim().toLowerCase() === "general" &&
              template.SelectType === "Festival" &&
              template.Active === true &&
              template.Launched === true
            ) {
              (template.GraphicsLink || []).filter(Boolean).forEach((graphic) => {
                items.push({ ...graphic, _template: template });
              });
            }
          } else if (filterType === "Domestic_Trip" || filterType === "Latest_update") {
            const snap = await getDocs(
              query(
                collection(db, COLLECTIONS.MLMTEMPLATE),
                where("SelectType", "==", filterType),
                where("MainType", "==", "General"),
                where("Active", "==", true),
                where("Launched", "==", true),
              ),
            );
            snap.forEach((docSnap) => {
              const template = { id: docSnap.id, ...docSnap.data() };
              if (
                template.MainType !== "General" ||
                template.Active !== true ||
                template.Launched !== true ||
                (fetchSubType && String(template.Subtype || "").trim() !== String(fetchSubType).trim())
              ) {
                return;
              }
              (template.GraphicsLink || []).forEach((graphic) => {
                items.push({ ...graphic, _template: template });
              });
            });
          } else {
            items = getGeneralItemsForEditor(
              genaral_template_json,
              filterType,
              fetchSubType,
            );
          }
        } else {
          const constraints = [
            where("SelectType", "==", filterType),
            where("Active", "==", true),
          ];

          if (rawFilterSubType && rawFilterSubType !== "") {
            constraints.splice(
              1,
              0,
              where("Subtype", "==", rawFilterSubType),
            );
          }

          if (filterCompanyId) {
            selType?.MainType === "MLM"
              ? constraints.push(where("Company", "==", filterCompanyId))
              : null;
          }

          const q = query(
            collection(db, COLLECTIONS.MLMTEMPLATE),
            ...constraints,
          );
          const snap = await getDocs(q);

          snap.forEach((docSnap) => {
            const t = { id: docSnap.id, ...docSnap.data() };
            (t.GraphicsLink || []).forEach((g) => {
              items.push({ ...g, _template: t });
            });
          });
        }

        items.sort((a, b) => {
          const aSerial = Number(a._template?.serial ?? a.serial ?? 0);
          const bSerial = Number(b._template?.serial ?? b.serial ?? 0);
          return aSerial - bSerial;
        });

        let filteredItems = items;
        try {
          if (filterSubType === "CLOSING") {
            filteredItems = items.filter(
              (g) => String(g.Filter) === String(closeFilter),
            );
          }
          if (filterType === "Meeting" || filterType === "General_Meeting") {
            if (meetingHostMode === "add") {
              filteredItems = items.filter((g) => String(g.Filter) === "true");
            } else if (meetingHostMode === "none") {
              filteredItems = items.filter((g) => String(g.Filter) === "false");
            } else {
              filteredItems = items;
            }
          }
        } catch {
          filteredItems = items;
        }

        if (selType?.id && filterSubType === "") {
          const idx = filteredItems.findIndex(
            (i) => i._template?.id === selType.id,
          );
          if (idx > 0) {
            const [found] = filteredItems.splice(idx, 1);
            filteredItems.unshift(found);
          }
        }

        const cachedFilteredItems = [...filteredItems];
        _editorTemplateCache.set(cacheKey, cachedFilteredItems);

        const preferredSelectionKey =
          selectedKeyRef.current || requestedSelectionKey;
        const displayItems = prepareEditorItemsForSelection(
          cachedFilteredItems,
          preferredSelectionKey,
          [...seededItems, ...items],
          seededItems,
        );

        setAllItems(displayItems);
        renderedCount.current = 0;

        const currentSelectedItem =
          findEditorItemBySelectionKey(displayItems, preferredSelectionKey) ||
          displayItems.find((i) => i.id === selectedRef.current?.id);
        const defaultItem =
          currentSelectedItem ||
          displayItems.find((i) => !i.backgroundVideoUrl) ||
          displayItems[0] ||
          null;

        const nextSelected = defaultItem
          ? cleanItem(defaultItem)
          : null;
        const nextSelectedKey = getEditorGraphicSelectionKey(defaultItem);

        selectedRef.current = nextSelected;
        selectedKeyRef.current = nextSelectedKey;
        setSelected(nextSelected);
        setPendingSelectedKey(nextSelectedKey || null);
        if (defaultItem?.backgroundVideoUrl) setActiveTab("video");

        const firstBatch = displayItems.slice(0, BATCH_SIZE);
        setVisibleItems(firstBatch);
        renderedCount.current = firstBatch.length;
      } catch (err) {
        
        setError("Failed to load templates. Please try again.");
        finishRequestedRefresh(err);
      } finally {
        setLoading(false);
        finishRequestedRefresh();
      }
    }

    fetchTemplates();
  }, [
    filterType,
    filterSubType,
    rawFilterSubType,
    filterCompanyId,
    isEverydayMoments,
    meetingHostMode,
    closeFilter,
    refreshRequestId,
  ]);

  const categoryOptions = useMemo(
    () =>
      isEverydayMoments
        ? getEverydayMomentSubtypeOptions(allItems)
        : [],
    [allItems, isEverydayMoments],
  );

  useEffect(() => {
    if (
      !isEverydayMoments ||
      loading ||
      !categoryKey ||
      categoryOptions.some((option) => option.key === categoryKey)
    ) {
      return;
    }
    setCategoryKey("");
  }, [categoryKey, categoryOptions, isEverydayMoments, loading]);

  const categoryItems = useMemo(
    () =>
      isEverydayMoments
        ? filterEverydayMomentItems(allItems, categoryKey)
        : allItems,
    [allItems, categoryKey, isEverydayMoments],
  );

  const imageItems = useMemo(
    () => categoryItems.filter((item) => !item.backgroundVideoUrl),
    [categoryItems],
  );
  const fbVideoItems = useMemo(
    () => categoryItems.filter((item) => !!item.backgroundVideoUrl),
    [categoryItems],
  );
  const videoItems = useMemo(
    () => (fbVideoItems.length > 0 ? fbVideoItems : PRESET_VIDEO_ITEMS),
    [fbVideoItems],
  );
  const tabItems = useMemo(
    () => (activeTab === "video" ? videoItems : imageItems),
    [activeTab, videoItems, imageItems],
  );

  const tabItemsRef = useRef(tabItems);
  useEffect(() => {
    tabItemsRef.current = tabItems;
  }, [tabItems]);

  const [visibleTabItems, setVisibleTabItems] = useState([]);
  const tabRenderedCount = useRef(0);

  useEffect(() => {
    tabRenderedCount.current = 0;
    const firstBatch = tabItems.slice(0, BATCH_SIZE);
    setVisibleTabItems(firstBatch);
    tabRenderedCount.current = firstBatch.length;
  }, [tabItems]);

  useEffect(() => {
    // Preload only the first visible row to keep mobile data/memory controlled
    // while making the most likely taps appear instantly on the canvas.
    visibleTabItems.slice(0, 6).forEach(preloadCanvasAsset);
  }, [visibleTabItems]);

  const loadMore = useCallback(() => {
    const items = tabItemsRef.current;
    if (tabRenderedCount.current >= items.length) return;
    setLoadingMore(true);
    setTimeout(() => {
      const next = items.slice(
        tabRenderedCount.current,
        tabRenderedCount.current + BATCH_SIZE,
      );
      setVisibleTabItems((prev) => [...prev, ...next]);
      tabRenderedCount.current += next.length;
      setLoadingMore(false);
    }, 100);
  }, []);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !loadingMore) loadMore();
      },
      { rootMargin: "120px" },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [loadMore, loadingMore]);

  const handleTab = useCallback(
    (tab) => {
      if (tab === activeTab) return;
      setActiveTab(tab);
      if (onTabChange) onTabChange(tab);
      const items = tab === "video" ? videoItems : imageItems;
      const nextItem = items[0] || null;
      const next = nextItem ? cleanItem(nextItem) : null;
      const nextSelectionKey = getEditorGraphicSelectionKey(nextItem);
      selectedKeyRef.current = nextSelectionKey;
      setPendingSelectedKey(nextSelectionKey || null);
      // Update the canvas immediately — startTransition was marking this
      // as low priority, so the selected template could sit behind other
      // pending work and take a visible beat to appear on the canvas.
      selectedRef.current = next;
      setSelected(next);
    },
    [activeTab, videoItems, imageItems, onTabChange, setSelected],
  );

  const handleSelect = useCallback(
    (item) => {
      const nextSelectionKey = getEditorGraphicSelectionKey(item);
      selectedKeyRef.current = nextSelectionKey;
      setPendingSelectedKey(nextSelectionKey || null);
      const nextSelected = cleanItem(item);
      selectedRef.current = nextSelected;
      setSelected(nextSelected);
    },
    [setSelected],
  );

  const handleCategorySelect = useCallback(
    (nextCategoryKey) => {
      const nextCategoryItems = filterEverydayMomentItems(
        allItems,
        nextCategoryKey,
      );
      let nextTab = activeTab;
      let nextTabItems = nextCategoryItems.filter((item) =>
        nextTab === "video"
          ? Boolean(item.backgroundVideoUrl)
          : !item.backgroundVideoUrl,
      );

      if (nextTabItems.length === 0 && nextCategoryItems.length > 0) {
        nextTab = nextCategoryItems.some((item) => !item.backgroundVideoUrl)
          ? "image"
          : "video";
        nextTabItems = nextCategoryItems.filter((item) =>
          nextTab === "video"
            ? Boolean(item.backgroundVideoUrl)
            : !item.backgroundVideoUrl,
        );
      }

      setCategoryKey(nextCategoryKey);
      setCategoryOpen(false);

      if (nextTab !== activeTab) {
        setActiveTab(nextTab);
        onTabChange?.(nextTab);
      }

      const currentKey = selectedKeyRef.current;
      const currentStillVisible = nextTabItems.find(
        (item) => getEditorGraphicSelectionKey(item) === currentKey,
      );
      const nextItem = currentStillVisible || nextTabItems[0] || null;
      if (nextItem) handleSelect(nextItem);
    },
    [activeTab, allItems, handleSelect, onTabChange],
  );

  const visibleSubtypeSections = useMemo(
    () =>
      isEverydayMoments
        ? groupEverydayMomentItemsBySubtype(visibleTabItems)
        : [],
    [isEverydayMoments, visibleTabItems],
  );

  const selectedSelectionKey = pendingSelectedKey || selectedKeyRef.current;
  const isItemSelected = useCallback(
    (item) =>
      selectedSelectionKey
        ? selectedSelectionKey === getEditorGraphicSelectionKey(item)
        : selected?.id === item.id,
    [selected?.id, selectedSelectionKey],
  );

  return (
    <div className="flex h-full min-h-0 w-full flex-col bg-transparent">
      <div className="flex-shrink-0 px-4 pt-2 pb-2">
        <div className="flex items-center gap-1.5 rounded-[18px] bg-[#eef2f7] dark:bg-[#182234] p-1.5">
        {isEverydayMoments && (
          <button
            type="button"
            onClick={() => setCategoryOpen(true)}
            aria-haspopup="dialog"
            aria-expanded={categoryOpen}
            className={`flex min-w-0 items-center justify-center gap-1.5 rounded-[14px] px-3 py-2 text-[12px] font-semibold transition-all duration-200 ${
              categoryKey
                ? "bg-white text-[#2F80EA] shadow-sm dark:bg-[#151d2b]"
                : "text-[#667085] dark:text-[#b9c5d8] hover:text-[#2F80EA]"
            }`}
          >
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
            >
              <path d="M4 6h16M7 12h10M10 18h4" />
            </svg>
            Categories
          </button>
        )}
        <TabBtn
          active={activeTab === "image"}
          onClick={() => handleTab("image")}
          label="Image"
          count={imageItems.length || null}
          icon={
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <path d="m21 15-5-5L5 21" />
            </svg>
          }
        />
        <TabBtn
          active={activeTab === "video"}
          onClick={() => handleTab("video")}
          label="Video"
          count={videoItems.length || null}
          icon={
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polygon points="5 3 19 12 5 21 5 3" />
            </svg>
          }
        />
        </div>
      </div>

      <div className="w-full flex-1 min-h-0 overflow-y-auto px-4 pb-6">
        {error && (
          <div className="rounded-xl bg-danger/10 border border-danger/20 p-3 text-xs text-danger mb-2">
            {error}
          </div>
        )}
        {!filterType && !loading && (
          <div className="rounded-xl bg-warning/10 p-3 text-xs text-warning-foreground">
            No template type found.
          </div>
        )}

        {loading && <LoadingGrid />}

        {!loading && !error && filterType && tabItems.length === 0 && (
          <EmptyState
            label={
              activeTab === "video"
                ? "No Video Available Soon"
                : "No image templates found"
            }
            sublabel=""
          />
        )}

        {!loading && visibleTabItems.length > 0 &&
          (isEverydayMoments ? (
            <div className="space-y-5">
              {visibleSubtypeSections.map((section) => (
                <section key={section.key}>
                  <div className="mb-2 flex items-center gap-2">
                    <span className="h-4 w-1 rounded-full bg-accent" />
                    <h3 className="truncate text-[12px] font-bold text-foreground/85">
                      {section.label}
                    </h3>
                    <span className="ml-auto rounded-full bg-muted/40 px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
                      {section.items.length}
                    </span>
                  </div>
                  <div className="grid grid-cols-4 gap-2 sm:grid-cols-5 md:grid-cols-6">
                    {section.items.map((item, idx) => (
                      <Tile
                        key={`${item._template?.id}-${item._template?.serial}-${item.id}-${idx}`}
                        item={item}
                        isSelected={isItemSelected(item)}
                        onSelect={handleSelect}
                        isVideo={activeTab === "video"}
                      />
                    ))}
                  </div>
                </section>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-4 gap-2 sm:grid-cols-5 md:grid-cols-6">
              {visibleTabItems.map((item, idx) => (
                <Tile
                  key={`${item._template?.serial}-${item.id}-${idx}`}
                  item={item}
                  isSelected={isItemSelected(item)}
                  onSelect={handleSelect}
                  isVideo={activeTab === "video"}
                />
              ))}
            </div>
          ))}

        <div ref={sentinelRef} className="h-1" />

        {loadingMore && (
          <div className="flex justify-center py-3">
            <div className="flex gap-1">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="w-1.5 h-1.5 rounded-full bg-accent/40 animate-bounce"
                  style={{ animationDelay: `${i * 100}ms` }}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {isEverydayMoments && categoryOpen && (
        <div
          className="fixed inset-0 z-[250] flex items-end justify-center bg-black/60 px-3 backdrop-blur-sm sm:items-center"
          role="presentation"
          onClick={() => setCategoryOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Select template category"
            className="w-full max-w-md rounded-t-3xl border border-border bg-background p-4 pb-7 shadow-2xl sm:rounded-3xl sm:pb-4"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <h3 className="text-[16px] font-bold text-foreground">
                  Categories
                </h3>
                <p className="text-[11px] text-muted-foreground">
                  Select a subtype to filter templates
                </p>
              </div>
              <button
                type="button"
                onClick={() => setCategoryOpen(false)}
                aria-label="Close categories"
                className="flex h-9 w-9 items-center justify-center rounded-full bg-muted/40 text-foreground"
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                >
                  <path d="M6 6l12 12M18 6 6 18" />
                </svg>
              </button>
            </div>

            <div className="max-h-[62vh] space-y-2 overflow-y-auto pr-0.5">
              {[
                { key: "", label: "All Categories" },
                ...categoryOptions,
              ].map((option) => {
                const active = option.key === categoryKey;
                return (
                  <button
                    key={option.key || "all-categories"}
                    type="button"
                    onClick={() => handleCategorySelect(option.key)}
                    className={`flex w-full items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-left text-[13px] font-semibold transition-colors ${
                      active
                        ? "border-accent bg-accent/10 text-accent dark:text-white"
                        : "border-border bg-background text-foreground"
                    }`}
                  >
                    <span className="truncate">{option.label}</span>
                    {active && (
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent text-white">
                        <svg
                          width="12"
                          height="12"
                          viewBox="0 0 12 12"
                          fill="none"
                        >
                          <path
                            d="m2 6 2.5 2.5L10 3"
                            stroke="currentColor"
                            strokeWidth="1.8"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
