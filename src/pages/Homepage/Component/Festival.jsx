import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { Festival_template } from "./Services/Festival_template";
import { useGeneralData } from "../../.././Context/GeneralContext";
import { useNavigate } from "react-router";
import { Skeleton } from "@heroui/react";
import { Calendar } from "@gravity-ui/icons";
import { hasMlmProfileInStorage } from "../../../utils/companyStorage";
import { rememberEditorBackTarget } from "../../../utils/editorNavigation";
import { useSelectedCompany } from "../../../Context/SelectedCompanyContext";
import { storeEditorTemplateSeed } from "../../../utils/editorTemplateSelection";

const HOME_FESTIVAL_DAYS = 6; // today + next 5 days

export default function Festival() {
  const sliderRef = useRef(null);
  const dateSliderRef = useRef(null);
  const cardGroupRefs = useRef({});
  const loadedDateRef = useRef(new Set());
  const loadingDateRef = useRef(new Set());

  const dates = useMemo(() => generateDates(), []);
  const homeDates = useMemo(() => dates.slice(0, HOME_FESTIVAL_DAYS), [dates]);

  const [selectedDate, setSelectedDate] = useState(dates[0].iso);
  const [allFestivalData, setAllFestivalData] = useState({});
  const [loadingDates, setLoadingDates] = useState({});
  const [initialLoading, setInitialLoading] = useState(true);

  const { setSelType, cachedFestivalData, setCachedFestivalData } =
    useGeneralData();
  const navigate = useNavigate();
  const { selectedCompany } = useSelectedCompany();

  // Home requirement: immediately load ALL festival templates for
  // today + next 5 calendar days. We wait for all six date requests and then
  // commit the result together so no date is accidentally omitted by racing
  // state updates. Today's request is forced to network to avoid stale/empty
  // cache hiding a newly added current-day festival, while still reusing a
  // non-empty 5-minute cache to reduce repeat reads.
  useEffect(() => {
    let cancelled = false;

    const loadHomeWindow = async () => {
      const todayIso = dates[0].iso;
      const isoDates = homeDates.map((d) => d.iso);

      setInitialLoading(true);
      setLoadingDates((prev) => {
        const next = { ...prev };
        isoDates.forEach((iso) => {
          next[iso] = true;
          loadingDateRef.current.add(iso);
        });
        return next;
      });

      const results = await Promise.allSettled(
        isoDates.map((iso) =>
          Festival_template(iso, {
            // Re-check only a stale/empty current-day cache. A non-empty result
            // can reuse the 5-minute cache so Home navigation does not keep
            // charging the same Firestore reads.
            bypassEmptyCache: iso === todayIso,
          }),
        ),
      );

      if (cancelled) return;

      const nextData = {};
      results.forEach((result, index) => {
        const iso = isoDates[index];
        const data = result.status === "fulfilled" && Array.isArray(result.value)
          ? result.value
          : [];
        nextData[iso] = data;
        loadedDateRef.current.add(iso);
        loadingDateRef.current.delete(iso);
      });

      // One state commit contains all festivals from today through +5 days.
      setAllFestivalData((prev) => ({ ...prev, ...nextData }));
      setCachedFestivalData((prev) => ({ ...prev, ...nextData }));
      setLoadingDates((prev) => {
        const next = { ...prev };
        isoDates.forEach((iso) => {
          next[iso] = false;
        });
        return next;
      });
      setSelectedDate(todayIso);
      setInitialLoading(false);
    };

    void loadHomeWindow();

    return () => {
      cancelled = true;
    };
    // The six-day window is intentionally loaded once per Festival mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const ensureDateLoaded = useCallback(
    async (iso) => {
      if (!iso || loadedDateRef.current.has(iso) || loadingDateRef.current.has(iso)) {
        return;
      }

      const cached = cachedFestivalData[iso];
      if (Array.isArray(cached)) {
        loadedDateRef.current.add(iso);
        setAllFestivalData((prev) => ({ ...prev, [iso]: cached }));
        return;
      }

      loadingDateRef.current.add(iso);
      setLoadingDates((prev) => ({ ...prev, [iso]: true }));
      try {
        const data = await Festival_template(iso);
        const safeData = Array.isArray(data) ? data : [];
        loadedDateRef.current.add(iso);
        setCachedFestivalData((prev) => ({ ...prev, [iso]: safeData }));
        setAllFestivalData((prev) => ({ ...prev, [iso]: safeData }));
      } finally {
        loadingDateRef.current.delete(iso);
        setLoadingDates((prev) => ({ ...prev, [iso]: false }));
      }
    },
    [cachedFestivalData, setCachedFestivalData],
  );

  const scrollCardsToDate = useCallback((iso) => {
    const el = cardGroupRefs.current[iso];
    if (el && sliderRef.current) {
      sliderRef.current.scrollTo({
        left: Math.max(0, el.offsetLeft - 16),
        behavior: "smooth",
      });
    }
  }, []);

  // First six dates are already fetched automatically. Any later date is
  // fetched only when the user taps its date chip.
  const handleDateSelect = (iso) => {
    setSelectedDate(iso);

    if (loadedDateRef.current.has(iso)) {
      scrollCardsToDate(iso);
    } else {
      void ensureDateLoaded(iso).then(() => {
        requestAnimationFrame(() => requestAnimationFrame(() => scrollCardsToDate(iso)));
      });
    }

    const dateChip = dateSliderRef.current?.querySelector(`[data-iso="${iso}"]`);
    if (dateChip) {
      dateChip.scrollIntoView({
        behavior: "smooth",
        inline: "center",
        block: "nearest",
      });
    }
  };

  const handleCardScroll = useCallback(() => {
    if (!sliderRef.current) return;
    const containerLeft = sliderRef.current.getBoundingClientRect().left;

    for (const date of dates.map((d) => d.iso)) {
      const el = cardGroupRefs.current[date];
      if (!el) continue;
      const elLeft = el.getBoundingClientRect().left - containerLeft;
      if (elLeft >= -10) {
        if (selectedDate !== date) {
          setSelectedDate(date);
          const dateChip = dateSliderRef.current?.querySelector(`[data-iso="${date}"]`);
          dateChip?.scrollIntoView({
            behavior: "smooth",
            inline: "center",
            block: "nearest",
          });
        }
        break;
      }
    }
  }, [dates, selectedDate]);

  useEffect(() => {
    const el = sliderRef.current;
    if (!el) return;
    el.addEventListener("scroll", handleCardScroll, { passive: true });
    return () => el.removeEventListener("scroll", handleCardScroll);
  }, [handleCardScroll]);

  const handleImagePress = (item) => {
    const graphics = Array.isArray(item?.GraphicsLink)
      ? item.GraphicsLink.filter(Boolean)
      : [];
    const firstGraphic =
      graphics.find((graphic) => !graphic?.backgroundVideoUrl) ||
      graphics[0] ||
      null;

    const templateForSeed = {
      ...item,
      MainType: item?.MainType || "General",
      SelectType: item?.type || "Festival",
      type: item?.type || "Festival",
    };
    const seed = firstGraphic
      ? storeEditorTemplateSeed({
          template: templateForSeed,
          selectedGraphic: firstGraphic,
          companyId: selectedCompany?.id || "",
          maxItems: 20,
        })
      : null;

    const selttype = {
      id: item.id,
      MainType: item?.MainType || "General",
      type: item.type || "Festival",
      serial: item.serial,
      ShowCaseForm: item.ShowCaseForm,
      Subtype: item.Subtype || "",
      selectedGraphicKey: seed?.selectedGraphicKey || "",
    };

    setSelType(selttype);
    localStorage.setItem("selType", JSON.stringify(selttype));

    if (hasMlmProfileInStorage()) {
      rememberEditorBackTarget("/", selttype);
      navigate("/editor", { state: { editorBackTarget: "/" } });
    } else {
      navigate("/mlmprofile");
    }
  };

  const visibleDates = dates.filter((d) => {
    const cards = allFestivalData[d.iso];
    return loadingDates[d.iso] || (Array.isArray(cards) && cards.length > 0);
  });

  return (
    <div className="flex flex-col gap-4 w-full">
      <div className="flex items-center gap-2 px-1">
        <div className="w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center text-accent">
          <Calendar className="w-5 h-5" />
        </div>
        <h3 className="text-lg font-display font-bold text-foreground">
          Festival Calendar
        </h3>
      </div>

      <div
        ref={dateSliderRef}
        className="flex hide-scrollbar gap-3 overflow-x-auto w-full pt-2 pb-2 px-1 snap-x"
      >
        {dates.map((d) => {
          const isSelected = selectedDate === d.iso;
          const hasData = allFestivalData[d.iso]?.length > 0;
          return (
            <button
              key={d.iso}
              data-iso={d.iso}
              onClick={() => handleDateSelect(d.iso)}
              className={`relative flex flex-col items-center justify-center min-w-[45px] h-[55px] rounded-xl transition-all duration-300 snap-center shrink-0 border ${
                isSelected
                  ? "bg-accent text-white shadow-md border-transparent scale-105"
                  : "bg-white dark:bg-black/20 text-foreground border-border hover:border-accent/50 hover:bg-accent/5"
              }`}
            >
              <span
                className={`text-[9px] font-semibold uppercase tracking-wider mb-0.5 ${isSelected ? "text-white/80" : "text-muted-foreground"}`}
              >
                {d.monthShort}
              </span>
              <span
                className={`text-xl font-display font-bold leading-none ${isSelected ? "text-white" : ""}`}
              >
                {d.day}
              </span>
              {hasData && (
                <span
                  className={`absolute bottom-1.5 w-1 h-1 rounded-full ${isSelected ? "bg-white/70" : "bg-accent"}`}
                />
              )}
            </button>
          );
        })}
      </div>

      {initialLoading ? (
        <div className="flex gap-4 overflow-x-hidden px-1">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="shrink-0 flex flex-col gap-1">
              <div className="w-[110px] md:w-[140px] h-[110px] md:h-[140px] rounded-2xl overflow-hidden bg-white dark:bg-black/20 border border-border">
                <Skeleton className="w-full h-full" />
              </div>
              <div className="w-[110px] md:w-[140px] h-3 rounded bg-muted animate-pulse" />
            </div>
          ))}
        </div>
      ) : visibleDates.length > 0 ? (
        <div
          ref={sliderRef}
          className="flex gap-2 overflow-x-auto hide-scrollbar px-1 pb-1"
        >
          {visibleDates.map((d) => {
            const cards = allFestivalData[d.iso] || [];
            const isLoading = loadingDates[d.iso];

            return (
              <div
                key={d.iso}
                ref={(el) => {
                  cardGroupRefs.current[d.iso] = el;
                }}
                className="flex gap-3 shrink-0"
              >
                <div className="flex gap-3">
                  {isLoading
                    ? [1, 2].map((i) => (
                        <div key={i} className="shrink-0 flex flex-col gap-1">
                          <div className="w-[110px] md:w-[140px] h-[110px] md:h-[140px] rounded-2xl overflow-hidden bg-white dark:bg-black/20 border border-border">
                            <Skeleton className="w-full h-full" />
                          </div>
                          <div className="w-[110px] md:w-[140px] h-3 rounded bg-muted animate-pulse" />
                        </div>
                      ))
                    : cards.map((card) => (
                        <div
                          key={card.id}
                          onClick={() => handleImagePress(card)}
                          className="shrink-0 flex flex-col gap-1.5 cursor-pointer"
                        >
                          <div className="w-[110px] md:w-[140px] h-[110px] md:h-[140px] rounded-2xl overflow-hidden relative border border-border shadow-sm bg-white dark:bg-black/20 card-press">
                            <img
                              src={card.image}
                              alt={card.Subtype || "festival template"}
                              className="w-full h-full object-cover"
                              loading="lazy"
                              decoding="async"
                            />
                            <div className="absolute bottom-1.5 right-1.5 min-w-[22px] h-[22px] px-1.5 rounded-lg bg-accent/90 backdrop-blur-sm flex items-center justify-center">
                              <span className="text-white text-[10px] font-bold leading-none">
                                {d.day}
                              </span>
                            </div>
                          </div>
                          {card.Subtype ? (
                            <div className="w-[110px] md:w-[140px] overflow-hidden">
                              <div className="flex whitespace-nowrap animate-marquee-smooth">
                                <span className="text-[10px] font-semibold text-foreground/70 leading-tight pr-8">
                                  {card.Subtype}
                                </span>
                                <span className="text-[10px] font-semibold text-foreground/70 leading-tight pr-8">
                                  {card.Subtype}
                                </span>
                              </div>
                            </div>
                          ) : null}
                        </div>
                      ))}
                </div>
              </div>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

function getLocalIsoDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function generateDates() {
  const dates = [];
  const base = new Date();
  base.setHours(12, 0, 0, 0);

  for (let i = 0; i < 17; i++) {
    const d = new Date(base);
    d.setDate(base.getDate() + i);
    dates.push({
      iso: getLocalIsoDate(d),
      day: d.getDate(),
      month: d.toLocaleString("default", { month: "long" }),
      monthShort: d.toLocaleString("default", { month: "short" }),
    });
  }
  return dates;
}
