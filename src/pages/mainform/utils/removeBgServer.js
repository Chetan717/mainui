const DEFAULT_SERVER_URL = "http://36.50.82.244";
const VITE_ENV = import.meta.env || {};
const REQUEST_TIMEOUT_MS = 25_000;
const TRANSIENT_RETRY_DELAY_MS = 350;
let firebaseModulePromise = null;

async function getFirebaseAuth() {
  if (!firebaseModulePromise) {
    firebaseModulePromise = import("../../../Firebase.js").catch((error) => {
      firebaseModulePromise = null;
      throw error;
    });
  }
  const module = await firebaseModulePromise;
  return module.auth;
}

function normalizeBaseUrl(value) {
  return String(value || "")
    .trim()
    .replace(/\/+$/, "");
}

export const REMOVE_BG_SERVER = Object.freeze({
  baseUrl: normalizeBaseUrl(
    VITE_ENV.VITE_REMOVEBG_API_URL || DEFAULT_SERVER_URL,
  ),
  endpoint: "/v1/remove-background?refine=true",
  timeoutMs: REQUEST_TIMEOUT_MS,
});

function abortError() {
  return new DOMException("Background removal cancelled", "AbortError");
}

function sleep(ms, signal) {
  if (signal?.aborted) return Promise.reject(abortError());
  return new Promise((resolve, reject) => {
    const timer = setTimeout(resolve, ms);
    const onAbort = () => {
      clearTimeout(timer);
      reject(abortError());
    };
    signal?.addEventListener("abort", onAbort, { once: true });
  });
}

function createLinkedController(signal, timeoutMs) {
  const controller = new AbortController();
  let timedOut = false;
  const timeout = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);

  const onAbort = () => controller.abort();
  signal?.addEventListener("abort", onAbort, { once: true });

  return {
    controller,
    didTimeout: () => timedOut,
    cleanup() {
      clearTimeout(timeout);
      signal?.removeEventListener("abort", onAbort);
    },
  };
}

async function getRequestHeaders(file) {
  const headers = {
    "Content-Type": file.type || "application/octet-stream",
    Accept: "image/png",
  };

  // Firebase ID token is the preferred production credential. The VPS can
  // verify it without placing a permanent server secret inside the WebView.
  try {
    const firebaseAuth = await getFirebaseAuth();
    const user = firebaseAuth?.currentUser;
    if (user) {
      const token = await user.getIdToken();
      if (token) headers.Authorization = `Bearer ${token}`;
    }
  } catch (error) {
    console.warn("[removeBg] Firebase token unavailable:", error);
  }

  // Optional compatibility key for the current VPS while Firebase-token
  // verification is being enabled server-side. VITE_* values are visible in a
  // web bundle, so this must not be treated as the long-term security layer.
  const compatibilityKey = String(
    VITE_ENV.VITE_REMOVEBG_API_KEY || "",
  ).trim();
  if (compatibilityKey) headers["X-API-Key"] = compatibilityKey;

  return headers;
}

function makeServerError(message, details = {}) {
  const error = new Error(message);
  Object.assign(error, {
    removeBgServerError: true,
    ...details,
  });
  return error;
}

function isTransientStatus(status) {
  return status === 500 || status === 502 || status === 504;
}

/**
 * Send the image directly to the private MLM LIVE VPS. The response stays in
 * memory as a Blob; this helper never writes user photos to browser storage.
 */
export async function removeBackgroundOnServer(file, signal, onProgress) {
  if (!(file instanceof Blob) || file.size === 0) {
    throw makeServerError("Invalid image for server processing.", {
      retryable: false,
    });
  }
  if (!REMOVE_BG_SERVER.baseUrl) {
    throw makeServerError("Remove-BG server URL is not configured.", {
      retryable: false,
    });
  }
  if (signal?.aborted) throw abortError();

  const url = `${REMOVE_BG_SERVER.baseUrl}${REMOVE_BG_SERVER.endpoint}`;
  const headers = await getRequestHeaders(file);
  const maxAttempts = 2;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    if (signal?.aborted) throw abortError();
    onProgress?.(
      attempt === 1
        ? "Professional server is refining complex edges…"
        : "Retrying the server connection…",
      attempt === 1 ? 76 : 82,
    );

    const linked = createLinkedController(signal, REMOVE_BG_SERVER.timeoutMs);
    try {
      const response = await fetch(url, {
        method: "POST",
        headers,
        body: file,
        signal: linked.controller.signal,
        cache: "no-store",
        credentials: "omit",
      });

      // Busy/rate-limited server must fall back immediately to the already
      // computed local matte instead of making the user wait through retries.
      if (response.status === 429 || response.status === 503) {
        throw makeServerError("Remove-BG server is busy.", {
          status: response.status,
          retryable: false,
          busy: true,
        });
      }

      if (!response.ok) {
        throw makeServerError(
          `Remove-BG server returned HTTP ${response.status}.`,
          {
            status: response.status,
            retryable: isTransientStatus(response.status),
          },
        );
      }

      const contentType = response.headers.get("content-type") || "";
      if (!contentType.toLowerCase().includes("image/png")) {
        throw makeServerError("Remove-BG server returned an invalid response.", {
          retryable: false,
        });
      }

      const output = await response.blob();
      if (!output.size) {
        throw makeServerError("Remove-BG server returned an empty image.", {
          retryable: false,
        });
      }

      onProgress?.("Professional transparent photo is ready", 96);
      return output;
    } catch (error) {
      if (signal?.aborted) throw abortError();
      if (linked.didTimeout()) {
        error = makeServerError("Remove-BG server timed out.", {
          retryable: false,
          timeout: true,
        });
      } else if (error?.name === "AbortError") {
        // The linked controller can abort because of timeout. A real user
        // cancellation was already handled above.
        error = makeServerError("Remove-BG server request was interrupted.", {
          retryable: attempt < maxAttempts,
        });
      } else if (!error?.removeBgServerError) {
        error = makeServerError(error?.message || "Server connection failed.", {
          retryable: attempt < maxAttempts,
          cause: error,
        });
      }

      if (!error.retryable || attempt >= maxAttempts) throw error;
      await sleep(TRANSIENT_RETRY_DELAY_MS, signal);
    } finally {
      linked.cleanup();
    }
  }

  throw makeServerError("Remove-BG server could not process the image.", {
    retryable: false,
  });
}

async function decodeBlob(blob) {
  if (typeof createImageBitmap === "function") {
    const bitmap = await createImageBitmap(blob);
    return {
      source: bitmap,
      width: bitmap.width,
      height: bitmap.height,
      close: () => bitmap.close(),
    };
  }

  const url = URL.createObjectURL(blob);
  try {
    const image = await new Promise((resolve, reject) => {
      const element = new Image();
      element.onload = () => resolve(element);
      element.onerror = () => reject(new Error("Unable to inspect local matte."));
      element.src = url;
    });
    return {
      source: image,
      width: image.naturalWidth,
      height: image.naturalHeight,
      close: () => {},
    };
  } finally {
    URL.revokeObjectURL(url);
  }
}

function connectedComponents(mask, width, height, foregroundCount) {
  const visited = new Uint8Array(mask.length);
  const queue = new Int32Array(mask.length);
  let largest = 0;
  let secondLargest = 0;
  let meaningful = 0;
  const minimumMeaningful = Math.max(4, Math.round(foregroundCount * 0.01));

  for (let start = 0; start < mask.length; start += 1) {
    if (!mask[start] || visited[start]) continue;
    let head = 0;
    let tail = 0;
    let size = 0;
    queue[tail++] = start;
    visited[start] = 1;

    while (head < tail) {
      const index = queue[head++];
      size += 1;
      const x = index % width;
      const y = Math.floor(index / width);

      if (x > 0) {
        const next = index - 1;
        if (mask[next] && !visited[next]) {
          visited[next] = 1;
          queue[tail++] = next;
        }
      }
      if (x + 1 < width) {
        const next = index + 1;
        if (mask[next] && !visited[next]) {
          visited[next] = 1;
          queue[tail++] = next;
        }
      }
      if (y > 0) {
        const next = index - width;
        if (mask[next] && !visited[next]) {
          visited[next] = 1;
          queue[tail++] = next;
        }
      }
      if (y + 1 < height) {
        const next = index + width;
        if (mask[next] && !visited[next]) {
          visited[next] = 1;
          queue[tail++] = next;
        }
      }
    }

    if (size >= minimumMeaningful) meaningful += 1;
    if (size > largest) {
      secondLargest = largest;
      largest = size;
    } else if (size > secondLargest) {
      secondLargest = size;
    }
  }

  return { meaningful, largest, secondLargest };
}

/**
 * Conservative local-matte inspection. "complex" means the server should get
 * a chance to produce the final PNG; it does not mean the local result is bad.
 * The local result is retained as the guaranteed fallback for server trouble.
 */
export async function assessLocalMatte(localBlob) {
  const decoded = await decodeBlob(localBlob);
  try {
    const maxSide = 192;
    const scale = Math.min(1, maxSide / Math.max(decoded.width, decoded.height));
    const width = Math.max(1, Math.round(decoded.width * scale));
    const height = Math.max(1, Math.round(decoded.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d", { willReadFrequently: true });
    if (!context) {
      return { complex: true, reasons: ["inspection-unavailable"] };
    }
    context.clearRect(0, 0, width, height);
    context.drawImage(decoded.source, 0, 0, width, height);
    const pixels = context.getImageData(0, 0, width, height).data;
    const count = width * height;
    const mask = new Uint8Array(count);

    let foreground = 0;
    let soft = 0;
    let borderForeground = 0;
    let minX = width;
    let minY = height;
    let maxX = -1;
    let maxY = -1;

    const borderBand = Math.max(1, Math.round(Math.min(width, height) * 0.02));
    for (let i = 0; i < count; i += 1) {
      const alpha = pixels[i * 4 + 3];
      if (alpha > 28) {
        foreground += 1;
        const x = i % width;
        const y = Math.floor(i / width);
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);

        // Bottom contact is common for torso/full-body portraits, so only the
        // top/side borders are used as a complexity signal.
        if (
          x < borderBand ||
          x >= width - borderBand ||
          y < borderBand
        ) {
          borderForeground += 1;
        }
      }
      if (alpha > 20 && alpha < 235) soft += 1;
      if (alpha >= 96) mask[i] = 1;
    }

    const foregroundRatio = foreground / Math.max(1, count);
    const softRatio = soft / Math.max(1, foreground);
    const borderRatio = borderForeground / Math.max(1, foreground);
    const components = connectedComponents(mask, width, height, foreground);
    const secondComponentRatio =
      components.secondLargest / Math.max(1, foreground);
    const boxWidthRatio = maxX >= minX ? (maxX - minX + 1) / width : 0;
    const boxHeightRatio = maxY >= minY ? (maxY - minY + 1) / height : 0;

    const reasons = [];
    if (foregroundRatio < 0.07) reasons.push("small-subject");
    if (foregroundRatio > 0.78) reasons.push("foreground-too-large");
    if (softRatio > 0.09) reasons.push("complex-soft-edges");
    if (borderRatio > 0.04) reasons.push("subject-touches-edge");
    if (components.meaningful > 1 && secondComponentRatio > 0.02) {
      reasons.push("multiple-foreground-regions");
    }
    if (boxWidthRatio > 0.96 && boxHeightRatio > 0.92) {
      reasons.push("mask-fills-frame");
    }

    return {
      complex: reasons.length > 0,
      reasons,
      metrics: {
        foregroundRatio,
        softRatio,
        borderRatio,
        secondComponentRatio,
        boxWidthRatio,
        boxHeightRatio,
      },
    };
  } finally {
    decoded.close();
  }
}
