import { useState, useEffect } from "react";
import { useGeneralData } from "../Context/GeneralContext";
import { useNavigate, useLocation } from "react-router";
import { getUser } from "../utils/authStorage";
function getStoredHeaderData() {
  const mlmProfile = JSON.parse(sessionStorage.getItem("mlmProfile") || "{}");
  const userMlm = getUser() || {};
  return {
    companyLogo: (mlmProfile?.logoURLs || [])[0] || null,
    userName: mlmProfile?.name || userMlm?.name || "",
  };
}

const HomeIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 9.5L12 3l9 6.5V20a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V9.5z" />
    <path d="M9 21V12h6v9" />
  </svg>
);

const SubscriptionIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="5" width="20" height="14" rx="2" />
    <path d="M2 10h20" />
    <path d="M6 15h4" />
    <path d="M14 15h4" />
  </svg>
);

const ProfileIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="8" r="4" />
    <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
  </svg>
);

const TABS = [
  { label: "Home", path: "/", Icon: HomeIcon },
  // { label: "Subscription", path: "/Subscription", Icon: SubscriptionIcon },
  { label: "Subscription", path: "/", Icon: SubscriptionIcon },
  { label: "Profile", path: "/profile", Icon: ProfileIcon },
];

const HIDDEN_PATHS = [""];

export default function TabBar({
  collapsed,
  setCollapsed,
  setMobileOpen,
  darkMode,
  setDarkMode,
  activeLabel,
}) {
  const { theme, toggleTheme } = useGeneralData();
  const navigate = useNavigate();
  const location = useLocation();

  const [companyLogo, setCompanyLogo] = useState(() => getStoredHeaderData().companyLogo);
  const [userName, setUserName] = useState(() => getStoredHeaderData().userName);

  useEffect(() => {
    const { companyLogo: logo, userName: name } = getStoredHeaderData();
    setCompanyLogo(logo);
    setUserName(name);
  }, []);

  if (HIDDEN_PATHS.includes(location.pathname)) return null;

  return (
    <header
      className="sticky bottom-0  z-20 h-16 flex items-center justify-around px-2
      bg-white/80 dark:bg-[#0f1117]/80 backdrop-blur-md border-t
      border-gray-100 dark:border-gray-800/70"
    >
      {TABS.map(({ label, path, Icon }) => {
        const isActive = location.pathname === path;
        return (
          <button
            key={path}
            onClick={() => navigate(path)}
            className="relative flex flex-col items-center justify-center gap-1 flex-1 h-full"
          >
            {/* Active top indicator */}
            <span
              className={`absolute top-0 left-1/2 -translate-x-1/2 h-[3px] w-8
                rounded-b-sm transition-opacity duration-200
                bg-accent dark:bg-white
                ${isActive ? "opacity-100" : "opacity-0"}`}
            />

            {/* Icon */}
            <span
              className={`flex items-center justify-center w-7 h-7 rounded-lg
                transition-colors duration-150
                ${
                  isActive
                    ? "bg-accent text-white dark:bg-white dark:text-accent"
                    : "text-gray-400 dark:text-gray-500"
                }`}
            >
              <Icon />
            </span>

            {/* Label */}
            <span
              className={`text-[11px] transition-colors duration-150
                ${
                  isActive
                    ? "font-medium text-accent dark:text-white"
                    : "font-normal text-gray-400 dark:text-white"
                }`}
            >
              {label}
            </span>
          </button>
        );
      })}
    </header>
  );
}
