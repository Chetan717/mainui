// ImageAudioToVideo.jsx
// 📦 npm install @ffmpeg/ffmpeg @ffmpeg/util
//
// ⚠️  Required server headers (vite.config.js / next.config.js):
//    'Cross-Origin-Opener-Policy': 'same-origin'
//    'Cross-Origin-Embedder-Policy': 'require-corp'

import { useRef, useState, useCallback, useEffect } from "react";
import { validateUploadFile } from "../lib/fileValidation";
import { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile, toBlobURL } from "@ffmpeg/util";

// ─── Helpers ──────────────────────────────────────────────────────────────────
const formatBytes = (bytes) => {
  if (!bytes) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
};

const formatDuration = (secs) => {
  if (!secs || isNaN(secs)) return "--:--";
  const m = Math.floor(secs / 60).toString().padStart(2, "0");
  const s = Math.floor(secs % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
};

/**
 * FIX #1 — Reliably get audio duration via a Promise
 * (avoids the race condition where loadedmetadata fires before we attach the listener)
 */
const getAudioDuration = (file) =>
  new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const audio = new Audio();
    audio.preload = "metadata";
    audio.onloadedmetadata = () => {
      URL.revokeObjectURL(url);
      resolve(isFinite(audio.duration) ? audio.duration : null);
    };
    audio.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Could not read audio metadata."));
    };
    audio.src = url;
  });

// ─── DropZone ─────────────────────────────────────────────────────────────────
const DropZone = ({ accept, icon, label, hint, file, preview, onFile, disabled }) => {
  const inputRef = useRef();
  const [dragging, setDragging] = useState(false);

  const handleDrop = useCallback(
    (e) => {
      e.preventDefault();
      setDragging(false);
      if (disabled) return;
      const f = e.dataTransfer.files[0];
      if (f) onFile(f);
    },
    [disabled, onFile]
  );

  return (
    <div
      className={`relative rounded-2xl border-2 border-dashed transition-all duration-300 cursor-pointer overflow-hidden group
        ${dragging ? "border-violet-400 bg-violet-950/30 scale-[1.02]" : "border-white/10 hover:border-violet-500/50 bg-white/[0.03]"}
        ${disabled ? "opacity-40 cursor-not-allowed" : ""}
      `}
      style={{ minHeight: 180 }}
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      onClick={() => !disabled && inputRef.current?.click()}
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => e.target.files[0] && onFile(e.target.files[0])}
        disabled={disabled}
      />
      {preview && accept.startsWith("image") && (
        <img
          src={preview}
          alt="preview"
          className="absolute inset-0 w-full h-full object-cover opacity-30 group-hover:opacity-40 transition-opacity"
        />
      )}
      <div className="relative z-10 flex flex-col items-center justify-center gap-3 p-6 h-full min-h-[180px]">
        {file ? (
          <>
            <div className="w-12 h-12 rounded-xl bg-violet-500/20 border border-violet-400/30 flex items-center justify-center text-2xl">
              {accept.startsWith("image") ? "🖼️" : "🎵"}
            </div>
            <div className="text-center">
              <p className="text-white font-semibold text-sm truncate max-w-[200px]">{file.name}</p>
              <p className="text-white/40 text-xs mt-1">{formatBytes(file.size)}</p>
            </div>
            <span className="text-xs text-violet-400 border border-violet-500/30 px-3 py-1 rounded-full bg-violet-500/10">
              ✓ Ready · Click to change
            </span>
          </>
        ) : (
          <>
            <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-3xl
              group-hover:bg-violet-500/10 group-hover:border-violet-400/30 transition-all duration-300">
              {icon}
            </div>
            <div className="text-center">
              <p className="text-white/80 font-medium text-sm">{label}</p>
              <p className="text-white/30 text-xs mt-1">{hint}</p>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

// ─── ProgressBar ──────────────────────────────────────────────────────────────
const ProgressBar = ({ progress, label }) => (
  <div className="space-y-2">
    <div className="flex justify-between items-center">
      <span className="text-white/60 text-xs font-medium">{label}</span>
      <span className="text-violet-400 text-xs font-bold tabular-nums">{progress}%</span>
    </div>
    <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
      <div
        className="h-full bg-gradient-to-r from-violet-600 to-fuchsia-500 rounded-full transition-all duration-500 relative"
        style={{ width: `${progress}%` }}
      >
        <div className="absolute inset-0 bg-white/20 animate-pulse rounded-full" />
      </div>
    </div>
  </div>
);

// ─── Animated progress counter ────────────────────────────────────────────────
const useAnimatedProgress = (target) => {
  const [displayed, setDisplayed] = useState(0);
  useEffect(() => {
    let raf;
    const step = () => {
      setDisplayed((prev) => {
        const diff = target - prev;
        if (Math.abs(diff) < 0.5) return target;
        raf = requestAnimationFrame(step);
        return prev + diff * 0.12;
      });
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target]);
  return Math.round(displayed);
};

// ─── Main Component ───────────────────────────────────────────────────────────
export default function ImageAudioToVideo() {
  const [imageFile, setImageFile]         = useState(null);
  const [imagePreview, setImagePreview]   = useState(null);
  const [audioFile, setAudioFile]         = useState(null);
  const [audioDuration, setAudioDuration] = useState(null);
  const [durationLoading, setDurationLoading] = useState(false);

  const [status, setStatus]               = useState("idle");
  const [progressTarget, setProgressTarget] = useState(0);
  const [progressLabel, setProgressLabel] = useState("");
  const [logs, setLogs]                   = useState([]);
  const [outputUrl, setOutputUrl]         = useState(null);
  const [outputSize, setOutputSize]       = useState(null);
  const [errorMsg, setErrorMsg]           = useState("");

  const ffmpegRef = useRef(null);
  const displayProgress = useAnimatedProgress(progressTarget);

  // ── Image handler ──────────────────────────────────────────────────────────
  const handleImage = (file) => {
    const result = validateUploadFile(file, "image");
    if (!result.valid) {
      alert(result.error || "Invalid image file.");
      return;
    }

    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
    setOutputUrl(null);
  };

  // ── Audio handler — reliably await duration ────────────────────────────────
  const handleAudio = async (file) => {
    const result = validateUploadFile(file, "audio");
    if (!result.valid) {
      alert(result.error || "Invalid audio file.");
      return;
    }

    setAudioFile(file);
    setAudioDuration(null);
    setDurationLoading(true);
    setOutputUrl(null);
    try {
      const dur = await getAudioDuration(file);
      setAudioDuration(dur);
    } catch (e) {
      // console.warn("Duration read failed:", e);
    } finally {
      setDurationLoading(false);
    }
  };

  // ── Load FFmpeg (cached after first load) ─────────────────────────────────
  const loadFFmpeg = async () => {
    if (ffmpegRef.current) return ffmpegRef.current;
    const ffmpeg = new FFmpeg();

    ffmpeg.on("log", ({ message }) => {
      setLogs((prev) => [...prev.slice(-5), message]);
    });

    // Progress event is unreliable for short files — used only as a bonus bump.
    ffmpeg.on("progress", ({ progress: p }) => {
      const bump = Math.round(Math.min(Math.max(p, 0), 1) * 40) + 50; // 50–90
      setProgressTarget((prev) => Math.max(prev, bump));
    });

    const baseURL = "https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm";
    await ffmpeg.load({
      coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`,   "text/javascript"),
      wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, "application/wasm"),
    });

    ffmpegRef.current = ffmpeg;
    return ffmpeg;
  };

  // ── Create Video ──────────────────────────────────────────────────────────
  const createVideo = async () => {
    if (!imageFile || !audioFile) return;

    try {
      setStatus("loading-ffmpeg");
      setProgressTarget(5);
      setProgressLabel("Loading FFmpeg engine…");
      setLogs([]);
      setOutputUrl(null);
      setErrorMsg("");

      const ffmpeg = await loadFFmpeg();

      // Ensure duration is resolved before encoding
      let duration = audioDuration;
      if (!duration) {
        setProgressLabel("Reading audio duration…");
        duration = await getAudioDuration(audioFile);
        setAudioDuration(duration);
      }
      if (!duration || duration <= 0) {
        throw new Error("Could not determine audio duration. Try a different file.");
      }

      setStatus("processing");
      setProgressTarget(20);
      setProgressLabel("Writing files to memory…");

      const imgExt = imageFile.name.split(".").pop().toLowerCase() || "jpg";
      const audExt = audioFile.name.split(".").pop().toLowerCase() || "mp3";
      const imgName = `in_img.${imgExt}`;
      const audName = `in_aud.${audExt}`;

      await ffmpeg.writeFile(imgName, await fetchFile(imageFile));
      setProgressTarget(35);
      await ffmpeg.writeFile(audName, await fetchFile(audioFile));
      setProgressTarget(45);
      setProgressLabel("Encoding video…");

      /*
       * Key FFmpeg flags (all fixes explained):
       *
       * -t duration          → Video is EXACTLY as long as the audio (float seconds).
       *                        This is the primary guarantee for video = audio length.
       *
       * -vf scale=trunc(...) → libx264 requires EVEN width & height.
       *                        Any odd-dimension image (e.g. 101×200) silently crashes
       *                        without this filter. This is the #1 cause of "stuck" encodes.
       *
       * -preset ultrafast    → Much faster encoding; prevents the "stuck on small files"
       *                        feeling since the encoder doesn't stall on slow presets.
       *
       * -r 25                → Explicit fps prevents weird timestamp issues.
       *
       * -avoid_negative_ts   → Fixes pts problems on some audio codecs (AAC from OGG etc.)
       *
       * -shortest            → Belt-and-suspenders alongside -t.
       */
      await ffmpeg.exec([
        "-loop",      "1",
        "-framerate", "25",
        "-i",         imgName,
        "-i",         audName,
        "-t",         String(duration),
        "-vf",        "scale=trunc(iw/2)*2:trunc(ih/2)*2",
        "-c:v",       "libx264",
        "-preset",    "ultrafast",
        "-tune",      "stillimage",
        "-c:a",       "aac",
        "-b:a",       "192k",
        "-pix_fmt",   "yuv420p",
        "-r",         "25",
        "-shortest",
        "-avoid_negative_ts", "make_zero",
        "-movflags",  "+faststart",
        "output.mp4",
      ]);

      // exec() resolves = encoding is DONE. Always force 95 before file read.
      setProgressTarget(95);
      setProgressLabel("Reading output…");

      const data = await ffmpeg.readFile("output.mp4");
      const blob = new Blob([data.buffer], { type: "video/mp4" });

      if (blob.size < 1000) {
        throw new Error("Output file is too small — encoding may have failed. Check the console for FFmpeg logs.");
      }

      const url = URL.createObjectURL(blob);
      setOutputUrl(url);
      setOutputSize(blob.size);
      setProgressTarget(100);
      setProgressLabel("Done!");
      setStatus("done");

      // Cleanup — wrapped individually so one failure doesn't abort the rest
      try { await ffmpeg.deleteFile(imgName); } catch (_) {}
      try { await ffmpeg.deleteFile(audName); } catch (_) {}
      try { await ffmpeg.deleteFile("output.mp4"); } catch (_) {}

    } catch (err) {
      
      setErrorMsg("Something went wrong. Please try again.");
      setStatus("error");
    }
  };

  // ── Download ──────────────────────────────────────────────────────────────
  const downloadVideo = () => {
    if (!outputUrl) return;
    const a = document.createElement("a");
    a.href = outputUrl;
    a.download = `video_${Date.now()}.mp4`;
    a.click();
  };

  // ── Reset ─────────────────────────────────────────────────────────────────
  const reset = () => {
    setImageFile(null);
    setImagePreview(null);
    setAudioFile(null);
    setAudioDuration(null);
    setStatus("idle");
    setProgressTarget(0);
    setLogs([]);
    setOutputUrl(null);
    setOutputSize(null);
    setErrorMsg("");
  };

  const isProcessing = status === "loading-ffmpeg" || status === "processing";
  const canCreate    = imageFile && audioFile && !isProcessing && !durationLoading;

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white" style={{ fontFamily: "'Figtree', sans-serif" }}>

      {/* Ambient glow */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-20%] left-[10%] w-[600px] h-[600px] rounded-full bg-violet-900/20 blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[5%] w-[400px] h-[400px] rounded-full bg-fuchsia-900/15 blur-[100px]" />
      </div>

      <div className="relative z-10 max-w-2xl mx-auto px-4 py-12">

        {/* Header */}
        <div className="mb-10 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-violet-500/20 bg-violet-500/5 text-violet-300 text-xs font-medium mb-6"
            style={{ fontFamily: "'Figtree', sans-serif" }}>
            <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse" />
            CLIENT-SIDE · NO UPLOAD · FFMPEG.WASM
          </div>
          <h1 className="text-4xl font-bold tracking-tight text-white mb-3">
            Image <span className="text-violet-400">+</span> Audio
            <span className="block text-2xl font-light text-white/40 mt-1">→ Video</span>
          </h1>
          <p className="text-white/40 text-sm max-w-sm mx-auto leading-relaxed">
            Combine any image with your audio track and export a shareable MP4 — entirely in your browser.
          </p>
        </div>

        {/* Upload Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
          <DropZone
            accept="image/jpeg,image/png,.jpg,.jpeg,.png"
            icon="🖼️"
            label="Drop your image"
            hint="JPG, PNG supported"
            file={imageFile}
            preview={imagePreview}
            onFile={handleImage}
            disabled={isProcessing}
          />
          <DropZone
            accept="audio/*"
            icon="🎵"
            label="Drop your audio"
            hint="MP3, WAV, AAC, OGG, M4A"
            file={audioFile}
            onFile={handleAudio}
            disabled={isProcessing}
          />
        </div>

        {/* Info pills */}
        {(imageFile || audioFile) && (
          <div className="flex flex-wrap gap-3 mb-6">
            {imageFile && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs text-white/50">
                <span className="text-green-400">✓</span> Image ready
              </div>
            )}
            {audioFile && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs text-white/50">
                {durationLoading ? (
                  <>
                    <svg className="w-3 h-3 animate-spin text-violet-400" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Reading audio…
                  </>
                ) : (
                  <><span className="text-green-400">✓</span> Audio{audioDuration ? ` · ${formatDuration(audioDuration)}` : ""}</>
                )}
              </div>
            )}
            {imageFile && audioFile && audioDuration && !isProcessing && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-violet-500/10 border border-violet-500/20 text-xs text-violet-300">
                🎬 Output length: {formatDuration(audioDuration)}
              </div>
            )}
          </div>
        )}

        {/* Processing */}
        {isProcessing && (
          <div className="mb-6 p-5 rounded-2xl bg-white/[0.03] border border-white/10 space-y-4">
            <ProgressBar progress={displayProgress} label={progressLabel} />
            {logs.length > 0 && (
              <div className="text-[11px] text-white/20 leading-relaxed border-t border-white/5 pt-3 space-y-0.5 overflow-hidden"
                style={{ fontFamily: "'Figtree', sans-serif" }}>
                {logs.map((l, i) => <div key={i} className="truncate">{l}</div>)}
              </div>
            )}
          </div>
        )}

        {/* Error */}
        {status === "error" && (
          <div className="mb-6 p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-300 text-sm flex items-start gap-3">
            <span className="text-lg mt-0.5">⚠️</span>
            <div>
              <p className="font-semibold mb-1">Export failed</p>
              <p className="text-red-400/70 text-xs" style={{ fontFamily: "'Figtree', sans-serif" }}>{errorMsg}</p>
            </div>
          </div>
        )}

        {/* Output */}
        {status === "done" && outputUrl && (
          <div className="mb-6 rounded-2xl overflow-hidden border border-violet-500/20 bg-white/[0.02]">
            <video src={outputUrl} controls className="w-full" style={{ maxHeight: 320, background: "#000", display: "block" }} />
            <div className="px-5 py-4 flex items-center justify-between gap-4">
              <div>
                <p className="text-white font-semibold text-sm">Your video is ready 🎉</p>
                <p className="text-white/30 text-xs mt-0.5">
                  {formatBytes(outputSize)} · {formatDuration(audioDuration)} · MP4 / H.264 + AAC
                </p>
              </div>
              <button
                onClick={downloadVideo}
                className="flex-shrink-0 flex items-center gap-2 px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 transition-colors text-white font-semibold text-sm"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5 5-5M12 4v11" />
                </svg>
                Download
              </button>
            </div>
          </div>
        )}

        {/* Buttons */}
        <div className="flex gap-3">
          <button
            onClick={createVideo}
            disabled={!canCreate}
            className={`flex-1 py-4 rounded-2xl font-semibold text-sm flex items-center justify-center gap-2 transition-all duration-300
              ${canCreate
                ? "bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white shadow-lg shadow-violet-900/40 hover:scale-[1.01] active:scale-[0.99]"
                : "bg-white/5 text-white/20 cursor-not-allowed border border-white/10"
              }`}
          >
            {isProcessing ? (
              <>
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                {status === "loading-ffmpeg" ? "Loading Engine…" : "Encoding…"}
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.723v6.554a1 1 0 01-1.447.894L15 14M3 8a2 2 0 012-2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z" />
                </svg>
                Create Video
              </>
            )}
          </button>
          {(imageFile || audioFile || status !== "idle") && !isProcessing && (
            <button
              onClick={reset}
              className="px-4 py-4 rounded-2xl border border-white/10 text-white/40 hover:text-white/70 hover:border-white/20 transition-colors"
              title="Reset"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582M20 20v-5h-.581M5.635 19A9 9 0 104.582 9H4" />
              </svg>
            </button>
          )}
        </div>

        <p className="text-center text-white/15 text-xs mt-8" style={{ fontFamily: "'Figtree', sans-serif" }}>
          Processed locally · No data leaves your device
        </p>
      </div>
    </div>
  );
}
