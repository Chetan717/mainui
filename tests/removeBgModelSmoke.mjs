import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { performance } from "node:perf_hooks";

import {
  cleanPortraitMatte,
  refineAlphaWithImage,
} from "../src/pages/mainform/utils/modnetBg.js";

const projectRoot = resolve(import.meta.dirname, "..");
const temporaryRoot = mkdtempSync(
  join(projectRoot, "tests", ".tmp-removebg-smoke-"),
);
const width = 640;
const height = 640;

function convert(...args) {
  execFileSync("convert", args, { stdio: "pipe" });
}

try {
  const background = join(temporaryRoot, "background.png");
  const person = join(temporaryRoot, "person.png");
  const personCanvas = join(temporaryRoot, "person-canvas.png");
  const source = join(temporaryRoot, "source.png");
  const sourceRgb = join(temporaryRoot, "source.rgb");
  const expectedMask = join(temporaryRoot, "expected.gray");
  const outputRgba = join(temporaryRoot, "output.rgba");
  const outputPng = process.env.REMOVE_BG_SMOKE_OUTPUT
    ? resolve(process.env.REMOVE_BG_SMOKE_OUTPUT)
    : join(temporaryRoot, "output.png");

  convert(
    join(projectRoot, "src/pages/Subscription/plan.png"),
    "-resize",
    `${width}x${height}^`,
    "-gravity",
    "center",
    "-extent",
    `${width}x${height}`,
    background,
  );
  convert(
    join(projectRoot, "src/assets/professional-guide.png"),
    "-resize",
    "x540",
    person,
  );
  convert(
    "-size",
    `${width}x${height}`,
    "xc:none",
    person,
    "-gravity",
    "south",
    "-composite",
    personCanvas,
  );
  convert(background, personCanvas, "-composite", source);
  convert(source, "-alpha", "off", "-depth", "8", `rgb:${sourceRgb}`);
  convert(
    personCanvas,
    "-alpha",
    "extract",
    "-depth",
    "8",
    `gray:${expectedMask}`,
  );

  const ortModule = await import("onnxruntime-web/wasm");
  const ort = ortModule.default || ortModule;
  ort.env.wasm.numThreads = 1;
  ort.env.wasm.proxy = false;
  ort.env.wasm.wasmPaths = {
    wasm: new URL(
      "../public/modnet/ort-wasm-simd-threaded.wasm",
      import.meta.url,
    ).href,
    mjs: new URL(
      "../public/modnet/ort-wasm-simd-threaded.mjs",
      import.meta.url,
    ).href,
  };

  const startedSession = performance.now();
  const session = await ort.InferenceSession.create(
    readFileSync(join(projectRoot, "public/modnet/modnet.onnx")),
    {
      executionProviders: ["wasm"],
      graphOptimizationLevel: "all",
      executionMode: "sequential",
      enableCpuMemArena: true,
    },
  );
  const sessionMs = performance.now() - startedSession;

  const rgb = readFileSync(sourceRgb);
  assert.equal(rgb.length, width * height * 3);
  const rgba = new Uint8ClampedArray(width * height * 4);
  const planeSize = width * height;
  const tensorData = new Float32Array(planeSize * 3);
  for (let pixelIndex = 0; pixelIndex < planeSize; pixelIndex += 1) {
    const rgbIndex = pixelIndex * 3;
    const rgbaIndex = pixelIndex * 4;
    const red = rgb[rgbIndex];
    const green = rgb[rgbIndex + 1];
    const blue = rgb[rgbIndex + 2];
    rgba[rgbaIndex] = red;
    rgba[rgbaIndex + 1] = green;
    rgba[rgbaIndex + 2] = blue;
    rgba[rgbaIndex + 3] = 255;
    tensorData[pixelIndex] = (red - 127.5) / 127.5;
    tensorData[pixelIndex + planeSize] = (green - 127.5) / 127.5;
    tensorData[pixelIndex + planeSize * 2] = (blue - 127.5) / 127.5;
  }

  const input = new ort.Tensor("float32", tensorData, [1, 3, height, width]);
  const startedInference = performance.now();
  const result = await session.run({ [session.inputNames[0]]: input });
  const inferenceMs = performance.now() - startedInference;
  const output = result[session.outputNames[0]];
  const startedWarmInference = performance.now();
  const warmResult = await session.run({ [session.inputNames[0]]: input });
  const warmInferenceMs = performance.now() - startedWarmInference;
  warmResult[session.outputNames[0]]?.dispose?.();
  const startedPostProcess = performance.now();
  const cleaned = cleanPortraitMatte(
    new Float32Array(output.data),
    width,
    height,
  );
  const alpha = refineAlphaWithImage(
    Uint8Array.from(cleaned, (value) =>
      Math.round(Math.max(0, Math.min(1, value)) * 255),
    ),
    rgba,
    width,
    height,
  );
  const postProcessMs = performance.now() - startedPostProcess;

  const expected = readFileSync(expectedMask);
  let intersection = 0;
  let union = 0;
  let expectedForeground = 0;
  let missedForeground = 0;
  let backgroundPixels = 0;
  let leakedBackground = 0;
  const outputBytes = new Uint8Array(width * height * 4);
  for (let index = 0; index < planeSize; index += 1) {
    const expectedVisible = expected[index] >= 128;
    const predictedVisible = alpha[index] >= 128;
    if (expectedVisible && predictedVisible) intersection += 1;
    if (expectedVisible || predictedVisible) union += 1;
    if (expectedVisible) {
      expectedForeground += 1;
      if (!predictedVisible) missedForeground += 1;
    } else {
      backgroundPixels += 1;
      if (predictedVisible) leakedBackground += 1;
    }
    const dataIndex = index * 4;
    outputBytes[dataIndex] = rgba[dataIndex];
    outputBytes[dataIndex + 1] = rgba[dataIndex + 1];
    outputBytes[dataIndex + 2] = rgba[dataIndex + 2];
    outputBytes[dataIndex + 3] = alpha[index];
  }

  writeFileSync(outputRgba, outputBytes);
  convert(
    "-size",
    `${width}x${height}`,
    "-depth",
    "8",
    `rgba:${outputRgba}`,
    outputPng,
  );

  const metrics = {
    sessionMs: Math.round(sessionMs),
    inferenceMs: Math.round(inferenceMs),
    warmInferenceMs: Math.round(warmInferenceMs),
    postProcessMs: Math.round(postProcessMs),
    maskIouPct: Number(((intersection / union) * 100).toFixed(2)),
    missedPersonPct: Number(
      ((missedForeground / expectedForeground) * 100).toFixed(3),
    ),
    backgroundLeakPct: Number(
      ((leakedBackground / backgroundPixels) * 100).toFixed(3),
    ),
    outputPng,
  };
  assert.ok(metrics.maskIouPct >= 90, JSON.stringify(metrics));
  assert.ok(metrics.backgroundLeakPct <= 2, JSON.stringify(metrics));
  process.stdout.write(`${JSON.stringify(metrics)}\n`);
} finally {
  rmSync(temporaryRoot, { recursive: true, force: true });
}
