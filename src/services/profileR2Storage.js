import { getFunctions, httpsCallable } from "firebase/functions";
import { app } from "@firebase-config";
import { isR2ProfileUrl } from "../utils/profileR2Urls";

const functions = getFunctions(app, "asia-south1");
const createUploadFn = httpsCallable(functions, "createR2ProfileUpload");
const deleteProfileFn = httpsCallable(functions, "deleteR2ProfileObject");

const safeFileName = (value = "image.webp") =>
  String(value || "image.webp")
    .replace(/[^A-Za-z0-9._-]/g, "_")
    .replace(/\.{2,}/g, ".")
    .slice(-140) || "image.webp";

export async function uploadProfileImageToR2(blob, { scope = "profile", fileName = "image.webp" } = {}) {
  if (!(blob instanceof Blob)) throw new Error("Profile upload requires an image blob.");
  const contentType = "image/webp";
  const result = await createUploadFn({
    scope,
    fileName: safeFileName(fileName.replace(/\.[^.]+$/, ".webp")),
    contentType,
    size: blob.size,
  });
  const { uploadUrl, publicUrl } = result?.data || {};
  if (!uploadUrl || !publicUrl) throw new Error("R2 profile upload URL was not returned.");

  const response = await fetch(uploadUrl, {
    method: "PUT",
    headers: { "Content-Type": contentType },
    body: blob,
  });
  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`R2 profile upload failed (${response.status}) ${body.slice(0, 120)}`);
  }
  return publicUrl;
}

export async function deleteR2ProfileAsset(url) {
  if (!isR2ProfileUrl(url)) return false;
  await deleteProfileFn({ url });
  return true;
}
