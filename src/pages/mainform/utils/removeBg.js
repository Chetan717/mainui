/**
 * Client-only background removal shared by every MLM LIVE photo flow.
 *
 * Quality tier:
 *   - WebGPU-capable devices: BiRefNet Lite 512 FP16 from Cloudflare R2.
 *   - Devices that are genuinely not capable of running the WebGPU model:
 *     bundled MODNet continuous-alpha portrait fallback.
 *
 * There is intentionally NO short timeout that downgrades a capable device to
 * MODNet while BiRefNet is still downloading. The quality model is preloaded
 * when the editor/photo UI mounts and is cached persistently after first use.
 */

export const REMOVE_BG_QUALITY = Object.freeze({
  engine: "birefnet-webgpu-with-modnet-capability-fallback",
  model: "birefnet-lite-512-fp16",
  continuousAlpha: true,
  lowQualityFallback: false,
  originalPhotoFallback: false,
  fallbackOnlyWhenUnsupported: true,
});

let birefNetPromise = null;
let modNetPromise = null;
let preloadPromise = null;
let selectedEnginePromise = null;
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
  activeProgress(stage, Math.max(0, Math.min(100, Math.round(percentage))));
}

async function loadBirefNetEngine() {
  if (!birefNetPromise) {
    birefNetPromise = import("./birefnetBg.js").catch((error) => {
      birefNetPromise = null;
      throw error;
    });
  }
  return birefNetPromise;
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

async function selectBestEngine() {
  if (!selectedEnginePromise) {
    selectedEnginePromise = (async () => {
      try {
        const { getBirefNetCapability } = await loadBirefNetEngine();
        const capability = await getBirefNetCapability();
        if (capability.supported) return "birefnet";
      } catch {
        // Import/capability failure means this browser cannot use the quality
        // engine, so it is safe to choose the local fallback before download.
      }
      return "modnet";
    })();
  }
  return selectedEnginePromise;
}

function reportNativeFailure(error, engine) {
  try {
    window.ReactNativeWebView?.postMessage(
      JSON.stringify({
        type: "REMOVE_BG_ERROR",
        engine,
        message: error?.message || String(error),
      }),
    );
  } catch {
    // Diagnostics must never hide the original processing error.
  }
}

/** Start loading the final engine as early as possible. */
export async function preloadBgModel(onProgress) {
  if (typeof window === "undefined") return "unavailable";
  if (onProgress) activeProgress = onProgress;

  if (!preloadPromise) {
    preloadPromise = (async () => {
      const engine = await selectBestEngine();
      if (engine === "birefnet") {
        const { preloadBirefNet } = await loadBirefNetEngine();
        try {
          await preloadBirefNet((stage, percentage) => emitProgress(stage, percentage));
          return "birefnet-webgpu";
        } catch (error) {
          // Only a genuine runtime/device incompatibility is allowed to route
          // to MODNet. Slow download/network errors stay on BiRefNet and are
          // surfaced/retried later instead of silently lowering quality.
          if (error?.removeBgUnsupported !== true) throw error;
          selectedEnginePromise = Promise.resolve("modnet");
        }
      }

      const { preloadModNet } = await loadModNetEngine();
      await preloadModNet((stage, percentage) => emitProgress(stage, percentage));
      return "modnet-capability-fallback";
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
  const scheduled = processingTail.then(async () => {
    throwIfAborted(signal);
    return task();
  });
  processingTail = scheduled.catch(() => {});
  return raceWithAbort(scheduled, signal);
}

async function runBirefNet(file, signal) {
  const { removeBackgroundWithBirefNet } = await loadBirefNetEngine();
  throwIfAborted(signal);
  const result = await removeBackgroundWithBirefNet(
    file,
    (stage, percentage) => emitProgress(stage, percentage),
    signal,
  );
  if (!(result instanceof Blob) || result.size === 0) {
    throw new Error("BiRefNet returned an empty image.");
  }
  return result;
}

async function runModNet(file, signal) {
  const { preloadModNet, removeBackgroundWithModNet } = await loadModNetEngine();
  await preloadModNet((stage, percentage) => emitProgress(stage, percentage));
  throwIfAborted(signal);
  const result = await removeBackgroundWithModNet(
    file,
    (stage, percentage) => emitProgress(stage, percentage),
    signal,
  );
  if (!(result instanceof Blob) || result.size === 0) {
    throw new Error("Portrait fallback returned an empty image.");
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

async function retrySameEngine(engine) {
  preloadPromise = null;
  if (engine === "birefnet") {
    const { resetBirefNetEngine } = await loadBirefNetEngine();
    // Keep the cached 94 MB file. A transient session failure should not force
    // a second giant network download.
    await resetBirefNetEngine({ freshAssets: false });
    return;
  }
  const { resetModNetEngine } = await loadModNetEngine();
  resetModNetEngine({ freshAssets: false });
}

async function removeWithSelectedEngine(file, signal) {
  let engine = await selectBestEngine();

  if (engine === "birefnet") {
    try {
      return { blob: await runBirefNet(file, signal), engine };
    } catch (error) {
      if (error?.removeBgUnsupported === true) {
        // This is not a timeout. The WebGPU runtime has positively rejected the
        // device/provider, so the bundled continuous-alpha fallback is valid.
        selectedEnginePromise = Promise.resolve("modnet");
        preloadPromise = null;
        engine = "modnet";
        emitProgress("इस device पर compatible portrait AI use हो रहा है…", 12);
        return { blob: await runModNet(file, signal), engine };
      }
      throw Object.assign(error, { removeBgEngine: engine });
    }
  }

  try {
    return { blob: await runModNet(file, signal), engine };
  } catch (error) {
    throw Object.assign(error, { removeBgEngine: engine });
  }
}

/**
 * Remove a portrait background entirely on the user's device.
 * No photo bytes are uploaded to the model host.
 */
export async function removeBg(file, onProgress, signal) {
  if (!(file instanceof Blob) || file.size === 0) {
    throw new Error("Please select a valid image.");
  }
  throwIfAborted(signal);
  onProgress?.("High-quality portrait AI तैयार हो रहा है…", 2);

  return queueProcessing(async () => {
    throwIfAborted(signal);
    activeProgress = onProgress || null;
    let engine = await selectBestEngine();
    try {
      try {
        const { blob, engine: usedEngine } = await removeWithSelectedEngine(file, signal);
        engine = usedEngine;
        emitProgress("Clean transparent photo तैयार है", 100);
        return blob;
      } catch (firstError) {
        if (firstError?.name === "AbortError" || signal?.aborted) throw abortError();
        engine = firstError?.removeBgEngine || engine;
        if (!isRetryableRemoveBgError(firstError)) throw firstError;

        console.warn(`[removeBg] ${engine} retry:`, firstError);
        emitProgress("High-quality AI clean retry कर रहा है…", 7);
        await retrySameEngine(engine);
        const retried =
          engine === "birefnet"
            ? await runBirefNet(file, signal)
            : await runModNet(file, signal);
        emitProgress("Clean transparent photo तैयार है", 100);
        return retried;
      }
    } catch (error) {
      if (error?.name === "AbortError" || signal?.aborted) throw abortError();
      console.error("[removeBg] Portrait removal failed:", error);
      reportNativeFailure(error, engine);
      throw new Error(
        "Clean background removal पूरा नहीं हुआ. Internet चालू रखकर Retry करें—background वाली photo save नहीं की गई है.",
        { cause: error },
      );
    } finally {
      activeProgress = null;
    }
  }, signal);
}

/** Force a fresh model download only after the user explicitly retries repair. */
export function refreshRemoveBgKeys() {
  preloadPromise = null;
  selectedEnginePromise = null;
  if (birefNetPromise) {
    void birefNetPromise
      .then(({ resetBirefNetEngine }) => resetBirefNetEngine({ freshAssets: true }))
      .catch(() => {
        birefNetPromise = null;
      });
  }
  if (modNetPromise) {
    void modNetPromise
      .then(({ resetModNetEngine }) => resetModNetEngine({ freshAssets: true }))
      .catch(() => {
        modNetPromise = null;
      });
  }
}
