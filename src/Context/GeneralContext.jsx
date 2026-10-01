import {
  createContext,
  useCallback,
  useContext,
  useState,
  useEffect,
  useMemo,
} from "react";
import { clearTemplateCache } from "../pages/Homepage/Component/Services/GeneralTemplateService";
import { clearTrendingCache } from "../pages/Homepage/Component/Services/TTrend_templateService";
import { clearFestivalTemplateCache } from "../pages/Homepage/Component/Services/Festival_template";
import { clearAllTemplateGraphicsCache } from "../pages/Homepage/Component/Services/Alltemplateservice";
import { subscribeToCompanyTemplateInvalidation } from "../utils/companyTemplateState";
const DataContextGen = createContext();

function GeneralContext({ children }) {
  const [theme, setTheme] = useState(
    () => localStorage.getItem("theme") || "light",
  );
  const [selType, setSelType] = useState({});
  useEffect(() => {
    const html = document.documentElement;
    html.className = theme;
    html.setAttribute("data-theme", theme);
    localStorage.setItem("theme", theme);
  }, [theme]);

  const toggleTheme = () =>
    setTheme((prev) => (prev === "light" ? "dark" : "light"));

  const theame_color = "#0088DA";
  const [cachedTemplates, setCachedTemplates] = useState([]);
  const [cachedGroupIndex, setCachedGroupIndex] = useState(0);
  const [cachedFestivalData, setCachedFestivalData] = useState({});
  const [cachedTrending, setCachedTrending] = useState(null);

  // Cache for AllTemplates page: key = type string, value = { templates, lastDoc, hasMore }
  const [allTemplatesCache, setAllTemplatesCache] = useState({});

  // New-templates notification badge
  // true when templates with a higher serial than last seen have been loaded
  const [hasNewTemplates, setHasNewTemplates] = useState(false);
  const [templateDataVersion, setTemplateDataVersion] = useState(0);

  const resetCompanyTemplateData = useCallback(() => {
    // Clear both module-level request caches and all keep-alive React state.
    // This runs before SelectedCompanyContext commits the next company.
    clearTemplateCache();
    clearTrendingCache();
    clearFestivalTemplateCache();
    clearAllTemplateGraphicsCache();
    setSelType({});
    setCachedTemplates([]);
    setCachedGroupIndex(0);
    setCachedFestivalData({});
    setCachedTrending(null);
    setAllTemplatesCache({});
    setHasNewTemplates(false);
    setTemplateDataVersion((version) => version + 1);
  }, []);

  useEffect(() => {
    return subscribeToCompanyTemplateInvalidation(resetCompanyTemplateData);
  }, [resetCompanyTemplateData]);

  const contextValue = useMemo(
    () => ({
      theme,
      toggleTheme,
      theame_color,
      setSelType,
      selType,
      cachedFestivalData,
      setCachedFestivalData,
      cachedTemplates,
      setCachedTemplates,
      cachedGroupIndex,
      setCachedGroupIndex,
      cachedTrending,
      setCachedTrending,
      allTemplatesCache,
      setAllTemplatesCache,
      hasNewTemplates,
      setHasNewTemplates,
      templateDataVersion,
      resetCompanyTemplateData,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      theme,
      selType,
      cachedFestivalData,
      cachedTemplates,
      cachedGroupIndex,
      cachedTrending,
      allTemplatesCache,
      hasNewTemplates,
      templateDataVersion,
      resetCompanyTemplateData,
    ],
  );

  return (
    <DataContextGen.Provider value={contextValue}>
      {children}
    </DataContextGen.Provider>
  );
}

const useGeneralData = () => {
  return useContext(DataContextGen);
};

export { GeneralContext, useGeneralData };
