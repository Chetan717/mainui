import { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router";
import { House, Gem, Person } from "@gravity-ui/icons";
import { useAppLanguage } from "../i18n/AppLanguageContext";
import { Sparkles } from "lucide-react";
import { db } from "../Firebase";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { COLLECTIONS } from "../collections";
import { useGeneralData } from "../Context/GeneralContext";

const TABS = [
  {
    label: "Home",
    path: "/",
    Icon: ({ className }) => <House className={className} />,
  },
  // {
  //   label: "Plans",
  //   path: "/subscription",
  //   Icon: ({ className }) => <Gem className={className} />,
  // },
  {
    label: "Ask AI",
    path: "/ask-ai",
    Icon: ({ className }) => <Sparkles className={className} />,
  },
  {
    label: "My Profile",
    path: "/profile",
    Icon: ({ className }) => <Person className={className} />,
  },
];

function useReportingBadge(enabled) {
  const [count, setCount] = useState(0);
  const unsubRef = useRef(null);

  useEffect(() => {
    if (!enabled) {
      setCount(0);
      return;
    }

    let reportingProfile = null;
    try {
      const raw = localStorage.getItem("reportingProfile");
      if (raw) reportingProfile = JSON.parse(raw);
    } catch {}

    if (!reportingProfile || reportingProfile.role !== "Manager" || !reportingProfile.managerId) {
      setCount(0);
      return;
    }

    const managerId = reportingProfile.managerId;

    const q = query(
      collection(db, COLLECTIONS.REPORTINGUSER),
      where("managerId", "==", managerId),
      where("role", "==", "Team Member")
    );

    unsubRef.current = onSnapshot(q, (snap) => {
      let pending = 0;
      snap.docs.forEach((d) => {
        const data = d.data();
        if (!data.approvedByManager || data.sendDeleteApproval) pending++;
      });
      setCount(pending);
    }, () => setCount(0));

    return () => {
      if (unsubRef.current) unsubRef.current();
    };
  }, [enabled]);

  return count;
}

export default function TabBar() {
  const navigate        = useNavigate();
  const location        = useLocation();
  const reportingTabEnabled = TABS.some((tab) => tab.path === "/reporting");
  const badgeCount      = useReportingBadge(reportingTabEnabled);
  const { hasNewTemplates } = useGeneralData();
  const { t } = useAppLanguage();

  const hide = ["/editor", "/Editor", "/selectcomp", "/mlmform", "/mlmprofile"].includes(location.pathname) || (location.pathname.startsWith("/profile/") && location.pathname !== "/profile");
  if (hide) return null;

  return (
    <div className="md:hidden  fixed bottom-0 left-0 right-0 z-50">
      <div className="absolute rounded-t-2xl inset-0 bg-background/90 backdrop-blur-2xl border-t border-border/60" />

      <div className="relative flex items-stretch h-[58px] px-1">
        {TABS.map(({ label, path, Icon }) => {
          const isActive =
            location.pathname === path ||
            (path === "/" && location.pathname === "");
          const isAi = path === "/ask-ai";
          const isReporting = path === "/reporting";
          const isHome = path === "/";
          const showBadge =
            (isReporting && badgeCount > 0) || (isHome && hasNewTemplates);

          return (
            <button
              key={path}
              onClick={() => navigate(path)}
              style={{
                touchAction: "manipulation",
                WebkitTapHighlightColor: "transparent",
              }}
              className="relative flex-1 flex flex-col items-center justify-center gap-[3px] group"
            >
              {isActive && (
                <div className="absolute inset-x-2 top-2 bottom-2 rounded-2xl bg-accent/10 dark:bg-accent/15" />
              )}

              <div className="relative z-10 flex flex-col items-center gap-[3px]">
                <div className="relative">
                  <div
                    className={`flex items-center justify-center w-[34px] h-[24px] rounded-xl transition-colors duration-200 ${
                      isActive ? "text-accent" : "text-muted-foreground"
                    }`}
                  >
                    <Icon className="w-[18px] h-[18px]" />
                  </div>

                  {/* Reporting: numbered badge */}
                  {isReporting && badgeCount > 0 && (
                    <span
                      className="absolute -top-1 -right-1 min-w-[15px] h-[15px] px-[3px] rounded-full bg-red-500 text-white text-[8px] font-bold flex items-center justify-center leading-none shadow-sm"
                      style={{ boxShadow: "0 1px 4px rgba(239,68,68,0.5)" }}
                    >
                      {badgeCount > 99 ? "99+" : badgeCount}
                    </span>
                  )}

                  {/* Home: pulsing dot badge for new templates */}
                  {isHome && hasNewTemplates && (
                    <span className="absolute -top-0.5 -right-0.5">
                      <span className="relative flex h-2.5 w-2.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-70" />
                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-accent" />
                      </span>
                    </span>
                  )}
                </div>

                <span
                  className={`text-[9px] font-semibold leading-none transition-colors duration-200 ${
                    isActive ? "text-accent" : "text-muted-foreground"
                  }`}
                >
                  {label === "My Profile" ? t("Profile") : t(label)}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
