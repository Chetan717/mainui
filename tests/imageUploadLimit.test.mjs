import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import test from "node:test";

import {
  IMAGE_MAX_SIZE_BYTES,
  IMAGE_SIZE_LIMIT_MESSAGE,
  validateUploadFile,
} from "../src/lib/fileValidation.ts";

const projectRoot = resolve(import.meta.dirname, "..");
const read = (relativePath) =>
  readFileSync(join(projectRoot, relativePath), "utf8");

function collectSourceFiles(directory) {
  return readdirSync(directory).flatMap((entry) => {
    const absolutePath = join(directory, entry);
    if (statSync(absolutePath).isDirectory()) {
      return collectSourceFiles(absolutePath);
    }
    return /\.(?:js|jsx|ts|tsx)$/.test(entry) ? [absolutePath] : [];
  });
}

const imageFile = (size) => ({
  name: "portrait.jpg",
  type: "image/jpeg",
  size,
});

test("image uploads allow exactly 20 MB and reject anything larger", () => {
  assert.equal(IMAGE_MAX_SIZE_BYTES, 20 * 1024 * 1024);
  assert.equal(
    IMAGE_SIZE_LIMIT_MESSAGE,
    "Image का size 20 MB से ज्यादा है। कृपया 20 MB से कम की image select करें।",
  );
  assert.deepEqual(validateUploadFile(imageFile(IMAGE_MAX_SIZE_BYTES), "image"), {
    valid: true,
  });
  assert.deepEqual(
    validateUploadFile(imageFile(IMAGE_MAX_SIZE_BYTES + 1), "image"),
    { valid: false, error: IMAGE_SIZE_LIMIT_MESSAGE },
  );
});

test("every image picker rejects oversize files with an immediate popup", () => {
  const sharedPopupPickers = [
    "src/pages/mainform/components/ImageUploadWithBgRemove.jsx",
    "src/pages/mainform/components/MultiImagePicker.jsx",
    "src/pages/mainform/components/ImageUploadSquare.jsx",
    "src/pages/Test.jsx",
  ];

  for (const path of sharedPopupPickers) {
    const source = read(path);
    assert.match(source, /validateUploadFile\([^,]+,\s*["']image["']\)/, path);
    assert.match(source, /toast\.danger\(|alert\(/, path);
  }

  const profile = read("src/pages/Form/Mlmprofilemodal.jsx");
  assert.match(profile, /file\.size > IMAGE_MAX_SIZE_BYTES/);
  assert.match(profile, /toast\.danger\(IMAGE_SIZE_LIMIT_MESSAGE\)/);

  const topUpline = read("src/pages/Form/MultiImagePicker.jsx");
  assert.match(topUpline, /file\.size > IMAGE_MAX_SIZE_BYTES/);
  assert.match(topUpline, /alert\(IMAGE_SIZE_LIMIT_MESSAGE\)/);

  const prescription = read("src/lib/prescriptionImage.ts");
  const askAi = read("src/pages/AskAi/AskAi.jsx");
  assert.match(prescription, /file\.size > IMAGE_MAX_SIZE_BYTES/);
  assert.match(prescription, /throw new Error\(IMAGE_SIZE_LIMIT_MESSAGE\)/);
  assert.match(askAi, /toast\.danger\(message\)/);
});

test("legacy 8 MB and 10 MB image limits are absent from app source", () => {
  const source = collectSourceFiles(join(projectRoot, "src"))
    .map((file) => readFileSync(file, "utf8"))
    .join("\n");

  assert.doesNotMatch(source, /Image must be (?:smaller than|10 MB or smaller) (?:8|10) MB/i);
  assert.doesNotMatch(source, /(?:8|10)\s*\*\s*(?:1024|512)\s*\*\s*(?:1024|512)/);
  assert.doesNotMatch(source, /(?:maximum|up to|तक की)[^\n]{0,20}10 MB|10 MB तक/i);
});
