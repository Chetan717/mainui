import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { onIdTokenChanged, signOut } from "firebase/auth";
import { auth } from "@firebase-config";
import {
  clearLegacyAuthStorage,
  clearCachedPii,
  isManualLogoutMarked,
  setVerifiedUser,
} from "../utils/authStorage";
import {
  getSessionExpiresAt,
  getSessionRemainingMs,
  isSessionExpired,
} from "../utils/sessionPolicy";

const AuthContext = createContext({
  user: null,
  identity: null,
  sessionExpiresAt: null,
  loading: true,
});

function mobileFromVerifiedIdentity(firebaseUser, claims) {
  const uidMobileMatch = String(firebaseUser?.uid || "").match(
    /^mobile_(\d{10})$/,
  );
  const candidates = [
    firebaseUser?.phoneNumber,
    claims?.mobileNo,
    claims?.mobile,
    claims?.phone_number,
    uidMobileMatch?.[1],
  ];

  for (const candidate of candidates) {
    const digits = String(candidate || "").replace(/\D/g, "");
    if (digits.length >= 10) return digits.slice(-10);
  }

  return null;
}

function isTransientRefreshError(error) {
  const code = String(error?.code || "");
  return (
    code.includes("network-request-failed") ||
    code.includes("timeout")
  );
}

export function AuthProvider({ children }) {
  const [state, setState] = useState({
    user: null,
    identity: null,
    sessionExpiresAt: null,
    loading: true,
  });

  useEffect(() => {
    let cancelled = false;
    let expiryTimer = null;
    let authEventVersion = 0;
    let activeSessionExpiresAt = null;
    let endingSession = false;
    let lastServerValidationAt = 0;

    const clearExpiryTimer = () => {
      if (expiryTimer !== null) {
        window.clearTimeout(expiryTimer);
        expiryTimer = null;
      }
    };

    const clearClientSession = () => {
      clearExpiryTimer();
      activeSessionExpiresAt = null;
      clearCachedPii();
      setVerifiedUser(null);
      if (!cancelled) {
        setState({
          user: null,
          identity: null,
          sessionExpiresAt: null,
          loading: false,
        });
      }
    };

    const redirectToLogin = (reason) => {
      if (cancelled) return;
      const target =
        reason === "expired"
          ? "/login?session_expired=1"
          : reason === "manual"
            ? "/login"
          : "/login?session_invalid=1";
      if (`${window.location.pathname}${window.location.search}` !== target) {
        window.location.replace(target);
      }
    };

    const endSession = async (reason) => {
      if (endingSession) return;
      endingSession = true;
      authEventVersion += 1;
      clearClientSession();

      try {
        await signOut(auth);
      } catch {
        // The protected UI is already locked locally. Firebase will retry its
        // own persistence cleanup when auth initializes again.
      } finally {
        redirectToLogin(reason);
      }
    };

    const scheduleSessionExpiry = (expiresAt) => {
      clearExpiryTimer();
      activeSessionExpiresAt = expiresAt;
      const remainingMs = getSessionRemainingMs(expiresAt);
      if (remainingMs === 0) {
        void endSession("expired");
        return;
      }
      expiryTimer = window.setTimeout(
        () => void endSession("expired"),
        remainingMs,
      );
    };

    // Remove only the old forgeable user JSON. Firebase's own persisted,
    // cryptographically verified session is intentionally preserved.
    clearLegacyAuthStorage();

    const unsubscribe = onIdTokenChanged(auth, async (firebaseUser) => {
      const eventVersion = ++authEventVersion;
      clearExpiryTimer();

      if (!firebaseUser) {
        endingSession = false;
        clearClientSession();
        return;
      }

      try {
        // A manual logout is a denial-only local barrier. It never grants
        // access, but it prevents a stale persisted credential from restoring
        // the account until the user explicitly signs in again.
        if (isManualLogoutMarked()) {
          await endSession("manual");
          return;
        }

        // Claims come from a Firebase-verified ID token, never browser storage.
        const tokenResult = await firebaseUser.getIdTokenResult();
        if (
          cancelled ||
          eventVersion !== authEventVersion ||
          auth.currentUser?.uid !== firebaseUser.uid
        ) {
          return;
        }

        const sessionExpiresAt = getSessionExpiresAt(tokenResult.claims);
        if (isSessionExpired(sessionExpiresAt)) {
          await endSession("expired");
          return;
        }

        const identity = {
          uid: firebaseUser.uid,
          mobileNo: mobileFromVerifiedIdentity(firebaseUser, tokenResult.claims),
          name:
            firebaseUser.displayName ||
            tokenResult.claims?.name ||
            null,
          role: tokenResult.claims?.role || null,
        };

        setVerifiedUser(identity);
        scheduleSessionExpiry(sessionExpiresAt);
        setState({
          user: firebaseUser,
          identity,
          sessionExpiresAt,
          loading: false,
        });
      } catch {
        // A token that cannot be verified must never unlock protected UI.
        if (
          !cancelled &&
          eventVersion === authEventVersion &&
          auth.currentUser?.uid === firebaseUser.uid
        ) {
          await endSession("invalid");
        }
      }
    });

    const revalidateOnResume = async () => {
      if (document.visibilityState === "hidden") return;
      const firebaseUser = auth.currentUser;
      if (!firebaseUser) return;
      // The initial token callback has not finished establishing the signed
      // deadline yet. Let that callback complete before checking the clock.
      if (activeSessionExpiresAt === null) return;

      if (isSessionExpired(activeSessionExpiresAt)) {
        await endSession("expired");
        return;
      }

      // Re-check a restored/active account periodically so disabled accounts
      // and revoked refresh tokens do not remain trusted until the next
      // automatic token refresh.
      const now = Date.now();
      if (now - lastServerValidationAt < 5 * 60 * 1000) return;
      lastServerValidationAt = now;
      try {
        await firebaseUser.getIdToken(true);
      } catch (error) {
        // A temporary connectivity failure must not destroy a still-valid
        // 7-day local session. Protected server reads remain unavailable while
        // offline, and the next resume retries validation. Explicitly invalid,
        // disabled, or revoked credentials still end the session immediately.
        if (isTransientRefreshError(error)) return;
        await endSession("invalid");
      }
    };

    document.addEventListener("visibilitychange", revalidateOnResume);
    window.addEventListener("pageshow", revalidateOnResume);

    return () => {
      cancelled = true;
      clearExpiryTimer();
      unsubscribe();
      document.removeEventListener("visibilitychange", revalidateOnResume);
      window.removeEventListener("pageshow", revalidateOnResume);
    };
  }, []);

  const value = useMemo(() => state, [state]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
