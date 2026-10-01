import { useEffect } from "react";
import { useLocation } from "react-router";

export default function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    // App scrolls inside .layout-scroll-container (not the window),
    // so reset both to guarantee every page opens at the top.klnkl
    window.scrollTo(0, 0);
    const scrollEl = document.querySelector(".layout-scroll-container");
    if (scrollEl) scrollEl.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [pathname]);

  return null;
}
