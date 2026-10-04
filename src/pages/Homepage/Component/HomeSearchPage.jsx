import { useCallback, useMemo, useState } from "react";
import { ArrowLeft, ArrowUpRight, Clock3, Search, X } from "lucide-react";
import { useNavigate } from "react-router";
import { useGeneralData } from "../../../Context/GeneralContext";
import ListOfGenaraltemp from "./ListOfGenaraltemp";
import { getAllGeneralTemplates } from "./Services/generalTemplateIndex";
import { buildDeepSearchResults } from "./homeSearchRanking";

const RECENT_SEARCHES_KEY = "mlmliv-recent-template-searches";
const MAX_RECENT_SEARCHES = 6;

function readRecentSearches() {
  try {
    const parsed = JSON.parse(localStorage.getItem(RECENT_SEARCHES_KEY) || "[]");
    return Array.isArray(parsed)
      ? parsed.filter((item) => typeof item === "string" && item.trim()).slice(0, MAX_RECENT_SEARCHES)
      : [];
  } catch {
    return [];
  }
}

function storeRecentSearches(items) {
  try {
    localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(items));
  } catch {
    // Search still works even if storage is unavailable.
  }
}

export default function HomeSearchPage() {
  const navigate = useNavigate();
  const { cachedTemplates } = useGeneralData();
  const [query, setQuery] = useState("");
  const [recentSearches, setRecentSearches] = useState(() => readRecentSearches());

  const commitSearch = useCallback((rawValue) => {
    const value = String(rawValue || "").trim();
    if (!value) return;

    setQuery(value);
    setRecentSearches((current) => {
      const next = [
        value,
        ...current.filter((item) => item.toLowerCase() !== value.toLowerCase()),
      ].slice(0, MAX_RECENT_SEARCHES);
      storeRecentSearches(next);
      return next;
    });
  }, []);

  const filteredTemplates = useMemo(
    () => buildDeepSearchResults(cachedTemplates, query, getAllGeneralTemplates),
    [cachedTemplates, query],
  );

  const clearRecent = () => {
    setRecentSearches([]);
    storeRecentSearches([]);
  };

  return (
    <div className="min-h-full bg-[#F5F7FC] text-[#141A28] dark:bg-[#0B0F19] dark:text-white">
      <header className="bg-[linear-gradient(135deg,#2F80EA_0%,#236FDE_48%,#1454C5_100%)] px-4 pb-5 pt-4 text-white shadow-[0_5px_18px_rgba(26,75,148,0.10)]">
        <div className="mx-auto flex w-full max-w-3xl items-center gap-3">
          <button
            type="button"
            aria-label="Go back"
            onClick={() => navigate(-1)}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/15 text-white active:scale-95"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>

          <form
            className="relative min-w-0 flex-1"
            onSubmit={(event) => {
              event.preventDefault();
              commitSearch(query);
            }}
          >
            <Search className="pointer-events-none absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-[#7E8AA1]" />
            <input
              autoFocus
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onBlur={() => query.trim() && commitSearch(query)}
              placeholder="Search templates"
              maxLength={50}
              className="h-12 w-full rounded-2xl border-0 bg-white pl-11 pr-11 text-[14px] font-medium text-[#1A2232] outline-none placeholder:text-[#8D98AD] dark:bg-[#172033] dark:text-white"
            />
            {query ? (
              <button
                type="button"
                onClick={() => setQuery("")}
                aria-label="Clear search"
                className="absolute right-3 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full text-[#8290A8]"
              >
                <X className="h-4 w-4" />
              </button>
            ) : null}
          </form>
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl px-4 py-5">
        {!query.trim() ? (
          <section>
            <div className="mb-4 flex items-center justify-between">
              <h1 className="text-[15px] font-bold">Recent searches</h1>
              {recentSearches.length ? (
                <button
                  type="button"
                  onClick={clearRecent}
                  className="text-[12px] font-semibold text-[#0875F5]"
                >
                  Clear
                </button>
              ) : null}
            </div>

            {recentSearches.length ? (
              <div className="space-y-1">
                {recentSearches.map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => commitSearch(item)}
                    className="flex w-full items-center gap-3 rounded-xl px-1 py-3 text-left active:bg-black/[0.03] dark:active:bg-white/[0.04]"
                  >
                    <Clock3 className="h-[18px] w-[18px] shrink-0 text-[#8A95AA]" />
                    <span className="min-w-0 flex-1 truncate text-[14px] font-medium text-[#202737] dark:text-[#E7EBF3]">
                      {item}
                    </span>
                    <ArrowUpRight className="h-4 w-4 shrink-0 text-[#8A95AA]" />
                  </button>
                ))}
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-[#DCE3EE] px-4 py-7 text-center text-[13px] font-medium text-[#8A95AA] dark:border-[#293448]">
                Your recent template searches will appear here.
              </div>
            )}
          </section>
        ) : (
          <section>
            <ListOfGenaraltemp
              templates={filteredTemplates}
              loading={false}
              searchQuery={query}
              companyName=""
            />
          </section>
        )}
      </main>
    </div>
  );
}
