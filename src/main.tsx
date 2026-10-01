import { StrictMode, useEffect } from "react";
import { Toast, toast } from "@heroui/react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.jsx";
import { BrowserRouter, Routes, Route } from "react-router";
import { GeneralContext } from "./Context/GeneralContext.jsx";
import { AppLanguageProvider } from "./i18n/AppLanguageContext.jsx";
import { ErrorBoundary, OnlineProvider } from "./components/ErrorBoundary.jsx";
import { AuthProvider } from "./Auth/AuthContext.jsx";
import { SelectedCompanyProvider } from "./Context/SelectedCompanyContext.jsx";
import DownloadConfetti from "./components/DownloadConfetti.jsx";
import { installModalKeyboardGuard } from "./utils/modalKeyboard.js";
import { installGlobalReferralCapture } from "./utils/referralCode.js";
// import ScrollToTop from "./Pages/ScrollToTop.js";

installGlobalReferralCapture();

function GlobalToastController() {
  useEffect(() => {
    const queue = toast.getQueue();
    const timers = new Map<string, ReturnType<typeof setTimeout>>();

    const syncToastTimers = () => {
      const visibleKeys = new Set(
        queue.visibleToasts.map((item) => String(item.key)),
      );

      queue.visibleToasts.forEach((item) => {
        const key = String(item.key);

        if (!timers.has(key)) {
          const timer = setTimeout(() => {
            toast.close(key);
            timers.delete(key);
          }, 2000);

          timers.set(key, timer);
        }
      });

      timers.forEach((timer, key) => {
        if (!visibleKeys.has(key)) {
          clearTimeout(timer);
          timers.delete(key);
        }
      });
    };

    const unsubscribe = queue.subscribe(syncToastTimers);
    syncToastTimers();

    return () => {
      unsubscribe();
      timers.forEach((timer) => clearTimeout(timer));
      timers.clear();
    };
  }, []);

  return null;
}

function GlobalKeyboardController() {
  useEffect(() => {
    const dismissKeyboard = () => {
      const activeElement = document.activeElement;
      if (
        activeElement instanceof HTMLElement &&
        activeElement.matches(
          "input, textarea, select, [contenteditable='true']",
        )
      ) {
        activeElement.blur();
      }
    };

    // Covers submit buttons as well as the mobile keyboard's Go/Next/arrow
    // action when it triggers a native form submission.
    const handleSubmit = () => dismissKeyboard();

    // Some mobile WebViews send Enter to React handlers without dispatching a
    // native submit event. Keep textarea/contenteditable multi-line behavior.
    const handleKeyDown = (event: KeyboardEvent) => {
      if (
        event.key === "Enter" &&
        event.target instanceof HTMLInputElement
      ) {
        dismissKeyboard();
      }
    };

    document.addEventListener("submit", handleSubmit, true);
    document.addEventListener("keydown", handleKeyDown, true);

    return () => {
      document.removeEventListener("submit", handleSubmit, true);
      document.removeEventListener("keydown", handleKeyDown, true);
    };
  }, []);

  return null;
}

function ModalKeyboardController() {
  useEffect(() => installModalKeyboardGuard(), []);
  return null;
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ErrorBoundary>
      <OnlineProvider>
        <GeneralContext>
          <AppLanguageProvider>
          <GlobalToastController />
          <GlobalKeyboardController />
          <ModalKeyboardController />
          <DownloadConfetti />

          <Toast.Provider
            placement="top"
            maxVisibleToasts={1}
            width="min(92vw, 380px)"
          />
          <BrowserRouter>
            <AuthProvider>
              <SelectedCompanyProvider>
                {/* <ScrollToTop /> */}
                <Routes>
                  <Route path="/*" element={<App />} />
                </Routes>
              </SelectedCompanyProvider>
            </AuthProvider>
          </BrowserRouter>
          </AppLanguageProvider>
        </GeneralContext>
      </OnlineProvider>
    </ErrorBoundary>
  </StrictMode>,
);
