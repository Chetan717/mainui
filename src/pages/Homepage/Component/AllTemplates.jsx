import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router";
import { ArrowLeft, Check, ChevronRight, Compass } from "lucide-react";
import { useGeneralData } from "../../../Context/GeneralContext";
import { useSelectedCompany } from "../../../Context/SelectedCompanyContext";
import { hasMlmProfileInStorage } from "../../../utils/companyStorage";
import {
  isDirectEditorTemplate,
  rememberEditorBackTarget,
} from "../../../utils/editorNavigation";
import {
  buildAllTemplatesReturnPath,
  buildAllTemplatesSubtypePath,
  getAllTemplatesBackTarget,
  getAllTemplatesGroup,
  getAllTemplatesSubtype,
  getAllTemplatesType,
} from "../../../utils/allTemplatesNavigation";
import {
  EVERYDAY_MOMENT_ENTRIES,
  EVERYDAY_MOMENTS_GROUP_KEY,
  isEverydayMomentType,
} from "../../../utils/everydayMoments";
import {
  getEditorGraphicSelectionKey,
  storeEditorTemplateSeed,
} from "../../../utils/editorTemplateSelection";
import { subscribeToCompanyTemplateInvalidation } from "../../../utils/companyTemplateState";
import {
  ALL_TEMPLATE_GRAPHICS_CACHE_TTL_MS,
  AllTemplateGraphicsService,
} from "./Services/Alltemplateservice";
import { getAllGeneralTemplates } from "./Services/generalTemplateIndex";
import {
  getSubtypeRowItems,
  groupTemplateGraphicsBySubtype,
} from "./templateGraphicsView";
import {
  isNewTemplate,
  markImageSeen,
  preloadImage,
  seenImages,
} from "./templateCacheUtils";
import "./stylec.css";

function readSelectedType(contextSelectedType) {
  if (contextSelectedType?.type) return contextSelectedType;
  try {
    const stored = localStorage.getItem("selType");
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
}

function displayLabel(value, fallback = "Templates") {
  const text = String(value || "").trim();
  return text ? text.replaceAll("_", " ") : fallback;
}

function ShowcaseImage({ src, alt, aggressiveLazy = false }) {
  const wrapperRef = useRef(null);
  const [loaded, setLoaded] = useState(() =>
    Boolean(src && seenImages.has(src)),
  );
  const [shouldLoad, setShouldLoad] = useState(() =>
    aggressiveLazy ? false : Boolean(src && seenImages.has(src)),
  );

  useEffect(() => {
    const alreadySeen = Boolean(src && seenImages.has(src));
    setLoaded(alreadySeen);
    setShouldLoad(aggressiveLazy ? false : alreadySeen);
    if (!src) return;
    if (!aggressiveLazy && alreadySeen) return;

    const element = wrapperRef.current;
    if (!element || typeof IntersectionObserver === "undefined") {
      setShouldLoad(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (aggressiveLazy) {
          // Everyday View All can contain many image cards. Keep only nearby
          // <img> nodes mounted so vertical scrolling does not accumulate
          // decoded images and repaint work. Browser cache makes re-entry cheap.
          setShouldLoad(entry.isIntersecting);
          return;
        }
        if (!entry.isIntersecting) return;
        setShouldLoad(true);
        observer.disconnect();
      },
      { rootMargin: aggressiveLazy ? "180px" : "260px" },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [aggressiveLazy, src]);

  if (!src) {
    return (
      <div
        ref={wrapperRef}
        className="absolute inset-0 flex items-center justify-center bg-muted/40 text-muted-foreground"
      >
        <Compass className="h-6 w-6" />
      </div>
    );
  }

  return (
    <div ref={wrapperRef} className="absolute inset-0 bg-muted/40">
      {!loaded && (!aggressiveLazy || shouldLoad) && (
        <div className="absolute inset-0 shimmer-bar" />
      )}
      {shouldLoad && (
        <img
          src={src}
          alt={alt}
          className={`h-full w-full object-cover transition-opacity duration-150 ${
            loaded ? "opacity-100" : "opacity-0"
          }`}
          loading="lazy"
          decoding="async"
          fetchPriority={aggressiveLazy ? "low" : "auto"}
          onLoad={() => {
            markImageSeen(src);
            setLoaded(true);
          }}
        />
      )}
    </div>
  );
}

function ShowcaseCard({
  graphic,
  selected,
  onSelect,
  layout = "row",
  aggressiveLazy = false,
}) {
  const template = graphic?._template;
  const preview =
    graphic?.suggestionImage ||
    graphic?.url ||
    graphic?.backgroundVideoUrl ||
    "";

  return (
    <button
      type="button"
      onPointerEnter={() => graphic?.url && preloadImage(graphic.url)}
      onPointerDown={() => graphic?.url && preloadImage(graphic.url)}
      onClick={() => onSelect(graphic)}
      aria-label={`Select ${displayLabel(template?.Subtype, "template")} background`}
      style={
        layout === "grid" && aggressiveLazy
          ? { contentVisibility: "auto", containIntrinsicSize: "110px 110px" }
          : undefined
      }
      className={`relative overflow-hidden rounded-[16px] border bg-white text-left shadow-[0_2px_10px_rgba(28,54,92,0.04)] transition-transform duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent card-press dark:bg-black/20 ${
        layout === "grid"
          ? "aspect-square w-full max-w-[110px]"
          : "h-[110px] w-[110px] shrink-0 snap-start"
      } ${
        selected
          ? "border-accent ring-2 ring-accent ring-offset-1 dark:ring-offset-[#0b0f19]"
          : "border-border"
      }`}
    >
      <ShowcaseImage
        src={preview}
        alt="GraphicsLink showcase"
        aggressiveLazy={aggressiveLazy}
      />
      {isNewTemplate(template?.serial) && (
        <span className="absolute left-1.5 top-1.5 rounded-full bg-emerald-500 px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wide text-white shadow">
          New
        </span>
      )}
      {selected && (
        <span className="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full border-2 border-white bg-accent shadow-md dark:border-[#0b0f19]">
          <Check className="h-3.5 w-3.5 text-white" strokeWidth={3} />
        </span>
      )}
    </button>
  );
}

function SubtypeRow({
  section,
  parentType,
  selectedGraphicKey,
  onSelect,
  onOpenGrid,
  previewLimit = null,
}) {
  const rowRef = useRef(null);
  const [renderItems, setRenderItems] = useState(false);

  useEffect(() => {
    if (renderItems) return;

    const element = rowRef.current;
    if (!element || typeof IntersectionObserver === "undefined") {
      setRenderItems(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        setRenderItems(true);
        observer.disconnect();
      },
      { rootMargin: "500px 0px" },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [renderItems]);

  const rowItems = getSubtypeRowItems(section);
  const visibleRowItems =
    Number.isInteger(previewLimit) && previewLimit > 0
      ? rowItems.slice(0, previewLimit)
      : rowItems;

  return (
    <section
      ref={rowRef}
      style={{
        contentVisibility: "auto",
        containIntrinsicSize: "160px",
      }}
    >
      <div className="mb-3 flex items-center justify-between gap-3 px-0.5">
        <div className="min-w-0">
          <h3 className="truncate text-base font-display font-bold text-foreground">
            {displayLabel(section.subtype)}
          </h3>
          <p className="text-[11px] font-medium text-muted-foreground">
            {section.items.length} backgrounds
          </p>
        </div>
        <button
          type="button"
          onClick={() => onOpenGrid(section.subtype, parentType)}
          className="flex shrink-0 items-center gap-1 rounded-full bg-accent/10 px-3 py-1.5 text-xs font-bold text-accent dark:text-white"
        >
          View All
          <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </div>

      {renderItems ? (
        <div className="hide-scrollbar scroll-gpu flex snap-x gap-3 overflow-x-auto px-0.5 pb-2 pt-0.5">
          {visibleRowItems.map((graphic) => {
            const key = getEditorGraphicSelectionKey(
              graphic,
              graphic?._template?.id,
            );
            return (
              <ShowcaseCard
                key={key}
                graphic={graphic}
                selected={selectedGraphicKey === key}
                onSelect={onSelect}
              />
            );
          })}
        </div>
      ) : (
        <div
          className="relative h-[112px] overflow-hidden rounded-md bg-muted/30"
          aria-hidden="true"
        >
          <div className="absolute inset-0 shimmer-bar" />
        </div>
      )}
    </section>
  );
}

function SubtypeChoiceCard({ section, parentType, onOpenGrid }) {
  const previewGraphic = getSubtypeRowItems(section)[0] || null;
  const preview =
    previewGraphic?.suggestionImage ||
    previewGraphic?.url ||
    previewGraphic?.backgroundVideoUrl ||
    "";
  const subtypeLabel = displayLabel(section.subtype);

  return (
    <button
      type="button"
      onPointerEnter={() => previewGraphic?.url && preloadImage(previewGraphic.url)}
      onPointerDown={() => previewGraphic?.url && preloadImage(previewGraphic.url)}
      onClick={() => onOpenGrid(section.subtype, parentType)}
      aria-label={`View all ${subtypeLabel} designs`}
      className="relative aspect-square w-[118px] shrink-0 snap-start overflow-hidden rounded-[16px] border border-[#E5EAF2] bg-muted/40 text-left shadow-[0_2px_10px_rgba(28,54,92,0.04)] card-press dark:border-border"
    >
      <ShowcaseImage
        src={preview}
        alt={subtypeLabel}
        aggressiveLazy
      />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 bg-gradient-to-t from-black/75 via-black/30 to-transparent px-2.5 pb-2 pt-8 text-white">
        <div className="flex items-center gap-1">
          <span className="min-w-0 flex-1 truncate text-[10px] font-bold">
            {subtypeLabel}
          </span>
          <ChevronRight className="h-3 w-3 shrink-0" />
        </div>
      </div>
    </button>
  );
}

function EverydayTypeSubtypeSection({ typeSection, onOpenGrid }) {
  const sectionRef = useRef(null);
  const [renderChoices, setRenderChoices] = useState(false);

  useEffect(() => {
    const element = sectionRef.current;
    if (!element || typeof IntersectionObserver === "undefined") {
      setRenderChoices(true);
      return;
    }

    // Mount subtype cards only while their main-type section is near the
    // viewport. A fixed-height placeholder keeps the vertical scroll position
    // stable while off-screen image/card work is released.
    const observer = new IntersectionObserver(
      ([entry]) => setRenderChoices(entry.isIntersecting),
      { rootMargin: "600px 0px" },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return (
    <section
      ref={sectionRef}
      style={{ contentVisibility: "auto", containIntrinsicSize: "170px" }}
    >
      <div className="mb-4 flex items-end justify-between gap-3 border-b border-border/70 pb-3">
        <div className="min-w-0">
          <h2 className="truncate text-lg font-display font-bold text-foreground">
            {typeSection.label}
          </h2>
          <p className="mt-0.5 text-[11px] font-medium text-muted-foreground">
            {typeSection.subtypeSections.length} subtypes
          </p>
        </div>
      </div>

      {typeSection.subtypeSections.length > 0 ? (
        renderChoices ? (
          <div className="hide-scrollbar scroll-gpu flex min-h-[122px] snap-x gap-3 overflow-x-auto px-0.5 pb-2 pt-0.5">
            {typeSection.subtypeSections.map((section) => (
              <SubtypeChoiceCard
                key={`${typeSection.type}-${section.subtype}`}
                section={section}
                parentType={typeSection.type}
                onOpenGrid={onOpenGrid}
              />
            ))}
          </div>
        ) : (
          <div
            className="h-[122px] rounded-xl bg-muted/20"
            aria-hidden="true"
          />
        )
      ) : (
        <div className="rounded-2xl border border-dashed border-border bg-muted/20 px-4 py-6 text-center text-xs font-medium text-muted-foreground">
          No subtypes available in this category.
        </div>
      )}
    </section>
  );
}

function EverydayGraphicsGrid({
  section,
  selectedGraphicKey,
  onSelect,
}) {
  const items = Array.isArray(section?.items) ? section.items : [];
  const loadMoreRef = useRef(null);
  const [visibleCount, setVisibleCount] = useState(() => Math.min(36, items.length));

  useEffect(() => {
    setVisibleCount(Math.min(36, items.length));
  }, [items.length, section?.subtype]);

  useEffect(() => {
    if (visibleCount >= items.length) return;
    const element = loadMoreRef.current;
    if (!element || typeof IntersectionObserver === "undefined") {
      setVisibleCount(items.length);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        setVisibleCount((current) => Math.min(current + 30, items.length));
      },
      { rootMargin: "900px 0px" },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [items.length, visibleCount]);

  const visibleItems = items.slice(0, visibleCount);

  return (
    <>
      <div className="grid grid-cols-3 justify-items-center gap-3 pb-4 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
        {visibleItems.map((graphic) => {
          const key = getEditorGraphicSelectionKey(
            graphic,
            graphic?._template?.id,
          );
          return (
            <ShowcaseCard
              key={key}
              graphic={graphic}
              selected={selectedGraphicKey === key}
              onSelect={onSelect}
              layout="grid"
              aggressiveLazy
            />
          );
        })}
      </div>
      {visibleCount < items.length && (
        <div ref={loadMoreRef} className="h-10" aria-hidden="true" />
      )}
    </>
  );
}

function LoadingRows() {
  return (
    <div className="space-y-8">
      {Array.from({ length: 3 }).map((_, sectionIndex) => (
        <div key={sectionIndex}>
          <div className="mb-3 h-5 w-36 overflow-hidden rounded-md bg-muted/50">
            <div className="h-full w-full shimmer-bar" />
          </div>
          <div className="flex gap-3 overflow-hidden">
            {Array.from({ length: 5 }).map((__, cardIndex) => (
              <div
                key={cardIndex}
                className="relative h-[110px] w-[110px] shrink-0 overflow-hidden rounded-md border border-border bg-muted/40"
              >
                <div className="absolute inset-0 shimmer-bar" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function LoadingGrid() {
  return (
    <div className="grid grid-cols-3 justify-items-center gap-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
      {Array.from({ length: 12 }).map((_, index) => (
        <div
          key={index}
          className="relative aspect-square w-full max-w-[110px] overflow-hidden rounded-md border border-border bg-muted/40"
        >
          <div className="absolute inset-0 shimmer-bar" />
        </div>
      ))}
    </div>
  );
}

function EmptyState({ message }) {
  return (
    <div className="flex flex-col items-center justify-center py-28 text-center">
      <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full border border-border bg-white shadow-sm dark:bg-black/20">
        <Compass className="h-8 w-8 text-muted-foreground" />
      </div>
      <h3 className="mb-2 text-xl font-display font-bold text-foreground">
        No backgrounds found
      </h3>
      <p className="max-w-sm text-sm text-muted-foreground">{message}</p>
    </div>
  );
}

export default function AllTemplates() {
  const navigate = useNavigate();
  const location = useLocation();
  const lastAllTemplatesSearchRef = useRef(
    location.pathname === "/alltemp" ? location.search : "",
  );
  const { selectedCompany } = useSelectedCompany();
  const {
    selType: contextSelectedType,
    setSelType,
    allTemplatesCache,
    setAllTemplatesCache,
  } = useGeneralData();

  const selectedType = readSelectedType(contextSelectedType);
  const companyId = selectedCompany?.id || "";
  const allTemplatesSearch =
    location.pathname === "/alltemp"
      ? location.search
      : lastAllTemplatesSearchRef.current;
  const requestedGroup = getAllTemplatesGroup(allTemplatesSearch);
  const isEverydayGroup =
    requestedGroup === EVERYDAY_MOMENTS_GROUP_KEY;
  const requestedType = getAllTemplatesType(allTemplatesSearch);
  const templateType = isEverydayGroup
    ? isEverydayMomentType(requestedType)
      ? requestedType
      : ""
    : selectedType?.type || "";
  const requestedSubtype = getAllTemplatesSubtype(allTemplatesSearch);
  const isSubtypeGrid = Boolean(requestedSubtype);
  const isEverydayLanding = isEverydayGroup && !templateType && !isSubtypeGrid;
  const isEverydayTypePage =
    isEverydayGroup && Boolean(templateType) && !isSubtypeGrid;
  const templateFlowReturnTarget = buildAllTemplatesReturnPath(
    allTemplatesSearch,
  );
  const typeEntries = useMemo(() => {
    if (isEverydayGroup) {
      if (isSubtypeGrid || isEverydayTypePage) {
        return isEverydayMomentType(templateType)
          ? EVERYDAY_MOMENT_ENTRIES.filter(
              (entry) => entry.type === templateType,
            )
          : [];
      }
      return EVERYDAY_MOMENT_ENTRIES;
    }

    return templateType
      ? [{ type: templateType, label: displayLabel(templateType) }]
      : [];
  }, [isEverydayGroup, isEverydayTypePage, isSubtypeGrid, templateType]);
  const typeRequestKey = typeEntries.map((entry) => entry.type).join("|");

  const [templatesByType, setTemplatesByType] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retryId, setRetryId] = useState(0);
  const [selectedGraphicKey, setSelectedGraphicKey] = useState("");
  const requestSequenceRef = useRef(0);
  const lastKeyRef = useRef("");

  useEffect(() => {
    if (!contextSelectedType?.type) return;
    try {
      localStorage.setItem("selType", JSON.stringify(contextSelectedType));
    } catch {
      // The in-memory selection still keeps navigation functional.
    }
  }, [contextSelectedType]);

  useEffect(() => {
    if (location.pathname === "/alltemp") {
      lastAllTemplatesSearchRef.current = location.search;
    }
  }, [location.pathname, location.search]);

  useEffect(
    () =>
      subscribeToCompanyTemplateInvalidation(() => {
        requestSequenceRef.current += 1;
        lastKeyRef.current = "";
        setTemplatesByType({});
        setSelectedGraphicKey("");
        setError("");
        setLoading(true);
      }),
    [],
  );

  useEffect(() => {
    if (!typeRequestKey) {
      lastKeyRef.current = "";
      setTemplatesByType({});
      setLoading(false);
      setError("");
      return;
    }

    setSelectedGraphicKey("");
    const cacheKey = `graphics-set::${companyId}::${typeRequestKey}`;
    lastKeyRef.current = cacheKey;
    const cachedTemplatesByType = {};
    const missingTypes = [];
    const now = Date.now();

    for (const entry of typeEntries) {
      const typeCacheKey = `graphics::${companyId}::${entry.type}`;
      const cached = allTemplatesCache[typeCacheKey];
      const cacheIsFresh =
        Array.isArray(cached?.templates) &&
        (!cached?.timestamp ||
          now - cached.timestamp < ALL_TEMPLATE_GRAPHICS_CACHE_TTL_MS);

      if (cacheIsFresh) {
        cachedTemplatesByType[entry.type] = cached.templates;
      } else {
        missingTypes.push(entry.type);
      }
    }

    setTemplatesByType(cachedTemplatesByType);
    if (missingTypes.length === 0) {
      setLoading(false);
      setError("");
      return;
    }

    const requestId = ++requestSequenceRef.current;
    let cancelled = false;
    setLoading(true);
    setError("");

    const loadTemplates = async () => {
      try {
        const loadedEntries = await Promise.all(
          missingTypes.map(async (type) => [
            type,
            await AllTemplateGraphicsService(type, companyId),
          ]),
        );
        if (
          cancelled ||
          requestSequenceRef.current !== requestId ||
          lastKeyRef.current !== cacheKey
        ) {
          return;
        }

        const loadedTemplatesByType = Object.fromEntries(loadedEntries);
        setTemplatesByType({
          ...cachedTemplatesByType,
          ...loadedTemplatesByType,
        });
        const timestamp = Date.now();
        setAllTemplatesCache((current) => ({
          ...current,
          ...Object.fromEntries(
            loadedEntries.map(([type, templates]) => [
              `graphics::${companyId}::${type}`,
              { templates, timestamp },
            ]),
          ),
        }));
      } catch {
        if (!cancelled && requestSequenceRef.current === requestId) {
          setError("Backgrounds could not be loaded. Please try again.");
        }
      } finally {
        if (!cancelled && requestSequenceRef.current === requestId) {
          setLoading(false);
        }
      }
    };

    void loadTemplates();
    return () => {
      cancelled = true;
    };
  }, [companyId, retryId, typeRequestKey]);

  const typeSections = useMemo(
    () =>
      typeEntries.map((entry) => {
        const templates = templatesByType[entry.type] || [];
        const subtypeSections = groupTemplateGraphicsBySubtype(templates);
        const totalBackgrounds = subtypeSections.reduce(
          (total, section) => total + section.items.length,
          0,
        );
        return {
          ...entry,
          templates,
          subtypeSections,
          totalBackgrounds,
        };
      }),
    [templatesByType, typeEntries],
  );
  const activeTypeSection = useMemo(
    () =>
      typeSections.find((section) => section.type === templateType) || null,
    [templateType, typeSections],
  );
  const activeSubtypeSection = useMemo(
    () =>
      activeTypeSection?.subtypeSections.find(
        (section) => section.subtype === requestedSubtype,
      ) || null,
    [activeTypeSection, requestedSubtype],
  );
  const totalBackgrounds = useMemo(
    () =>
      typeSections.reduce(
        (total, section) => total + section.totalBackgrounds,
        0,
      ),
    [typeSections],
  );
  const totalSubtypes = useMemo(
    () =>
      typeSections.reduce(
        (total, section) => total + section.subtypeSections.length,
        0,
      ),
    [typeSections],
  );

  const goBack = useCallback(() => {
    navigate(getAllTemplatesBackTarget(allTemplatesSearch), { replace: true });
  }, [allTemplatesSearch, navigate]);

  const selectGraphic = useCallback(
    (graphic) => {
      const template = graphic?._template;
      if (!template) return;
      lastAllTemplatesSearchRef.current = allTemplatesSearch;

      const nextGraphicKey = getEditorGraphicSelectionKey(
        graphic,
        template.id,
      );
      setSelectedGraphicKey(nextGraphicKey);

      if (!hasMlmProfileInStorage()) {
        navigate("/mlmprofile");
        return;
      }

      const nextSelectedType = {
        MainType: template.MainType,
        id: template.id,
        type: template.type,
        serial: template.serial,
        ShowCaseForm: template.ShowCaseForm,
        Subtype: template.Subtype,
        suggestionImage: graphic?.suggestionImage || "",
        selectedGraphicKey: nextGraphicKey,
        templateFlowReturnTarget,
      };

      setSelType(nextSelectedType);
      try {
        localStorage.setItem("selType", JSON.stringify(nextSelectedType));
      } catch {
        // React context remains the fallback when storage is unavailable.
      }
      storeEditorTemplateSeed({
        template,
        selectedGraphic: graphic,
        companyId,
      });
      if (graphic?.url) preloadImage(graphic.url);

      const isDirectEditor = isDirectEditorTemplate(template.type);
      if (!isDirectEditor) localStorage.removeItem("mlmform");

      if (isDirectEditor) {
        rememberEditorBackTarget(templateFlowReturnTarget, nextSelectedType);
        navigate("/editor", {
          replace: true,
          state: { editorBackTarget: templateFlowReturnTarget },
        });
      } else {
        rememberEditorBackTarget(templateFlowReturnTarget, nextSelectedType);
        navigate("/mlmform", {
          replace: true,
          state: { templateFlowReturnTarget },
        });
      }
    },
    [
      allTemplatesSearch,
      companyId,
      navigate,
      setSelType,
      templateFlowReturnTarget,
    ],
  );

  const openSubtypeGrid = useCallback(
    (subtype, parentType) => {
      navigate(
        buildAllTemplatesSubtypePath(
          subtype,
          isEverydayGroup
            ? {
                group: EVERYDAY_MOMENTS_GROUP_KEY,
                type: parentType,
              }
            : undefined,
        ),
      );
    },
    [isEverydayGroup, navigate],
  );

  const activeEverydayEntry = EVERYDAY_MOMENT_ENTRIES.find(
    (entry) => entry.type === templateType,
  );
  const headerTitle = isSubtypeGrid
    ? displayLabel(requestedSubtype)
    : isEverydayTypePage
      ? activeEverydayEntry?.label || displayLabel(templateType)
      : isEverydayGroup
        ? "Everyday Moments"
        : templateType === "Festival"
          ? "Festival Calendar"
          : displayLabel(templateType);
  const headerSubtitle = isSubtypeGrid
    ? activeEverydayEntry?.label || displayLabel(templateType)
    : isEverydayLanding
      ? !loading && totalSubtypes > 0
        ? `${typeSections.length} main types · ${totalSubtypes} subtypes`
        : "Choose a subtype"
      : !loading && totalBackgrounds > 0
        ? `${totalSubtypes} subtypes · ${totalBackgrounds} backgrounds`
        : "Choose a subtype";

  return (
    <div
      className={`relative flex flex-col bg-[#F5F7FC] dark:bg-[#0B0F19] [--accent:#2478EA] ${
        isEverydayGroup ? "min-h-full" : "min-h-screen overflow-hidden"
      }`}
    >
      <header
        className="sticky top-0 z-20 flex min-h-[56px] items-center gap-3 overflow-hidden border-b border-transparent bg-[linear-gradient(135deg,#2F80EA_0%,#236FDE_48%,#1454C5_100%)] px-4 py-2 text-white md:px-8"
      >
        <span className="pointer-events-none absolute -right-12 -top-20 h-44 w-44 rounded-full bg-[#0D58C8]/28" />
        <span className="pointer-events-none absolute right-12 -top-14 h-28 w-28 rounded-full bg-white/[0.045]" />
        <button
          type="button"
          onClick={goBack}
          aria-label="Go back"
          className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/15 text-white transition hover:bg-white/20"
        >
          <ArrowLeft className="h-5 w-5 text-white" />
        </button>
        <div className="min-w-0">
          <h1 className="truncate text-[16px] font-display font-bold leading-tight text-white md:text-xl">
            {headerTitle}
          </h1>
          <p className="mt-0.5 truncate text-[10px] font-medium text-white/70">
            {headerSubtitle}
          </p>
        </div>
      </header>

      <main
        className={
          isEverydayGroup
            ? "z-10 px-4 py-6 md:px-8"
            : "layout-scroll-container z-10 flex-1 overflow-y-auto px-4 py-6 md:px-8"
        }
      >
        {loading && (isSubtypeGrid ? <LoadingGrid /> : <LoadingRows />)}

        {!loading && error && (
          <div className="flex flex-col items-center justify-center gap-4 py-28 text-center">
            <p className="text-sm font-medium text-danger">{error}</p>
            <button
              type="button"
              onClick={() => setRetryId((value) => value + 1)}
              className="rounded-full bg-accent px-5 py-2 text-sm font-bold text-white shadow-sm"
            >
              Try Again
            </button>
          </div>
        )}

        {!loading && !error && isEverydayLanding && totalSubtypes > 0 && (
          <div className="space-y-10 pb-8">
            {typeSections.map((typeSection) => (
              <EverydayTypeSubtypeSection
                key={typeSection.type}
                typeSection={typeSection}
                onOpenGrid={openSubtypeGrid}
              />
            ))}
          </div>
        )}

        {!loading && !error && isEverydayLanding && totalSubtypes === 0 && (
          <EmptyState message="No subtypes are available in Everyday Moments yet." />
        )}

        {!loading &&
          !error &&
          !isSubtypeGrid &&
          !isEverydayGroup &&
          totalSubtypes === 0 && (
            <EmptyState message="Check back later for new designs in this category." />
          )}

        {!loading &&
          !error &&
          !isSubtypeGrid &&
          !isEverydayLanding &&
          totalSubtypes > 0 && (
            <div className="space-y-8 pb-8">
              {typeSections.map((typeSection) => (
                <div key={typeSection.type} className="space-y-8">
                  {typeSection.subtypeSections.map((section) => (
                    <SubtypeRow
                      key={`${typeSection.type}-${section.subtype}`}
                      section={section}
                      parentType={typeSection.type}
                      selectedGraphicKey={selectedGraphicKey}
                      onSelect={selectGraphic}
                      onOpenGrid={openSubtypeGrid}
                      previewLimit={isEverydayTypePage ? 4 : null}
                    />
                  ))}
                </div>
              ))}
            </div>
          )}

        {!loading &&
          !error &&
          isEverydayTypePage &&
          totalSubtypes === 0 && (
            <EmptyState message="No subtypes are available in this category yet." />
          )}

        {!loading && !error && isSubtypeGrid && !activeSubtypeSection && (
          <EmptyState
            message="This subtype is no longer available. Go back and choose another subtype."
          />
        )}

        {!loading && !error && isSubtypeGrid && activeSubtypeSection && (
          isEverydayGroup ? (
            <EverydayGraphicsGrid
              section={activeSubtypeSection}
              selectedGraphicKey={selectedGraphicKey}
              onSelect={selectGraphic}
            />
          ) : (
            <div className="grid grid-cols-3 justify-items-center gap-3 pb-8 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
              {activeSubtypeSection.items.map((graphic) => {
                const key = getEditorGraphicSelectionKey(
                  graphic,
                  graphic?._template?.id,
                );
                return (
                  <ShowcaseCard
                    key={key}
                    graphic={graphic}
                    selected={selectedGraphicKey === key}
                    onSelect={selectGraphic}
                    layout="grid"
                  />
                );
              })}
            </div>
          )
        )}
      </main>
    </div>
  );
}
