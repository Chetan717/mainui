import { useEffect, useRef, useState } from "react";
import { celebrateDownload } from "../../utils/downloadCelebration";

const ACCENT = "#0088DA";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Poll an ImageKit AI-transformed URL until the image is ready.
// While processing, ImageKit returns an intermediate HTML page with a 200
// status, so we must inspect the content-type rather than the status alone.
async function pollForImage(url, { signal, maxAttempts = 48, intervalMs = 2500 } = {}) {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const resp = await fetch(url, { cache: "no-store", signal });
    const contentType = resp.headers.get("content-type") || "";

    if (resp.ok && contentType.startsWith("image/")) {
      return await resp.blob();
    }
    if (resp.ok) {
      // 200 + HTML => "asset is being prepared", keep polling.
      await sleep(intervalMs);
      continue;
    }
    // Non-OK: surface a readable error and stop.
    let detail = "";
    try {
      detail = (await resp.text()).slice(0, 200);
    } catch {
      detail = "";
    }
    throw new Error(`Generation failed (${resp.status}). ${detail}`.trim());
  }
  throw new Error("This is taking longer than expected. Please try again.");
}

const PROGRESS_MESSAGES = [
  "Uploading your image...",
  "Warming up the AI...",
  "Reimagining your design...",
  "Polishing the details...",
  "Almost there...",
];

export default function AiRetouchModal({ imageUri, onClose, onToast }) {
  // stage: "choose" | "loading" | "result"
  const [stage, setStage] = useState("choose");
  const [usePrompt, setUsePrompt] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [resultUrl, setResultUrl] = useState(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [progressIdx, setProgressIdx] = useState(0);
  const [lastMode, setLastMode] = useState("retouch");

  const abortRef = useRef(null);
  const objectUrlRef = useRef(null);

  // Cycle the friendly progress messages while loading.
  useEffect(() => {
    if (stage !== "loading") return;
    setProgressIdx(0);
    const id = setInterval(() => {
      setProgressIdx((i) => Math.min(i + 1, PROGRESS_MESSAGES.length - 1));
    }, 4000);
    return () => clearInterval(id);
  }, [stage]);

  // Clean up any object URL + in-flight request on unmount.
  useEffect(() => {
    return () => {
      if (abortRef.current) abortRef.current.abort();
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    };
  }, []);

  const runRetouch = async (mode) => {
    if (mode === "edit" && !prompt.trim()) {
      onToast?.("Please describe what you want to change.", "error");
      return;
    }
    setLastMode(mode);
    setErrorMsg("");
    setStage("loading");

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const resp = await fetch("/api/ai/retouch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          image: imageUri,
          mode,
          ...(mode === "edit" ? { prompt: prompt.trim() } : {}),
        }),
        signal: controller.signal,
      });

      if (!resp.ok) {
        let msg = "AI service error. Please try again.";
        try {
          const data = await resp.json();
          if (data?.message) msg = data.message;
        } catch {
          /* keep default */
        }
        throw new Error(msg);
      }

      const { url } = await resp.json();
      const blob = await pollForImage(url, { signal: controller.signal });

      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
      const objUrl = URL.createObjectURL(blob);
      objectUrlRef.current = objUrl;
      setResultUrl(objUrl);
      setStage("result");
    } catch (err) {
      if (err?.name === "AbortError") return;
      setErrorMsg("Something went wrong. Please try again.");
      setStage("choose");
      onToast?.("AI retouch failed. Please try again.", "error");
    } finally {
      abortRef.current = null;
    }
  };

  const cancelLoading = () => {
    if (abortRef.current) abortRef.current.abort();
    abortRef.current = null;
    setStage("choose");
  };

  const handleDownload = () => {
    if (!resultUrl) return;
    const link = document.createElement("a");
    link.href = resultUrl;
    link.download = `mlm-ai-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    celebrateDownload();
    onToast?.("AI image saved!", "success");
  };

  const handleShare = async () => {
    if (!resultUrl) return;
    try {
      const blob = await (await fetch(resultUrl)).blob();
      const file = new File([blob], `mlm-ai-${Date.now()}.png`, { type: blob.type });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: "My AI design" });
      } else {
        handleDownload();
      }
    } catch {
      /* user cancelled share — ignore */
    }
  };

  const tryAgain = () => {
    setResultUrl(null);
    setStage("choose");
  };

  const btnPrimary =
    "w-full h-12 rounded-2xl text-white text-sm font-semibold flex items-center justify-center gap-2 transition-opacity active:opacity-80 disabled:opacity-50";
  const btnGhost =
    "w-full h-12 rounded-2xl text-sm font-semibold border border-border text-foreground flex items-center justify-center gap-2 transition-colors hover:bg-muted active:opacity-80";

  return (
    <div
      className="fixed inset-0 z-[700] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={stage === "loading" ? undefined : onClose}
    >
      <div
        className="bg-background dark:bg-[#141824] w-full sm:w-[92vw] sm:max-w-[420px] rounded-t-3xl sm:rounded-3xl border border-border shadow-2xl max-h-[90vh] overflow-y-auto p-5"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span
              className="inline-flex items-center justify-center w-7 h-7 rounded-full text-white"
              style={{ backgroundColor: ACCENT }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 3l1.9 4.6L18.5 9l-4.6 1.9L12 15.5 10.1 10.9 5.5 9l4.6-1.4L12 3z" />
                <path d="M19 14l.8 2 .2.0M5 17l.6 1.6" />
              </svg>
            </span>
            <h3 className="text-base font-bold text-foreground">AI Touch-Up</h3>
          </div>
          {stage !== "loading" && (
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-full text-muted-foreground hover:bg-muted transition-colors"
              aria-label="Close"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        {/* ── CHOOSE STAGE ───────────────────────────────────────────────── */}
        {stage === "choose" && (
          <>
            <div className="rounded-2xl overflow-hidden border border-border bg-muted mb-4">
              <img src={imageUri} alt="Exported design" className="w-full h-auto block" />
            </div>

            <p className="text-xs text-muted-foreground mb-4 leading-relaxed">
              Your image is downloaded. Give it an AI touch-up — enhance it
              automatically, or describe a change in your own words.
            </p>

            {!usePrompt ? (
              <div className="space-y-2.5">
                <button
                  className={btnPrimary}
                  style={{ backgroundColor: ACCENT }}
                  onClick={() => runRetouch("retouch")}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 3l1.9 4.6L18.5 9l-4.6 1.9L12 15.5 10.1 10.9 5.5 9l4.6-1.4L12 3z" />
                  </svg>
                  Auto Enhance
                </button>
                <button className={btnGhost} onClick={() => setUsePrompt(true)}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
                  </svg>
                  Edit with a Prompt
                </button>
                <button
                  className="w-full h-11 rounded-2xl text-sm font-medium text-muted-foreground hover:bg-muted transition-colors"
                  onClick={onClose}
                >
                  Not now
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <label className="block text-xs font-semibold text-foreground">
                  Describe the change
                </label>
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  rows={3}
                  maxLength={300}
                  autoFocus
                  placeholder="e.g. add a soft golden festive glow in the background"
                  className="w-full rounded-2xl border border-border bg-background dark:bg-[#0f131d] p-3 text-sm text-foreground outline-none focus:border-[#0088DA] resize-none"
                />
                <div className="text-[11px] text-muted-foreground -mt-1">
                  {prompt.length}/300
                </div>
                <button
                  className={btnPrimary}
                  style={{ backgroundColor: ACCENT }}
                  onClick={() => runRetouch("edit")}
                  disabled={!prompt.trim()}
                >
                  Generate
                </button>
                <button
                  className="w-full h-11 rounded-2xl text-sm font-medium text-muted-foreground hover:bg-muted transition-colors"
                  onClick={() => setUsePrompt(false)}
                >
                  Back
                </button>
              </div>
            )}

            {errorMsg && (
              <p className="mt-3 text-xs text-red-500 leading-relaxed">{errorMsg}</p>
            )}
          </>
        )}

        {/* ── LOADING STAGE ──────────────────────────────────────────────── */}
        {stage === "loading" && (
          <div className="py-2">
            <div className="relative rounded-2xl overflow-hidden border border-border mb-5">
              <img
                src={imageUri}
                alt="Processing"
                className="w-full h-auto block opacity-40"
              />
              {/* sweeping shimmer */}
              <div className="ai-shimmer absolute inset-0" />
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span
                  className="ai-spin inline-block w-10 h-10 rounded-full border-[3px] border-white/40"
                  style={{ borderTopColor: "#fff" }}
                />
              </div>
            </div>

            <p className="text-center text-sm font-semibold text-foreground">
              {PROGRESS_MESSAGES[progressIdx]}
            </p>
            <p className="text-center text-xs text-muted-foreground mt-1">
              AI generation can take up to a minute.
            </p>

            <button
              className="mt-5 w-full h-11 rounded-2xl text-sm font-medium text-muted-foreground border border-border hover:bg-muted transition-colors"
              onClick={cancelLoading}
            >
              Cancel
            </button>
          </div>
        )}

        {/* ── RESULT STAGE ───────────────────────────────────────────────── */}
        {stage === "result" && resultUrl && (
          <>
            <div className="grid grid-cols-2 gap-2 mb-4">
              <div>
                <p className="text-[11px] font-medium text-muted-foreground mb-1 text-center">
                  Before
                </p>
                <div className="rounded-xl overflow-hidden border border-border bg-muted">
                  <img src={imageUri} alt="Before" className="w-full h-auto block" />
                </div>
              </div>
              <div>
                <p
                  className="text-[11px] font-semibold mb-1 text-center"
                  style={{ color: ACCENT }}
                >
                  After (AI)
                </p>
                <div className="rounded-xl overflow-hidden border-2" style={{ borderColor: ACCENT }}>
                  <img src={resultUrl} alt="After" className="w-full h-auto block" />
                </div>
              </div>
            </div>

            <div className="space-y-2.5">
              <button
                className={btnPrimary}
                style={{ backgroundColor: ACCENT }}
                onClick={handleDownload}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" />
                </svg>
                Save AI Image
              </button>
              <div className="grid grid-cols-2 gap-2.5">
                <button className={btnGhost} onClick={handleShare}>
                  Share
                </button>
                <button className={btnGhost} onClick={() => runRetouch(lastMode)}>
                  Regenerate
                </button>
              </div>
              <button
                className="w-full h-11 rounded-2xl text-sm font-medium text-muted-foreground hover:bg-muted transition-colors"
                onClick={tryAgain}
              >
                Try another style
              </button>
              <button
                className="w-full h-11 rounded-2xl text-sm font-medium text-muted-foreground hover:bg-muted transition-colors"
                onClick={onClose}
              >
                Done
              </button>
            </div>
          </>
        )}
      </div>

      <style>{`
        @keyframes aiSpin { to { transform: rotate(360deg); } }
        .ai-spin { animation: aiSpin 0.8s linear infinite; }
        @keyframes aiSweep {
          0% { transform: translateX(-120%); }
          100% { transform: translateX(120%); }
        }
        .ai-shimmer {
          background: linear-gradient(
            100deg,
            transparent 30%,
            rgba(255,255,255,0.35) 50%,
            transparent 70%
          );
          animation: aiSweep 1.6s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}
