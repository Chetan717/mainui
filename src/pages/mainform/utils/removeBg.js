/**
 * Hybrid production background removal for MLM LIVE.
 *
 * 1) Bundled MODNet always gives us a private, free on-device result.
 * 2) That matte is inspected locally. Simple/clean portraits finish instantly.
 * 3) Complex portraits are sent to the private BiRefNet VPS for the final PNG.
 * 4) If the VPS is busy/offline/times out, the already-computed MODNet result
 *    is returned automatically so a server incident never becomes a user-flow
 *    failure while the local engine is available.
 */

import {
  assessLocalMatte,
  removeBackgroundOnServer,
} from "./removeBgServer.js";

export const REMOVE_BG_QUALITY = Object.freeze({
  engine: "hybrid-modnet-birefnet",
  localModel: "modnet-portrait",
  serverModel: "birefnet-portrait",
  continuousAlpha: true,
  serverForComplexPortraits: true,
  localFallbackOnServerFailure: true,
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

function reportNativeFailure(error, extra = {}) {
  try {
    window.ReactNativeWebView?.postMessage(
      JSON.stringify({
        type: "REMOVE_BG_ERROR",
        engine: REMOVE_BG_QUALITY.engine,
        message: error?.message || String(error),
        ...extra,
      }),
    );
  } catch {
    // Diagnostics must never affect image processing.
  }
}

function reportNativeRoute(route, extra = {}) {
  try {
    window.ReactNativeWebView?.postMessage(
      JSON.stringify({
        type: "REMOVE_BG_ROUTE",
        route,
        ...extra,
      }),
    );
  } catch {
    // Optional diagnostics only.
  }
}

/** Download and initialise the local portrait model ahead of the Done tap. */
export async function preloadBgModel(onProgress) {
  if (typeof window === "undefined") return "unavailable";
  if (onProgress) activeProgress = onProgress;

  if (!preloadPromise) {
    preloadPromise = (async () => {
      const { preloadModNet } = await loadModNetEngine();
      await preloadModNet((stage, percentage) =>
        emitProgress(stage, percentage),
      );
      return "modnet-continuous-portrait-matte";
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
  // One local model run at a time protects lower-memory Android WebViews.
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
    (stage, percentage) => {
      // Reserve progress space for quality inspection/server routing.
      emitProgress(stage, Math.min(68, Math.round(percentage * 0.68)));
    },
    signal,
  );
  throwIfAborted(signal);
  if (!(result instanceof Blob) || result.size === 0) {
    throw new Error("Local portrait model returned an empty image.");
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
  resetModNetEngine({ freshAssets: false });
}

async function runLocalWithStartupRetry(file, signal) {
  try {
    return await removeWithProfessionalMatte(file, signal);
  } catch (firstError) {
    if (firstError?.name === "AbortError" || signal?.aborted) {
      throw abortError();
    }
    if (!isRetryableRemoveBgError(firstError)) throw firstError;

    console.warn("[removeBg] Local portrait retry:", firstError);
    emitProgress("Retrying on-device AI…", 8);
    await prepareSameQualityRetry();
    return removeWithProfessionalMatte(file, signal);
  }
}

async function tryServer(file, signal) {
  return removeBackgroundOnServer(file, signal, (stage, pct) =>
    emitProgress(stage, pct),
  );
}

/**
 * Remove a portrait background with automatic local/server routing.
 *
 * @param {File|Blob} file
 * @param {(stage: string, pct: number) => void} [onProgress]
 * @param {AbortSignal} [signal]
 * @returns {Promise<Blob>} transparent PNG
 */
export async function removeBg(file, onProgress, signal) {
  if (!(file instanceof Blob) || file.size === 0) {
    throw new Error("Please select a valid image.");
  }
  throwIfAborted(signal);
  onProgress?.("Preparing on-device portrait AI…", 2);

  return queueProcessing(async () => {
    throwIfAborted(signal);
    activeProgress = onProgress || null;

    let localResult = null;
    let localError = null;

    try {
      // Local processing is intentionally first: it gives simple portraits an
      // instant/private path and leaves us with a ready fallback before the VPS
      // is contacted for complex hair/edges.
      try {
        localResult = await runLocalWithStartupRetry(file, signal);
      } catch (error) {
        if (error?.name === "AbortError" || signal?.aborted) throw abortError();
        localError = error;
        console.warn("[removeBg] Local engine failed; trying VPS:", error);
      }

      throwIfAborted(signal);

      if (localResult) {
        emitProgress("Checking photo complexity…", 70);
        let assessment;
        try {
          assessment = await assessLocalMatte(localResult);
        } catch (error) {
          // If quality inspection itself is unavailable, be conservative and
          // let the higher-quality server have a chance.
          console.warn("[removeBg] Matte inspection failed:", error);
          assessment = { complex: true, reasons: ["inspection-failed"] };
        }

        if (!assessment.complex) {
          reportNativeRoute("local-simple", { metrics: assessment.metrics });
          emitProgress("Transparent photo is ready", 100);
          return localResult;
        }

        reportNativeRoute("server-complex", { reasons: assessment.reasons });
        try {
          const serverResult = await tryServer(file, signal);
          emitProgress("Transparent photo is ready", 100);
          return serverResult;
        } catch (serverError) {
          if (serverError?.name === "AbortError" || signal?.aborted) {
            throw abortError();
          }

          // Critical reliability rule: complex photos still complete using the
          // local result if the VPS is busy, offline, blocked by CORS/mixed
          // content, or temporarily unhealthy.
          console.warn(
            "[removeBg] VPS unavailable; using local fallback:",
            serverError,
          );
          reportNativeRoute("local-server-fallback", {
            reason: serverError?.message || "server-unavailable",
          });
          emitProgress("Server is busy — using the clean local result", 94);
          emitProgress("Transparent photo is ready", 100);
          return localResult;
        }
      }

      // Local engine itself could not produce a PNG. Give the VPS one final
      // independent chance before showing an error.
      emitProgress("On-device AI unavailable — trying the server…", 72);
      try {
        const serverResult = await tryServer(file, signal);
        reportNativeRoute("server-local-failed");
        emitProgress("Transparent photo is ready", 100);
        return serverResult;
      } catch (serverError) {
        if (serverError?.name === "AbortError" || signal?.aborted) {
          throw abortError();
        }
        const combined = new Error(
          "Both local and server background removal are unavailable.",
          { cause: serverError },
        );
        combined.localCause = localError;
        throw combined;
      }
    } catch (error) {
      if (error?.name === "AbortError" || signal?.aborted) throw abortError();
      console.error("[removeBg] Hybrid background removal failed:", error);
      reportNativeFailure(error, {
        localMessage: localError?.message || null,
      });
      throw new Error(
        "Background removal is temporarily unavailable. Please check your connection and try again.",
        { cause: error },
      );
    } finally {
      activeProgress = null;
    }
  }, signal);
}

/** Force a clean local model/session retry after a corrupt cached download. */
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
