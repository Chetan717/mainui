/**
 * Pure client-side BiRefNet Lite background removal.
 *
 * - No user image ever leaves the device.
 * - The FP16 model is downloaded once, cached with the browser Cache API and
 *   reused across sessions when storage survives browser eviction.
 * - WebGPU is required for this quality path; slower/older devices are routed
 *   to the bundled MODNet fallback by removeBg.js instead of making users wait.
 */

import {
  cleanPortraitMatte,
  decontaminateEdgeColours,
  refineAlphaWithImage,
} from "./modnetBg.js";

const MODEL_URL =
  import.meta.env.VITE_BIREFNET_MODEL_URL ||
  "https://huggingface.co/studioludens/birefnet-lite-512/resolve/main/onnx/model_fp16.onnx";
const MODEL_CACHE = "mlmlive-birefnet-lite-512-fp16-v1";
const MODEL_CACHE_KEY = `${MODEL_URL}${MODEL_URL.includes("?") ? "&" : "?"}mlmlive-cache=v1`;
const INPUT_SIZE = 512;
const MAX_OUTPUT_SIDE = 1920;
const MAX_OUTPUT_PIXELS = 2_500_000;
const MIN_DEVICE_MEMORY_GB = 4;
const MIN_STORAGE_BUFFER_LIMIT = 7;

let runtimePromise = null;
let sessionPromise = null;
let capabilityPromise = null;
let modelReady = false;
let sessionFailed = false;

function abortError() {
  return new DOMException("Background removal cancelled", "AbortError");
}

function throwIfAborted(signal) {
  if (signal?.aborted) throw abortError();
}

function emit(onProgress, text, pct) {
  onProgress?.(text, Math.max(0, Math.min(100, Math.round(pct))));
}

function getSafeOutputSize(width, height) {
  if (!(width > 0) || !(height > 0)) return { width: 1, height: 1 };
  const sideScale = Math.min(1, MAX_OUTPUT_SIDE / Math.max(width, height));
  const pixelScale = Math.min(
    1,
    Math.sqrt(MAX_OUTPUT_PIXELS / Math.max(1, width * height)),
  );
  const scale = Math.min(sideScale, pixelScale);
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

async function decodeImage(file) {
  if (typeof createImageBitmap === "function") {
    try {
      const bitmap = await createImageBitmap(file, {
        imageOrientation: "from-image",
      });
      return {
        source: bitmap,
        width: bitmap.width,
        height: bitmap.height,
        close: () => bitmap.close?.(),
      };
    } catch {
      // HTMLImage fallback below handles older Android/WebView decoders.
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

async function requestPersistentStorage() {
  try {
    if (navigator.storage?.persist) await navigator.storage.persist();
  } catch {
    // Persistent storage is best-effort. Cache API still works without it.
  }
}

async function hasEnoughStorageForModel() {
  try {
    if (!navigator.storage?.estimate) return true;
    const { quota = 0, usage = 0 } = await navigator.storage.estimate();
    if (!quota) return true;
    // Leave headroom for the model session, image cache and normal app data.
    return quota - usage >= 150 * 1024 * 1024;
  } catch {
    return true;
  }
}

export async function getBiRefNetCapability() {
  if (!capabilityPromise) {
    capabilityPromise = (async () => {
      if (typeof navigator === "undefined" || !navigator.gpu) {
        return { eligible: false, reason: "webgpu-unavailable" };
      }
      const deviceMemory = Number(navigator.deviceMemory || 4);
      if (deviceMemory < MIN_DEVICE_MEMORY_GB) {
        return { eligible: false, reason: "low-memory", deviceMemory };
      }
      if (!(await hasEnoughStorageForModel())) {
        return { eligible: false, reason: "low-storage", deviceMemory };
      }

      let adapter;
      try {
        adapter = await navigator.gpu.requestAdapter({
          powerPreference: "high-performance",
        });
      } catch {
        return { eligible: false, reason: "webgpu-adapter-error" };
      }
      if (!adapter) return { eligible: false, reason: "webgpu-adapter-missing" };

      const storageBuffers = Number(
        adapter.limits?.maxStorageBuffersPerShaderStage || 0,
      );
      if (storageBuffers && storageBuffers < MIN_STORAGE_BUFFER_LIMIT) {
        return {
          eligible: false,
          reason: "webgpu-limits",
          storageBuffers,
          deviceMemory,
        };
      }
      return {
        eligible: true,
        reason: "webgpu",
        storageBuffers,
        deviceMemory,
      };
    })();
  }
  return capabilityPromise;
}

async function openModelCache() {
  if (typeof caches === "undefined") return null;
  try {
    return await caches.open(MODEL_CACHE);
  } catch {
    return null;
  }
}

export async function isBiRefNetModelCached() {
  const cache = await openModelCache();
  if (!cache) return false;
  try {
    return Boolean(await cache.match(MODEL_CACHE_KEY));
  } catch {
    return false;
  }
}

async function responseToBytes(response, onProgress, progressStart, progressEnd) {
  const expected = Number(response.headers.get("content-length")) || 0;
  if (!response.body?.getReader) {
    const bytes = new Uint8Array(await response.arrayBuffer());
    emit(onProgress, "High-quality AI model is ready…", progressEnd);
    return bytes;
  }

  const reader = response.body.getReader();
  const chunks = [];
  let received = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    received += value.byteLength;
    if (expected > 0) {
      const ratio = Math.min(1, received / expected);
      emit(
        onProgress,
        "Preparing high-quality on-device AI…",
        progressStart + (progressEnd - progressStart) * ratio,
      );
    }
  }
  const bytes = new Uint8Array(received);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return bytes;
}


async function prefetchModelToCache(onProgress) {
  await requestPersistentStorage();
  const cache = await openModelCache();
  if (!cache) return false;
  const cached = await cache.match(MODEL_CACHE_KEY);
  if (cached) return true;

  emit(onProgress, "Caching high-quality AI for future use…", 8);
  const response = await fetch(MODEL_URL, {
    mode: "cors",
    credentials: "omit",
    cache: "force-cache",
  });
  if (!response.ok) {
    throw new Error(`Client AI model download failed (${response.status}).`);
  }
  await cache.put(MODEL_CACHE_KEY, response);
  emit(onProgress, "High-quality AI is cached on this device…", 40);
  return true;
}

function scheduleIdleSessionWarmup() {
  if (modelReady || sessionPromise || sessionFailed) return;
  const warm = () => {
    void getSession().catch(() => {
      // removeBg.js will transparently use MODNet if this device cannot run it.
    });
  };
  if (typeof requestIdleCallback === "function") {
    requestIdleCallback(warm, { timeout: 12_000 });
  } else {
    setTimeout(warm, 2_500);
  }
}

async function loadModelBytes(onProgress) {
  await requestPersistentStorage();
  const cache = await openModelCache();
  if (cache) {
    const cached = await cache.match(MODEL_CACHE_KEY);
    if (cached) {
      emit(onProgress, "Loading cached high-quality AI…", 24);
      return new Uint8Array(await cached.arrayBuffer());
    }
  }

  emit(onProgress, "Caching high-quality AI for future use…", 8);
  const response = await fetch(MODEL_URL, {
    mode: "cors",
    credentials: "omit",
    cache: "force-cache",
  });
  if (!response.ok) {
    throw new Error(`Client AI model download failed (${response.status}).`);
  }

  // Tee the response: one branch is persisted, one branch is consumed now.
  const cacheWrite = cache
    ? cache.put(MODEL_CACHE_KEY, response.clone()).catch(() => {})
    : Promise.resolve();
  const bytes = await responseToBytes(response, onProgress, 8, 40);
  await cacheWrite;
  return bytes;
}

async function loadRuntime() {
  if (!runtimePromise) {
    runtimePromise = import("onnxruntime-web/webgpu")
      .then((module) => module.default || module)
      .catch((error) => {
        runtimePromise = null;
        throw error;
      });
  }
  return runtimePromise;
}

async function getSession(onProgress) {
  if (sessionFailed) throw new Error("High-quality WebGPU engine is unavailable.");
  if (!sessionPromise) {
    sessionPromise = (async () => {
      const capability = await getBiRefNetCapability();
      if (!capability.eligible) {
        throw new Error(`WebGPU quality engine unavailable (${capability.reason}).`);
      }
      const [ort, model] = await Promise.all([
        loadRuntime(),
        loadModelBytes(onProgress),
      ]);
      emit(onProgress, "Starting high-quality on-device AI…", 44);
      const session = await ort.InferenceSession.create(model, {
        executionProviders: ["webgpu"],
        graphOptimizationLevel: "all",
        executionMode: "sequential",
        enableCpuMemArena: false,
      });
      modelReady = true;
      return { ort, session };
    })().catch((error) => {
      sessionPromise = null;
      sessionFailed = true;
      throw error;
    });
  }
  return sessionPromise;
}

export function isBiRefNetReady() {
  return modelReady;
}

export async function preloadBiRefNet(onProgress) {
  const capability = await getBiRefNetCapability();
  if (!capability.eligible) return "unavailable";
  await prefetchModelToCache(onProgress);
  // Compile the WebGPU session only when the browser reports idle time. This
  // keeps crop/scroll/typing interactions responsive while still making the
  // first Remove BG tap fast on capable devices.
  scheduleIdleSessionWarmup();
  return "birefnet-lite-512-fp16-webgpu";
}

function halfToFloat(value) {
  const sign = (value & 0x8000) ? -1 : 1;
  const exponent = (value >> 10) & 0x1f;
  const fraction = value & 0x03ff;
  if (exponent === 0) return sign * Math.pow(2, -14) * (fraction / 1024);
  if (exponent === 31) return fraction ? NaN : sign * Infinity;
  return sign * Math.pow(2, exponent - 15) * (1 + fraction / 1024);
}

function sigmoid(value) {
  if (value >= 0) {
    const z = Math.exp(-value);
    return 1 / (1 + z);
  }
  const z = Math.exp(value);
  return z / (1 + z);
}

function tensorValue(data, index, type) {
  if (type === "float16" && data instanceof Uint16Array) {
    return halfToFloat(data[index]);
  }
  return Number(data[index]);
}

function matteToAlphaCanvas(values, width, height) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas is unavailable on this device.");
  const imageData = ctx.createImageData(width, height);
  for (let i = 0; i < values.length; i += 1) {
    const v = Math.max(0, Math.min(255, Math.round(values[i] * 255)));
    const d = i * 4;
    imageData.data[d] = v;
    imageData.data[d + 1] = v;
    imageData.data[d + 2] = v;
    imageData.data[d + 3] = 255;
  }
  ctx.putImageData(imageData, 0, 0);
  return canvas;
}

function canvasToPng(canvas) {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) return resolve(blob);
        try {
          const [, base64] = canvas.toDataURL("image/png").split(",");
          const binary = atob(base64);
          const bytes = new Uint8Array(binary.length);
          for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
          resolve(new Blob([bytes], { type: "image/png" }));
        } catch (error) {
          reject(new Error("Transparent PNG creation failed.", { cause: error }));
        }
      },
      "image/png",
    );
  });
}

export async function removeBackgroundWithBiRefNet(file, onProgress, signal) {
  if (!(file instanceof Blob) || file.size === 0) {
    throw new Error("Please select a valid image.");
  }
  throwIfAborted(signal);
  const startedAt = performance.now();
  const [{ ort, session }, decoded] = await Promise.all([
    getSession(onProgress),
    decodeImage(file),
  ]);
  throwIfAborted(signal);

  const outputSize = getSafeOutputSize(decoded.width, decoded.height);
  const sourceCanvas = document.createElement("canvas");
  sourceCanvas.width = outputSize.width;
  sourceCanvas.height = outputSize.height;
  const sourceContext = sourceCanvas.getContext("2d", {
    alpha: false,
    willReadFrequently: true,
  });
  if (!sourceContext) {
    decoded.close();
    throw new Error("Canvas is unavailable on this device.");
  }
  sourceContext.imageSmoothingEnabled = true;
  sourceContext.imageSmoothingQuality = "high";
  try {
    sourceContext.drawImage(
      decoded.source,
      0,
      0,
      decoded.width,
      decoded.height,
      0,
      0,
      outputSize.width,
      outputSize.height,
    );
  } finally {
    decoded.close();
  }

  emit(onProgress, "AI is separating the subject on your device…", 50);
  const inferenceCanvas = document.createElement("canvas");
  inferenceCanvas.width = INPUT_SIZE;
  inferenceCanvas.height = INPUT_SIZE;
  const inferenceContext = inferenceCanvas.getContext("2d", {
    alpha: false,
    willReadFrequently: true,
  });
  if (!inferenceContext) throw new Error("Canvas is unavailable on this device.");
  inferenceContext.imageSmoothingEnabled = true;
  inferenceContext.imageSmoothingQuality = "high";
  inferenceContext.drawImage(sourceCanvas, 0, 0, INPUT_SIZE, INPUT_SIZE);

  const pixels = inferenceContext.getImageData(0, 0, INPUT_SIZE, INPUT_SIZE).data;
  const plane = INPUT_SIZE * INPUT_SIZE;
  const tensorData = new Float32Array(plane * 3);
  const mean = [0.485, 0.456, 0.406];
  const std = [0.229, 0.224, 0.225];
  for (let src = 0, px = 0; src < pixels.length; src += 4, px += 1) {
    tensorData[px] = (pixels[src] / 255 - mean[0]) / std[0];
    tensorData[px + plane] = (pixels[src + 1] / 255 - mean[1]) / std[1];
    tensorData[px + plane * 2] = (pixels[src + 2] / 255 - mean[2]) / std[2];
  }
  throwIfAborted(signal);

  const inputName = session.inputNames[0];
  const inputTensor = new ort.Tensor("float32", tensorData, [
    1,
    3,
    INPUT_SIZE,
    INPUT_SIZE,
  ]);
  let outputTensor;
  try {
    const outputs = await session.run({ [inputName]: inputTensor });
    throwIfAborted(signal);
    outputTensor = outputs[session.outputNames[0]];
    if (!outputTensor?.data?.length) {
      throw new Error("High-quality AI returned an empty mask.");
    }

    emit(onProgress, "Refining hair and clothing edges…", 76);
    const maskHeight = outputTensor.dims.at(-2) || INPUT_SIZE;
    const maskWidth = outputTensor.dims.at(-1) || INPUT_SIZE;
    const probabilities = new Float32Array(maskWidth * maskHeight);
    for (let i = 0; i < probabilities.length; i += 1) {
      probabilities[i] = sigmoid(
        tensorValue(outputTensor.data, i, outputTensor.type),
      );
    }

    // Remove disconnected background particles while preserving soft alpha.
    const cleaned = cleanPortraitMatte(probabilities, maskWidth, maskHeight);
    const alphaCanvas = matteToAlphaCanvas(cleaned, maskWidth, maskHeight);
    const upscaledMaskCanvas = document.createElement("canvas");
    upscaledMaskCanvas.width = sourceCanvas.width;
    upscaledMaskCanvas.height = sourceCanvas.height;
    const maskContext = upscaledMaskCanvas.getContext("2d", {
      willReadFrequently: true,
    });
    if (!maskContext) throw new Error("Canvas is unavailable on this device.");
    maskContext.imageSmoothingEnabled = true;
    maskContext.imageSmoothingQuality = "high";
    maskContext.drawImage(
      alphaCanvas,
      0,
      0,
      sourceCanvas.width,
      sourceCanvas.height,
    );

    const maskPixels = maskContext.getImageData(
      0,
      0,
      sourceCanvas.width,
      sourceCanvas.height,
    ).data;
    let alphaMap = new Uint8Array(sourceCanvas.width * sourceCanvas.height);
    for (let i = 0; i < alphaMap.length; i += 1) {
      alphaMap[i] = maskPixels[i * 4];
    }

    const sourceImage = sourceContext.getImageData(
      0,
      0,
      sourceCanvas.width,
      sourceCanvas.height,
    );
    // One edge-aware pass gives most of the visual improvement while keeping
    // the main thread short enough for mobile UI responsiveness.
    alphaMap = refineAlphaWithImage(
      alphaMap,
      sourceImage.data,
      sourceCanvas.width,
      sourceCanvas.height,
      1,
    );

    emit(onProgress, "Cleaning edge colour…", 89);
    const outputPixels = decontaminateEdgeColours(
      sourceImage.data,
      alphaMap,
      sourceCanvas.width,
      sourceCanvas.height,
    );
    let foreground = 0;
    let transparent = 0;
    for (let i = 0; i < alphaMap.length; i += 1) {
      const a = alphaMap[i];
      const d = i * 4;
      if (a >= 128) foreground += 1;
      if (a <= 8) transparent += 1;
      if (a <= 4) {
        outputPixels[d] = 0;
        outputPixels[d + 1] = 0;
        outputPixels[d + 2] = 0;
        outputPixels[d + 3] = 0;
      } else {
        outputPixels[d + 3] = a;
      }
    }
    if (foreground < alphaMap.length * 0.001) {
      throw new Error("No clear foreground subject was found.");
    }
    if (transparent < alphaMap.length * 0.005) {
      throw new Error("The subject could not be separated from the background.");
    }

    const outputCanvas = document.createElement("canvas");
    outputCanvas.width = sourceCanvas.width;
    outputCanvas.height = sourceCanvas.height;
    const outputContext = outputCanvas.getContext("2d");
    if (!outputContext) throw new Error("Canvas is unavailable on this device.");
    outputContext.putImageData(
      new ImageData(outputPixels, sourceCanvas.width, sourceCanvas.height),
      0,
      0,
    );
    emit(onProgress, "Preparing HD transparent photo…", 96);
    const blob = await canvasToPng(outputCanvas);
    const elapsedMs = performance.now() - startedAt;
    try {
      localStorage.setItem(
        "mlmlive:birefnet:last-ms:v1",
        String(Math.round(elapsedMs)),
      );
    } catch {
      // Diagnostics only.
    }
    emit(onProgress, "Transparent photo is ready", 100);
    return blob;
  } finally {
    inputTensor.dispose?.();
    outputTensor?.dispose?.();
  }
}
