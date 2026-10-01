import React, { useState, useCallback } from "react";
import captionsData from "../captions.json";
import { isBonanzaFlowType, isRankPromotionType } from "../utils/templateTypeConfig";

const categories = captionsData.categories;

export default function CaptionModal({
  isOpen,
  onClose,
  onDownload,
  achieverInfo,
  companyName,
}) {
  const [activeCat, setActiveCat] = useState(categories[0]?.id || "");
  const [copiedId, setCopiedId] = useState(null);
  const [expandedId, setExpandedId] = useState(null);

  const currentPosts = categories.find((c) => c.id === activeCat)?.posts || [];

  const achieverLine = achieverInfo?.name
    ? [
        isBonanzaFlowType(achieverInfo?.selectType)
          ? `आइए हम सभी मिलकर बधाई देते हैं ${achieverInfo.name} from ${achieverInfo.city} जिन्होनें कंपनी का ${achieverInfo.rankname} ${achieverInfo?.selectType === "Domestic_Trip" ? "DOMESTIC TRIP" : "BONANZA"} अचीव  किया है। \n\nBEST WISHES FROM \n${achieverInfo.fromwish}\n${achieverInfo.formdesignation}\n ${`MOB NO. : ${achieverInfo.formmobile}`}\n`
          : isRankPromotionType(achieverInfo?.selectType)
            ? `आइए हम सभी मिलकर बधाई देते हैं ${achieverInfo.name} from ${achieverInfo.city} जिन्होनें कंपनी का ${achieverInfo.rankname} RANK अचीव करके ${achieverInfo.amount} प्राप्त किया है। \n\nBEST WISHES FROM \n ${achieverInfo.fromwish}\n${achieverInfo.formdesignation}\n${`MOB NO. : ${achieverInfo.formmobile}`}\n`
            : null,
      ]
        .filter(Boolean)
        .join("  |  ")
    : null;

  const buildFullText = (post) => {
    const base = `${post.caption}\n`;
    return achieverLine
      ? `${base}\n${achieverLine}\n${post.hashtags}#${companyName}`
      : `${base}\n${post.hashtags}#${companyName}`;
  };

  const handleCopy = useCallback(
    async (post) => {
      const text = buildFullText(post);
      try {
        await navigator.clipboard.writeText(text);
      } catch {
        const ta = document.createElement("textarea");
        ta.value = text;
        ta.style.position = "fixed";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.focus();
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
      }
      setCopiedId(post.id + activeCat);
      setTimeout(() => setCopiedId(null), 2000);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [activeCat, achieverLine, companyName],
  );

  const handleDownload = () => {
    onClose();
    onDownload();
  };

  const handleCatChange = (catId) => {
    setActiveCat(catId);
    setExpandedId(null);
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[700] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-background dark:bg-[#141824] w-full sm:w-[92vw] sm:max-w-[460px] rounded-t-3xl sm:rounded-3xl border border-border shadow-2xl flex flex-col"
        style={{ maxHeight: "88vh" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Header ── */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3 flex-shrink-0">
          <div>
            <h3 className="text-base font-bold text-foreground">
              🚀 AI Captions / एआई कैप्शन
            </h3>
            <p className="text-sm text-muted-foreground mt-0.5">
              डिज़ाइन पोस्ट करते समय इस्तेमाल करने के लिए एक कैप्शन कॉपी करें।
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full text-muted-foreground hover:bg-muted transition-colors"
            aria-label="Close"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
            >
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="mx-5 mb-3 rounded-xl border border-accent/20 bg-accent/10 px-3 py-2.5 flex items-start gap-2">
          <span className="w-5 h-5 rounded-full bg-accent text-white text-[10px] font-bold flex items-center justify-center shrink-0">i</span>
          <p className="text-[11px] leading-relaxed text-foreground/75">
            <span className="font-bold">3 easy steps:</span> Category चुनें → Caption देखें और Copy करें → Design Download करें।
          </p>
        </div>

        {/* ── Category Filter ── */}
        <div className="flex gap-2 px-5 pb-3 flex-shrink-0 overflow-x-auto scrollbar-hide" data-guide="caption-categories">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => handleCatChange(cat.id)}
              className={`flex-shrink-0 px-4 py-1.5 rounded-full text-xs font-semibold transition-all border ${
                activeCat === cat.id
                  ? "bg-accent text-background"
                  : "border-border text-muted-foreground"
              }`}
            >
              {cat.title}
            </button>
          ))}
        </div>

        {/* ── Caption List ── */}
        <div className="flex-1 overflow-y-auto px-4 pb-2 mt-2 space-y-3 min-h-0" data-guide="caption-list">
          {currentPosts.map((post) => {
            const uid = post.id + activeCat;
            const copied = copiedId === uid;
            const expanded = expandedId === uid;

            return (
              <div
                key={uid}
                className="rounded-2xl border border-border bg-accent/10 p-4 flex flex-col gap-2"
              >
                {/* Title */}
                <p className="text-xs font-semibold text-foreground/70 uppercase tracking-wide">
                  {post.title}
                </p>

                {/* Collapsed — 3 line preview always visible */}
                {!expanded && (
                  <p className="text-sm text-foreground leading-relaxed whitespace-pre-line line-clamp-3">
                    {post.caption}
                  </p>
                )}

                {/* Expanded — full preview box with achieverLine + hashtags */}
                {expanded && (
                  <div className="rounded-xl bg-background/60 border border-border/60 p-3 flex flex-col gap-2">
                    <p className="text-sm text-foreground leading-relaxed whitespace-pre-line">
                      {post.caption}
                    </p>
                    {achieverLine && (
                      <>
                        <div className="my-0.5" />
                        <p className="text-xs text-foreground leading-relaxed whitespace-pre-line font-medium">
                          {achieverLine}
                        </p>
                      </>
                    )}
                    <div className="border-t border-border/40 pt-1">
                      <p className="text-xs text-primary/80 font-medium break-all leading-relaxed">
                        {post.hashtags}#{companyName}
                      </p>
                    </div>
                  </div>
                )}

                {/* View Full Caption / Show Less toggle */}
                <button
                  onClick={() => setExpandedId(expanded ? null : uid)}
                  className="self-start flex items-center gap-1.5 text-xs font-semibold text-accent hover:opacity-70 transition-opacity"
                >
                  {expanded ? (
                    <>
                      <svg
                        width="12"
                        height="12"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <polyline points="18 15 12 9 6 15" />
                      </svg>
                      Show Less
                    </>
                  ) : (
                    <>
                      <svg
                        width="12"
                        height="12"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                      View Full Caption
                    </>
                  )}
                </button>

                {/* Copy button */}
                <button
                  onClick={() => handleCopy(post)}
                  data-guide="caption-copy"
                  className={`self-end flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                    copied
                      ? "bg-green-500 text-white"
                      : "bg-accent text-background hover:opacity-90"
                  }`}
                >
                  {copied ? (
                    <>
                      <svg
                        width="13"
                        height="13"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M20 6L9 17l-5-5" />
                      </svg>
                      Copied!
                    </>
                  ) : (
                    <>
                      <svg
                        width="13"
                        height="13"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <rect x="9" y="9" width="13" height="13" rx="2" />
                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                      </svg>
                      {"कॉपी / Copy"}
                    </>
                  )}
                </button>
              </div>
            );
          })}
        </div>

        {/* ── Footer ── */}
        <div className="px-5 pt-3 pb-5 flex-shrink-0 border-t border-border">
          <p className="text-xs text-muted-foreground text-center mb-3">
            ऊपर अपना कैप्शन कॉपी करें, फिर अपना डिज़ाइन डाउनलोड करें।
          </p>
          <button
            onClick={handleDownload}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl bg-accent text-background font-semibold text-sm hover:opacity-90 transition-opacity"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            Download Design
          </button>
        </div>
      </div>
    </div>
  );
}
