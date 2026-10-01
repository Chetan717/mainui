import { useRef, useState, useEffect } from "react";
import { toast } from "@heroui/react";
import { preloadBgModel, removeBg } from "../utils/removeBg";
import { validateUploadFile } from "../../../lib/fileValidation";
import RemoveBgLoadingOverlay from "./RemoveBgLoadingOverlay";

export default function ImageUploadWithBgRemove({
  onImageReady,
  setEditingImage,
  setOnImageDone,
  currentImage,
  onRequestReEdit,
  setOpen,
  open,
  type,
  editingType,
  setEditingType,
  setEnhanceEnabled,
  onProcessingChange,
  skipBackgroundRemoval = false,
  guideTarget,
}) {
  const inputRef = useRef();
  const abortRef = useRef(null);
  const processingRef = useRef(false);
  const processingIdRef = useRef(0);
  const processingStateRef = useRef({
    active: false,
    previewUrl: null,
    progressMessage: "",
    progressPct: 0,
    onCancel: null,
  });
  const [load, setLoad] = useState(false);
  const [progressMsg, setProgressMsg] = useState("Please wait…");
  const [progressPct, setProgressPct] = useState(0);
  const [dots, setDots] = useState("");
  const [processingPreview, setProcessingPreview] = useState(null);

  useEffect(() => {
    if (!load) { setDots(""); return; }
    const id = setInterval(() => {
      setDots((d) => (d.length >= 3 ? "" : d + "."));
    }, 400);
    return () => clearInterval(id);
  }, [load]);

  function getSelType() {
    try { return JSON.parse(localStorage.getItem("selType")) || {}; }
    catch { return {}; }
  }
  const selll = getSelType();
  const isAchv = selll?.type === "Achievements";

  const publishProcessing = (patch) => {
    const next = { ...processingStateRef.current, ...patch };
    processingStateRef.current = next;
    onProcessingChange?.(next);
  };

  const cancelRemoveBg = () => {
    processingIdRef.current += 1;
    processingRef.current = false;
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
    setLoad(false);
    setProgressMsg("Please wait…");
    setProgressPct(0);
    setProcessingPreview(null);
    publishProcessing({
      active: false,
      previewUrl: null,
      progressMessage: "",
      progressPct: 0,
      onCancel: null,
    });
    setEditingImage(null);
    setOnImageDone(null);
    setEnhanceEnabled?.(false);
    setOpen(false);
    toast("Background removal cancelled.");
  };

  const openFinalCrop = (image, canEnhance = false) => {
    const preview = image instanceof Blob ? URL.createObjectURL(image) : image;
    setEnhanceEnabled?.(canEnhance);
    setEditingImage(preview);
    setOnImageDone(() => (finalBlob) => {
      onImageReady(finalBlob);
      setEnhanceEnabled?.(false);
      setEditingImage(null);
      return true;
    });
    setOpen(true);
  };

  const removeBackgroundAfterCrop = (croppedBlob) => {
    if (!croppedBlob) return true;
    if (processingRef.current) return false;

    processingRef.current = true;
    const processingId = processingIdRef.current + 1;
    processingIdRef.current = processingId;
    const previewUrl = URL.createObjectURL(croppedBlob);
    setProcessingPreview(previewUrl);
    setLoad(true);
    setProgressMsg("AI आपकी फोटो तैयार कर रहा है…");
    setProgressPct(0);
    const controller = new AbortController();
    abortRef.current = controller;
    publishProcessing({
      active: true,
      previewUrl,
      progressMessage: "AI आपकी फोटो तैयार कर रहा है…",
      progressPct: 0,
      onCancel: cancelRemoveBg,
    });

    // The first crop is finished. Close that editor while AI is running so a
    // second tap cannot enqueue the same photo again. MeetingForm closes its
    // image-picker modal before this callback, so its parent-level loader keeps
    // the processing state visible even if this uploader is temporarily gone.
    setEditingImage(null);
    setOpen(false);

    (async () => {
      let finalImage = null;
      let completed = false;
      try {
        const processed = await removeBg(
          croppedBlob,
          (stage, pct) => {
            if (processingId !== processingIdRef.current) return;
            setProgressMsg(stage);
            setProgressPct(pct);
            publishProcessing({
              active: true,
              previewUrl,
              progressMessage: stage,
              progressPct: pct,
              onCancel: cancelRemoveBg,
            });
          },
          controller.signal,
        );
        if (
          controller.signal.aborted ||
          processingId !== processingIdRef.current
        ) return;
        finalImage = processed;
        completed = true;
        toast.success("Background removed successfully! ✨");
      } catch (err) {
        if (
          err?.name === "AbortError" ||
          controller.signal.aborted ||
          processingId !== processingIdRef.current
        ) return;
        
        console.error("[removeBg] Image processing failed:", err, err?.cause);
        toast.danger(
          "Background removal शुरू नहीं हो पाया. Photo दोबारा select करके Retry करें.",
        );

        // Never return the unchanged crop to another Done button. That looked
        // like a successful result and trapped users in an endless retry loop
        // whenever the AI runtime could not start. Exit cleanly to the form;
        // the original/background photo is still never accepted as output.
        setEnhanceEnabled?.(false);
        setEditingImage(null);
        setOnImageDone(null);
        setOpen(false);
      } finally {
        if (processingId === processingIdRef.current) {
          abortRef.current = null;
          processingRef.current = false;
          setLoad(false);
          setProgressMsg("Please wait…");
          setProgressPct(0);
          setProcessingPreview(null);
          publishProcessing({
            active: false,
            previewUrl: null,
            progressMessage: "",
            progressPct: 0,
            onCancel: null,
          });
        }
        URL.revokeObjectURL(previewUrl);
      }

      if (
        completed &&
        !controller.signal.aborted &&
        processingId === processingIdRef.current
      ) {
        openFinalCrop(finalImage, true);
        toast("Adjust the final crop, then tap Done.");
      }
    })();

    // The callback contract remains false for parents that decide whether to
    // close the current editor. This flow already closed it above and will open
    // a fresh final editor only after AI processing completes.
    return false;
  };

  const handleFile = (file) => {
    if (!file) return;
    const result = validateUploadFile(file, "image");
    if (!result.valid) {
      toast.danger(result.error || "Invalid image file.");
      return;
    }
    if (typeof setEditingType === "function") setEditingType(type);

    // Start downloading/initialising the free on-device model while the user
    // adjusts the first crop. removeBg() reuses this promise, so Done feels much
    // faster without uploading the selected photo anywhere.
    if (!skipBackgroundRemoval) {
      void preloadBgModel().catch(() => {
        // removeBg() performs a same-quality clean retry and shows any error.
      });
    }

    // Achievement images keep their existing one-crop flow and background.
    if (skipBackgroundRemoval) {
      openFinalCrop(file, false);
      return;
    }

    // Standard photo flow: crop the original first. Its Done callback removes
    // the background and reopens the result for a second/final crop.
    const preview = URL.createObjectURL(file);
    setEnhanceEnabled?.(false);
    setEditingImage(preview);
    setOnImageDone(() => removeBackgroundAfterCrop);
    setOpen(true);
  };

  const src = currentImage instanceof Blob ? URL.createObjectURL(currentImage) : currentImage;

  return (
    <div data-guide={guideTarget}>
      {/* Upload box — always visible, non-interactive while loading */}
      {currentImage ? (
        <div
          onClick={() => !load && inputRef.current?.click()}
          className={`relative w-full h-[150px] rounded-2xl border-2 border-accent/40 overflow-hidden shadow-md transition-opacity ${load ? "opacity-40 pointer-events-none" : "cursor-pointer group"}`}
        >
          <img
            src={src}
            alt="Uploaded"
            className="w-full h-full object-contain bg-muted/20"
          />
          {!load && (
            <div className="absolute inset-0 bg-accent/60 opacity-0 group-hover:opacity-100 transition-all duration-200 flex flex-col items-center justify-center gap-1.5 rounded-[14px]">
              <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="white"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L6.832 19.82a4.5 4.5 0 0 1-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 0 1 1.13-1.897L16.863 4.487Z" />
                </svg>
              </div>
              <p className="text-white text-[11px] font-bold">Tap to change</p>
            </div>
          )}
          <div className="absolute top-2 left-2 px-2 py-1 rounded-full bg-green-500/80 backdrop-blur-sm">
            <p className="text-[9px] font-bold text-white uppercase tracking-wide">
              Uploaded
            </p>
          </div>
        </div>
      ) : (
        <div
          onClick={() => !load && inputRef.current?.click()}
          className={`h-[150px] rounded-2xl border-2 border-dashed border-border bg-muted/20 transition-all duration-200 flex flex-col items-center justify-center gap-3 ${load ? "opacity-40 pointer-events-none" : "hover:border-accent/60 hover:bg-accent/5 cursor-pointer group"}`}
        >
          <div className="w-14 h-14 rounded-2xl bg-muted/40 border border-border group-hover:bg-accent/10 group-hover:border-accent/30 flex items-center justify-center transition-all duration-200">
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-muted-foreground group-hover:text-accent transition-colors"
            >
              <path d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Zm10.5-11.25h.008v.008h-.008V8.25Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
            </svg>
          </div>
          <div className="text-center">
            <p className="text-[10px] text-muted-foreground mt-0.5">
              {isAchv ? "JPG, PNG, WEBP supported" : "Add Photo"}
            </p>
          </div>
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files[0];
          if (typeof setEditingType === "function") setEditingType(type);
          if (file) handleFile(file);
          e.target.value = "";
        }}
      />

      {load && !onProcessingChange && (
        <RemoveBgLoadingOverlay
          previewUrl={processingPreview}
          progressMessage={`${progressMsg}${dots}`}
          progressPct={progressPct}
          onCancel={cancelRemoveBg}
        />
      )}
    </div>
  );
}
