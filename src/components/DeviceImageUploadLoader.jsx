import { useEffect, useRef, useState } from "react";

const IMAGE_EXTENSION = /\.(?:jpe?g|png|webp|gif|heic|heif)$/i;

async function decodeLocalImage(file) {
  if (typeof createImageBitmap === "function") {
    try {
      const bitmap = await createImageBitmap(file);
      bitmap.close?.();
      return;
    } catch {
      // Some Android WebViews expose createImageBitmap but cannot decode every
      // camera format. The preview image below still gets a normal DOM decode.
    }
  }

  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.src = url;
    if (typeof image.decode === "function") await image.decode();
    else {
      await new Promise((resolve) => {
        image.onload = resolve;
        image.onerror = resolve;
      });
    }
  } finally {
    URL.revokeObjectURL(url);
  }
}

export default function DeviceImageUploadLoader() {
  const [visible, setVisible] = useState(false);
  const [progress, setProgress] = useState(0);
  const [previewUrl, setPreviewUrl] = useState("");
  const runRef = useRef(0);
  const intervalRef = useRef(null);
  const hideTimerRef = useRef(null);
  const previewRef = useRef("");

  useEffect(() => {
    const clearTimers = () => {
      window.clearInterval(intervalRef.current);
      window.clearTimeout(hideTimerRef.current);
    };

    const onFileChange = (event) => {
      const input = event.target;
      if (!(input instanceof HTMLInputElement) || input.type !== "file") return;
      const files = Array.from(input.files || []);
      const imageFile = files.find(
        (file) => file.type.startsWith("image/") || IMAGE_EXTENSION.test(file.name),
      );
      if (!imageFile) return;

      const run = ++runRef.current;
      clearTimers();
      if (previewRef.current) URL.revokeObjectURL(previewRef.current);
      previewRef.current = URL.createObjectURL(imageFile);
      setPreviewUrl(previewRef.current);
      setProgress(8);
      setVisible(true);

      intervalRef.current = window.setInterval(() => {
        setProgress((value) => Math.min(94, value + Math.max(1, Math.round((95 - value) / 6))));
      }, 90);

      Promise.allSettled([
        decodeLocalImage(imageFile),
        new Promise((resolve) => window.setTimeout(resolve, 700)),
      ]).then(() => {
        if (run !== runRef.current) return;
        window.clearInterval(intervalRef.current);
        setProgress(100);
        hideTimerRef.current = window.setTimeout(() => {
          if (run !== runRef.current) return;
          setVisible(false);
          setProgress(0);
          if (previewRef.current) URL.revokeObjectURL(previewRef.current);
          previewRef.current = "";
          setPreviewUrl("");
        }, 180);
      });
    };

    document.addEventListener("change", onFileChange, true);
    return () => {
      runRef.current += 1;
      clearTimers();
      document.removeEventListener("change", onFileChange, true);
      if (previewRef.current) URL.revokeObjectURL(previewRef.current);
    };
  }, []);

  if (!visible) return null;

  return (
    <div
      className="fixed inset-0 z-[100200] flex items-center justify-center bg-black/75 px-5 backdrop-blur-sm"
      role="status"
      aria-live="polite"
      aria-label="Photo loading from device"
    >
      <div className="w-full max-w-[330px] overflow-hidden rounded-2xl border border-border bg-background shadow-2xl">
        <div className="bg-[linear-gradient(135deg,#2F80EA_0%,#236FDE_48%,#1454C5_100%)] px-5 py-3 text-white">
          <p className="text-[15px] font-extrabold">Preparing Photo</p>
          <p className="mt-0.5 text-[10px] font-medium text-white/80">Opening the photo editor</p>
        </div>
        <div className="relative h-[210px] bg-[linear-gradient(45deg,#e7e7e7_25%,transparent_25%),linear-gradient(-45deg,#e7e7e7_25%,transparent_25%),linear-gradient(45deg,transparent_75%,#e7e7e7_75%),linear-gradient(-45deg,transparent_75%,#e7e7e7_75%)] bg-[length:20px_20px] bg-[position:0_0,0_10px,10px_-10px,-10px_0px] dark:bg-muted/30">
          {previewUrl && (
            <img
              src={previewUrl}
              alt="Selected preview"
              className="h-full w-full object-contain"
            />
          )}
          <div className="absolute inset-0 flex items-center justify-center bg-black/15">
            <div className="h-12 w-12 animate-spin rounded-full border-4 border-white/40 border-t-[#2877e9] shadow-lg" />
          </div>
        </div>

        <div className="p-5 text-center">
          <p className="text-[16px] font-extrabold text-foreground">
            Loading photo from your device…
          </p>
          <p className="mt-1 text-[11px] font-medium text-muted-foreground">
            Please wait while the photo editor is being prepared
          </p>
          <div className="mt-4 h-2 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-[linear-gradient(90deg,#2F80EA_0%,#236FDE_55%,#1454C5_100%)] transition-[width] duration-100 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="mt-2 text-[12px] font-bold text-accent">{progress}%</p>
        </div>
      </div>
    </div>
  );
}
