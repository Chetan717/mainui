import { useState, useRef, useEffect } from "react";
import { Search, ChevronLeft, ChevronRight, X } from "lucide-react";

const PAGE_SIZE = 8;

export default function SearchablePicker({
  items,
  value,
  onChange,
  placeholder = "Search by name or mobile...",
  renderItem,
  getLabel,
  disabled = false,
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const ref = useRef(null);

  const filtered = items.filter((item) => {
    const q = search.toLowerCase().trim();
    if (!q) return true;
    return (
      (item.name || "").toLowerCase().includes(q) ||
      (item.mobile || "").includes(q)
    );
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageItems = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const selectedItem = items.find((i) => i.id === value);

  useEffect(() => {
    setPage(1);
  }, [search]);

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false);
        setSearch("");
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleSelect = (item) => {
    onChange(item.id);
    setOpen(false);
    setSearch("");
  };

  const handleClear = (e) => {
    e.stopPropagation();
    onChange("");
    setSearch("");
  };

  const toggleOpen = () => {
    if (disabled) return;
    setOpen((o) => !o);
  };

  return (
    <div className="relative bg-card dark:bg-gray-900" ref={ref}>
      <button
        type="button"
        onClick={toggleOpen}
        disabled={disabled}
        className="w-full flex items-center justify-between px-3 py-2 rounded-xl border border-border bg-background text-[13px] focus:outline-none focus:ring-2 focus:ring-accent/30 text-left disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <span className={selectedItem ? "text-foreground" : "text-muted-foreground truncate"}>
          {selectedItem
            ? getLabel
              ? getLabel(selectedItem)
              : `${selectedItem.name} · ${selectedItem.mobile}`
            : placeholder}
        </span>
        {selectedItem ? (
          <X
            className="w-3.5 h-3.5 text-muted-foreground shrink-0 ml-1 hover:text-foreground"
            onClick={handleClear}
          />
        ) : (
          <Search className="w-3.5 h-3.5 text-muted-foreground shrink-0 ml-1" />
        )}
      </button>

      {open && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-card dark:bg-gray-900 border border-border rounded-xl shadow-xl overflow-hidden">
          <div className="p-2 border-b border-border/50">
            <div className="flex items-center gap-2 bg-muted/40 rounded-lg px-2.5 py-1.5">
              <Search className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
              <input
                autoFocus
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name or mobile..."
                className="flex-1 bg-transparent text-[12px] outline-none text-foreground placeholder:text-muted-foreground"
              />
              {search && (
                <X
                  className="w-3 h-3 text-muted-foreground cursor-pointer hover:text-foreground"
                  onClick={() => setSearch("")}
                />
              )}
            </div>
          </div>

          <div className="max-h-52 overflow-y-auto">
            {pageItems.length === 0 ? (
              <div className="py-5 text-center text-[12px] text-muted-foreground">
                No results found
              </div>
            ) : (
              pageItems.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleSelect(item)}
                  className="w-full text-left px-3 py-2.5 hover:bg-muted/40 transition-colors border-b border-border/30 last:border-0"
                >
                  {renderItem ? (
                    renderItem(item)
                  ) : (
                    <div>
                      <p className="text-[12px] font-semibold text-foreground leading-tight">
                        {item.name}
                      </p>
                      <p className="text-[10px] text-muted-foreground">{item.mobile}</p>
                    </div>
                  )}
                </button>
              ))
            )}
          </div>

          {(totalPages > 1 || filtered.length > 0) && (
            <div className="flex items-center justify-between px-3 py-2 border-t border-border/50 bg-card dark:bg-gray-900">
              <span className="text-[10px] text-muted-foreground">
                {filtered.length} result{filtered.length !== 1 ? "s" : ""}
              </span>
              {totalPages > 1 && (
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="p-0.5 rounded disabled:opacity-30 hover:bg-muted/60 transition-colors"
                  >
                    <ChevronLeft className="w-3.5 h-3.5 text-muted-foreground" />
                  </button>
                  <span className="text-[10px] text-muted-foreground font-medium min-w-[32px] text-center">
                    {page}/{totalPages}
                  </span>
                  <button
                    type="button"
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="p-0.5 rounded disabled:opacity-30 hover:bg-muted/60 transition-colors"
                  >
                    <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
