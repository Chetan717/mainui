import { useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  Camera,
  CheckCircle2,
  ChevronDown,
  LoaderCircle,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  Upload,
  WalletCards,
  X,
} from "lucide-react";
import { toast } from "@heroui/react";
import { preparePrescriptionImage } from "../../lib/prescriptionImage";
import { readPrescription } from "../../services/askAiService";
import {
  ensureAskAiCredits,
  refundAskAiCredit,
  reserveAskAiCredit,
  subscribeAskAiCredits,
} from "../../services/askAiCreditService";
import { getUser } from "../../utils/authStorage";

const formatMb = (bytes) => `${(bytes / 1024 / 1024).toFixed(2)} MB`;

function EmptyResult({ analyzing }) {
  return (
    <div className="flex min-h-[360px] flex-col items-center justify-center px-6 text-center">
      <div className="relative flex h-20 w-20 items-center justify-center rounded-[28px] bg-gradient-to-br from-[#e9f4ff] via-[#f2edff] to-[#ffeef5] dark:from-blue-950 dark:via-violet-950 dark:to-fuchsia-950">
        {analyzing ? (
          <LoaderCircle className="h-9 w-9 animate-spin text-accent" />
        ) : (
          <Sparkles className="h-9 w-9 text-accent" />
        )}
        {analyzing && (
          <span className="absolute inset-0 animate-ping rounded-[28px] border border-accent/25" />
        )}
      </div>
      <h2 className="mt-5 font-display text-xl font-bold text-foreground">
        {analyzing
          ? "Reading your prescription…"
          : "AI response will appear here"}
      </h2>
      <p className="mt-2 max-w-sm text-sm leading-6 text-muted-foreground">
        {analyzing
          ? "Identifying visible names, strengths and written directions. Please keep this screen open."
          : "Upload one clear prescription image, then tap Ask AI."}
      </p>
      {analyzing && (
        <div className="mt-6 flex items-end gap-1.5" aria-label="Analyzing">
          {[0, 1, 2, 3].map((item) => (
            <span
              key={item}
              className="h-2 w-2 animate-bounce rounded-full bg-accent"
              style={{ animationDelay: `${item * 120}ms` }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function AskAi() {
  const inputRef = useRef(null);
  const [prepared, setPrepared] = useState(null);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [optimizing, setOptimizing] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [credit, setCredit] = useState(null);
  const [creditLoading, setCreditLoading] = useState(true);
  const mobileNo = getUser()?.mobileNo || "";

  useEffect(() => {
    let active = true;
    let unsubscribe = null;
    const start = async () => {
      try {
        const initial = await ensureAskAiCredits(mobileNo);
        if (!active) return;
        setCredit(initial);
        unsubscribe = await subscribeAskAiCredits(mobileNo, (next) => {
          if (active) setCredit(next);
        });
      } catch (nextError) {
        if (active)
          setError(
            nextError instanceof Error
              ? nextError.message
              : "Credits could not be loaded.",
          );
      } finally {
        if (active) setCreditLoading(false);
      }
    };
    start();
    return () => {
      active = false;
      unsubscribe?.();
    };
  }, [mobileNo]);

  useEffect(
    () => () => {
      if (prepared?.previewUrl) URL.revokeObjectURL(prepared.previewUrl);
    },
    [prepared],
  );

  const reset = () => {
    if (prepared?.previewUrl) URL.revokeObjectURL(prepared.previewUrl);
    setPrepared(null);
    setResult(null);
    setError("");
    if (inputRef.current) inputRef.current.value = "";
  };

  const selectFile = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setError("");
    setResult(null);
    setOptimizing(true);
    try {
      const next = await preparePrescriptionImage(file);
      if (prepared?.previewUrl) URL.revokeObjectURL(prepared.previewUrl);
      setPrepared(next);
    } catch (nextError) {
      const message =
        nextError instanceof Error
          ? nextError.message
          : "Unable to prepare this image. Please try again.";
      setError(message);
      toast.danger(message);
      event.target.value = "";
    } finally {
      setOptimizing(false);
    }
  };

  const analyze = async () => {
    if (!prepared || analyzing || creditLoading) return;
    if (!credit || credit.remainingCredits <= 0) {
      setError(
        "Your 30 free Ask AI credits are finished. New plans are coming soon.",
      );
      return;
    }
    setError("");
    setResult(null);
    setAnalyzing(true);
    let reserved = false;
    try {
      const nextCredit = await reserveAskAiCredit(mobileNo);
      reserved = true;
      setCredit(nextCredit);
      setResult(await readPrescription(prepared.blob));
    } catch (nextError) {
      if (reserved) {
        try {
          await refundAskAiCredit(mobileNo);
          setCredit(await ensureAskAiCredits(mobileNo));
        } catch {}
      }
      setError("Unable to read this prescription. Please try again.");
    } finally {
      setAnalyzing(false);
    }
  };

  const noCredits = !creditLoading && (credit?.remainingCredits ?? 0) <= 0;

  return (
    <main className="min-h-full bg-[radial-gradient(circle_at_top_left,rgba(0,136,218,0.08),transparent_32%),radial-gradient(circle_at_top_right,rgba(139,92,246,0.08),transparent_30%)] px-4 py-6 sm:px-6 sm:py-9">
      <style>{`@keyframes ai-shine { 0% { background-position: 200% center; } 100% { background-position: -200% center; } }`}</style>
      <div className="mx-auto max-w-5xl">
        <header className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-violet-500 text-white">
                <Sparkles className="h-4 w-4" />
              </span>
              MLM LIVE AI
            </div>
            {/* <h1 className="font-display text-3xl font-bold sm:text-4xl">
              <span className="bg-gradient-to-r from-[#087fd1] via-[#7257d9] to-[#d84f9b] bg-clip-text text-transparent">
                Hello, how can I help?
              </span>
            </h1> */}
            <p className="mt-2 text-sm text-muted-foreground">
              {/* Upload a prescription and get a clear reading of the visible text. */}
              Ai Feature Comming Soon. Please check back later
              for updates.
            </p>
          </div>

          {/* <div
            data-guide="ask-ai-credits"
            className="flex items-center gap-3 rounded-2xl border border-border bg-card/90 px-4 py-3 shadow-[var(--shadow-card)] backdrop-blur"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/10 text-accent">
              <WalletCards className="h-5 w-5" />
            </span>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Free credits
              </p>
              <p className="text-lg font-bold text-foreground">
                {creditLoading ? "—" : (credit?.remainingCredits ?? 0)}
                <span className="text-xs font-semibold text-muted-foreground">
                  {" "}
                  / 30 left
                </span>
              </p>
            </div>
          </div> */}
        </header>

        {/* <div className="mt-7 grid gap-5 lg:grid-cols-[0.88fr_1.12fr]">
          <section
            data-guide="ask-ai-upload"
            className="rounded-[28px] border border-border bg-card/95 p-4 shadow-[var(--shadow-elevated)] backdrop-blur sm:p-5"
          >
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="font-display text-lg font-bold text-foreground">
                  Add prescription
                </h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  One image · maximum 20 MB
                </p>
              </div>
              {prepared && (
                <button
                  onClick={reset}
                  className="rounded-xl p-2 text-muted-foreground transition hover:bg-surface-secondary"
                  aria-label="Remove image"
                >
                  <X className="h-5 w-5" />
                </button>
              )}
            </div>

            <input
              ref={inputRef}
              className="hidden"
              type="file"
              accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
              onChange={selectFile}
            />

            {!prepared ? (
              <button
                onClick={() => inputRef.current?.click()}
                disabled={optimizing || noCredits}
                className="group mt-4 flex min-h-[310px] w-full flex-col items-center justify-center rounded-[24px] border border-dashed border-accent/35 bg-gradient-to-b from-accent/[0.06] to-transparent px-7 text-center transition hover:border-accent/70 hover:from-accent/[0.1] disabled:cursor-not-allowed disabled:opacity-55"
              >
                <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-[#e8f4ff] to-[#eee9ff] text-accent transition group-hover:scale-105 dark:from-blue-950 dark:to-violet-950">
                  {optimizing ? (
                    <LoaderCircle className="h-8 w-8 animate-spin" />
                  ) : (
                    <Upload className="h-8 w-8" />
                  )}
                </span>
                <span className="mt-5 text-base font-bold text-foreground">
                  {optimizing
                    ? "Optimizing your image…"
                    : noCredits
                      ? "Free credits finished"
                      : "Upload prescription"}
                </span>
                <span className="mt-2 max-w-xs text-xs leading-5 text-muted-foreground">
                  Use a bright, straight photo. Include the full page and avoid
                  shadows or glare.
                </span>
                {!noCredits && (
                  <span className="mt-5 inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-xs font-bold text-foreground shadow-sm">
                    <Camera className="h-4 w-4 text-accent" /> Choose camera or
                    gallery
                  </span>
                )}
              </button>
            ) : (
              <div className="mt-4">
                <div className="relative overflow-hidden rounded-[22px] bg-black/[0.04] dark:bg-white/[0.04]">
                  <img
                    src={prepared.previewUrl}
                    alt="Selected prescription"
                    className="max-h-[390px] w-full object-contain"
                  />
                  <span className="absolute bottom-3 left-3 inline-flex items-center gap-1.5 rounded-full bg-black/65 px-3 py-1.5 text-[10px] font-bold text-white backdrop-blur">
                    <CheckCircle2 className="h-3.5 w-3.5" /> Optimized WEBP
                  </span>
                </div>
                <div className="mt-3 flex items-center justify-between rounded-xl bg-surface-secondary px-3 py-2 text-[11px] text-muted-foreground">
                  <span>
                    {prepared.width} × {prepared.height}px
                  </span>
                  <span>
                    {formatMb(prepared.originalBytes)} →{" "}
                    {formatMb(prepared.optimizedBytes)}
                  </span>
                </div>
                <button
                  data-guide="ask-ai-read"
                  onClick={analyze}
                  disabled={analyzing || creditLoading || noCredits}
                  className="relative mt-4 flex h-13 w-full items-center justify-center gap-2 overflow-hidden rounded-2xl bg-gradient-to-r from-[#087fd1] via-[#596fdc] to-[#8b5cd7] px-5 text-sm font-bold text-white shadow-lg shadow-blue-500/20 transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {analyzing ? (
                    <LoaderCircle className="h-5 w-5 animate-spin" />
                  ) : (
                    <Sparkles className="h-5 w-5" />
                  )}
                  {analyzing ? "Analyzing securely…" : "Ask AI · Use 1 credit"}
                </button>
              </div>
            )}

            {error && (
              <div
                role="alert"
                className="mt-4 flex gap-3 rounded-2xl border border-red-500/20 bg-red-500/[0.07] p-3.5 text-sm text-red-600 dark:text-red-300"
              >
                <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="mt-4 flex items-center justify-center gap-2 text-[11px] text-muted-foreground">
              <ShieldCheck className="h-4 w-4 text-emerald-500" /> Failed AI
              requests automatically return the reserved credit.
            </div>
          </section>

          <section
            data-guide="ask-ai-result"
            className="rounded-[28px] border border-border bg-card/95 p-4 shadow-[var(--shadow-elevated)] backdrop-blur sm:p-5"
            aria-live="polite"
          >
            {!result ? (
              <EmptyResult analyzing={analyzing} />
            ) : (
              <div>
                <div className="flex items-start justify-between gap-3 border-b border-border pb-4">
                  <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-violet-500 text-white">
                      <Sparkles className="h-5 w-5" />
                    </span>
                    <div>
                      <p className="text-xs font-bold text-accent">
                        MLM LIVE AI
                      </p>
                      <h2 className="font-display text-lg font-bold text-foreground">
                        Prescription reading
                      </h2>
                    </div>
                  </div>
                  <button
                    onClick={reset}
                    className="flex items-center gap-1.5 rounded-xl bg-surface-secondary px-3 py-2 text-xs font-bold text-foreground"
                  >
                    <RotateCcw className="h-3.5 w-3.5" /> New
                  </button>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
                  {[
                    ["Patient", result.patient_name],
                    ["Doctor", result.doctor_name],
                    ["Date", result.date],
                    ["Document", result.document_type],
                  ]
                    .filter(([, value]) => value)
                    .map(([label, value]) => (
                      <div
                        key={label}
                        className="rounded-2xl bg-surface-secondary p-3"
                      >
                        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                          {label}
                        </p>
                        <p className="mt-1 font-semibold text-foreground">
                          {value}
                        </p>
                      </div>
                    ))}
                </div>

                {result.medicines?.length > 0 && (
                  <div className="mt-5">
                    <h3 className="text-sm font-bold text-foreground">
                      Medicines visible
                    </h3>
                    <div className="mt-2 space-y-2">
                      {result.medicines.map((medicine, index) => (
                        <div
                          key={`${medicine.name}-${index}`}
                          className="rounded-2xl border border-border p-3.5"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <p className="font-bold text-foreground">
                              {medicine.name || "Unclear medicine"}
                            </p>
                            <span
                              className={`rounded-full px-2 py-1 text-[9px] font-bold uppercase ${medicine.confidence === "high" ? "bg-emerald-500/10 text-emerald-600" : medicine.confidence === "medium" ? "bg-amber-500/10 text-amber-600" : "bg-red-500/10 text-red-600"}`}
                            >
                              {medicine.confidence}
                            </span>
                          </div>
                          {medicine.strength && (
                            <p className="mt-1 text-xs font-semibold text-accent">
                              {medicine.strength}
                            </p>
                          )}
                          {medicine.directions && (
                            <p className="mt-2 text-sm leading-6 text-muted-foreground">
                              {medicine.directions}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {result.tests_and_advice?.length > 0 && (
                  <div className="mt-5">
                    <h3 className="text-sm font-bold text-foreground">
                      Tests / written advice
                    </h3>
                    <ul className="mt-2 space-y-2">
                      {result.tests_and_advice.map((item, index) => (
                        <li
                          key={index}
                          className="rounded-xl bg-surface-secondary px-3 py-2 text-sm text-foreground"
                        >
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="mt-5 rounded-2xl bg-gradient-to-br from-accent/[0.09] to-violet-500/[0.07] p-4">
                  <h3 className="text-sm font-bold text-foreground">
                    Simple explanation
                  </h3>
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-muted-foreground">
                    {result.plain_language_summary}
                  </p>
                </div>

                {result.unclear_text?.length > 0 && (
                  <div className="mt-4 rounded-2xl border border-amber-500/20 bg-amber-500/[0.08] p-4">
                    <h3 className="flex items-center gap-2 text-sm font-bold text-amber-700 dark:text-amber-200">
                      <AlertTriangle className="h-4 w-4" /> Verify unclear text
                    </h3>
                    <ul className="mt-2 list-inside list-disc text-sm leading-6 text-amber-700/80 dark:text-amber-100/80">
                      {result.unclear_text.map((item, index) => (
                        <li key={index}>{item}</li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="mt-4 rounded-2xl border border-red-500/20 bg-red-500/[0.07] p-4 text-xs leading-5 text-red-700 dark:text-red-200">
                  <strong>Safety:</strong>{" "}
                  {result.safety_notice ||
                    "AI can make mistakes. Confirm every medicine and dose with the prescribing doctor or pharmacist."}
                </div>

                <details className="mt-4 rounded-2xl border border-border p-3.5">
                  <summary className="flex cursor-pointer list-none items-center justify-between text-sm font-bold text-foreground">
                    Full visible transcription{" "}
                    <ChevronDown className="h-4 w-4" />
                  </summary>
                  <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-muted-foreground">
                    {result.transcription ||
                      "No reliable transcription available."}
                  </p>
                </details>
              </div>
            )}
          </section>
        </div> */}
      </div>
    </main>
  );
}
