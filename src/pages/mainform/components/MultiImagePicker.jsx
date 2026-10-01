import { useState, useEffect, useRef, useMemo } from "react";
import { Modal, toast } from "@heroui/react";
import { validateUploadFile } from "../../../lib/fileValidation";
import { preloadBgModel, removeBg } from "../utils/removeBg";
import ImageEditorCanvas from "./ImageEditorCanvas";
import photoupload from "./photoupload.png";
import RemoveBgLoadingOverlay from "./RemoveBgLoadingOverlay";

const IcoCheck = () => (
  <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
    <path
      d="M2 6l3 3 5-5"
      stroke="white"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const IcoX = () => (
  <svg width="8" height="8" viewBox="0 0 12 12" fill="none">
    <path
      d="M2 2l8 8M10 2l-8 8"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    />
  </svg>
);

export default function MultiImagePicker({
  companyImages,
  selectedLinks,
  onToggleLink,
  customFiles,
  onAddCustomFiles,
  onRemoveCustomFile,
  inputRef,
  companyGridCols = 4,
  thumbHeight = "h-10",
  maxImages = 15,
  inlineStrip = false,
}) {
  const [tab, setTab] = useState("company");
  const [open, setOpen] = useState(false);
  const internalRef = useRef(null);
  const effectiveRef = inputRef || internalRef;

  // Queue of raw files waiting for the two-crop background-removal flow.
  const [pendingQueue, setPendingQueue] = useState([]);
  // File currently going through initial crop -> removeBg -> final crop.
  const [activeFile, setActiveFile] = useState(null);
  const [editingImage, setEditingImage] = useState(null);
  const [bgLoading, setBgLoading] = useState(false);
  const [bgProgressMsg, setBgProgressMsg] = useState("");
  const [bgProgressPct, setBgProgressPct] = useState(0);
  const [bgPreviewUrl, setBgPreviewUrl] = useState(null);
  const [cropOpen, setCropOpen] = useState(false);
  const [cropStage, setCropStage] = useState(null);
  const abortRef = useRef(null);

  const handleClose = () => setOpen(false);

  // Tracks whether a file is currently being processed (removeBg/crop) so
  // newly selected files always append to the queue instead of racing to
  // become "active" based on a possibly-stale render snapshot.
  const processingRef = useRef(false);

  // Pulls the next file off the queue using functional state updates so it
  // never operates on a stale `pendingQueue` snapshot captured by an older
  // render (e.g. if more files were queued while a file was processing).
  const advanceQueue = () => {
    setPendingQueue((prev) => {
      if (!prev.length) {
        processingRef.current = false;
        return prev;
      }
      const [next, ...rest] = prev;
      setActiveFile(next);
      setEditingImage(URL.createObjectURL(next));
      setCropStage("initial");
      setCropOpen(true);
      return rest;
    });
  };

  const cancelActiveProcessing = () => {
    abortRef.current?.abort();
    abortRef.current = null;
    setBgLoading(false);
    setBgProgressMsg("");
    setBgProgressPct(0);
    setBgPreviewUrl(null);
    setCropOpen(false);
    setEditingImage(null);
    setCropStage(null);
    setActiveFile(null);
    advanceQueue();
    toast("Background removal cancelled.");
  };

  // Adds newly selected files to the queue, starting processing immediately
  // if nothing is currently in flight.
  const enqueueFiles = (files) => {
    // Model loading starts only after a user selects a photo and overlaps the
    // first crop; this keeps startup/CDN optimisation intact.
    void preloadBgModel().catch(() => {
      // removeBg() owns the normal retry/fallback and user-facing error.
    });
    if (!processingRef.current) {
      processingRef.current = true;
      const [first, ...rest] = files;
      setActiveFile(first);
      setEditingImage(URL.createObjectURL(first));
      setCropStage("initial");
      setCropOpen(true);
      setPendingQueue((prev) => [...prev, ...rest]);
    } else {
      setPendingQueue((prev) => [...prev, ...files]);
    }
  };

  const handleCropDone = (blob) => {
    if (cropStage === "final") {
      setCropOpen(false);
      setEditingImage(null);
      setCropStage(null);
      setActiveFile(null);
      onAddCustomFiles([{ file: blob, previewURL: URL.createObjectURL(blob) }]);
      advanceQueue();
      return true;
    }

    // First crop is complete. Keep the editor open, remove the background,
    // then replace its source with the transparent result for the final crop.
    const previewUrl = URL.createObjectURL(blob);
    setBgPreviewUrl(previewUrl);
    setBgProgressMsg("AI आपकी फोटो तैयार कर रहा है…");
    setBgProgressPct(0);
    setBgLoading(true);
    const controller = new AbortController();
    abortRef.current = controller;
    (async () => {
      try {
        const processed = await removeBg(
          blob,
          (stage, pct) => {
            setBgProgressMsg(stage);
            setBgProgressPct(pct);
          },
          controller.signal,
        );
        if (controller.signal.aborted) return;
        toast.success("Background removed successfully! ✨");
        setEditingImage(URL.createObjectURL(processed));
        setCropStage("final");
        toast("Adjust the final crop, then tap Done.");
      } catch (err) {
        if (err?.name === "AbortError" || controller.signal.aborted) return;
        
        toast.danger(
          "Background removal शुरू नहीं हो पाया. इस photo को छोड़कर आगे बढ़ रहे हैं—इसे दोबारा select करके Retry करें.",
        );
        // Do not redisplay the same unchanged crop with another Done button.
        // Skip only this failed item and continue the remaining queue; the
        // original/background image is never accepted as a successful result.
        setCropOpen(false);
        setEditingImage(null);
        setCropStage(null);
        setActiveFile(null);
        advanceQueue();
      } finally {
        abortRef.current = null;
        setBgLoading(false);
        setBgProgressMsg("");
        setBgProgressPct(0);
        setBgPreviewUrl(null);
        URL.revokeObjectURL(previewUrl);
      }
    })();
    return false;
  };

  const handleCropCancel = () => {
    setCropOpen(false);
    setEditingImage(null);
    setCropStage(null);
    setActiveFile(null);
    advanceQueue();
  };

  const colClass =
    { 3: "grid-cols-3", 4: "grid-cols-4" }[companyGridCols] || "grid-cols-4";

  // In-flight items (queued, actively removing bg, or mid-crop) reserve a
  // slot too, so the limit can't be exceeded by selecting more files while
  // earlier ones are still processing.
  const inFlightCount =
    pendingQueue.length + (activeFile || bgLoading || cropOpen ? 1 : 0);
  const totalSelected =
    selectedLinks.length + customFiles.length + inFlightCount;
  const isLimitReached = totalSelected >= maxImages;

  useEffect(() => {
    if (isLimitReached) {
      setTimeout(() => setOpen(false), 400);
    }
  }, [isLimitReached]);

  return (
    <>
      {inlineStrip ? (
        <div className="w-full flex items-center gap-2 rounded-2xl border border-border p-2">
          <div className="flex-1 min-w-0 flex items-center gap-2 overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
            {totalSelected === 0 && (
              <span className="text-[11px] text-muted-foreground px-2 py-3">
                No images selected yet
              </span>
            )}
            {selectedLinks.map((link, i) => (
              <div key={link || `sel-${i}`} className="relative flex-shrink-0">
                <img
                  src={link}
                  alt=""
                  className="w-14 h-14 rounded-full object-cover border-2 border-yellow-400 bg-muted/20"
                />
                <button
                  type="button"
                  onClick={() => onToggleLink(link)}
                  className="absolute top-0 right-0 w-4 h-4 rounded-full bg-rose-500 text-white text-[9px] flex items-center justify-center shadow ring-2 ring-background"
                  title="Remove"
                >
                  ✕
                </button>
              </div>
            ))}
            {customFiles.map((item, i) => (
              <div
                key={item.previewURL || `cus-${i}`}
                className="relative flex-shrink-0"
              >
                <img
                  src={item.previewURL}
                  alt=""
                  className="w-14 h-14 rounded-full object-cover border-2 border-accent/50 bg-muted/20"
                />
                <button
                  type="button"
                  onClick={() => onRemoveCustomFile(i)}
                  className="absolute top-0 right-0 w-4 h-4 rounded-full bg-rose-500 text-white text-[9px] flex items-center justify-center shadow ring-2 ring-background"
                  title="Remove"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setOpen(true)}
            disabled={isLimitReached}
            className="flex-shrink-0 w-14 h-14 rounded-full border-2 border-dashed border-border hover:border-accent/60 hover:bg-accent/5 flex items-center justify-center transition disabled:opacity-40 disabled:cursor-not-allowed"
            title={isLimitReached ? "Limit reached" : "Add image"}
          >
            <img
              src={photoupload}
              alt="Upload"
              className="w-5 h-5 opacity-70"
            />
          </button>
        </div>
      ) : (
        <div
          onClick={() => setOpen(true)}
          className="text-white h-[40px] w-[40px] flex gap-1 border border-border justify-center items-center font-semibold bg-muted/40 p-2 rounded-full transition hover:bg-muted/60"
        >
          <img src={photoupload} alt="Upload" className="w-4 h-4 text-accent" />
        </div>
      )}

      <Modal isOpen={open} onOpenChange={handleClose}>
        <Modal.Backdrop>
          <Modal.Container
            placement="center"
            className="w-full p-3 sm:p-4"
          >
            <Modal.Dialog className="flex max-h-[calc(100dvh-1.5rem)] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-border bg-background shadow-2xl sm:max-h-[90dvh]">
              <Modal.CloseTrigger />

              <Modal.Header className="flex-shrink-0">
                <Modal.Heading className="text-[17px] font-bold text-foreground">
                  Select Images
                </Modal.Heading>
              </Modal.Header>

              <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto overscroll-contain px-5 py-3">
                <div className="flex w-full flex-shrink-0 flex-col gap-4">
                  {[
                    { key: "company", label: "From company" },
                    { key: "upload", label: "Upload manually" },
                  ].map(({ key, label }) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setTab(key)}
                      className={`px-4 py-1.5 rounded-full text-xs font-medium border transition ${
                        tab === key
                          ? "bg-accent text-white border-accent"
                          : "bg-background border-border text-foreground/70 hover:border-accent/50"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>

                {tab === "company" && (
                  <>
                    {companyImages.length === 0 ? (
                      <p className="text-[11px] text-muted-foreground">
                        No images found in company data.
                      </p>
                    ) : (
                      <div className={`grid w-full ${colClass} gap-3`}>
                        {companyImages.map((img, idx) => {
                          const link = typeof img === "string" ? img : img.link;
                          const name =
                            typeof img === "string" ? "" : img.name || "";
                          const id =
                            typeof img === "string"
                              ? img
                              : img.id || link || idx;
                          const selected = selectedLinks.includes(link);

                          return (
                            <button
                              key={id}
                              type="button"
                              onClick={() => {
                                if (!selected && isLimitReached) return;
                                onToggleLink(link);
                              }}
                              className={`relative border-2 rounded-xl overflow-hidden flex flex-col transition bg-muted/20 ${
                                selected
                                  ? "border-accent shadow-md"
                                  : isLimitReached
                                    ? "border-border/30 opacity-50 cursor-not-allowed"
                                    : "border-border hover:border-accent"
                              }`}
                            >
                              <div className="w-full aspect-square">
                                {link ? (
                                  <img
                                    src={link}
                                    alt={name}
                                    className="w-full h-full object-contain"
                                  />
                                ) : (
                                  <div className="w-full h-full bg-muted/40 rounded-t-lg flex items-center justify-center text-slate-400 text-xs">
                                    No image
                                  </div>
                                )}
                              </div>
                              {name ? (
                                <div className="px-1 py-1 border-t border-border/40 bg-background">
                                  <p className="text-[9px] font-semibold text-foreground/70 truncate text-center leading-tight">
                                    {name}
                                  </p>
                                </div>
                              ) : null}

                              {selected && (
                                <span className="absolute top-1 right-1 w-5 h-5 bg-accent rounded-full flex items-center justify-center shadow">
                                  <IcoCheck />
                                </span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </>
                )}

                {tab === "upload" && (
                  <>
                    <button
                      type="button"
                      disabled={isLimitReached}
                      onClick={() => effectiveRef.current?.click()}
                      className={`mb-3 px-2 py-2 text-xs rounded-lg shadow-sm font-bold transition flex items-center gap-1 ${
                        isLimitReached
                          ? "bg-muted/40 text-muted-foreground cursor-not-allowed"
                          : "bg-muted/40 text-foreground/70 hover:bg-accent/10"
                      }`}
                    >
                      <img
                        src={photoupload}
                        alt="Upload"
                        className="w-4 h-4 text-accent"
                      />
                      <p className="text-[10px] text-muted-foreground">
                        Upload Image
                      </p>
                    </button>

                    <input
                      ref={effectiveRef}
                      type="file"
                      accept="image/jpeg,image/png,.jpg,.jpeg,.png"
                      multiple
                      className="hidden"
                      onChange={(e) => {
                        const files = Array.from(e.target.files || []);
                        if (!files.length) return;

                        const remaining = maxImages - totalSelected;
                        const allowedFiles = files.slice(0, remaining);
                        const validFiles = [];

                        allowedFiles.forEach((file) => {
                          const result = validateUploadFile(file, "image");
                          if (result.valid) {
                            validFiles.push(file);
                          } else {
                            toast.danger(result.error || "Invalid image file.");
                          }
                        });

                        // Route each valid file through the same
                        // remove-background + crop pipeline used elsewhere
                        // in the form, one at a time.
                        if (validFiles.length > 0) enqueueFiles(validFiles);

                        e.target.value = "";
                      }}
                    />

                    {customFiles.length > 0 && (
                      <div className={`grid w-full ${colClass} gap-3`}>
                        {customFiles.map((item, i) => (
                          <div
                            key={i}
                            className="relative border-2 border-accent rounded-xl p-1.5 bg-muted/20 overflow-hidden"
                          >
                            <img
                              src={item.previewURL}
                              alt=""
                              className={`w-full ${thumbHeight} object-contain rounded-lg`}
                            />
                            <button
                              type="button"
                              onClick={() => onRemoveCustomFile(i)}
                              className="absolute top-1 right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center hover:bg-red-600 transition shadow text-white"
                            >
                              <IcoX />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}

                <p
                  className={`text-xs mt-2 font-medium ${
                    isLimitReached ? "text-red-500" : "text-accent"
                  }`}
                >
                  {totalSelected} / {maxImages} image(s) selected
                </p>
              </div>

              <Modal.Footer className="flex-shrink-0 border-t border-border bg-background">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="w-full rounded-2xl bg-accent py-3 text-[14px] font-bold text-white shadow-md"
                >
                  Continue
                </button>
              </Modal.Footer>
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal>

      {/* Background removal loading overlay */}
      {bgLoading && (
        <RemoveBgLoadingOverlay
          previewUrl={bgPreviewUrl}
          progressMessage={bgProgressMsg}
          progressPct={bgProgressPct}
          onCancel={cancelActiveProcessing}
        />
      )}

      {/* Initial crop, then the final crop of the background-removed result. */}
      {cropOpen && editingImage && !bgLoading && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center overflow-y-auto bg-black/70 p-3">
          <div className="h-[min(560px,calc(100dvh-1.5rem))] w-full max-w-sm flex-shrink-0">
            <ImageEditorCanvas
              src={editingImage}
              editingType="feature"
              // ImageEditorCanvas calls setOpen(false) itself right after
              // onDone/onCancel fire — those already drive our state, so
              // this is intentionally a no-op to avoid double-processing
              // the upload queue.
              setOpen={() => {}}
              onDone={handleCropDone}
              onCancel={handleCropCancel}
              enableEnhance={cropStage === "final"}
            />
          </div>
        </div>
      )}
    </>
  );
}
