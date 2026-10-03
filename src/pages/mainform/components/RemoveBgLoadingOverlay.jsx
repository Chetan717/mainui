import { useEffect, useState } from "react";
import { Spinner } from "@heroui/react";

const FRIENDLY_MESSAGES = [
  "AI is identifying the subject",
  "Separating the background",
  "Refining hair and fine edges",
  "Preparing a clean transparent photo",
];

export default function RemoveBgLoadingOverlay({
  previewUrl,
  progressMessage,
  progressPct = 0,
  onCancel,
  zIndex = "z-[99999]",
}) {
  const [messageIndex, setMessageIndex] = useState(0);
  const [displayPct, setDisplayPct] = useState(1);

  useEffect(() => {
    const id = window.setInterval(
      () => setMessageIndex((index) => (index + 1) % FRIENDLY_MESSAGES.length),
      4000,
    );
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    if (progressPct >= 100) {
      setDisplayPct(100);
      return undefined;
    }

    // The engine reports broad phases (often staying at 82/88 during the
    // longest inference). Drive the visible 1–99 counter smoothly by elapsed
    // time so users can always see that work is continuing.
    const startedAt = Date.now();
    setDisplayPct(1);
    const id = window.setInterval(() => {
      const elapsed = Date.now() - startedAt;
      const timeBasedPct = Math.min(99, 1 + Math.floor(elapsed / 350));
      setDisplayPct((current) => Math.max(current, timeBasedPct));
    }, 350);
    return () => window.clearInterval(id);
  }, [progressPct >= 100]);

  const safePct = Math.max(1, Math.min(100, Math.round(displayPct)));
  const steps = [
    { at: 1, label: "Prepare" },
    { at: 20, label: "Detect" },
    { at: 45, label: "Remove BG" },
    { at: 75, label: "Refine" },
    { at: 100, label: "Done" },
  ];

  return (
    <div
      className={`fixed inset-0 ${zIndex} flex items-center justify-center bg-black/70 backdrop-blur-sm p-3`}
      role="status"
      aria-live="polite"
      aria-label="AI photo processing in progress"
    >
      <div className="w-full max-w-sm max-h-[96vh] overflow-y-auto rounded-2xl bg-background border border-border shadow-2xl flex flex-col">
        <div className="flex items-center justify-between gap-3 bg-[linear-gradient(135deg,#2F80EA_0%,#236FDE_48%,#1454C5_100%)] px-4 py-3 text-white">
          <div>
            <p className="text-[15px] font-extrabold">Remove Background</p>
            <p className="text-[10px] text-white/80">
              Step 2 of 3 · Please keep this screen open
            </p>
          </div>
          <div className="flex items-center gap-2 rounded-full border border-white/20 bg-white/15 px-3 py-1.5">
            <Spinner color="white" size="sm" />
            <span className="text-[10px] font-bold text-white">Processing</span>
          </div>
        </div>

        <div className="flex flex-col gap-3 p-4">
          <div className="relative w-full h-[230px] overflow-hidden rounded-2xl border border-accent/25 bg-[linear-gradient(45deg,#e8edf3_25%,transparent_25%),linear-gradient(-45deg,#e8edf3_25%,transparent_25%),linear-gradient(45deg,transparent_75%,#e8edf3_75%),linear-gradient(-45deg,transparent_75%,#e8edf3_75%)] bg-[length:20px_20px] bg-[position:0_0,0_10px,10px_-10px,-10px_0px] dark:bg-muted/20">
            {previewUrl ? (
              <img
                src={previewUrl}
                alt="Photo being processed"
                className="h-full w-full object-contain"
              />
            ) : (
              <div className="h-full w-full flex items-center justify-center">
                <Spinner color="white" size="lg" />
              </div>
            )}
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-accent/5 via-transparent to-accent/10" />
            <div className="pointer-events-none absolute left-0 right-0 h-[2px] bg-accent/80 shadow-[0_0_14px_4px_rgba(0,136,218,0.35)] animate-[removebg-scan_1.1s_ease-in-out_infinite]" />
            <div className="absolute bottom-2 left-2 rounded-full bg-black/65 px-2.5 py-1 text-[9px] font-bold text-white backdrop-blur-sm">
              AI Preview
            </div>
          </div>

          <div className="text-center px-1">
            <p className="min-h-[22px] text-[13px] font-bold text-accent transition-all">
              {FRIENDLY_MESSAGES[messageIndex]}…
            </p>
        
            {progressMessage && (
              <p className="mt-1 text-[9px] text-muted-foreground/80">
                {progressMessage}
              </p>
            )}
          </div>

          <div className="w-full px-1">
            <div className="mb-3 flex items-start justify-between gap-1">
              {steps.map((step, index) => {
                const complete = safePct >= step.at;
                const active =
                  complete &&
                  (index === steps.length - 1 || safePct < steps[index + 1].at);
                return (
                  <div
                    key={step.label}
                    className="relative flex min-w-0 flex-1 flex-col items-center"
                  >
                    {index > 0 && (
                      <div
                        className={`absolute right-1/2 top-2 h-[2px] w-full ${complete ? "bg-accent" : "bg-border"}`}
                      />
                    )}
                    <div
                      className={`relative z-10 flex h-4 w-4 items-center justify-center rounded-full border-2 transition-all ${
                        complete
                          ? "border-accent bg-accent text-white"
                          : "border-border bg-background text-transparent"
                      } ${active ? "ring-4 ring-accent/15" : ""}`}
                    >
                      <span className="text-[8px]">✓</span>
                    </div>
                    <span
                      className={`mt-1 text-center text-[8px] leading-tight ${complete ? "font-bold text-accent" : "text-muted-foreground/60"}`}
                    >
                      {step.label}
                    </span>
                  </div>
                );
              })}
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-accent/15">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[#0088DA] via-cyan-400 to-[#0088DA] transition-[width] duration-700 ease-out"
                style={{ width: `${safePct}%` }}
              />
            </div>
            <div className="mt-1 flex items-center justify-between text-[10px] font-semibold">
              <span className="text-muted-foreground">AI Processing</span>
              <span className="text-accent">{safePct}%</span>
            </div>
          </div>

          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="w-full rounded-xl border border-border py-2.5 text-[12px] font-semibold text-muted-foreground transition hover:bg-muted/40 hover:text-foreground"
            >
              Cancel
            </button>
          )}
        </div>
      </div>

      <style>{`
        @keyframes removebg-scan {
          0% { top: 4%; opacity: .45; }
          50% { top: 94%; opacity: 1; }
          100% { top: 4%; opacity: .45; }
        }
      `}</style>
    </div>
  );
}
