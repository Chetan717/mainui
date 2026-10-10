import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {
  R2_PROFILE_BASE_URL,
  getProfileObjectPath,
  isR2ProfileUrl,
  normalizeProfileUrlArray,
  toR2ProfileUrl,
} from "../src/utils/profileR2Urls.js";

const modal = fs.readFileSync(new URL("../src/pages/Form/Mlmprofilemodal.jsx", import.meta.url), "utf8");
const sales = fs.readFileSync(new URL("../src/pages/mainform/components/SalesExecutiveForm.jsx", import.meta.url), "utf8");
const service = fs.readFileSync(new URL("../src/services/profileR2Storage.js", import.meta.url), "utf8");

test("legacy Firebase mlmprofiles URL maps to the second public R2 bucket", () => {
  const firebaseUrl = "https://firebasestorage.googleapis.com/v0/b/mlmbooster-a4887.firebasestorage.app/o/mlmprofiles%2Fabc123%2Fprofile.webp?alt=media&token=x";
  const expected = `${R2_PROFILE_BASE_URL}/mlmprofiles/abc123/profile.webp`;
  assert.equal(toR2ProfileUrl(firebaseUrl), expected);
  assert.equal(getProfileObjectPath(firebaseUrl), "mlmprofiles/abc123/profile.webp");
  assert.equal(isR2ProfileUrl(expected), true);
});

test("dual-storage reads preserve Firebase profile URLs until Firestore cutover", () => {
  const firebaseUrl = "https://firebasestorage.googleapis.com/v0/b/mlmbooster-a4887.firebasestorage.app/o/mlmprofiles%2Fabc123%2Fold-profile.png?alt=media&token=legacy";
  assert.deepEqual(normalizeProfileUrlArray([firebaseUrl]), [firebaseUrl]);
});

test("profile and top-upline writes use R2 signed upload instead of Firebase Storage", () => {
  assert.match(service, /createR2ProfileUpload/);
  assert.match(modal, /uploadProfileImageToR2/);
  assert.match(sales, /uploadProfileImageToR2/);
  assert.doesNotMatch(modal, /\buploadBytes\b/);
  assert.doesNotMatch(sales, /\buploadBytes\b/);
});
