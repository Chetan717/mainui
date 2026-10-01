import { useState, useEffect, useMemo, useCallback } from "react";
import topbg from "../../../public/topupline_bg.webp"
import {
  IMAGE_MAX_SIZE_BYTES,
  IMAGE_SIZE_LIMIT_MESSAGE,
} from "../../lib/fileValidation";
// ── inline SVG icons (no image asset needed) ──────────────────────────────────
const IcoUpload = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="17 8 12 3 7 8" />
    <line x1="12" y1="3" x2="12" y2="15" />
  </svg>
);

const IcoCheck = () => (
  <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
    <path d="M2 6l3 3 5-5" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const IcoX = () => (
  <svg width="8" height="8" viewBox="0 0 12 12" fill="none">
    <path d="M2 2l8 8M10 2l-8 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

const IcoSearch = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8" />
    <path d="m21 21-4.35-4.35" />
  </svg>
);

const IcoChevLeft = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M15 18l-6-6 6-6" />
  </svg>
);

const IcoChevRight = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 18l6-6-6-6" />
  </svg>
);

const IcoImage = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="18" height="18" rx="2" />
    <circle cx="8.5" cy="8.5" r="1.5" />
    <path d="m21 15-5-5L5 21" />
  </svg>
);

const IcoClose = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 6 6 18M6 6l12 12" />
  </svg>
);

// ── constants ─────────────────────────────────────────────────────────────────
const PAGE_SIZE = 12;

const getSelectionLink = (item) =>
  typeof item === "string" ? item : item?.link || "";

const getSelectionSize = (item) =>
  typeof item === "string" ? "" : item?.size || "";

// ── Modal (plain div overlay — same pattern as rest of project) ───────────────
function PickerModal({ open, onClose, children }) {
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  if (!open) return null;

  return (
    <div
      data-keyboard-modal
      role="dialog"
      aria-modal="true"
      aria-label="Select top upline images"
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
    >
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      <div
        data-keyboard-modal-content
        className="relative w-full sm:max-w-lg bg-white dark:bg-gray-900 rounded-t-3xl sm:rounded-3xl shadow-2xl border border-gray-100 dark:border-gray-800 flex flex-col max-h-[92dvh] sm:max-h-[88vh] overflow-hidden z-10"
      >
        {children}
      </div>
    </div>
  );
}

// ── main component ────────────────────────────────────────────────────────────
export default function MultiImagePicker({
  companyImages   = [],   // [{link, name}]  ← topuplines data
  selectedLinks   = [],
  onToggleLink,
  customFiles     = [],
  onAddCustomFiles,
  onRemoveCustomFile,
  inputRef,
  companyGridCols = 3,
  thumbHeight     = "h-10",
  type,
  maxImages       = 15,
  inlineStrip     = false,
  processingBg    = false,
  hideUpload      = false,
}) {
  const [tab,           setTab]          = useState("company");
  const [open,          setOpen]         = useState(false);
  const [search,        setSearch]       = useState("");
  const [page,          setPage]         = useState(1);
  const [confirmRemove, setConfirmRemove] = useState(null);

  const totalSelected  = selectedLinks.length + customFiles.length;
  const allowed        = type === "Logo" ? 3 : maxImages;
  const isLimitReached = totalSelected >= allowed;
  const isTriggerDisabled = isLimitReached || processingBg;

  const handleOpen  = useCallback(() => { setTab("company"); setSearch(""); setPage(1); setOpen(true); }, []);
  const handleClose = useCallback(() => setOpen(false), []);

  const handleTriggerKeyDown = (event) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    if (!isTriggerDisabled) handleOpen();
  };

  useEffect(() => {
    if (isLimitReached && open) {
      const t = setTimeout(handleClose, 400);
      return () => clearTimeout(t);
    }
  }, [isLimitReached, open, handleClose]);

  useEffect(() => { setPage(1); }, [search]);

  // filter companyImages (topuplines) by name
const filtered = useMemo(() => {
  const q = search.trim().toLowerCase();
  if (!q) return companyImages;
  const words = q.split(/\s+/).filter(Boolean);
  return companyImages.filter((img) => {
    const name = (img.name || "").toLowerCase();
    return words.some((w) => name.includes(w));
  });
}, [companyImages, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage   = Math.min(page, totalPages);
  const pageItems  = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const pageNumbers = useMemo(() => {
    const nums = Array.from({ length: totalPages }, (_, i) => i + 1)
      .filter((p) => p === 1 || p === totalPages || Math.abs(p - safePage) <= 1);
    return nums.reduce((acc, p, i, arr) => {
      if (i > 0 && p - arr[i - 1] > 1) acc.push("…");
      acc.push(p);
      return acc;
    }, []);
  }, [totalPages, safePage]);

  const colClass = companyGridCols === 4 ? "grid-cols-4" : "grid-cols-3";

  // ── trigger ───────────────────────────────────────────────────────────────
  const trigger = inlineStrip ? (
    <div
      role="button"
      tabIndex={isTriggerDisabled ? -1 : 0}
      aria-disabled={isTriggerDisabled}
      aria-label="Add Top Upline or Seniors Image / टॉप अपलाइन या सीनियर्स की इमेज जोड़ें"
      onClick={() => {
        if (!isTriggerDisabled) handleOpen();
      }}
      onKeyDown={handleTriggerKeyDown}
      className={`w-full flex items-center gap-2 rounded-2xl border border-gray-200 dark:border-gray-700 p-2 transition focus:outline-none focus:ring-2 focus:ring-accent/30 ${
        isTriggerDisabled
          ? "cursor-not-allowed opacity-60"
          : "cursor-pointer hover:border-accent/60 hover:bg-accent/5"
      }`}
    >
      <div className="flex-1 min-w-0 flex items-center gap-2 overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
        {totalSelected === 0 && (
          <span className="text-[11px] text-gray-400 px-2 py-3">
            Tap anywhere to add an image / इमेज जोड़ने के लिए बॉक्स पर टैप करें
          </span>
        )}
       {selectedLinks.map((item, i) => {
  const link = getSelectionLink(item);
  return (
    <div key={link || `sel-${i}`} className="relative w-15 h-15 flex-shrink-0">
      <img src={link} alt="" className="w-14 h-14 p-1 rounded-full object-cover border border-2 border-yellow-400" />
      <button type="button"
        onClick={(event) => {
          event.stopPropagation();
          setConfirmRemove({ action: () => onToggleLink(link) });
        }}
        className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full bg-rose-500 text-white text-[9px] flex items-center justify-center shadow ring-2 ring-white dark:ring-gray-900" title="Remove">
        ✕
      </button>
    </div>
  );
})}
        {customFiles.map((item, i) => (
          <div key={item.previewURL || `cus-${i}`} className="relative flex-shrink-0">
            <img src={item.previewURL} alt="" className="w-14 h-14 rounded-full object-cover border-2 border-violet-300 dark:border-violet-500/50 bg-gray-100 dark:bg-gray-800" />
            <button type="button"
              onClick={(event) => {
                event.stopPropagation();
                setConfirmRemove({ action: () => onRemoveCustomFile(i) });
              }}
              className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full bg-rose-500 text-white text-[9px] flex items-center justify-center shadow ring-2 ring-white dark:ring-gray-900" title="Remove">
              ✕
            </button>
          </div>
        ))}
      </div>
      <button type="button" onClick={(event) => { event.stopPropagation(); handleOpen(); }} disabled={isTriggerDisabled}
        className="flex-shrink-0 w-14 h-14 rounded-full border-2 border-dashed border-gray-300 dark:border-gray-600 hover:border-violet-400 hover:bg-violet-50 dark:hover:bg-violet-500/10 flex items-center justify-center transition text-gray-400 hover:text-violet-500 disabled:opacity-40 disabled:cursor-not-allowed"
        title={isLimitReached ? "Limit reached" : processingBg ? "Processing…" : "Add image"}>
        {processingBg
          ? <svg className="animate-spin w-5 h-5 text-violet-500" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" /></svg>
          : <IcoUpload />}
      </button>
    </div>
  ) : (
    <button type="button" onClick={handleOpen}
      className="w-full flex items-center gap-2.5 px-4 py-3 rounded-2xl border-2 border-dashed border-gray-200 dark:border-gray-700 hover:border-violet-400 bg-gray-50/50 dark:bg-gray-800/30 hover:bg-violet-50 dark:hover:bg-violet-500/10 cursor-pointer transition-all duration-200 group">
      <div className="w-9 h-9 rounded-xl bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 group-hover:bg-violet-100 dark:group-hover:bg-violet-500/20 group-hover:border-violet-300 flex items-center justify-center transition-all duration-200 flex-shrink-0 text-gray-400 group-hover:text-violet-500">
        <IcoUpload />
      </div>
      <div className="flex-1 text-left">
        <p className="text-[13px] font-semibold text-gray-800 dark:text-gray-200 group-hover:text-[#0088DA] dark:group-hover:text-violet-400 transition-colors">
          {totalSelected > 0 ? `${totalSelected} image${totalSelected > 1 ? "s" : ""} selected` : "Select Image"}
        </p>
        <p className="text-[10px] text-gray-400 dark:text-gray-500">
          {totalSelected > 0 ? `Tap to manage · max ${allowed}` : `From company topup lines or upload · max ${allowed}`}
        </p>
      </div>
      {totalSelected > 0 && (
        <div className="w-6 h-6 rounded-full bg-violet-100 dark:bg-violet-500/20 border border-violet-200 dark:border-violet-500/30 flex items-center justify-center flex-shrink-0">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-[#0088DA] dark:text-violet-400">
            <path d="M20 6 9 17l-5-5" />
          </svg>
        </div>
      )}
    </button>
  );

  return (
    <>
      {trigger}

      <PickerModal open={open} onClose={handleClose}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-gray-100 dark:border-gray-800 flex-shrink-0">
          <div>
            <h2 className="text-[17px] font-bold text-gray-900 dark:text-white">Select Images / इमेज चुनें</h2>
            <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5">{totalSelected} of {allowed} selected</p>
          </div>
          <button type="button" onClick={handleClose}
            className="w-8 h-8 flex items-center justify-center rounded-xl text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
            <IcoClose />
          </button>
        </div>

        {/* Scrollable body */}
        <div
          data-keyboard-modal-scroll
          className="flex flex-col gap-4 p-5 overflow-y-auto flex-1 min-h-0"
        >

          {/* Tab bar — hidden when upload is disabled */}
          {!hideUpload && (
            <div className="flex gap-1.5 p-1 bg-gray-100 dark:bg-gray-800/60 rounded-2xl flex-shrink-0">
              {[
                { key: "company", label: "Company Photos / कंपनी फोटो" },
                { key: "upload",  label: "Upload New / नई अपलोड करें"  },
              ].map(({ key, label }) => (
                <button key={key} type="button" onClick={() => setTab(key)}
                  className={`flex-1 py-2 px-3 rounded-xl text-[12px] font-bold transition-all duration-200 ${
                    tab === key
                      ? "bg-[#0088DA] text-white shadow-md"
                      : "text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
                  }`}>
                  {label}
                </button>
              ))}
            </div>
          )}

          {/* ── Company Photos tab ── */}
          {tab === "company" && (
            <>
              {/* Search */}
              <div className="relative flex-shrink-0">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
                  <IcoSearch />
                </span>
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by name / नाम से खोजें…"
                  aria-label="Search top upline by name"
                  autoComplete="off"
                  enterKeyHint="search"
                  className="w-full pl-9 pr-9 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/60 text-[13px] text-gray-800 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-violet-400/40 focus:border-violet-400 transition"
                />
                {search && (
                  <button type="button" onClick={() => setSearch("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition">
                    <IcoX />
                  </button>
                )}
              </div>

              {search.trim() && (
                <p className="text-[11px] text-gray-400 -mt-2 flex-shrink-0">
                  {filtered.length === 0
                    ? `No results for "${search.trim()}"`
                    : `${filtered.length} result${filtered.length !== 1 ? "s" : ""} for "${search.trim()}"`}
                </p>
              )}

              {/* Grid */}
              {pageItems.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 gap-2">
                  <div className="w-12 h-12 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-400">
                    <IcoImage />
                  </div>
                  <p className="text-[12px] text-gray-400 font-medium">
                    {search.trim() ? "No images match your search" : "No topup line images found"}
                  </p>
                </div>
              ) : (
                <div className={`grid ${colClass} gap-2.5`}>
                  {pageItems.map((img, i) => {
                    const selected = selectedLinks.some(
                      (item) => getSelectionLink(item) === img.link,
                    );
                    return (
                      <button key={img.id || img.link || i} type="button"
                        onClick={() => {
                          if (!selected && isLimitReached) return;
                          onToggleLink(img.link, getSelectionSize(img));
                        }}
                        className={`relative border-2 rounded-xl overflow-hidden transition-all duration-150 flex flex-col ${
                          selected
                            ? "border-[#0088DA] shadow-md shadow-[#0088DA]/20 scale-95"
                            : isLimitReached
                              ? "border-gray-200 dark:border-gray-700 opacity-40 cursor-not-allowed"
                              : "border-gray-200 dark:border-gray-700 hover:border-[#0088DA] hover:scale-[0.97]"
                        }`}>
                        <div className="aspect-square w-full bg-gray-50 dark:bg-gray-800/60">
                          {img.link ? (
                            <img src={img.link} alt={img.name || ""} className="w-full h-full object-contain" loading="lazy" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <span className="text-[10px] text-gray-400">No image</span>
                            </div>
                          )}
                        </div>
                        {img.name && (
                          <div className="px-1.5 py-1 bg-white dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800">
                            <p className="text-[9px] font-semibold text-gray-700 dark:text-gray-300 truncate text-center leading-tight">
                              {img.name}
                            </p>
                          </div>
                        )}
                        {selected && (
                          <div className="absolute top-1 right-1 w-5 h-5 bg-[#0088DA] rounded-full flex items-center justify-center shadow">
                            <IcoCheck />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex flex-col gap-1.5 flex-shrink-0">
                  <div className="flex items-center justify-between">
                    <button type="button" onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={safePage === 1}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-xl border border-gray-200 dark:border-gray-700 text-[11px] font-semibold text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-30 disabled:cursor-not-allowed transition">
                      <IcoChevLeft /> Prev
                    </button>

                    <div className="flex items-center gap-1">
                      {pageNumbers.map((p, i) =>
                        p === "…" ? (
                          <span key={`dots-${i}`} className="text-[11px] text-gray-400 w-5 text-center">…</span>
                        ) : (
                          <button key={p} type="button" onClick={() => setPage(p)}
                            className={`w-7 h-7 rounded-lg text-[11px] font-bold transition-all ${
                              p === safePage
                                ? "bg-[#0088DA] text-white shadow shadow-violet-500/20"
                                : "text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800"
                            }`}>
                            {p}
                          </button>
                        )
                      )}
                    </div>

                    <button type="button" onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      disabled={safePage === totalPages}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-xl border border-gray-200 dark:border-gray-700 text-[11px] font-semibold text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-30 disabled:cursor-not-allowed transition">
                      Next <IcoChevRight />
                    </button>
                  </div>
                  <p className="text-center text-[10px] text-gray-400">
                    Page {safePage} of {totalPages} · {filtered.length} image{filtered.length !== 1 ? "s" : ""}
                  </p>
                </div>
              )}
            </>
          )}

          {/* ── Upload tab ── */}
          {!hideUpload && tab === "upload" && (
            <div className="flex flex-col gap-3">
              <button type="button"
                disabled={isLimitReached || processingBg}
                onClick={() => { if (!isLimitReached && !processingBg) inputRef.current?.click(); }}
                className={`flex items-center gap-3 px-4 py-3 rounded-2xl border-2 border-dashed transition-all duration-200 ${
                  isLimitReached || processingBg
                    ? "border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/30 opacity-50 cursor-not-allowed"
                    : "border-gray-200 dark:border-gray-700 hover:border-violet-400 bg-gray-50 dark:bg-gray-800/30 hover:bg-violet-50 dark:hover:bg-violet-500/10 cursor-pointer group"
                }`}>
                <div className="w-9 h-9 rounded-xl bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 group-hover:bg-violet-100 dark:group-hover:bg-violet-500/20 group-hover:border-violet-300 flex items-center justify-center flex-shrink-0 transition-all text-gray-400 group-hover:text-violet-500">
                  {processingBg
                    ? <svg className="animate-spin w-4 h-4 text-violet-500" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" /></svg>
                    : <IcoUpload />}
                </div>
                <div className="text-left">
                  <p className="text-[13px] font-semibold text-gray-800 dark:text-gray-200 group-hover:text-[#0088DA] dark:group-hover:text-violet-400 transition-colors">
                    {isLimitReached ? "Image limit reached / सीमा पूरी हुई" : processingBg ? "Processing image… / इमेज प्रोसेस हो रही है…" : "Choose from gallery / गैलरी से चुनें"}
                  </p>
                  <p className="text-[10px] text-gray-400">JPG, PNG · max {allowed}</p>
                </div>
              </button>

              <input ref={inputRef} type="file" accept="image/jpeg,image/png,.jpg,.jpeg,.png" className="hidden"
                onChange={(e) => {
                  const files = Array.from(e.target.files || []);
                  if (!files.length || totalSelected >= allowed) return;
                  const file = files[0];
                  const allowedMimes = ["image/jpeg", "image/png"];
                  const ext = file.name.split(".").pop()?.toLowerCase();
                  if (!allowedMimes.includes(file.type) && ext !== "jpg" && ext !== "jpeg" && ext !== "png") {
                    alert("Only JPG and PNG images are allowed.");
                    e.target.value = "";
                    return;
                  }
                  if (file.size > IMAGE_MAX_SIZE_BYTES) {
                    alert(IMAGE_SIZE_LIMIT_MESSAGE);
                    e.target.value = "";
                    return;
                  }
                  onAddCustomFiles([file]);
                  e.target.value = "";
                  handleClose();
                }}
              />

              {customFiles.length > 0 && (
                <div className={`grid ${colClass} gap-2.5`}>
                  {customFiles.map((item, i) => (
                    <div key={i} className="relative border-2 border-violet-400/40 rounded-xl overflow-hidden aspect-square">
                      <img src={item.previewURL} alt="" className={`w-full ${thumbHeight} object-contain bg-gray-50 dark:bg-gray-800/60`} />
                      <button type="button"
                        onClick={() => setConfirmRemove({ action: () => onRemoveCustomFile(i) })}
                        className="absolute top-1 right-1 w-5 h-5 bg-red-500/80 hover:bg-red-500 rounded-full flex items-center justify-center transition-colors shadow text-white">
                        <IcoX />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Count indicator */}
          <div className={`flex items-center justify-center gap-1.5 py-2 rounded-xl flex-shrink-0 ${
            isLimitReached
              ? "bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20"
              : "bg-gray-50 dark:bg-gray-800/40"
          }`}>
            {isLimitReached ? (
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="text-red-500">
                <circle cx="12" cy="12" r="10" /><path d="M12 8v4M12 16h.01" />
              </svg>
            ) : (
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-violet-500">
                <path d="M20 6 9 17l-5-5" />
              </svg>
            )}
            <p className={`text-[11px] font-bold ${isLimitReached ? "text-red-500" : "text-[#0088DA] dark:text-violet-400"}`}>
              {totalSelected} / {allowed} {isLimitReached ? "— limit reached" : "images selected"}
            </p>
          </div>

          {/* Done */}
          <button type="button" onClick={handleClose}
            className="w-full py-3 rounded-2xl bg-[#0088DA] hover:bg-violet-700 text-white text-[14px] font-bold transition-all active:scale-[0.98] shadow-lg shadow-violet-500/20 flex-shrink-0">
            Done
          </button>
        </div>
      </PickerModal>

      {/* ── Confirm Remove ── */}
      {confirmRemove && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-xs rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 shadow-2xl p-5 flex flex-col gap-4">
            <div className="flex flex-col items-center gap-2 text-center">
              <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-500/15 flex items-center justify-center">
                <svg className="w-6 h-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916" />
                </svg>
              </div>
              <p className="text-[15px] font-bold text-gray-900 dark:text-white">Remove Image?</p>
              <p className="text-[12px] text-gray-500 dark:text-gray-400">This image will be removed from your selection.</p>
            </div>
            <div className="flex gap-2.5">
              <button type="button" onClick={() => setConfirmRemove(null)}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-[13px] font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition">
                Cancel
              </button>
              <button type="button" onClick={() => { confirmRemove.action(); setConfirmRemove(null); }}
                className="flex-1 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-white text-[13px] font-bold transition shadow-sm">
                Remove
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
