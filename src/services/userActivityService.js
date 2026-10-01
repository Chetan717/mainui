import { doc, serverTimestamp, updateDoc } from "firebase/firestore";
import { getFunctions, httpsCallable } from "firebase/functions";
import { app, db } from "@firebase-config";
import { COLLECTIONS } from "../collections";

export const LAST_DOWNLOAD_FIELD = "lastDownloadAt";
const activityFunctions = getFunctions(app, "us-central1");
const recordUserDownload = httpsCallable(
  activityFunctions,
  "recordUserDownload",
);

function safeDocumentId(value) {
  const id = String(value || "").trim();
  return /^[A-Za-z0-9_-]{1,128}$/.test(id) ? id : "";
}

// Use the zero-read client write first. If production rules reject that write,
// the authenticated callable verifies the signed-in mobile and updates only
// that user's existing document.
export async function recordImageDownload({ userDocumentId } = {}) {
  const safeId = safeDocumentId(userDocumentId);

  if (safeId) {
    try {
      await updateDoc(doc(db, COLLECTIONS.USERS, safeId), {
        [LAST_DOWNLOAD_FIELD]: serverTimestamp(),
      });
      return { ok: true, mode: "direct" };
    } catch {
      // Continue to the secure server fallback below.
    }
  }

  const result = await recordUserDownload({
    userDocumentId: safeId || null,
  });
  if (result.data?.ok !== true) {
    throw new Error("Last Download timestamp was not saved.");
  }
  return { ok: true, mode: "server" };
}
