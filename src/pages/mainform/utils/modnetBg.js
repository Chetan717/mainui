/**
 * Local, free portrait matting powered by MODNet (Apache-2.0).
 *
 * Unlike MediaPipe Selfie Segmentation, MODNet predicts a continuous alpha
 * matte. That is essential for hair, ears and other soft portrait boundaries.
 * The model and ONNX Runtime assets are served from /public/modnet so Android
 * WebView never needs blob: scripts or a paid/cloud background-removal API.
 */

let runtimePromise = null;
let sessionPromise = null;
let assetRevision = 0;
let forceFreshModelFetch = false;
// Bump whenever either the model or its matching ONNX Runtime WASM changes.
// The previous production archive contained a truncated WASM binary; a new
// URL is required so WebViews cannot reuse that corrupt response from cache.
const MODEL_ASSET_VERSION = "modnet-2026-09-03-production-model-v3";
const INFERENCE_REFERENCE_SIZE = 640;
const MAX_INFERENCE_SIDE = 1024;
const MAX_OUTPUT_SIDE = 2048;
const MAX_OUTPUT_PIXELS = 2048 * 1536;
const STRONG_FOREGROUND_ALPHA = 0.32;
const WEAK_EDGE_ALPHA = 0.006;
const EDGE_RECOVERY_DISTANCE = 12;
const DETAIL_PASS_MAX_BOX_RATIO = 0.55;
const MIN_TRANSPARENT_RATIO = 0.005;

export const MODNET_QUALITY_SETTINGS = Object.freeze({
  inferenceReferenceSize: INFERENCE_REFERENCE_SIZE,
  maxInferenceSide: MAX_INFERENCE_SIDE,
  maxOutputSide: MAX_OUTPUT_SIDE,
  maxOutputPixels: MAX_OUTPUT_PIXELS,
  detailPassMaxBoxRatio: DETAIL_PASS_MAX_BOX_RATIO,
});

function abortError() {
  return new DOMException("Background removal cancelled", "AbortError");
}

function throwIfAborted(signal) {
  if (signal?.aborted) throw abortError();
}

function tagEngineError(error, stage, retryable = false) {
  if (error?.name === "AbortError") return error;
  const tagged = error instanceof Error ? error : new Error(String(error));
  tagged.removeBgStage ||= stage;
  if (typeof tagged.removeBgRetryable !== "boolean") {
    tagged.removeBgRetryable = retryable;
  }
  return tagged;
}

function assetUrl(fileName) {
  const url = new URL(
    `${import.meta.env.BASE_URL}modnet/${fileName}`,
    window.location.href,
  );
  // Cache files permanently on the device while keeping future model updates
  // safe: bump this version whenever any MODNet/ORT asset changes.
  url.searchParams.set("v", MODEL_ASSET_VERSION);
  if (assetRevision > 0) url.searchParams.set("retry", String(assetRevision));
  return url.href;
}

async function loadRuntime() {
  if (!runtimePromise) {
    runtimePromise = import("onnxruntime-web/wasm")
      .then((module) => {
        const ort = module.default || module;
        // A single WASM thread avoids SharedArrayBuffer/crossOriginIsolated
        // requirements in React Native WebView. Direct same-origin paths avoid
        // the blob: CSP failure that the previous engine hit.
        ort.env.wasm.numThreads = 1;
        ort.env.wasm.proxy = false;
        ort.env.wasm.wasmPaths = {
          wasm: assetUrl("ort-wasm-simd-threaded.wasm"),
          mjs: assetUrl("ort-wasm-simd-threaded.mjs"),
        };
        return ort;
      })
      .catch((error) => {
        runtimePromise = null;
        throw error;
      });
  }
  return runtimePromise;
}

async function fetchModel(onProgress) {
  const cacheMode = forceFreshModelFetch ? "reload" : "force-cache";
  forceFreshModelFetch = false;
  let response;
  try {
    response = await fetch(assetUrl("modnet.onnx"), {
      cache: cacheMode,
    });
  } catch (error) {
    throw tagEngineError(error, "model-download", true);
  }
  if (!response.ok) {
    throw tagEngineError(
      new Error(`Portrait model download failed (${response.status}).`),
      "model-download",
      response.status === 408 || response.status === 429 || response.status >= 500,
    );
  }

  const expectedSize = Number(response.headers.get("content-length")) || 0;
  if (!response.body?.getReader) {
    const bytes = new Uint8Array(await response.arrayBuffer());
    onProgress?.("Professional AI मॉडल तैयार है…", 38);
    return bytes;
  }

  const reader = response.body.getReader();
  const chunks = [];
  let received = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    received += value.length;
    const ratio = expectedSize > 0 ? Math.min(1, received / expectedSize) : 0;
    onProgress?.(
      "Professional AI मॉडल पहली बार डाउनलोड हो रहा है…",
      8 + ratio * 30,
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

async function getSession(onProgress) {
  if (!sessionPromise) {
    sessionPromise = (async () => {
      const [ort, model] = await Promise.all([
        loadRuntime(),
        fetchModel(onProgress),
      ]);
      onProgress?.("Professional portrait engine शुरू हो रहा है…", 42);
      return ort.InferenceSession.create(model, {
        executionProviders: ["wasm"],
        graphOptimizationLevel: "all",
        executionMode: "sequential",
        enableCpuMemArena: true,
      });
    })().catch((error) => {
      sessionPromise = null;
      throw tagEngineError(error, "engine-init", true);
    });
  }
  return sessionPromise;
}

async function decodeImage(file) {
  if (typeof createImageBitmap === "function") {
    try {
      const bitmap = await createImageBitmap(file);
      return {
        source: bitmap,
        width: bitmap.width,
        height: bitmap.height,
        close: () => bitmap.close?.(),
      };
    } catch {
      // Some older Android camera decoders need the HTMLImage fallback.
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

function alignToModelStride(value) {
  return Math.max(32, Math.round(value / 32) * 32);
}

/**
 * MODNet accepts dynamic shapes, but both dimensions must be divisible by 32.
 * Always giving the short edge enough pixels fixes the old wide-photo case
 * where a 200px-high portrait was sent to the model almost unchanged. The
 * longest edge remains capped so unusual panoramas cannot exhaust a WebView.
 */
export function getInferenceSize(
  width,
  height,
  referenceSize = INFERENCE_REFERENCE_SIZE,
  maxSide = MAX_INFERENCE_SIDE,
) {
  if (!(width > 0) || !(height > 0)) return { width: 32, height: 32 };

  const shortEdge = Math.min(width, height);
  const longEdge = Math.max(width, height);
  let scale = referenceSize / shortEdge;
  if (longEdge * scale > maxSide) scale = maxSide / longEdge;

  let inferenceWidth = alignToModelStride(width * scale);
  let inferenceHeight = alignToModelStride(height * scale);
  const alignedMaxSide = Math.max(32, Math.floor(maxSide / 32) * 32);

  if (Math.max(inferenceWidth, inferenceHeight) > alignedMaxSide) {
    const capScale = alignedMaxSide / Math.max(inferenceWidth, inferenceHeight);
    inferenceWidth = alignToModelStride(inferenceWidth * capScale);
    inferenceHeight = alignToModelStride(inferenceHeight * capScale);
  }

  return { width: inferenceWidth, height: inferenceHeight };
}

/** Keep large phone photos within a predictable memory budget without crop. */
export function getSafeOutputSize(
  width,
  height,
  maxSide = MAX_OUTPUT_SIDE,
  maxPixels = MAX_OUTPUT_PIXELS,
) {
  if (!(width > 0) || !(height > 0)) return { width: 1, height: 1, scale: 1 };
  const sideScale = Math.min(1, maxSide / Math.max(width, height));
  const pixelScale = Math.min(1, Math.sqrt(maxPixels / (width * height)));
  const scale = Math.min(sideScale, pixelScale);
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
    scale,
  };
}

function smoothAlpha(value) {
  const normalized = Math.max(0, Math.min(1, (value - 0.004) / 0.992));
  const smoothStep = normalized * normalized * (3 - 2 * normalized);
  // Do not crush genuine low-opacity hair into zero. Detached low confidence
  // has already been rejected by cleanPortraitMatte's connectivity gate.
  return Math.max(normalized * 0.78, smoothStep);
}

/**
 * Keep the main portrait and recover its weak connected edge. A low threshold
 * alone used to keep sizeable background objects, while a hard threshold cut
 * ears and fine hair. This is a two-threshold/hysteresis matte: the strongest
 * portrait component is the anchor, then genuine low-alpha detail may grow a
 * bounded distance from it. Detached background cannot re-enter the mask.
 */
export function cleanPortraitMatte(values, width, height) {
  const pixelCount = width * height;
  if (!values?.length || pixelCount <= 0) return new Float32Array(0);

  const labels = new Uint32Array(pixelCount);
  const queue = new Int32Array(pixelCount);
  let nextLabel = 0;
  let primaryLabel = 0;
  let primaryArea = 0;
  let primaryTop = height;
  let primaryBottom = -1;

  // Locate only confident components first. Eight-way connectivity prevents
  // diagonal hair strands from being misclassified as separate particles.
  for (let start = 0; start < pixelCount; start += 1) {
    if (labels[start] || values[start] < STRONG_FOREGROUND_ALPHA) continue;
    nextLabel += 1;
    let head = 0;
    let tail = 1;
    queue[0] = start;
    labels[start] = nextLabel;
    let componentTop = Math.floor(start / width);
    let componentBottom = componentTop;

    while (head < tail) {
      const index = queue[head++];
      const x = index % width;
      const y = Math.floor(index / width);
      componentTop = Math.min(componentTop, y);
      componentBottom = Math.max(componentBottom, y);

      for (let offsetY = -1; offsetY <= 1; offsetY += 1) {
        const neighbourY = y + offsetY;
        if (neighbourY < 0 || neighbourY >= height) continue;
        for (let offsetX = -1; offsetX <= 1; offsetX += 1) {
          if (offsetX === 0 && offsetY === 0) continue;
          const neighbourX = x + offsetX;
          if (neighbourX < 0 || neighbourX >= width) continue;
          const neighbour = neighbourY * width + neighbourX;
          if (
            !labels[neighbour] &&
            values[neighbour] >= STRONG_FOREGROUND_ALPHA
          ) {
            labels[neighbour] = nextLabel;
            queue[tail++] = neighbour;
          }
        }
      }
    }

    if (tail > primaryArea) {
      primaryArea = tail;
      primaryLabel = nextLabel;
      primaryTop = componentTop;
      primaryBottom = componentBottom;
    }
  }

  // Extremely low-contrast portraits can have no 0.32-confidence core. In
  // that rare case return a gentle matte instead of an entirely blank image.
  if (primaryLabel === 0) {
    const fallback = new Float32Array(pixelCount);
    for (let index = 0; index < pixelCount; index += 1) {
      fallback[index] = smoothAlpha(values[index]);
    }
    return fallback;
  }

  const distance = new Int16Array(pixelCount);
  distance.fill(-1);
  let head = 0;
  let tail = 0;
  for (let index = 0; index < pixelCount; index += 1) {
    if (labels[index] !== primaryLabel) continue;
    distance[index] = 0;
    queue[tail++] = index;
  }

  while (head < tail) {
    const index = queue[head++];
    const nextDistance = distance[index] + 1;
    if (nextDistance > EDGE_RECOVERY_DISTANCE) continue;
    const x = index % width;
    const y = Math.floor(index / width);

    for (let offsetY = -1; offsetY <= 1; offsetY += 1) {
      const neighbourY = y + offsetY;
      if (neighbourY < 0 || neighbourY >= height) continue;
      for (let offsetX = -1; offsetX <= 1; offsetX += 1) {
        if (offsetX === 0 && offsetY === 0) continue;
        const neighbourX = x + offsetX;
        if (neighbourX < 0 || neighbourX >= width) continue;
        const neighbour = neighbourY * width + neighbourX;
        if (
          distance[neighbour] === -1 &&
          values[neighbour] >= WEAK_EDGE_ALPHA
        ) {
          distance[neighbour] = nextDistance;
          queue[tail++] = neighbour;
        }
      }
    }
  }

  const cleaned = new Float32Array(pixelCount);
  for (let index = 0; index < pixelCount; index += 1) {
    if (distance[index] < 0) continue;
    cleaned[index] = smoothAlpha(values[index]);
  }

  // Recover a very thin, soft rim only around the upper portrait where ears
  // and loose hair live. The value is bounded by the model's original alpha,
  // so this cannot grow an opaque halo into an unrelated background.
  const protectedHeadEnd = Math.min(
    height - 1,
    primaryTop + Math.round((primaryBottom - primaryTop + 1) * 0.48),
  );
  const recovered = cleaned.slice();
  for (let y = Math.max(1, primaryTop - 2); y <= protectedHeadEnd; y += 1) {
    for (let x = 1; x < width - 1; x += 1) {
      const index = y * width + x;
      if (distance[index] < 0 || cleaned[index] >= 0.72) continue;
      let strongestNeighbour = 0;
      for (let offsetY = -1; offsetY <= 1; offsetY += 1) {
        for (let offsetX = -1; offsetX <= 1; offsetX += 1) {
          if (offsetX === 0 && offsetY === 0) continue;
          strongestNeighbour = Math.max(
            strongestNeighbour,
            cleaned[index + offsetY * width + offsetX],
          );
        }
      }
      recovered[index] = Math.max(
        recovered[index],
        Math.min(strongestNeighbour * 0.34, values[index] * 3.2),
      );
    }
  }

  return recovered;
}

function decontaminateEdgeColours(pixels, alphaMap, width, height) {
  const cleaned = new Uint8ClampedArray(pixels);
  const radius = 4;

  for (let y = radius; y < height - radius; y += 1) {
    for (let x = radius; x < width - radius; x += 1) {
      const index = y * width + x;
      const alphaByte = alphaMap[index];
      if (alphaByte <= 10 || alphaByte >= 248) continue;

      let backgroundRed = 0;
      let backgroundGreen = 0;
      let backgroundBlue = 0;
      let backgroundCount = 0;
      for (let offsetY = -radius; offsetY <= radius; offsetY += 1) {
        for (let offsetX = -radius; offsetX <= radius; offsetX += 1) {
          if (offsetX === 0 && offsetY === 0) continue;
          const sampleIndex =
            (y + offsetY) * width + (x + offsetX);
          if (alphaMap[sampleIndex] > 5) continue;
          const sampleDataIndex = sampleIndex * 4;
          backgroundRed += pixels[sampleDataIndex];
          backgroundGreen += pixels[sampleDataIndex + 1];
          backgroundBlue += pixels[sampleDataIndex + 2];
          backgroundCount += 1;
        }
      }
      if (backgroundCount === 0) continue;

      backgroundRed /= backgroundCount;
      backgroundGreen /= backgroundCount;
      backgroundBlue /= backgroundCount;
      const alpha = alphaByte / 255;
      const dataIndex = index * 4;
      const strength = Math.min(0.9, Math.max(0.22, (1 - alpha) * 1.1));
      const safeAlpha = Math.max(alpha, 0.1);
      const reconstructedRed = Math.max(
        0,
        Math.min(255, (pixels[dataIndex] - (1 - alpha) * backgroundRed) / safeAlpha),
      );
      const reconstructedGreen = Math.max(
        0,
        Math.min(
          255,
          (pixels[dataIndex + 1] - (1 - alpha) * backgroundGreen) / safeAlpha,
        ),
      );
      const reconstructedBlue = Math.max(
        0,
        Math.min(
          255,
          (pixels[dataIndex + 2] - (1 - alpha) * backgroundBlue) / safeAlpha,
        ),
      );

      cleaned[dataIndex] = Math.round(
        pixels[dataIndex] * (1 - strength) + reconstructedRed * strength,
      );
      cleaned[dataIndex + 1] = Math.round(
        pixels[dataIndex + 1] * (1 - strength) + reconstructedGreen * strength,
      );
      cleaned[dataIndex + 2] = Math.round(
        pixels[dataIndex + 2] * (1 - strength) + reconstructedBlue * strength,
      );
    }
  }

  return cleaned;
}

function getMatteBounds(values, width, height, threshold = 0.08) {
  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;
  let count = 0;

  for (let index = 0; index < values.length; index += 1) {
    if (values[index] < threshold) continue;
    const x = index % width;
    const y = Math.floor(index / width);
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x);
    maxY = Math.max(maxY, y);
    count += 1;
  }

  return maxX >= minX && maxY >= minY
    ? { minX, minY, maxX, maxY, count }
    : null;
}

function matteToCanvas(values, width, height) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas is unavailable on this device.");
  const image = context.createImageData(width, height);

  for (let index = 0; index < values.length; index += 1) {
    const value = Math.round(Math.max(0, Math.min(1, values[index])) * 255);
    const dataIndex = index * 4;
    image.data[dataIndex] = value;
    image.data[dataIndex + 1] = value;
    image.data[dataIndex + 2] = value;
    image.data[dataIndex + 3] = 255;
  }
  context.putImageData(image, 0, 0);
  return canvas;
}

async function runModNetInference(
  sourceCanvas,
  ort,
  session,
  signal,
  region = null,
) {
  throwIfAborted(signal);
  const crop = region || {
    x: 0,
    y: 0,
    width: sourceCanvas.width,
    height: sourceCanvas.height,
  };
  const inferenceSize = getInferenceSize(crop.width, crop.height);
  const inferenceCanvas = document.createElement("canvas");
  inferenceCanvas.width = inferenceSize.width;
  inferenceCanvas.height = inferenceSize.height;
  const inferenceContext = inferenceCanvas.getContext("2d", {
    alpha: false,
    willReadFrequently: true,
  });
  if (!inferenceContext) throw new Error("Canvas is unavailable on this device.");
  inferenceContext.imageSmoothingEnabled = true;
  inferenceContext.imageSmoothingQuality = "high";
  inferenceContext.drawImage(
    sourceCanvas,
    crop.x,
    crop.y,
    crop.width,
    crop.height,
    0,
    0,
    inferenceCanvas.width,
    inferenceCanvas.height,
  );

  const inputPixels = inferenceContext.getImageData(
    0,
    0,
    inferenceCanvas.width,
    inferenceCanvas.height,
  ).data;
  const planeSize = inferenceCanvas.width * inferenceCanvas.height;
  const tensorData = new Float32Array(planeSize * 3);
  for (
    let sourceIndex = 0, pixelIndex = 0;
    sourceIndex < inputPixels.length;
    sourceIndex += 4, pixelIndex += 1
  ) {
    tensorData[pixelIndex] = (inputPixels[sourceIndex] - 127.5) / 127.5;
    tensorData[pixelIndex + planeSize] =
      (inputPixels[sourceIndex + 1] - 127.5) / 127.5;
    tensorData[pixelIndex + planeSize * 2] =
      (inputPixels[sourceIndex + 2] - 127.5) / 127.5;
  }

  const inputName = session.inputNames[0];
  const outputName = session.outputNames[0];
  const inputTensor = new ort.Tensor("float32", tensorData, [
    1,
    3,
    inferenceCanvas.height,
    inferenceCanvas.width,
  ]);
  let matteTensor;
  try {
    let results;
    try {
      results = await session.run({ [inputName]: inputTensor });
    } catch (error) {
      throw tagEngineError(error, "inference", false);
    }
    throwIfAborted(signal);
    matteTensor = results[outputName];
    if (!matteTensor?.data?.length) {
      throw new Error("Professional portrait model returned an empty matte.");
    }
    const matteHeight = matteTensor.dims[matteTensor.dims.length - 2];
    const matteWidth = matteTensor.dims[matteTensor.dims.length - 1];
    const rawValues = new Float32Array(matteTensor.data);
    const values = cleanPortraitMatte(rawValues, matteWidth, matteHeight);
    return {
      values,
      width: matteWidth,
      height: matteHeight,
      bounds: getMatteBounds(values, matteWidth, matteHeight),
      region: crop,
    };
  } finally {
    inputTensor.dispose?.();
    matteTensor?.dispose?.();
  }
}

function getDetailRegion(globalMatte, sourceWidth, sourceHeight) {
  const bounds = globalMatte.bounds;
  if (!bounds) return null;
  const boxWidth = bounds.maxX - bounds.minX + 1;
  const boxHeight = bounds.maxY - bounds.minY + 1;
  const boxAreaRatio =
    (boxWidth * boxHeight) / (globalMatte.width * globalMatte.height);

  // A second, zoomed inference is most useful when the person is relatively
  // small in a large scene. It restores facial, ear and hair detail that a
  // single whole-photo pass cannot resolve.
  if (boxAreaRatio >= DETAIL_PASS_MAX_BOX_RATIO) return null;

  const scaleX = sourceWidth / globalMatte.width;
  const scaleY = sourceHeight / globalMatte.height;
  const subjectX = bounds.minX * scaleX;
  const subjectY = bounds.minY * scaleY;
  const subjectWidth = boxWidth * scaleX;
  const subjectHeight = boxHeight * scaleY;
  const horizontalPadding = Math.max(12, subjectWidth * 0.22);
  const topPadding = Math.max(12, subjectHeight * 0.28);
  const bottomPadding = Math.max(12, subjectHeight * 0.18);
  const x = Math.max(0, subjectX - horizontalPadding);
  const y = Math.max(0, subjectY - topPadding);
  const right = Math.min(
    sourceWidth,
    subjectX + subjectWidth + horizontalPadding,
  );
  const bottom = Math.min(
    sourceHeight,
    subjectY + subjectHeight + bottomPadding,
  );
  const region = {
    x,
    y,
    width: Math.max(1, right - x),
    height: Math.max(1, bottom - y),
  };

  return region.width * region.height < sourceWidth * sourceHeight * 0.9
    ? region
    : null;
}

function buildAlphaMap(globalMatte, detailMatte, width, height) {
  const globalCanvas = matteToCanvas(
    globalMatte.values,
    globalMatte.width,
    globalMatte.height,
  );
  const outputCanvas = document.createElement("canvas");
  outputCanvas.width = width;
  outputCanvas.height = height;
  const outputContext = outputCanvas.getContext("2d", {
    willReadFrequently: true,
  });
  if (!outputContext) throw new Error("Canvas is unavailable on this device.");
  outputContext.imageSmoothingEnabled = true;
  outputContext.imageSmoothingQuality = "high";
  outputContext.drawImage(globalCanvas, 0, 0, width, height);
  const globalPixels = outputContext.getImageData(0, 0, width, height).data;
  const alphaMap = new Uint8Array(width * height);
  for (let index = 0; index < alphaMap.length; index += 1) {
    alphaMap[index] = globalPixels[index * 4];
  }

  if (!detailMatte) return alphaMap;
  const detailCanvas = matteToCanvas(
    detailMatte.values,
    detailMatte.width,
    detailMatte.height,
  );
  outputContext.clearRect(0, 0, width, height);
  outputContext.drawImage(
    detailCanvas,
    detailMatte.region.x,
    detailMatte.region.y,
    detailMatte.region.width,
    detailMatte.region.height,
  );
  const detailPixels = outputContext.getImageData(0, 0, width, height).data;
  const feather = Math.max(
    4,
    Math.min(detailMatte.region.width, detailMatte.region.height) * 0.06,
  );
  const startX = Math.max(0, Math.floor(detailMatte.region.x));
  const startY = Math.max(0, Math.floor(detailMatte.region.y));
  const endX = Math.min(width, Math.ceil(detailMatte.region.x + detailMatte.region.width));
  const endY = Math.min(height, Math.ceil(detailMatte.region.y + detailMatte.region.height));

  for (let y = startY; y < endY; y += 1) {
    const distanceY = Math.min(
      y - detailMatte.region.y,
      detailMatte.region.y + detailMatte.region.height - y,
    );
    for (let x = startX; x < endX; x += 1) {
      const distanceX = Math.min(
        x - detailMatte.region.x,
        detailMatte.region.x + detailMatte.region.width - x,
      );
      const edgeWeight = Math.max(
        0,
        Math.min(1, Math.min(distanceX, distanceY) / feather),
      );
      const index = y * width + x;
      const detailAlpha = Math.round(detailPixels[index * 4] * edgeWeight);
      alphaMap[index] = Math.max(alphaMap[index], detailAlpha);
    }
  }

  return alphaMap;
}

/** Squared RGB distance, kept allocation-free for the per-pixel edge pass. */
export function colourDistanceSquared(
  red,
  green,
  blue,
  otherRed,
  otherGreen,
  otherBlue,
) {
  const redDelta = red - otherRed;
  const greenDelta = green - otherGreen;
  const blueDelta = blue - otherBlue;
  return (
    redDelta * redDelta +
    greenDelta * greenDelta +
    blueDelta * blueDelta
  );
}

export function refineAlphaWithImage(alphaMap, sourcePixels, width, height) {
  let current = alphaMap;

  // A compact joint-bilateral pass follows the real colour edge at output
  // resolution. This removes blocky upscaling without blurring an ear/hair
  // boundary into a differently-coloured background.
  for (let pass = 0; pass < 2; pass += 1) {
    const refined = current.slice();
    for (let y = 1; y < height - 1; y += 1) {
      for (let x = 1; x < width - 1; x += 1) {
        const index = y * width + x;
        const centerAlpha = current[index];
        if (centerAlpha <= 4 || centerAlpha >= 251) continue;
        const dataIndex = index * 4;
        const red = sourcePixels[dataIndex];
        const green = sourcePixels[dataIndex + 1];
        const blue = sourcePixels[dataIndex + 2];
        let alphaSum = centerAlpha * 5;
        let weightSum = 5;

        for (let offsetY = -1; offsetY <= 1; offsetY += 1) {
          for (let offsetX = -1; offsetX <= 1; offsetX += 1) {
            if (offsetX === 0 && offsetY === 0) continue;
            const neighbour = index + offsetY * width + offsetX;
            const neighbourDataIndex = neighbour * 4;
            const colourDistance = colourDistanceSquared(
              red,
              green,
              blue,
              sourcePixels[neighbourDataIndex],
              sourcePixels[neighbourDataIndex + 1],
              sourcePixels[neighbourDataIndex + 2],
            );
            const weight = 1 / (1 + colourDistance / 900);
            alphaSum += current[neighbour] * weight;
            weightSum += weight;
          }
        }
        refined[index] = Math.round(alphaSum / weightSum);
      }
    }
    current = refined;
  }

  return current;
}

export async function preloadModNet(onProgress) {
  await getSession(onProgress);
  return "modnet";
}

/** Clear a failed session so the caller can retry the exact same quality model. */
export function resetModNetEngine({ freshAssets = false } = {}) {
  sessionPromise = null;
  if (freshAssets) {
    runtimePromise = null;
    assetRevision += 1;
    forceFreshModelFetch = true;
  }
}

export async function removeBackgroundWithModNet(file, onProgress, signal) {
  throwIfAborted(signal);
  onProgress?.("Professional portrait model तैयार हो रहा है…", 6);
  const [ort, session, decoded] = await Promise.all([
    loadRuntime(),
    getSession(onProgress),
    decodeImage(file),
  ]);
  throwIfAborted(signal);

  const safeOutput = getSafeOutputSize(decoded.width, decoded.height);
  const sourceCanvas = document.createElement("canvas");
  sourceCanvas.width = safeOutput.width;
  sourceCanvas.height = safeOutput.height;
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
      sourceCanvas.width,
      sourceCanvas.height,
    );
  } finally {
    decoded.close();
  }

  onProgress?.("AI बाल, कान और body की alpha edge बना रहा है…", 52);
  const globalMatte = await runModNetInference(
    sourceCanvas,
    ort,
    session,
    signal,
  );
  if (!globalMatte.bounds) {
    throw new Error("No clear person was found in this photo.");
  }

  const detailRegion = getDetailRegion(
    globalMatte,
    sourceCanvas.width,
    sourceCanvas.height,
  );
  let detailMatte = null;
  if (detailRegion) {
    onProgress?.("छोटे चेहरे, कान और बाल detail में साफ हो रहे हैं…", 72);
    detailMatte = await runModNetInference(
      sourceCanvas,
      ort,
      session,
      signal,
      detailRegion,
    );
  }

  throwIfAborted(signal);
  onProgress?.("Background particles और edge colour साफ हो रहे हैं…", 86);

  const sourceImage = sourceContext.getImageData(
    0,
    0,
    sourceCanvas.width,
    sourceCanvas.height,
  );
  let alphaMap = buildAlphaMap(
    globalMatte,
    detailMatte,
    sourceCanvas.width,
    sourceCanvas.height,
  );
  alphaMap = refineAlphaWithImage(
    alphaMap,
    sourceImage.data,
    sourceCanvas.width,
    sourceCanvas.height,
  );

  let visiblePixels = 0;
  let transparentPixels = 0;
  let transparentBorderPixels = 0;
  let borderPixels = 0;
  for (let pixelIndex = 0; pixelIndex < alphaMap.length; pixelIndex += 1) {
    const alpha = alphaMap[pixelIndex];
    if (alpha >= 128) visiblePixels += 1;
    if (alpha <= 8) transparentPixels += 1;
    const x = pixelIndex % sourceCanvas.width;
    const y = Math.floor(pixelIndex / sourceCanvas.width);
    if (
      x === 0 ||
      y === 0 ||
      x === sourceCanvas.width - 1 ||
      y === sourceCanvas.height - 1
    ) {
      borderPixels += 1;
      if (alpha <= 8) transparentBorderPixels += 1;
    }
  }
  if (visiblePixels < alphaMap.length * 0.001) {
    throw new Error("No clear person was found in this photo.");
  }
  const transparentRatio = transparentPixels / alphaMap.length;
  const transparentBorderRatio = borderPixels
    ? transparentBorderPixels / borderPixels
    : 0;
  if (transparentRatio < MIN_TRANSPARENT_RATIO) {
    throw new Error("The portrait could not be separated from its background.");
  }
  if (transparentRatio < 0.015 && transparentBorderRatio < 0.02) {
    throw new Error("The background is still attached to the portrait mask.");
  }

  const outputPixels = decontaminateEdgeColours(
    sourceImage.data,
    alphaMap,
    sourceCanvas.width,
    sourceCanvas.height,
  );
  for (let pixelIndex = 0; pixelIndex < alphaMap.length; pixelIndex += 1) {
    const dataIndex = pixelIndex * 4;
    const alpha = alphaMap[pixelIndex];
    if (alpha <= 5) {
      outputPixels[dataIndex] = 0;
      outputPixels[dataIndex + 1] = 0;
      outputPixels[dataIndex + 2] = 0;
      outputPixels[dataIndex + 3] = 0;
    } else {
      outputPixels[dataIndex + 3] = alpha;
    }
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

  onProgress?.("Lossless Transparent PNG तैयार हो रही है…", 97);
  return new Promise((resolve, reject) => {
    outputCanvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
          return;
        }

        // Some Android WebViews occasionally return null from canvas.toBlob.
        // A data-URL fallback prevents a clean matte from being lost at the
        // final encoding step.
        try {
          const [, encoded] = outputCanvas.toDataURL("image/png").split(",");
          const binary = atob(encoded);
          const bytes = new Uint8Array(binary.length);
          for (let index = 0; index < binary.length; index += 1) {
            bytes[index] = binary.charCodeAt(index);
          }
          resolve(new Blob([bytes], { type: "image/png" }));
        } catch (error) {
          reject(new Error("Transparent PNG creation failed.", { cause: error }));
        }
      },
      "image/png",
    );
  });
}
