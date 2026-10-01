import React, { useEffect, useRef, useState } from "react";
import { TTrend_templateService } from "./Services/TTrend_templateService";
import { useNavigate } from "react-router";
import { useGeneralData } from "../../../Context/GeneralContext";
import defaultImage from "../../../../public/carasol.webp";
import { hasMlmProfileInStorage } from "../../../utils/companyStorage";
import { useSelectedCompany } from "../../../Context/SelectedCompanyContext";
import { rememberEditorBackTarget } from "../../../utils/editorNavigation";

function displayTitle(item, index) {
  const subtype = String(item?.Subtype || "").trim();
  if (subtype) return subtype;
  const type = String(item?.type || "").replaceAll("_", " ").trim();
  return type && type !== "Trending" && type !== "Today Trending"
    ? type
    : `Today's Pick ${index + 1}`;
}

export default function Carosel() {
  const { setSelType } = useGeneralData();
  const { selectedCompany } = useSelectedCompany();
  const [slides, setSlides] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeIndex, setActiveIndex] = useState(0);
  const navigate = useNavigate();
  const sliderRef = useRef(null);
  const activeIndexRef = useRef(0);
  const interactionRef = useRef(false);

  useEffect(() => {
    let mounted = true;

    const loadTrending = async () => {
      try {
        setLoading(true);
        const data = await TTrend_templateService(selectedCompany?.id || "");
        if (mounted) setSlides(Array.isArray(data) ? data : []);
      } catch {
        if (mounted) setSlides([]);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    loadTrending();
    return () => {
      mounted = false;
    };
  }, [selectedCompany?.id]);

  const selectType = (item) => {
    const selection = {
      id: item?.id || "",
      MainType: item?.MainType || "General",
      type: item?.type || "Today_Trending",
      serial: item?.serial || 0,
      ShowCaseForm: item?.ShowCaseForm,
      Subtype: item?.Subtype || "",
    };
    setSelType(selection);
    try {
      localStorage.setItem("selType", JSON.stringify(selection));
    } catch {}
    return selection;
  };

  const handleImagePress = (item) => {
    const selection = selectType(item);
    if (hasMlmProfileInStorage()) {
      rememberEditorBackTarget("/", selection);
      navigate("/editor", { state: { editorBackTarget: "/" } });
    } else {
      navigate("/mlmprofile");
    }
  };

  const handleViewAll = () => {
    const first = slides[0] || { type: "Today_Trending" };
    selectType(first);
    navigate("/alltemp");
  };

  const handleScroll = () => {
    const container = sliderRef.current;
    if (!container) return;
    const children = Array.from(container.children);
    if (!children.length) return;

    const viewportCenter = container.scrollLeft + container.clientWidth / 2;
    let nearestIndex = 0;
    let nearestDistance = Number.POSITIVE_INFINITY;
    children.forEach((child, index) => {
      const center = child.offsetLeft + child.offsetWidth / 2;
      const distance = Math.abs(center - viewportCenter);
      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearestIndex = index;
      }
    });
    setActiveIndex(nearestIndex);
  };

  const renderSlides = slides.length
    ? slides
    : [
        {
          id: "fallback-trending",
          type: "Today_Trending",
          Subtype: "Fresh designs for today",
          image: defaultImage,
        },
      ];

  useEffect(() => {
    activeIndexRef.current = activeIndex;
  }, [activeIndex]);

  useEffect(() => {
    activeIndexRef.current = 0;
    setActiveIndex(0);
    sliderRef.current?.scrollTo?.({ left: 0, behavior: "auto" });
  }, [renderSlides.length]);

  useEffect(() => {
    if (loading || renderSlides.length <= 1) return undefined;

    const timer = window.setInterval(() => {
      if (interactionRef.current) return;
      const container = sliderRef.current;
      if (!container) return;
      const children = Array.from(container.children);
      if (!children.length) return;

      const nextIndex = (activeIndexRef.current + 1) % children.length;
      const target = children[nextIndex];
      container.scrollTo({
        left: target.offsetLeft - container.offsetLeft,
        behavior: "smooth",
      });
      activeIndexRef.current = nextIndex;
      setActiveIndex(nextIndex);
    }, 3000);

    return () => window.clearInterval(timer);
  }, [loading, renderSlides.length]);

  return (
    <div className="w-full">
      {loading ? (
        <div className="aspect-[1.9/1] w-full animate-pulse rounded-[14px] bg-[#DCE4F1] dark:bg-[#182235]" />
      ) : (
        <div
          ref={sliderRef}
          onScroll={handleScroll}
          onPointerDown={() => {
            interactionRef.current = true;
          }}
          onPointerUp={() => {
            interactionRef.current = false;
          }}
          onPointerCancel={() => {
            interactionRef.current = false;
          }}
          onTouchStart={() => {
            interactionRef.current = true;
          }}
          onTouchEnd={() => {
            interactionRef.current = false;
          }}
          className="hide-scrollbar flex w-full snap-x snap-mandatory gap-2 overflow-x-auto scroll-smooth"
        >
          {renderSlides.map((item, index) => (
            <button
              key={item.id || `${item.type}-${index}`}
              type="button"
              onClick={() => handleImagePress(item)}
              className="relative aspect-[1.9/1] min-w-full snap-center overflow-hidden rounded-[14px] border border-[#E3E8F1] bg-[#EAF0F8] text-left shadow-[0_5px_16px_rgba(34,55,88,0.08)] transition active:scale-[0.995] dark:border-[#263247] dark:bg-[#172235]"
            >
              <img
                src={item.image || defaultImage}
                alt={displayTitle(item, index)}
                className="h-full w-full object-cover"
                loading={index === 0 ? "eager" : "lazy"}
                decoding="async"
              />
            </button>
          ))}
        </div>
      )}

      <div className="mt-2 flex h-2 items-center justify-center gap-1.5" aria-hidden="true">
        {renderSlides.map((item, index) => (
          <span
            key={item.id || index}
            className={`h-1 rounded-full transition-all duration-200 ${
              index === activeIndex
                ? "w-5 bg-[#1F78EA]"
                : "w-1.5 bg-[#D5DCE8] dark:bg-[#334157]"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
