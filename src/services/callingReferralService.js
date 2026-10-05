import { getFunctions, httpsCallable } from "firebase/functions";
import { app } from "@firebase-config";

const callingFunctions = getFunctions(
  app,
  import.meta.env.VITE_MARKETING_FUNCTIONS_REGION || "asia-south1",
);

const resolveCallingTeamCodeFn = httpsCallable(
  callingFunctions,
  "resolveCallingTeamCode",
);
const claimCallingTeamAttributionFn = httpsCallable(
  callingFunctions,
  "claimCallingTeamAttribution",
);

export async function resolveCallingTeamReferral(code, mobile = "") {
  const normalizedCode = String(code || "").trim().toUpperCase();
  if (!normalizedCode) return { matched: false };

  const result = await resolveCallingTeamCodeFn({
    code: normalizedCode,
    mobile: String(mobile || "").replace(/\D/g, "").slice(-10),
  });

  return result.data || { matched: false };
}

export async function claimCallingTeamAttribution(claimToken) {
  const token = String(claimToken || "").trim();
  if (!token) return { matched: false };

  const result = await claimCallingTeamAttributionFn({ claimToken: token });
  return result.data || { matched: false };
}
