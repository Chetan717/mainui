export const PAGE_REFRESH_EVENT = "mlmlive:page-refresh";

const REFRESH_WINDOW_MS = 5 * 60 * 1000;
const MAX_REFRESHES_PER_WINDOW = 10;

// Deliberately memory-only: refresh history is not sensitive browser storage and
// disappears with the Firebase in-memory session when the app is closed.
const attemptsByUser = new Map();

export function consumeRefreshAttempt(uid, now = Date.now()) {
  const userKey = String(uid || "signed-in-user");
  const recent = (attemptsByUser.get(userKey) || []).filter(
    (timestamp) => now - timestamp < REFRESH_WINDOW_MS,
  );

  if (recent.length >= MAX_REFRESHES_PER_WINDOW) {
    const retryAfterMs = Math.max(
      0,
      REFRESH_WINDOW_MS - (now - recent[0]),
    );
    attemptsByUser.set(userKey, recent);
    return { allowed: false, retryAfterMs, remaining: 0 };
  }

  recent.push(now);
  attemptsByUser.set(userKey, recent);
  return {
    allowed: true,
    retryAfterMs: 0,
    remaining: MAX_REFRESHES_PER_WINDOW - recent.length,
  };
}

export function refreshLimitMessage(retryAfterMs) {
  const seconds = Math.max(1, Math.ceil(retryAfterMs / 1000));
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  const wait = minutes
    ? `${minutes}m ${remainingSeconds}s`
    : `${remainingSeconds}s`;
  return `Refresh limit reached. Please try again in ${wait}.`;
}
