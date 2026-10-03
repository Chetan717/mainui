import {
  doc,
  runTransaction,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "@firebase-config";
import { COLLECTIONS } from "../collections";

// Product requirement: a signed-in user can trigger at most 10 successful
// image/video downloads per local calendar day from the editor.
export const DAILY_DOWNLOAD_LIMIT = 10;
export const DAILY_DOWNLOAD_DATE_FIELD = "dailyDownloadDate";
export const DAILY_DOWNLOAD_COUNT_FIELD = "dailyDownloadCount";

const LOCAL_PREFIX = "mlmlive_daily_download_v1:";

function safeDocumentId(value) {
  const id = String(value || "").trim();
  // Firestore document ids may contain punctuation; only path separators are
  // invalid here because doc(collectionRef, id) expects one path segment.
  return id && !id.includes("/") && id.length <= 1500 ? id : "";
}

export function getLocalDayKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function hashIdentity(value) {
  const text = String(value || "current-user");
  let hash = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

function localStorageKey(identity) {
  return `${LOCAL_PREFIX}${hashIdentity(identity)}`;
}

function readLocalCounter(identity, dayKey) {
  try {
    const key = localStorageKey(identity);
    const parsed = JSON.parse(localStorage.getItem(key) || "null");
    if (!parsed || parsed.dayKey !== dayKey) return { key, count: 0 };
    return {
      key,
      count: Math.max(0, Number(parsed.count || 0)),
    };
  } catch {
    return { key: localStorageKey(identity), count: 0 };
  }
}

function writeLocalCounter(key, dayKey, count) {
  try {
    localStorage.setItem(
      key,
      JSON.stringify({
        dayKey,
        count: Math.max(0, count),
      }),
    );
  } catch {
    // Private/low-storage WebViews may reject localStorage. The export flow
    // must still remain usable, so Firestore remains the preferred guard.
  }
}

function reserveLocal(identity, dayKey) {
  const current = readLocalCounter(identity, dayKey);
  if (current.count >= DAILY_DOWNLOAD_LIMIT) {
    return {
      allowed: false,
      mode: "local",
      dayKey,
      remaining: 0,
      localKey: current.key,
    };
  }

  const nextCount = current.count + 1;
  writeLocalCounter(current.key, dayKey, nextCount);
  return {
    allowed: true,
    mode: "local",
    dayKey,
    remaining: Math.max(0, DAILY_DOWNLOAD_LIMIT - nextCount),
    localKey: current.key,
  };
}

/**
 * Atomically reserves one daily download slot when Firestore rules allow it.
 * A same-device local counter is the resilience fallback if the direct user
 * document transaction is unavailable, so a temporary rules/network issue
 * never breaks downloading.
 */
export async function reserveDailyDownload({
  userDocumentId,
  userIdentity,
} = {}) {
  const dayKey = getLocalDayKey();
  const safeId = safeDocumentId(userDocumentId);
  const fallbackIdentity = safeId || userIdentity || "current-user";

  if (safeId) {
    try {
      const userRef = doc(db, COLLECTIONS.USERS, safeId);
      const result = await runTransaction(db, async (transaction) => {
        const snapshot = await transaction.get(userRef);
        if (!snapshot.exists()) throw new Error("User document not found");

        const data = snapshot.data() || {};
        const storedDay = String(data[DAILY_DOWNLOAD_DATE_FIELD] || "");
        const storedCount =
          storedDay === dayKey
            ? Math.max(0, Number(data[DAILY_DOWNLOAD_COUNT_FIELD] || 0))
            : 0;

        if (storedCount >= DAILY_DOWNLOAD_LIMIT) {
          return { allowed: false, remaining: 0 };
        }

        const nextCount = storedCount + 1;
        transaction.update(userRef, {
          [DAILY_DOWNLOAD_DATE_FIELD]: dayKey,
          [DAILY_DOWNLOAD_COUNT_FIELD]: nextCount,
          dailyDownloadUpdatedAt: serverTimestamp(),
        });

        return {
          allowed: true,
          remaining: Math.max(0, DAILY_DOWNLOAD_LIMIT - nextCount),
        };
      });

      return {
        ...result,
        mode: "firestore",
        dayKey,
        userDocumentId: safeId,
      };
    } catch (error) {
      console.warn(
        "[download-limit] Firestore reservation unavailable; using device fallback.",
        error,
      );
    }
  }

  return reserveLocal(fallbackIdentity, dayKey);
}

/** Undo a reservation only when the export itself failed before download. */
export async function releaseDailyDownload(reservation) {
  if (!reservation?.allowed) return;

  if (reservation.mode === "firestore" && reservation.userDocumentId) {
    try {
      const userRef = doc(db, COLLECTIONS.USERS, reservation.userDocumentId);
      await runTransaction(db, async (transaction) => {
        const snapshot = await transaction.get(userRef);
        if (!snapshot.exists()) return;
        const data = snapshot.data() || {};
        if (String(data[DAILY_DOWNLOAD_DATE_FIELD] || "") !== reservation.dayKey) {
          return;
        }
        const count = Math.max(0, Number(data[DAILY_DOWNLOAD_COUNT_FIELD] || 0));
        if (count <= 0) return;
        transaction.update(userRef, {
          [DAILY_DOWNLOAD_COUNT_FIELD]: Math.max(0, count - 1),
          dailyDownloadUpdatedAt: serverTimestamp(),
        });
      });
      return;
    } catch (error) {
      console.warn("[download-limit] Could not release Firestore slot.", error);
      return;
    }
  }

  if (reservation.mode === "local" && reservation.localKey) {
    try {
      const parsed = JSON.parse(localStorage.getItem(reservation.localKey) || "null");
      if (!parsed || parsed.dayKey !== reservation.dayKey) return;
      writeLocalCounter(
        reservation.localKey,
        reservation.dayKey,
        Math.max(0, Number(parsed.count || 0) - 1),
      );
    } catch {
      // Best-effort rollback only.
    }
  }
}
