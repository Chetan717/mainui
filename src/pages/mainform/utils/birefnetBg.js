/**
 * High-quality on-device background removal with BiRefNet Lite 512 FP16.
 *
 * The model is downloaded from the public R2 bucket once, cached by the
 * browser, and then executed with ONNX Runtime WebGPU. We intentionally do not
 * run the old MODNet portrait connectivity cleanup on BiRefNet output because
 * that cleanup can erase fine hair, ears and soft shoulder edges.
 */

const MODEL_SIZE = 512;
const MODEL_CACHE_NAME = "mlmlive-ai-models-v3";
const MODEL_CACHE_VERSION = "birefnet-lite-512-fp16-2026-10-09-v1";
const DEFAULT_MODEL_URL =
  "https://pub-51f26ff29c2f4b7ca6dfe48387d68c35.r2.dev/models/birefnet/model_fp16.onnx";
const MAX_OUTPUT_SIDE = 3072;
const MAX_OUTPUT_PIXELS = 6_500_000;

const IMAGENET_MEAN = [0.485, 0.456, 0.406];
const IMAGENET_STD = [0.229, 0.224, 0.225];

let runtimePromise = null;
let sessionPromise = null;
let capabilityPromise = null;
let forceFreshModelFetch = false;
let modelRevision = 0;

export const BIREFNET_QUALITY_SETTINGS = Object.freeze({
  inputSize: MODEL_SIZE,
  maxOutputSide: MAX_OUTPUT_SIDE,
  maxOutputPixels: MAX_OUTPUT_PIXELS,
  model: "birefnet-lite-512-fp16",
  backend: "webgpu",
});

function abortError() {
  return new DOMException("Background removal cancelled", "AbortError");
}

function throwIfAborted(signal) {
  if (signal?.aborted) throw abortError();
}

function tagEngineError(error, stage, { retryable = false, unsupported = false } = {}) {
  if (error?.name === "AbortError") return error;
  const tagged = error instanceof Error ? error : new Error(String(error));
  tagged.removeBgStage ||= stage;
  if (typeof tagged.removeBgRetryable !== "boolean") {
    tagged.removeBgRetryable = retryable;
  }
  if (typeof tagged.removeBgUnsupported !== "boolean") {
    tagged.removeBgUnsupported = unsupported;
  }
  return tagged;
}

export function getBirefNetModelUrl() {
  const configured = String(import.meta.env.VITE_BIREFNET_MODEL_URL || "").trim();
  const base = configured || DEFAULT_MODEL_URL;
  const url = new URL(base, window.location.href);
  // The revision only changes after an explicit retry. Normal loads keep a
  // stable URL so both HTTP cache and Cache Storage can reuse the 94 MB model.
  url.searchParams.set("v", MODEL_CACHE_VERSION);
  if (modelRevision > 0) url.searchParams.set("retry", String(modelRevision));
  return url.href;
}

/**
 * Check only capabilities that are required for the quality engine. A weak or
 * WebGPU-less device is routed to the bundled MODNet fallback before the large
 * BiRefNet model is downloaded.
 */
export async function getBirefNetCapability() {
  if (capabilityPromise) return capabilityPromise;
  capabilityPromise = (async () => {
    if (typeof window === "undefined" || typeof navigator === "undefined") {
      return { supported: false, reason: "browser-unavailable" };
    }
    if (!window.isSecureContext && location.hostname !== "localhost") {
      return { supported: false, reason: "secure-context-required" };
    }
    if (!navigator.gpu || typeof navigator.gpu.requestAdapter !== "function") {
      return { supported: false, reason: "webgpu-unavailable" };
    }

    // Avoid spending ~94 MB and then OOMing on very small-memory Android
    // devices. deviceMemory is intentionally treated as a hint only because it
    // is not available in every browser.
    const deviceMemory = Number(navigator.deviceMemory || 0);
    if (deviceMemory > 0 && deviceMemory < 4) {
      return { supported: false, reason: "low-device-memory" };
    }
    const cores = Number(navigator.hardwareConcurrency || 0);
    if (cores > 0 && cores < 4) {
      return { supported: false, reason: "low-cpu-tier" };
    }

    try {
      const adapter = await navigator.gpu.requestAdapter({ powerPreference: "high-performance" });
      if (!adapter) return { supported: false, reason: "webgpu-adapter-unavailable" };
      const storageBuffers = Number(adapter.limits?.maxStorageBuffersPerShaderStage || 0);
      if (storageBuffers > 0 && storageBuffers < 7) {
        return { supported: false, reason: "webgpu-storage-buffer-limit" };
      }
      return { supported: true, reason: "webgpu-ready" };
    } catch (error) {
      return { supported: false, reason: "webgpu-adapter-error", error };
    }
  })();
  return capabilityPromise;
}

async function loadRuntime() {
  if (!runtimePromise) {
    runtimePromise = import("onnxruntime-web/webgpu")
      .then((module) => {
        const ort = module.default || module;
        // BiRefNet uses WebGPU only. MODNet owns the WASM fallback path.
        ort.env.logLevel = "warning";
        return ort;
      })
      .catch((error) => {
        runtimePromise = null;
        throw tagEngineError(error, "runtime-import", { unsupported: true });
      });
  }
  return runtimePromise;
}

async function readResponseWithProgress(response, onProgress, signal) {
  const expectedSize = Number(response.headers.get("content-length")) || 0;
  if (!response.body?.getReader) {
    const bytes = new Uint8Array(await response.arrayBuffer());
    onProgress?.("BiRefNet AI model ready…", 40);
    return bytes;
  }

  const reader = response.body.getReader();
  const chunks = [];
  let received = 0;
  while (true) {
    throwIfAborted(signal);
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    received += value.length;
    const ratio = expectedSize > 0 ? Math.min(1, received / expectedSize) : 0;
    onProgress?.(
      expectedSize > 0
        ? "High-quality AI model पहली बार डाउनलोड हो रहा है…"
        : "High-quality AI model तैयार हो रहा है…",
      4 + ratio * 34,
    );
  }

  const bytes = new Uint8Array(received);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.length;
  }
  return bytes;
}

async function fetchModel(onProgress, signal) {
  const modelUrl = getBirefNetModelUrl();
  const request = new Request(modelUrl, { mode: "cors", credentials: "omit" });

  if (!forceFreshModelFetch && "caches" in window) {
    try {
      const cache = await caches.open(MODEL_CACHE_NAME);
      const cached = await cache.match(request, { ignoreVary: false });
      if (cached) {
        onProgress?.("Cached high-quality AI model मिल गया…", 30);
        return readResponseWithProgress(cached, onProgress, signal);
      }
    } catch {
      // Cache Storage can be disabled/private-mode limited. HTTP cache still
      // provides a second persistence layer, so continue normally.
    }
  }

  let response;
  try {
    response = await fetch(request, {
      cache: forceFreshModelFetch ? "reload" : "force-cache",
      signal,
    });
  } catch (error) {
    throw tagEngineError(error, "model-download", { retryable: true });
  } finally {
    forceFreshModelFetch = false;
  }

  if (!response.ok) {
    throw tagEngineError(
      new Error(`BiRefNet model download failed (${response.status}).`),
      "model-download",
      {
        retryable:
          response.status === 408 || response.status === 429 || response.status >= 500,
      },
    );
  }

  // Persist the exact successful R2 response without blocking inference. The
  // clone allows the original response body to continue feeding progress UI.
  if ("caches" in window) {
    try {
      const cache = await caches.open(MODEL_CACHE_NAME);
      void cache.put(request, response.clone()).catch(() => {});
    } catch {
      // Best-effort cache only.
    }
  }

  return readResponseWithProgress(response, onProgress, signal);
}

async function getSession(onProgress, signal) {
  if (!sessionPromise) {
    sessionPromise = (async () => {
      const capability = await getBirefNetCapability();
      if (!capability.supported) {
        throw tagEngineError(
          new Error(`BiRefNet WebGPU unavailable (${capability.reason}).`),
          "capability",
          { unsupported: true },
        );
      }

      const [ort, model] = await Promise.all([
        loadRuntime(),
        fetchModel(onProgress, signal),
      ]);
      throwIfAborted(signal);
      onProgress?.("High-quality portrait AI शुरू हो रहा है…", 43);
      try {
        return await ort.InferenceSession.create(model, {
          executionProviders: ["webgpu"],
          graphOptimizationLevel: "all",
          executionMode: "sequential",
        });
      } catch (error) {
        // WebGPU provider/adaptor failures are treated as genuine device
        // incompatibility. Network/download failures are tagged elsewhere and
        // are retried on the same quality engine instead of silently downgrading.
        const message = String(error?.message || error || "").toLowerCase();
        const unsupported =
          message.includes("webgpu") ||
          message.includes("adapter") ||
          message.includes("not supported") ||
          message.includes("unsupported") ||
          message.includes("out of memory") ||
          message.includes("oom");
        throw tagEngineError(error, "engine-init", {
          retryable: !unsupported,
          unsupported,
        });
      }
    })().catch((error) => {
      sessionPromise = null;
      throw error;
    });
  }
  return sessionPromise;
}

async function decodeImage(file) {
  if (typeof createImageBitmap === "function") {
    try {
      const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
      return {
        source: bitmap,
        width: bitmap.width,
        height: bitmap.height,
        close: () => bitmap.close?.(),
      };
    } catch {
      // Continue with HTMLImageElement for older Android/WebView decoders.
    }
  }

  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.decoding = "async";
    image.src = url;
    if (typeof image.decode === "function") await image.decode();
    else {
      await new Promise((resolve, reject) => {
        image.onload = resolve;
        image.onerror = () => reject(new Error("Selected image could not be read."));
      });
    }
    return {
      source: image,
      width: image.naturalWidth,
      height: image.naturalHeight,
      close: () => URL.revokeObjectURL(url),
    };
  } catch (error) {
    URL.revokeObjectURL(url);
    throw error;
  }
}

export function getBirefNetOutputSize(width, height) {
  if (!(width > 0) || !(height > 0)) return { width: 1, height: 1, scale: 1 };
  const sideScale = Math.min(1, MAX_OUTPUT_SIDE / Math.max(width, height));
  const pixelScale = Math.min(1, Math.sqrt(MAX_OUTPUT_PIXELS / (width * height)));
  const scale = Math.min(sideScale, pixelScale);
  return {
    // floor keeps the final raster strictly under the pixel-memory cap; using
    // round() can add one pixel on both axes and exceed the limit.
    width: Math.max(1, Math.floor(width * scale)),
    height: Math.max(1, Math.floor(height * scale)),
    scale,
  };
}

function createPreprocessedInput(source) {
  const canvas = document.createElement("canvas");
  canvas.width = MODEL_SIZE;
  canvas.height = MODEL_SIZE;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(source, 0, 0, MODEL_SIZE, MODEL_SIZE);
  const pixels = ctx.getImageData(0, 0, MODEL_SIZE, MODEL_SIZE).data;

  const planeSize = MODEL_SIZE * MODEL_SIZE;
  const data = new Float32Array(planeSize * 3);
  for (let i = 0; i < planeSize; i += 1) {
    const pixel = i * 4;
    data[i] = (pixels[pixel] / 255 - IMAGENET_MEAN[0]) / IMAGENET_STD[0];
    data[i + planeSize] =
      (pixels[pixel + 1] / 255 - IMAGENET_MEAN[1]) / IMAGENET_STD[1];
    data[i + planeSize * 2] =
      (pixels[pixel + 2] / 255 - IMAGENET_MEAN[2]) / IMAGENET_STD[2];
  }
  return data;
}

function halfToFloat32(value) {
  const sign = (value & 0x8000) ? -1 : 1;
  const exponent = (value >> 10) & 0x1f;
  const fraction = value & 0x03ff;
  if (exponent === 0) {
    return sign * Math.pow(2, -14) * (fraction / 1024);
  }
  if (exponent === 31) {
    return fraction ? Number.NaN : sign * Number.POSITIVE_INFINITY;
  }
  return sign * Math.pow(2, exponent - 15) * (1 + fraction / 1024);
}

export function sigmoidLogits(output) {
  const raw = output?.data || output;
  const isFloat16 = output?.type === "float16" && raw instanceof Uint16Array;
  const result = new Float32Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) {
    const logit = isFloat16 ? halfToFloat32(raw[i]) : Number(raw[i]);
    // Stable sigmoid avoids overflow on confident foreground/background logits.
    const alpha =
      logit >= 0
        ? 1 / (1 + Math.exp(-logit))
        : Math.exp(logit) / (1 + Math.exp(logit));
    // Only snap values that are already effectively opaque/transparent. This
    // removes tiny haze while preserving soft hair and shoulder boundaries.
    result[i] = alpha <= 0.004 ? 0 : alpha >= 0.996 ? 1 : alpha;
  }
  return result;
}

function resizeMatteToAlpha(matte, width, height) {
  const sourceCanvas = document.createElement("canvas");
  sourceCanvas.width = MODEL_SIZE;
  sourceCanvas.height = MODEL_SIZE;
  const sourceCtx = sourceCanvas.getContext("2d", { willReadFrequently: true });
  const imageData = sourceCtx.createImageData(MODEL_SIZE, MODEL_SIZE);
  for (let i = 0; i < matte.length; i += 1) {
    const value = Math.round(Math.max(0, Math.min(1, matte[i])) * 255);
    const offset = i * 4;
    imageData.data[offset] = value;
    imageData.data[offset + 1] = value;
    imageData.data[offset + 2] = value;
    imageData.data[offset + 3] = 255;
  }
  sourceCtx.putImageData(imageData, 0, 0);

  const targetCanvas = document.createElement("canvas");
  targetCanvas.width = width;
  targetCanvas.height = height;
  const targetCtx = targetCanvas.getContext("2d", { willReadFrequently: true });
  targetCtx.imageSmoothingEnabled = true;
  targetCtx.imageSmoothingQuality = "high";
  targetCtx.drawImage(sourceCanvas, 0, 0, width, height);
  const resized = targetCtx.getImageData(0, 0, width, height).data;
  const alpha = new Uint8ClampedArray(width * height);
  for (let i = 0; i < alpha.length; i += 1) {
    alpha[i] = resized[i * 4];
  }
  return alpha;
}

function canvasToPngBlob(canvas) {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob && blob.size > 0) resolve(blob);
        else reject(new Error("Transparent PNG could not be created."));
      },
      "image/png",
      1,
    );
  });
}

async function compositeTransparentPng(decoded, matte, onProgress, signal) {
  throwIfAborted(signal);
  const { width, height } = getBirefNetOutputSize(decoded.width, decoded.height);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(decoded.source, 0, 0, width, height);
  onProgress?.("Hair और edges preserve हो रहे हैं…", 88);

  const alpha = resizeMatteToAlpha(matte, width, height);
  const rgba = ctx.getImageData(0, 0, width, height);
  for (let i = 0; i < alpha.length; i += 1) {
    rgba.data[i * 4 + 3] = alpha[i];
  }
  ctx.clearRect(0, 0, width, height);
  ctx.putImageData(rgba, 0, 0);
  throwIfAborted(signal);
  return canvasToPngBlob(canvas);
}

export async function preloadBirefNet(onProgress, signal) {
  const capability = await getBirefNetCapability();
  if (!capability.supported) {
    throw tagEngineError(
      new Error(`BiRefNet unavailable (${capability.reason}).`),
      "capability",
      { unsupported: true },
    );
  }
  await getSession(onProgress, signal);
  return "birefnet-webgpu";
}

export async function removeBackgroundWithBirefNet(file, onProgress, signal) {
  throwIfAborted(signal);
  const [ort, session] = await Promise.all([
    loadRuntime(),
    getSession(onProgress, signal),
  ]);
  throwIfAborted(signal);

  const decoded = await decodeImage(file);
  try {
    onProgress?.("Photo high-quality AI के लिए prepare हो रही है…", 48);
    const inputData = createPreprocessedInput(decoded.source);
    throwIfAborted(signal);
    const input = new ort.Tensor("float32", inputData, [1, 3, MODEL_SIZE, MODEL_SIZE]);
    onProgress?.("BiRefNet background identify कर रहा है…", 58);

    let outputs;
    try {
      outputs = await session.run({ input_image: input });
    } catch (error) {
      throw tagEngineError(error, "inference", { retryable: false });
    }
    throwIfAborted(signal);

    const output = outputs.logits || outputs.output_image || outputs[session.outputNames[0]];
    if (!output?.data?.length) {
      throw tagEngineError(new Error("BiRefNet returned an empty matte."), "inference");
    }
    onProgress?.("Soft matte refine हो रहा है…", 78);
    const matte = sigmoidLogits(output);
    output.dispose?.();
    const result = await compositeTransparentPng(decoded, matte, onProgress, signal);
    onProgress?.("Clean transparent photo तैयार है", 100);
    return result;
  } finally {
    decoded.close?.();
  }
}

export async function resetBirefNetEngine({ freshAssets = false } = {}) {
  sessionPromise = null;
  capabilityPromise = null;
  if (freshAssets) {
    forceFreshModelFetch = true;
    modelRevision += 1;
    if (typeof window !== "undefined" && "caches" in window) {
      try {
        await caches.delete(MODEL_CACHE_NAME);
      } catch {
        // Best effort only.
      }
    }
  }
}
