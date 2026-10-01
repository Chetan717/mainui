import { useState, useEffect } from "react";
import {
  Moon,
  Sun,
  ListUl,
  Gear,
  ArrowRotateRight,
  Rocket,
} from "@gravity-ui/icons";
import { useGeneralData } from "../Context/GeneralContext";
import { useNavigate, useLocation } from "react-router";
import { getLocalLogo } from "../utils/getLocalLogo";
import { getUser } from "../utils/authStorage";
function getStoredHeaderData() {
  const mlmProfile = JSON.parse(sessionStorage.getItem("mlmProfile") || "{}");
  const userMlm = getUser() || {};
  return {
    companyLogo:
      (mlmProfile?.logoURLs || [])[0] ||
      "",
    userName: mlmProfile?.name || userMlm?.name || "",
  };
}

export default function Header({
  collapsed,
  setCollapsed,
  setMobileOpen,
  darkMode,
  setDarkMode,
  activeLabel,
}) {
  const { theme, toggleTheme } = useGeneralData();
  const isDark = theme === "dark";
  const navigate = useNavigate();
  const location = useLocation();

  const [companyLogo, setCompanyLogo] = useState(() =>
    getLocalLogo(mlmProfile?.companyId),
  );
  const [userName, setUserName] = useState(
    () => getStoredHeaderData().userName,
  );

  useEffect(() => {
    const { userName: name } = getStoredHeaderData();
    setUserName(name);
  }, []);

  const handleMenuClick = () => {
    if (window.innerWidth < 768) {
      setMobileOpen((prev) => !prev);
    } else {
      setCollapsed((prev) => !prev);
    }
  };

  return location.pathname === "/profile" ? null : (
    <header className="sticky top-0 z-20 h-16 flex items-center p-2 gap-1 bg-white/80 dark:bg-[#0f1117]/80 backdrop-blur-md border-b border-gray-100 dark:border-gray-800/70">
      {/* Sidebar toggle */}
      <button
        onClick={handleMenuClick}
        aria-label="Toggle sidebar"
        className="w-8 h-8 flex items-center justify-center rounded-xl text-accent dark:text-white hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors flex-shrink-0"
      >
        <ListUl className="w-6 h-6 " />
      </button>

      {/* Company logo + user name — mobile only */}
      {companyLogo ? (
        <div className="flex items-center ml-1 gap-1">
          {companyLogo ? (
            <img
              src={companyLogo}
              alt="Company Logo"
              className="w-6 h-6 rounded-lg object-contain"
            />
          ) : (
            <div className="w-6 h-6 rounded-lg bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-xs font-bold text-gray-500" />
          )}
          {userName && (
            <span className="text-[11px] font-semibold  capitalize text-gray-800 dark:text-gray-100 whitespace-nowrap ">
              {userName}
            </span>
          )}
        </div>
      ) : null}

      {/* Right controls */}
      <div className="flex items-center gap-1 ml-auto flex-shrink-0">
        <button
          onClick={() => window.location.reload()}
          className="flex items-center gap-2 pl-2 pr-2.5 py-1 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors group cursor-pointer"
        >
          <Rocket className="size-5 text-accent dark:text-white" />
        </button>
        <button
          onClick={toggleTheme}
          className="p-1 rounded-full transition-all duration-300 hover:bg-default"
          aria-label="Toggle theme"
        >
          {isDark ? (
            <Sun className="size-5 text-accent dark:text-white" />
          ) : (
            <Moon className="size-5 text-accent dark:text-white" />
          )}
        </button>

        {
          location.pathname === "/Editor" ? (
            <button
              onClick={() => navigate("/mlmprofile")}
              className="flex items-center gap-2 pl-2 pr-2.5 py-1 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors group cursor-pointer"
            >
              <Gear className="size-5 text-accent dark:text-white" />

              {/* <div className="w-7 h-7 rounded-lg bg-[#0088DA] flex items-center justify-center text-white font-bold text-xs flex-shrink-0">
              {userName?.[0]?.toUpperCase() || "A"}
            </div> */}
            </button>
          ) : null
          // <button
          //   onClick={() => navigate("/profile")}
          //   className="flex items-center gap-2 pl-2 pr-2.5 py-1 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors group"
          // >
          //   <div className="w-7 h-7 rounded-lg bg-[#0088DA] flex items-center justify-center text-white font-bold text-xs flex-shrink-0">
          //     {userName?.[0]?.toUpperCase() || "A"}
          //   </div>
          // </button>
        }
      </div>
    </header>
  );
}
