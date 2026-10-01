export const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Derive the fixed session deadline from Firebase's signed ID-token claim.
 * Browser storage is intentionally not trusted for the login time.
 */
export function getSessionExpiresAt(claims) {
  const authTimeSeconds = Number(claims?.auth_time);
  if (!Number.isFinite(authTimeSeconds) || authTimeSeconds <= 0) return null;
  return (authTimeSeconds * 1000) + SESSION_DURATION_MS;
}

export function isSessionExpired(expiresAt, now = Date.now()) {
  return !Number.isFinite(expiresAt) || now >= expiresAt;
}

export function getSessionRemainingMs(expiresAt, now = Date.now()) {
  if (!Number.isFinite(expiresAt)) return 0;
  return Math.max(0, expiresAt - now);
}
