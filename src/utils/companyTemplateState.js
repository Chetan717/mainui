export const COMPANY_TEMPLATE_STATE_INVALIDATED_EVENT =
  "mlmlive:company-template-state-invalidated";

let invalidationVersion = 0;
const invalidationListeners = new Set();

export function subscribeToCompanyTemplateInvalidation(listener) {
  if (typeof listener !== "function") return () => {};
  invalidationListeners.add(listener);
  return () => invalidationListeners.delete(listener);
}

/**
 * Tell every keep-alive template surface that the selected company changed.
 * The event is intentionally synchronous so cached UI is cleared before the
 * new company is committed to React state.
 */
export function invalidateCompanyTemplateState({
  previousCompanyId = "",
  nextCompanyId = "",
  reason = "company-selection-changed",
} = {}) {
  invalidationVersion += 1;

  const detail = {
    version: invalidationVersion,
    previousCompanyId: String(previousCompanyId || ""),
    nextCompanyId: String(nextCompanyId || ""),
    reason,
  };

  for (const listener of invalidationListeners) {
    try {
      listener(detail);
    } catch {
      // One UI surface must not prevent the remaining caches from resetting.
    }
  }

  if (typeof window === "undefined") return detail;

  try {
    window.dispatchEvent(
      new CustomEvent(COMPANY_TEMPLATE_STATE_INVALIDATED_EVENT, { detail }),
    );
  } catch {
    // Core subscribers above already invalidated the app. The DOM event is
    // only a compatibility notification for any independently mounted code.
  }

  return detail;
}
