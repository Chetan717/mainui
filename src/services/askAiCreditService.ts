import {
  doc,
  onSnapshot,
  runTransaction,
  serverTimestamp,
  type Unsubscribe,
} from "firebase/firestore";
import { db } from "@firebase-config";
import { COLLECTIONS } from "../collections";

export const INITIAL_ASK_AI_CREDITS = 30;

export type AskAiCredit = {
  totalCredits: number;
  usedCredits: number;
  remainingCredits: number;
};

function normalizeMobile(mobileNo: string): string {
  const value = String(mobileNo || "")
    .replace(/\D/g, "")
    .slice(-10);
  if (!/^[0-9]{10}$/.test(value))
    throw new Error("Valid logged-in user not found.");
  return value;
}

async function creditDocId(mobileNo: string): Promise<string> {
  const mobile = normalizeMobile(mobileNo);
  const bytes = new TextEncoder().encode(`mlmlive-ask-ai:${mobile}`);
  const hash = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(hash), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
}

function creditFromData(
  data: Record<string, unknown> | undefined,
): AskAiCredit {
  const totalCredits = Math.max(
    0,
    Number(data?.totalCredits ?? INITIAL_ASK_AI_CREDITS),
  );
  const usedCredits = Math.max(0, Number(data?.usedCredits ?? 0));
  const remainingCredits = Math.max(
    0,
    Math.min(totalCredits, Number(data?.remainingCredits ?? totalCredits)),
  );
  return { totalCredits, usedCredits, remainingCredits };
}

async function getCreditRef(mobileNo: string) {
  const id = await creditDocId(mobileNo);
  return doc(db, COLLECTIONS.ASKAICREDIT || "askaicredit", id);
}

export async function ensureAskAiCredits(
  mobileNo: string,
): Promise<AskAiCredit> {
  const mobile = normalizeMobile(mobileNo);
  const ref = await getCreditRef(mobile);
  return runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(ref);
    if (snapshot.exists()) return creditFromData(snapshot.data());
    const initial: AskAiCredit = {
      totalCredits: INITIAL_ASK_AI_CREDITS,
      usedCredits: 0,
      remainingCredits: INITIAL_ASK_AI_CREDITS,
    };
    transaction.set(ref, {
      ...initial,
      mobileNo: mobile,
      plan: "launch-free",
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return initial;
  });
}

export async function reserveAskAiCredit(
  mobileNo: string,
): Promise<AskAiCredit> {
  const mobile = normalizeMobile(mobileNo);
  const ref = await getCreditRef(mobile);
  return runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(ref);
    const current = snapshot.exists()
      ? creditFromData(snapshot.data())
      : {
          totalCredits: INITIAL_ASK_AI_CREDITS,
          usedCredits: 0,
          remainingCredits: INITIAL_ASK_AI_CREDITS,
        };
    if (current.remainingCredits <= 0)
      throw new Error("Your 30 free Ask AI credits are finished.");
    const next: AskAiCredit = {
      totalCredits: current.totalCredits,
      usedCredits: current.usedCredits + 1,
      remainingCredits: current.remainingCredits - 1,
    };
    if (snapshot.exists()) {
      transaction.update(ref, { ...next, updatedAt: serverTimestamp() });
    } else {
      transaction.set(ref, {
        ...next,
        mobileNo: mobile,
        plan: "launch-free",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
    return next;
  });
}

export async function refundAskAiCredit(mobileNo: string): Promise<void> {
  const ref = await getCreditRef(mobileNo);
  await runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(ref);
    if (!snapshot.exists()) return;
    const current = creditFromData(snapshot.data());
    if (
      current.usedCredits <= 0 ||
      current.remainingCredits >= current.totalCredits
    )
      return;
    transaction.update(ref, {
      usedCredits: current.usedCredits - 1,
      remainingCredits: current.remainingCredits + 1,
      updatedAt: serverTimestamp(),
    });
  });
}

export async function subscribeAskAiCredits(
  mobileNo: string,
  onValue: (credit: AskAiCredit) => void,
  onError?: (error: Error) => void,
): Promise<Unsubscribe> {
  const ref = await getCreditRef(mobileNo);
  return onSnapshot(
    ref,
    (snapshot) => {
      if (snapshot.exists()) onValue(creditFromData(snapshot.data()));
    },
    (error) => onError?.(error),
  );
}
