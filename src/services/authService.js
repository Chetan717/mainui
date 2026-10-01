import { getFunctions, httpsCallable } from "firebase/functions";
import {
  browserLocalPersistence,
  setPersistence,
  signInWithCustomToken,
} from "firebase/auth";
import { app, auth } from "@firebase-config";
import { clearManualLogoutMarker } from "../utils/authStorage";

const functions = getFunctions(app, "us-central1");

const _call = (name) => httpsCallable(functions, name);

// ─── Reusable callables ───────────────────────────────────────────────────────
const loginFn           = _call("authLogin");
const signupInitFn      = _call("authSignupInit");
const signupVerifyFn    = _call("authSignupVerify");
const resendOtpFn       = _call("authResendOtp");
const forgetPinInitFn   = _call("authForgetPinInit");
const forgetPinVerifyFn = _call("authForgetPinVerify");
const forgetPinResetFn  = _call("authForgetPinReset");
const verifyUserFn      = _call("authVerifyUser");

// ─── Exported helpers ─────────────────────────────────────────────────────────

async function signInWithPersistentSession(customToken) {
  // Persistence must be selected before sign-in. Firebase stores only its
  // refresh credential; the app never stores the PIN or custom token.
  await setPersistence(auth, browserLocalPersistence);
  // This is reached only after the user explicitly submitted valid login/OTP
  // credentials. Remove the logout barrier immediately before the new sign-in.
  clearManualLogoutMarker();
  await signInWithCustomToken(auth, customToken);
}

/**
 * Login with mobile + PIN.
 * Returns { status, user, mlmProfile }
 * status === "unverified" means the account needs OTP verification first.
 */
export async function login(mobile, pin) {
  const result = await loginFn({ mobile, pin });
  const data   = result.data;
  if (data.customToken) {
    await signInWithPersistentSession(data.customToken);
  }
  return data;
}

/**
 * Signup Step 1: validate details, send OTP.
 * Returns { status, sessionId }
 */
export async function signupInit(name, mobile, pin, referCode = "") {
  const result = await signupInitFn({ name, mobile, pin, referCode });
  return result.data;
}

/**
 * Signup Step 2: verify OTP, create account.
 * Returns { status, user, mlmProfile }
 */
export async function signupVerify(sessionId, otp) {
  const result = await signupVerifyFn({ sessionId, otp });
  const data   = result.data;
  if (data.customToken) {
    await signInWithPersistentSession(data.customToken);
  }
  return data;
}

/**
 * Verify an unverified user (reached from login).
 * Returns { status, user, mlmProfile }
 */
export async function verifyUser(sessionId, otp) {
  const result = await verifyUserFn({ sessionId, otp });
  const data   = result.data;
  if (data.customToken) {
    await signInWithPersistentSession(data.customToken);
  }
  return data;
}

/**
 * Resend OTP for any active session.
 * type: "signup" | "login_verify" | "forgetpin"
 */
export async function resendOtp(sessionId, type) {
  const result = await resendOtpFn({ sessionId, type });
  return result.data;
}

/**
 * Forgot PIN Step 1: send OTP to mobile.
 * Returns { status, sessionId }
 */
export async function forgetPinInit(mobile) {
  const result = await forgetPinInitFn({ mobile });
  return result.data;
}

/**
 * Forgot PIN Step 2: verify OTP.
 * Returns { status, sessionId }
 */
export async function forgetPinVerify(sessionId, otp) {
  const result = await forgetPinVerifyFn({ sessionId, otp });
  return result.data;
}

/**
 * Forgot PIN Step 3: set new PIN.
 * Returns { status: "ok" }
 */
export async function forgetPinReset(sessionId, newPin) {
  const result = await forgetPinResetFn({ sessionId, newPin });
  return result.data;
}

const changePinFn      = _call("authChangePin");
const deleteAccountFn  = _call("authDeleteAccount");

/**
 * Change PIN (profile page).
 * Verifies current PIN server-side before updating.
 * Returns { status: "ok" }
 */
export async function changePin(mobile, oldPin, newPin) {
  const result = await changePinFn({ mobile, oldPin, newPin });
  return result.data;
}

/**
 * Delete Account (profile page).
 * Verifies PIN server-side, then deletes user + MLM profile docs.
 * Returns { status: "ok" }
 */
export async function deleteAccount(mobile, pin) {
  const result = await deleteAccountFn({ mobile, pin });
  return result.data;
}

/** Convert internal authentication failures into safe user-facing text. */
export function getAuthErrorMessage(error) {
  const code = error?.code || "";
  const msg  = error?.message || "";

  if (code.includes("resource-exhausted") || msg.includes("resource-exhausted")) {
    const seconds = msg.match(/(\d+)\s*seconds?/i)?.[1];
    return seconds
      ? `Too many attempts. Please try again in ${seconds} seconds.`
      : "Too many attempts. Please try again later.";
  }

  if (code.includes("not-found")        || msg.includes("not-found"))
    return "No account found with this mobile number";
  if (code.includes("already-exists")   || msg.includes("already-exists"))
    return "Mobile number already registered";
  if (code.includes("unauthenticated")  || msg.includes("unauthenticated"))
    return "Incorrect PIN. Please try again.";
  if (code.includes("deadline-exceeded")|| msg.includes("deadline-exceeded"))
    return "Session expired. Please start again.";
  if (code.includes("permission-denied")|| msg.includes("permission-denied"))
    return "Please complete OTP verification first.";
  if (code.includes("invalid-argument") || msg.includes("invalid-argument"))
    return "Please check the entered details and try again.";

  return "Something went wrong. Please try again.";
}
