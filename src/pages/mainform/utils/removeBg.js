/**
 * Professional portrait background removal for every MLM LIVE photo flow.
 *
 * The final PNG always comes from the bundled MODNet continuous-alpha portrait
 * model. MediaPipe's low-resolution selfie mask and general salient-object
 * models are not accepted as a successful fallback: they can cut ears/hair or
 * choose a large background object instead of the person.
 */

export const REMOVE_BG_QUALITY = Object.freeze({
  engine: "modnet-continuous-portrait-matte",
  model: "modnet-portrait",
  continuousAlpha: true,
  lowQualityFallback: false,
  originalPhotoFallback: false,
});

let modNetPromise = null;
let preloadPromise = null;
let activeProgress = null;
let processingTail = Promise.resolve();

function abortError() {
  return new DOMException("Background removal cancelled", "AbortError");
}

function throwIfAborted(signal) {
  if (signal?.aborted) throw abortError();
}

function emitProgress(stage, percentage) {
  if (!activeProgress) return;
  const safePercentage = Math.max(0, Math.min(100, Math.round(percentage)));
  activeProgress(stage, safePercentage);
}

async function loadModNetEngine() {
  if (!modNetPromise) {
    modNetPromise = import("./modnetBg.js").catch((error) => {
      modNetPromise = null;
      throw error;
    });
  }
  return modNetPromise;
}

function reportNativeFailure(error) {
  try {
    window.ReactNativeWebView?.postMessage(
      JSON.stringify({
        type: "REMOVE_BG_ERROR",
        engine: REMOVE_BG_QUALITY.engine,
        message: error?.message || String(error),
      }),
    );
  } catch {
    // Diagnostics must never hide the original processing error.
  }
}

/** Download and initialise the same quality portrait model used for output. */
export async function preloadBgModel(onProgress) {
  if (typeof window === "undefined") return "unavailable";
  if (onProgress) activeProgress = onProgress;

  if (!preloadPromise) {
    preloadPromise = (async () => {
      const { preloadModNet } = await loadModNetEngine();
      await preloadModNet((stage, percentage) =>
        emitProgress(stage, percentage),
      );
      return REMOVE_BG_QUALITY.engine;
    })().catch((error) => {
      preloadPromise = null;
      throw error;
    });
  }
  return preloadPromise;
}

function raceWithAbort(promise, signal) {
  if (!signal) return promise;
  if (signal.aborted) return Promise.reject(abortError());

  return new Promise((resolve, reject) => {
    const onAbort = () => reject(abortError());
    signal.addEventListener("abort", onAbort, { once: true });
    promise.then(
      (value) => {
        signal.removeEventListener("abort", onAbort);
        resolve(value);
      },
      (error) => {
        signal.removeEventListener("abort", onAbort);
        reject(error);
      },
    );
  });
}

function queueProcessing(task, signal) {
  // One model run at a time prevents several large photos from exhausting a
  // phone WebView while a user selects images quickly.
  const scheduled = processingTail.then(async () => {
    throwIfAborted(signal);
    return task();
  });
  processingTail = scheduled.catch(() => {});
  return raceWithAbort(scheduled, signal);
}

async function removeWithProfessionalMatte(file, signal) {
  const { removeBackgroundWithModNet } = await loadModNetEngine();
  await preloadBgModel(activeProgress);
  throwIfAborted(signal);
  const result = await removeBackgroundWithModNet(
    file,
    (stage, percentage) => emitProgress(stage, percentage),
    signal,
  );
  throwIfAborted(signal);
  if (!(result instanceof Blob) || result.size === 0) {
    throw new Error("Professional portrait model returned an empty image.");
  }
  return result;
}

export function isRetryableRemoveBgError(error) {
  let current = error;
  const visited = new Set();
  while (current && !visited.has(current)) {
    visited.add(current);
    if (current.removeBgRetryable === true) return true;
    current = current.cause;
  }
  return false;
}

async function prepareSameQualityRetry() {
  preloadPromise = null;
  const { resetModNetEngine } = await loadModNetEngine();
  // Reuse browser-cached model/WASM bytes. Cache-busting roughly 38 MB here
  // made one transient start-up failure feel like two complete runs on phones.
  resetModNetEngine({ freshAssets: false });
}

/**
 * Remove a portrait background entirely on the user's device.
 *
 * @param {File|Blob} file
 * @param {(stage: string, pct: number) => void} [onProgress]
 * @param {AbortSignal} [signal]
 * @returns {Promise<Blob>} lossless transparent PNG
 */
export async function removeBg(file, onProgress, signal) {
  if (!(file instanceof Blob) || file.size === 0) {
    throw new Error("Please select a valid image.");
  }
  throwIfAborted(signal);
  onProgress?.("Professional portrait AI तैयार हो रहा है…", 2);

  return queueProcessing(async () => {
    throwIfAborted(signal);
    activeProgress = onProgress || null;
    try {
      try {
        const result = await removeWithProfessionalMatte(file, signal);
        emitProgress("Clean transparent photo तैयार है", 100);
        return result;
      } catch (firstError) {
        if (firstError?.name === "AbortError" || signal?.aborted) {
          throw abortError();
        }

        // Only model download / engine initialisation errors deserve one
        // automatic retry. Photo, quality and post-processing errors are
        // deterministic; repeating the full inference only wastes time.
        if (!isRetryableRemoveBgError(firstError)) {
          throw firstError;
        }

        // Retry only the same continuous-alpha quality model after clearing a
        // partial session. Never downgrade to MediaPipe/original.
        console.warn("[removeBg] Professional portrait retry:", firstError);
        emitProgress("Professional AI clean retry कर रहा है…", 7);
        await prepareSameQualityRetry();
        const result = await removeWithProfessionalMatte(file, signal);
        emitProgress("Clean transparent photo तैयार है", 100);
        return result;
      }
    } catch (error) {
      if (error?.name === "AbortError" || signal?.aborted) throw abortError();
      console.error("[removeBg] Professional portrait removal failed:", error);
      reportNativeFailure(error);
      throw new Error(
        "Clean background removal पूरा नहीं हुआ. Internet चालू रखकर Retry करें—background वाली photo save नहीं की गई है.",
        { cause: error },
      );
    } finally {
      activeProgress = null;
    }
  }, signal);
}

/** Force a clean model/session retry after a failed or corrupt download. */
export function refreshRemoveBgKeys() {
  preloadPromise = null;
  if (modNetPromise) {
    void modNetPromise
      .then(({ resetModNetEngine }) =>
        resetModNetEngine({ freshAssets: true }),
      )
      .catch(() => {
        modNetPromise = null;
      });
  }
}
