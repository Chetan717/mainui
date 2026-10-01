export function runProfileNavigationGuard(pathname, proceed) {
  if (pathname !== "/mlmprofile") {
    proceed();
    return true;
  }

  const event = new CustomEvent("mlmProfileNavigationRequest", {
    cancelable: true,
    detail: { proceed },
  });

  const allowed = window.dispatchEvent(event);
  if (allowed) proceed();
  return allowed;
}
