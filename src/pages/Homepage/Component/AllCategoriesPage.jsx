import { useCallback, useMemo, useState } from "react";
import { ArrowLeft, Search } from "lucide-react";
import { useNavigate } from "react-router";
import { useGeneralData } from "../../../Context/GeneralContext";
import { EVERYDAY_MOMENTS_GROUP_KEY } from "../../../utils/everydayMoments";
import { HOME_CATEGORY_ITEMS, isEverydayCategory } from "./homeCategoryConfig";

export default function AllCategoriesPage() {
  const navigate = useNavigate();
  const { cachedTemplates, setSelType } = useGeneralData();
  const [query, setQuery] = useState("");

  const categories = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return HOME_CATEGORY_ITEMS;
    return HOME_CATEGORY_ITEMS.filter((item) =>
      item.label.toLowerCase().includes(normalized),
    );
  }, [query]);

  const openCategory = useCallback(
    (item) => {
      if (isEverydayCategory(item)) {
        navigate(`/alltemp?group=${encodeURIComponent(EVERYDAY_MOMENTS_GROUP_KEY)}`);
        return;
      }

      const group = (cachedTemplates || []).find((entry) => entry?.type === item.type);
      const first = group?.templates?.[0];
      const selection = {
        MainType: first?.MainType || "General",
        type: item.type,
        id: first?.id || "",
        serial: first?.serial || 0,
        ShowCaseForm: first?.ShowCaseForm,
        Subtype: first?.Subtype || "",
      };

      setSelType(selection);
      try {
        localStorage.setItem("selType", JSON.stringify(selection));
      } catch {
        // Context selection is enough for this navigation.
      }
      navigate("/alltemp");
    },
    [cachedTemplates, navigate, setSelType],
  );

  return (
    <div className="min-h-full bg-[#F5F7FC] text-[#141A28] dark:bg-[#0B0F19] dark:text-white">
      <header className="bg-[linear-gradient(135deg,#2F80EA_0%,#236FDE_48%,#1454C5_100%)] px-4 pb-4 pt-4 text-white">
        <div className="mx-auto flex w-full max-w-3xl items-center gap-3">
          <button
            type="button"
            onClick={() => navigate(-1)}
            aria-label="Go back"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white/15 active:scale-95"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-[17px] font-bold">All Templates</h1>
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl px-4 py-4">
        <div className="relative mb-6">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-[#8A95AA]" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search templates"
            className="h-12 w-full rounded-2xl border border-[#DCE3EE] bg-white pl-11 pr-4 text-[14px] font-medium text-[#202737] outline-none placeholder:text-[#8A95AA] focus:border-[#87B8FA] dark:border-[#2B364B] dark:bg-[#151D2B] dark:text-white"
          />
        </div>

        <div className="grid grid-cols-3 gap-x-5 gap-y-7 sm:grid-cols-4">
          {categories.map(({ type, label, Icon, ...item }) => (
            <button
              key={type}
              type="button"
              onClick={() => openCategory({ type, label, Icon, ...item })}
              className="flex min-w-0 flex-col items-center gap-2.5 text-center active:scale-[0.98]"
            >
              <span className="flex h-[60px] w-[60px] items-center justify-center rounded-full bg-white text-[#0875F5] shadow-[0_3px_14px_rgba(28,54,92,0.06)] dark:bg-[#171E2B] dark:text-[#70AFFF]">
                <Icon className="h-[21px] w-[21px]" strokeWidth={1.8} />
              </span>
              <span className="min-h-[28px] max-w-[92px] text-[11px] font-medium leading-[14px] text-[#5E6980] dark:text-[#B8C1D1]">
                {label}
              </span>
            </button>
          ))}
        </div>
      </main>
    </div>
  );
}
