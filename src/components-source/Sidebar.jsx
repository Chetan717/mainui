import {
  Dots9,
  Hand,
  PersonWorker,
  Gem,
  ChartAreaStacked,
  Person,
  LogoMicrosoftOffice,
  Sack,
  star,
  ArrowUpFromSquare,
  Video,
  Star,
  Comments,
  Timestamps,
  ScalesBalanced,
} from "@gravity-ui/icons";
import { useNavigate } from "react-router";
import logo from "/mlmboo2.ico";
import { useGeneralData } from "../Context/GeneralContext";
import { getLocalLogo } from "../utils/getLocalLogo";
const NAV_ITEMS = [
  // { icon: Dots9, label: "Home", id: "Home", link: "/" },
 
  {
    icon: Timestamps,
    label: "My Company Profile",
    id: "MyMLMProfile",
    link: "/mlmprofile",
  },
 {
    icon: Gem,
    label: "My Subscriptions",
    id: "Subscriptions",
    // link: "/Subscription",
    link: "/",
  },
  {
    icon: Comments,
    label: "Customer Support",
    id: "customerSupport",
    link: "https://wa.me/919341947815",
  },
  {
    icon: ScalesBalanced,
    label: "Privacy Policy & Terms",
    id: "privacyPolicy",
    link: "https://mlmlive.in/Privacy.html",
  },
  {
    icon: Star,
    label: "Share Review & Feedback",
    id: "Review",
    link: "https://play.google.com/store/apps/details?id=com.mlmbooster.mlmbooster&hl=en",
  },
  {
    icon: Video,
    label: "Learn How to Use App",
    id: "howtoUse",
    link: "https://youtube.com/@mlmboosterapp?si=4AQiHvcR8x6CmOHX",
  },
];

const BOTTOM_ITEMS = [
  //   { icon: Hand, label: "Settings", id: "settings" },
  { icon: ArrowUpFromSquare, label: "Logout", id: "logout", link: "/logout" },
];

export default function Sidebar({
  collapsed,
  setCollapsed,
  mobileOpen,
  setMobileOpen,
  active,
  setActive,
}) {
  const navigate = useNavigate();
  const { theme, theame_color } = useGeneralData();

  let selectedProfile = null;
  try {
    selectedProfile = JSON.parse(sessionStorage.getItem("mlmProfile") || "null");
  } catch (e) {
    selectedProfile = null;
  }

  const comapnyName = selectedProfile?.companyName || "";

  c;
  const companyLogo =
    getLocalLogo(selectedProfile?.companyId) ||
    logo;

  const handleNav = (id) => {
    setActive(id);
    setMobileOpen(false);
  };

  const hanClick = (id, link) => {
    if (link) {
      if (link.startsWith("http")) {
        window.open(link, "_blank");
      } else {
        navigate(link);
      }
    }
    handleNav(id);
  };

  return (
    <>
      {mobileOpen && (
        <div
          className="fixed inset-0 border z-40 bg-black/40 backdrop-blur-sm md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <aside
        className={[
          "fixed md:relative top-0 left-0 z-50 md:z-auto",
          "h-full flex flex-col",
          "bg-accent/90 dark:bg-[#0f1117]",
          "border- border-gray-100 dark:border-gray-800/70",
          "transition-all duration-300 ease-in-out",
          "shadow-xl md:shadow-none overflow-hidden",
          collapsed ? "md:w-[72px]" : "md:w-60",
          mobileOpen
            ? "w-60 translate-x-0"
            : "w-60 -translate-x-full md:translate-x-0",
        ].join(" ")}
      >
        {/* Logo row */}
        <div className="flex h-[120px] items-center m-1 rounded-xl  gap-3  p-2 dark:border-gray-800/70">
          <div
            className={`min-w-[46px] w-18 h-18  flex items-center justify-center  flex-shrink-0`}
          >
            {/* ✅ Safe optional chaining on parsed object */}
            {companyLogo ? (
              <img
                src={companyLogo}
                alt="Company Logo"
                className="w-18 h-18 object-contain rounded-xs"
              />
            ) : (
              <span className="text-white font-bold text-sm">M</span>
            )}
          </div>

          <p
            className={[
              "font-bold flex flex-col text-[17px] text-gray-900 dark:text-white tracking-tight whitespace-nowrap transition-all duration-300",
              collapsed
                ? "md:opacity-0 md:w-0 md:overflow-hidden"
                : "opacity-100",
            ].join(" ")}
            style={{ fontFamily: "'Figtree', sans-serif" }}
          >
            {/* ✅ Use company name from localStorage if available */}
            <span className={`text-white text-[14px]`}>{comapnyName}</span>
            <span className={`text-white text-[13px]`}>
              {selectedProfile?.fullName || ""}
            </span>
            <span className={`text-white text-[12px]`}>
              {`+91 ${selectedProfile?.mobile || ""}`}
            </span>
          </p>

          <button
            className="ml-auto md:hidden text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            onClick={() => setMobileOpen(false)}
          />
        </div>

        {/* Main nav */}
        <nav className="flex-1 bg-white rounded-t-[50px] overflow-y-auto py-4 px-2 space-y-0.5">
          <p
            className={[
              "text-[10px] uppercase tracking-widest font-semibold text-black dark:text-gray-600 px-3 m-4 transition-all duration-200 whitespace-nowrap",
              collapsed
                ? "md:opacity-0 md:h-0 md:mb-0 md:overflow-hidden"
                : "opacity-100",
            ].join(" ")}
          ></p>

          {NAV_ITEMS?.map(({ icon: Icon, label, id, badge, link }) => {
            const isActive = active === id;
            return (
              <button
                key={id}
                onClick={() => hanClick(id, link)}
                className={[
                  "w-full flex items-center gap-3 px-3 py-2.5 mb-3 rounded-xl text-sm font-medium transition-all duration-200 group relative",
                  isActive
                    ? `bg-slate-100 dark:bg-[${theame_color}] text-accent dark:text-white`
                    : "text-accent",
                ].join(" ")}
              >
                <span
                  className={[
                    "min-w-[20px] flex-shrink-0 transition-colors",
                    isActive ? "text-accent" : "group-hover:text-violet-400",
                  ].join(" ")}
                >
                  <Icon className="w-5 h-5" />
                </span>

                <span
                  className={[
                    "flex-1 text-left whitespace-nowrap transition-all duration-300",
                    collapsed
                      ? "md:opacity-0 md:w-0 md:overflow-hidden"
                      : "opacity-100",
                  ].join(" ")}
                >
                  {label}
                </span>

                {badge && !collapsed && (
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-violet-500 text-white min-w-[18px] text-center leading-none">
                    {badge}
                  </span>
                )}

                {collapsed && (
                  <span className="pointer-events-none absolute left-full ml-3 px-2.5 py-1.5 rounded-lg bg-gray-900 dark:bg-gray-700 text-white text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50 shadow-lg hidden md:flex items-center gap-1.5">
                    {label}
                    {badge && (
                      <span className="px-1 py-0.5 bg-violet-500 rounded-full text-[9px] leading-none">
                        {badge}
                      </span>
                    )}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Bottom actions */}
        <div className="dark:border-gray-800/70 p-2 bg-white ">
          {BOTTOM_ITEMS?.map(({ icon: Icon, label, id, link }) => {
            const isActive = active === id;
            const isLogout = id === "logout";
            return (
              <button
                key={id}
                onClick={() => (link ? hanClick(id, link) : handleNav(id))}
                className={[
                  "w-full flex items-center bg-accent shadow-xs mb-2 gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group relative",
                  isLogout
                    ? "text-white font-bold hover:bg-red-50 dark:hover:bg-red-500/10 hover:text-red-500"
                    : isActive
                      ? "bg-violet-50 dark:bg-violet-500/10 text-violet-600 dark:text-violet-400"
                      : "text-black dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800/60 hover:text-gray-700 dark:hover:text-gray-200",
                ].join(" ")}
              >
                <span
                  className={[
                    "min-w-[20px] flex-shrink-0 transition-colors",
                    isLogout ? "text-white group-hover:text-red-500" : "",
                  ].join(" ")}
                >
                  <Icon className="w-5 h-5" />
                </span>
                <span
                  className={[
                    "flex-1 text-left whitespace-nowrap transition-all duration-300",
                    collapsed
                      ? "md:opacity-0 md:w-0 md:overflow-hidden"
                      : "opacity-100",
                  ].join(" ")}
                >
                  {label}
                </span>
                {collapsed && (
                  <span className="pointer-events-none absolute left-full ml-3 px-2.5 py-1.5 rounded-lg bg-gray-900 dark:bg-gray-700 text-white text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50 shadow-lg hidden md:block">
                    {label}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </aside>
    </>
  );
}
