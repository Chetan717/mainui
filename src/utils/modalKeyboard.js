const EDITABLE_INPUT_TYPES = new Set([
  "",
  "email",
  "number",
  "password",
  "search",
  "tel",
  "text",
  "url",
]);

const MODAL_DIALOG_SELECTOR = [
  '[data-keyboard-modal]',
  '[data-slot="modal-dialog"]',
  '[aria-modal="true"]',
  '[role="dialog"]',
].join(",");

const px = (value) => `${Math.max(0, Math.round(value))}px`;

export function isKeyboardEditable(element) {
  if (!(element instanceof HTMLElement)) return false;
  if (element.matches("textarea, [contenteditable='true']")) {
    return !element.hasAttribute("disabled") && !element.hasAttribute("readonly");
  }
  if (!(element instanceof HTMLInputElement)) return false;

  return (
    EDITABLE_INPUT_TYPES.has((element.type || "").toLowerCase()) &&
    !element.disabled &&
    !element.readOnly
  );
}

export function getVisibleViewport() {
  const viewport = window.visualViewport;
  const innerHeight = window.innerHeight || document.documentElement.clientHeight;
  const viewportHeight = viewport?.height || innerHeight;

  return {
    height: Math.max(1, Math.min(viewportHeight, innerHeight || viewportHeight)),
    top: Math.max(0, viewport?.offsetTop || 0),
  };
}

export function calculateRevealDelta(
  fieldRect,
  scrollRect,
  viewport,
  margin = 16,
) {
  const visibleTop = Math.max(scrollRect.top, viewport.top) + margin;
  const visibleBottom =
    Math.min(scrollRect.bottom, viewport.top + viewport.height) - margin;

  if (visibleBottom <= visibleTop) return 0;
  if (fieldRect.bottom > visibleBottom) {
    return fieldRect.bottom - visibleBottom;
  }
  if (fieldRect.top < visibleTop) {
    return fieldRect.top - visibleTop;
  }
  return 0;
}

function isFullscreenFixed(element) {
  const style = window.getComputedStyle(element);
  if (style.position !== "fixed") return false;

  const hasViewportInsets =
    style.top === "0px" &&
    style.right === "0px" &&
    style.bottom === "0px" &&
    style.left === "0px";

  if (hasViewportInsets) return true;

  const rect = element.getBoundingClientRect();
  const viewportWidth =
    window.visualViewport?.width ||
    window.innerWidth ||
    document.documentElement.clientWidth;
  const viewportHeight =
    window.visualViewport?.height ||
    window.innerHeight ||
    document.documentElement.clientHeight;

  return (
    rect.width >= viewportWidth * 0.9 &&
    rect.height >= viewportHeight * 0.8
  );
}

function findFullscreenModalAncestor(control) {
  let element = control.parentElement;
  let fullscreenModal = null;

  while (element && element !== document.body) {
    if (isFullscreenFixed(element)) fullscreenModal = element;
    element = element.parentElement;
  }

  return fullscreenModal;
}

function findModalContext(control) {
  const keyboardModal = control.closest('[data-keyboard-modal]');
  if (keyboardModal) {
    return { host: keyboardModal, fullscreen: true };
  }

  const heroContainer = control.closest('[data-slot="modal-container"]');
  if (heroContainer) {
    const backdrop = heroContainer.closest('[data-slot="modal-backdrop"]');
    return {
      host: backdrop || heroContainer,
      fullscreen: Boolean(backdrop),
    };
  }

  const fullscreenModal = findFullscreenModalAncestor(control);
  if (fullscreenModal) {
    return { host: fullscreenModal, fullscreen: true };
  }

  const dialog = control.closest(MODAL_DIALOG_SELECTOR);
  return dialog ? { host: dialog, fullscreen: false } : null;
}

function findContentBranch(control, host) {
  if (control === host) return host;

  let branch = control;
  while (branch.parentElement && branch.parentElement !== host) {
    branch = branch.parentElement;
  }

  return branch.parentElement === host ? branch : host;
}

function findScrollableAncestor(control, host) {
  let element = control.parentElement;

  while (element) {
    const style = window.getComputedStyle(element);
    if (/(auto|scroll|overlay)/.test(style.overflowY)) return element;
    if (element === host) break;
    element = element.parentElement;
  }

  return null;
}

function safelyScroll(element, top) {
  const nextTop = Math.max(0, top);
  if (typeof element.scrollTo === "function") {
    element.scrollTo({ top: nextTop, behavior: "auto" });
  } else {
    element.scrollTop = nextTop;
  }
}

export function installModalKeyboardGuard() {
  const root = document.documentElement;
  const viewport = window.visualViewport;
  const timers = new Set();
  let frame = 0;
  let activeControl = null;
  let activeHost = null;
  let activeContent = null;
  let activeScroller = null;

  const clearActiveMarkers = () => {
    activeHost?.removeAttribute("data-keyboard-guard-active");
    activeHost?.removeAttribute("data-keyboard-guard-fullscreen");
    activeContent?.removeAttribute("data-keyboard-guard-content");
    activeScroller?.removeAttribute("data-keyboard-guard-scroll");
    activeHost = null;
    activeContent = null;
    activeScroller = null;
  };

  const syncViewport = () => {
    const visibleViewport = getVisibleViewport();
    root.style.setProperty(
      "--app-visual-viewport-height",
      px(visibleViewport.height),
    );
    root.style.setProperty(
      "--app-visual-viewport-top",
      px(visibleViewport.top),
    );
    return visibleViewport;
  };

  const revealActiveControl = () => {
    if (
      !activeControl?.isConnected ||
      !activeHost?.isConnected ||
      !isKeyboardEditable(activeControl)
    ) {
      return;
    }

    const visibleViewport = syncViewport();
    const fieldRect = activeControl.getBoundingClientRect();
    const scroller =
      activeScroller || findScrollableAncestor(activeControl, activeHost);

    if (scroller) {
      activeScroller = scroller;
      activeScroller.setAttribute("data-keyboard-guard-scroll", "true");
      const delta = calculateRevealDelta(
        fieldRect,
        scroller.getBoundingClientRect(),
        visibleViewport,
      );
      if (Math.abs(delta) > 1) {
        safelyScroll(scroller, scroller.scrollTop + delta);
      }
      return;
    }

    const viewportBottom =
      visibleViewport.top + visibleViewport.height - 16;
    if (
      fieldRect.bottom > viewportBottom ||
      fieldRect.top < visibleViewport.top + 16
    ) {
      activeControl.scrollIntoView({
        block: "center",
        inline: "nearest",
        behavior: "auto",
      });
    }
  };

  const requestReveal = () => {
    window.cancelAnimationFrame(frame);
    frame = window.requestAnimationFrame(revealActiveControl);
  };

  const scheduleReveal = () => {
    requestReveal();
    [80, 220, 420].forEach((delay) => {
      const timer = window.setTimeout(() => {
        timers.delete(timer);
        revealActiveControl();
      }, delay);
      timers.add(timer);
    });
  };

  const activateFor = (control) => {
    const modal = findModalContext(control);
    if (!modal) return false;

    clearActiveMarkers();
    activeControl = control;
    activeHost = modal.host;
    activeContent = findContentBranch(control, modal.host);
    activeScroller = findScrollableAncestor(control, modal.host);

    activeHost.setAttribute("data-keyboard-guard-active", "true");
    if (modal.fullscreen) {
      activeHost.setAttribute("data-keyboard-guard-fullscreen", "true");
    }
    activeContent.setAttribute("data-keyboard-guard-content", "true");
    activeScroller?.setAttribute("data-keyboard-guard-scroll", "true");
    scheduleReveal();
    return true;
  };

  const onFocusIn = (event) => {
    if (isKeyboardEditable(event.target)) activateFor(event.target);
  };

  const onFocusOut = () => {
    const timer = window.setTimeout(() => {
      timers.delete(timer);
      const nextControl = document.activeElement;
      if (isKeyboardEditable(nextControl) && activateFor(nextControl)) return;

      activeControl = null;
      clearActiveMarkers();
      syncViewport();
    }, 0);
    timers.add(timer);
  };

  const onViewportChange = () => {
    syncViewport();
    if (activeControl) requestReveal();
  };

  syncViewport();
  document.addEventListener("focusin", onFocusIn, true);
  document.addEventListener("focusout", onFocusOut, true);
  window.addEventListener("resize", onViewportChange);
  window.addEventListener("orientationchange", onViewportChange);
  viewport?.addEventListener("resize", onViewportChange);
  viewport?.addEventListener("scroll", onViewportChange);

  return () => {
    document.removeEventListener("focusin", onFocusIn, true);
    document.removeEventListener("focusout", onFocusOut, true);
    window.removeEventListener("resize", onViewportChange);
    window.removeEventListener("orientationchange", onViewportChange);
    viewport?.removeEventListener("resize", onViewportChange);
    viewport?.removeEventListener("scroll", onViewportChange);
    window.cancelAnimationFrame(frame);
    timers.forEach((timer) => window.clearTimeout(timer));
    timers.clear();
    activeControl = null;
    clearActiveMarkers();
  };
}
