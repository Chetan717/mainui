import assert from "node:assert/strict";
import { readFileSync, statSync } from "node:fs";
import test from "node:test";
import { join, resolve } from "node:path";

import {
  cleanPortraitMatte,
  colourDistanceSquared,
  getInferenceSize,
  getSafeOutputSize,
  MODNET_QUALITY_SETTINGS,
  refineAlphaWithImage,
} from "../src/pages/mainform/utils/modnetBg.js";
import {
  isRetryableRemoveBgError,
  REMOVE_BG_QUALITY,
} from "../src/pages/mainform/utils/removeBg.js";

const projectRoot = resolve(import.meta.dirname, "..");
const read = (relativePath) =>
  readFileSync(join(projectRoot, relativePath), "utf8");

test("quality inference keeps enough detail and caps panoramic images", () => {
  assert.deepEqual(MODNET_QUALITY_SETTINGS, {
    inferenceReferenceSize: 640,
    maxInferenceSide: 1024,
    maxOutputSide: 2048,
    maxOutputPixels: 2048 * 1536,
    detailPassMaxBoxRatio: 0.55,
  });
  assert.deepEqual(getInferenceSize(800, 800), { width: 640, height: 640 });
  assert.deepEqual(getInferenceSize(4000, 1000), {
    width: 1024,
    height: 256,
  });
  assert.deepEqual(getInferenceSize(1000, 4000), {
    width: 256,
    height: 1024,
  });

  const unusual = getInferenceSize(317, 911);
  assert.equal(unusual.width % 32, 0);
  assert.equal(unusual.height % 32, 0);
  assert.ok(Math.max(unusual.width, unusual.height) <= 1024);
});

test("large source photos are downscaled without changing aspect ratio", () => {
  assert.deepEqual(getSafeOutputSize(800, 600), {
    width: 800,
    height: 600,
    scale: 1,
  });

  const large = getSafeOutputSize(8000, 6000);
  assert.deepEqual(
    { width: large.width, height: large.height },
    { width: 2048, height: 1536 },
  );
  assert.equal(large.width / large.height, 4 / 3);
});

test("portrait matte preserves weak ear detail but rejects detached background", () => {
  const width = 32;
  const height = 32;
  const matte = new Float32Array(width * height);
  const setRect = (left, top, right, bottom, value) => {
    for (let y = top; y <= bottom; y += 1) {
      for (let x = left; x <= right; x += 1) {
        matte[y * width + x] = value;
      }
    }
  };

  // Main portrait.
  setRect(12, 7, 20, 28, 0.92);
  // Low-confidence ear connected to the head.
  setRect(10, 11, 11, 16, 0.08);
  // A sizeable, confident but detached background object.
  setRect(1, 20, 8, 29, 0.88);

  const cleaned = cleanPortraitMatte(matte, width, height);
  assert.ok(cleaned[13 * width + 10] > 0.03, "ear edge should survive");
  assert.ok(cleaned[12 * width + 15] > 0.85, "portrait core should survive");
  assert.equal(cleaned[24 * width + 4], 0, "detached background must be removed");
});

test("edge refinement executes its RGB distance path without a runtime failure", () => {
  assert.equal(colourDistanceSquared(10, 20, 30, 13, 24, 30), 25);

  const width = 5;
  const height = 5;
  const alpha = new Uint8Array(width * height).fill(255);
  alpha[2 * width + 2] = 128;
  const pixels = new Uint8ClampedArray(width * height * 4);
  for (let index = 0; index < width * height; index += 1) {
    const dataIndex = index * 4;
    pixels[dataIndex] = index * 3;
    pixels[dataIndex + 1] = index * 2;
    pixels[dataIndex + 2] = index;
    pixels[dataIndex + 3] = 255;
  }

  const refined = refineAlphaWithImage(alpha, pixels, width, height);
  assert.equal(refined.length, alpha.length);
  assert.notEqual(refined, alpha, "refinement must return its own alpha buffer");
  assert.ok(refined[2 * width + 2] > 0);
});

test("automatic retry is limited to engine startup failures", () => {
  const initError = Object.assign(new Error("model fetch interrupted"), {
    removeBgStage: "model-download",
    removeBgRetryable: true,
  });
  const deterministicError = Object.assign(
    new ReferenceError("post-processing helper is missing"),
    { removeBgStage: "post-process", removeBgRetryable: false },
  );
  assert.equal(isRetryableRemoveBgError(initError), true);
  assert.equal(isRetryableRemoveBgError(deterministicError), false);
  assert.equal(
    isRetryableRemoveBgError(new Error("No clear person was found")),
    false,
  );
});

test("all runtimes require the same continuous-alpha portrait model", () => {
  const removeBg = read("src/pages/mainform/utils/removeBg.js");
  assert.deepEqual(REMOVE_BG_QUALITY, {
    engine: "modnet-continuous-portrait-matte",
    model: "modnet-portrait",
    continuousAlpha: true,
    lowQualityFallback: false,
    originalPhotoFallback: false,
  });
  assert.match(removeBg, /removeWithProfessionalMatte/);
  assert.match(removeBg, /removeBackgroundWithModNet/);
  assert.doesNotMatch(
    removeBg,
    /removeBgWithMediaPipe|removeWithImgly|@imgly\/background-removal/,
  );
  assert.match(removeBg, /resetModNetEngine\(\{ freshAssets: false \}\)/);

  for (const path of [
    "src/pages/mainform/components/ImageUploadWithBgRemove.jsx",
    "src/pages/mainform/components/MultiImagePicker.jsx",
    "src/pages/Form/Mlmprofilemodal.jsx",
  ]) {
    assert.match(read(path), /mainform\/utils\/removeBg|\.\.\/utils\/removeBg/);
  }
});

test("the bundled ONNX Runtime WASM is complete, versioned, and not truncated", () => {
  const runtimePath = join(
    projectRoot,
    "public/modnet/ort-wasm-simd-threaded.wasm",
  );
  const runtime = readFileSync(runtimePath);
  const modnet = read("src/pages/mainform/utils/modnetBg.js");

  assert.equal(runtime.subarray(0, 4).toString("hex"), "0061736d");
  assert.ok(
    statSync(runtimePath).size > 10_000_000,
    "ONNX Runtime WASM appears truncated",
  );
  assert.match(modnet, /modnet-2026-09-03-production-model-v3/);
});

test("failed removal exits cleanly and never advances the original photo", () => {
  const single = read(
    "src/pages/mainform/components/ImageUploadWithBgRemove.jsx",
  );
  const multiple = read("src/pages/mainform/components/MultiImagePicker.jsx");
  const profile = read("src/pages/Form/Mlmprofilemodal.jsx");

  assert.doesNotMatch(single, /processed\s*\|\|\s*croppedBlob/);
  assert.doesNotMatch(single, /finalImage\s*=\s*croppedBlob/);
  assert.match(single, /setOnImageDone\(null\)/);
  assert.match(single, /setOpen\(false\)/);
  assert.doesNotMatch(single, /const retryPreview/);
  assert.doesNotMatch(multiple, /processed\s*\|\|\s*blob/);
  assert.match(multiple, /onCancel=\{cancelActiveProcessing\}/);
  assert.match(multiple, /setCropOpen\(false\)/);
  assert.doesNotMatch(profile, /blob\s*=\s*blob\s*\|\|\s*file/);
  assert.match(profile, /setStep\("form"\)/);
});

test("Income achiever photo uses the shared Remove-BG flow", () => {
  const salesForm = read(
    "src/pages/mainform/components/SalesExecutiveForm.jsx",
  );

  assert.match(salesForm, /label="Upload achiever photo"/);
  assert.doesNotMatch(
    salesForm,
    /skipBackgroundRemoval=\{isIncome\}/,
    "Income must not bypass background removal for the achiever photo",
  );
});
