import { useEffect } from "react";
import { Spinner } from "@heroui/react";
import { signOut } from "firebase/auth";
import { auth } from "@firebase-config";
import {
  clearCachedPii,
  markManualLogout,
  removeUser,
} from "../utils/authStorage";
import { clearMlmProfileStorage } from "../utils/companyStorage";

export function Logout() {
  useEffect(() => {
    // Keep a denial-only barrier until the next explicit successful login.
    // This guarantees that a failed/aborted cleanup cannot silently restore a
    // Firebase session after the user deliberately pressed Logout.
    markManualLogout();
    // Keep the UID-bound public company selection for the next login, but
    // remove the user's MLM profile PII from this tab.
    clearMlmProfileStorage();
    localStorage.removeItem("theme");
    localStorage.removeItem("mlmform");
    localStorage.removeItem("selType");
    localStorage.removeItem("close_filter");
    localStorage.removeItem("achieve_form");
    localStorage.removeItem("Meeting");
    removeUser();
    clearCachedPii();
    // Sign out from Firebase Auth then hard redirect
    signOut(auth).finally(() => window.location.replace("/login"));
  }, []);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background relative overflow-hidden">
      <div className="absolute -top-32 -right-32 w-64 h-64 bg-accent/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -left-32 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />
      
      <div className="text-center flex flex-col items-center gap-6 relative z-10 bg-white/50 dark:bg-black/20 p-10 rounded-3xl backdrop-blur-xl border border-border shadow-2xl">
        <div className="w-16 h-16 bg-accent/10 rounded-full flex items-center justify-center mb-2">
          <Spinner size="lg" color="primary" />
        </div>
        <div>
          <h2 className="text-2xl font-display font-bold text-foreground mb-2">Logging out...</h2>
          <p className="text-muted-foreground text-sm font-medium">Securing your account data</p>
        </div>
      </div>
    </div>
  );
}
