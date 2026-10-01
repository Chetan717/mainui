const INTERNAL_DETAIL_PATTERN =
  /firebase|firestore|googleapis|cloud\s*function|permission[-_ ]denied|unauthenticated|resource[-_ ]exhausted|requires?\s+an?\s+index|missing or insufficient permissions|auth\/|storage\/|functions\//i;

/**
 * Prevent infrastructure and authorization details from reaching rendered UI.
 * Validation messages remain usable; internal service messages use a safe fallback.
 */
export function safeUserMessage(value, fallback = "Something went wrong. Please try again.") {
  const raw =
    typeof value === "string"
      ? value
      : typeof value?.message === "string"
        ? value.message
        : "";

  const message = raw.trim();
  if (!message || INTERNAL_DETAIL_PATTERN.test(message)) return fallback;
  return message;
}
