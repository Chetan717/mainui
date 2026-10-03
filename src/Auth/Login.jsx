"use client";
import { useEffect, useState, useRef } from "react";
import logo from "/mlmboo2.ico";
import { useNavigate } from "react-router";
import { toast } from "@heroui/react";
import { Eye, EyeOff } from "lucide-react";
import { login, getAuthErrorMessage } from "../services/authService";
import { setAuthFlowPending, setUser } from "../utils/authStorage";
import { auth } from "@firebase-config";
import { useSelectedCompany } from "../Context/SelectedCompanyContext";
import {
  clearCompanyProfileStorage,
  clearMlmProfileStorage,
  saveMlmProfileToStorage,
} from "../utils/companyStorage";
import {
  getProfileCompanyIdentity,
  hasCompleteCompanyIdentity,
  selectPreferredMlmProfile,
} from "../utils/mlmProfileCompanyIdentity";
import { getVerifiedMlmProfile } from "../utils/mlmProfileVerification";

const LOGIN_WALL_CARDS = [
  { x: "-4%", y: 18, w: 88, h: 112, bg: "linear-gradient(145deg,#c83a32,#7d1518)" },
  { x: "22%", y: 6, w: 94, h: 122, bg: "linear-gradient(145deg,#14233e,#050a14)" },
  { x: "47%", y: 32, w: 96, h: 118, bg: "linear-gradient(145deg,#b62f36,#5b1015)" },
  { x: "72%", y: 0, w: 96, h: 124, bg: "linear-gradient(145deg,#264e8e,#102950)" },
  { x: "-10%", y: 142, w: 100, h: 120, bg: "linear-gradient(145deg,#1358a1,#0b274d)" },
  { x: "21%", y: 142, w: 96, h: 122, bg: "linear-gradient(145deg,#4b2780,#24113f)" },
  { x: "47%", y: 154, w: 98, h: 116, bg: "linear-gradient(145deg,#248d76,#105648)" },
  { x: "73%", y: 136, w: 96, h: 122, bg: "linear-gradient(145deg,#64236f,#32123c)" },
  { x: "-5%", y: 276, w: 96, h: 122, bg: "linear-gradient(145deg,#58a894,#2e665a)" },
  { x: "22%", y: 274, w: 96, h: 120, bg: "linear-gradient(145deg,#75b7aa,#356e66)" },
  { x: "48%", y: 278, w: 96, h: 118, bg: "linear-gradient(145deg,#b184cd,#6c4a88)" },
  { x: "73%", y: 270, w: 96, h: 122, bg: "linear-gradient(145deg,#71b8a7,#3c7168)" },
];

export function Login() {
  const navigate = useNavigate();
  const { refreshCompany } = useSelectedCompany();

  const [loading, setLoading]       = useState(false);
  const [formError, setFormError]   = useState("");
  const [pin, setPin]               = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [lockout, setLockout]       = useState(0);
  const failCountRef                = useRef(0);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("session_expired") === "1") {
      toast.warning("Your secure 7-day session expired. Please login again.");
      window.history.replaceState(window.history.state, "", "/login");
    } else if (params.get("session_invalid") === "1") {
      toast.warning("Your session is no longer valid. Please login again.");
      window.history.replaceState(window.history.state, "", "/login");
    } else if (params.get("session_migrated") === "1") {
      toast.success("Security update applied. Please login again.");
      window.history.replaceState(window.history.state, "", "/login");
    }
  }, []);

  const onSubmit = async (e) => {
    e.preventDefault();

    if (lockout > Date.now()) {
      const secs = Math.ceil((lockout - Date.now()) / 1000);
      setFormError(`Too many failed attempts. Try again in ${secs}s.`);
      return;
    }

    const formData = new FormData(e.currentTarget);
    const data     = {};
    formData.forEach((value, key) => { data[key] = value.toString().trim(); });

    if (!/^[0-9]{10}$/.test(data.mobile)) {
      setFormError("Please enter a valid 10-digit mobile number");
      return;
    }
    if (!/^[0-9]{4}$/.test(pin)) {
      setFormError(
        "Please enter a valid 4-digit password.",
      );
      return;
    }

    try {
      setLoading(true);
      setFormError("");
      setAuthFlowPending(true);

      const result = await login(data.mobile, pin);

      // Account exists but needs OTP verification first
      if (result.status === "unverified") {
        toast.success("OTP sent! Please verify it.");
        navigate("/signup", {
          state: {
            verifyMode: true,
            sessionId:  result.sessionId,
            mobile:     result.mobile,
            userId:     result.userId,
          },
        });
        return;
      }

      // Successful login
      failCountRef.current = 0;
      setLockout(0);

      setUser(result.user);

      // Firestore is the source of truth for the poster-creation profile.
      // Never decide this flow from a browser-cached profile object.
      let mlmProfile = null;
      try {
        const verificationUid =
          auth.currentUser?.uid ||
          result.user?.uid ||
          result.user?.id ||
          data.mobile;
        mlmProfile = await getVerifiedMlmProfile(
          verificationUid,
          data.mobile,
        );
        // Keep the same preferred-profile selection contract explicit at the
        // login boundary. The shared verifier already applies this selection;
        // re-applying it to the one returned profile is read-free and keeps
        // legacy duplicate-profile behavior stable.
        if (mlmProfile) mlmProfile = selectPreferredMlmProfile([mlmProfile]);
      } catch (profileLookupError) {
        throw new Error("Profile verification failed. Please try login again.");
      }

      if (mlmProfile) {
        clearCompanyProfileStorage();
        saveMlmProfileToStorage(mlmProfile);
        toast.success("Login Successful!");
        navigate(
          hasCompleteCompanyIdentity(getProfileCompanyIdentity(mlmProfile))
            ? "/"
            : "/selectcomp",
        );
      } else {
        clearMlmProfileStorage();
        toast.success("Login Successful!");
        const company = await refreshCompany();
        navigate(company ? "/" : "/selectcomp");
      }
    } catch (error) {
      const msg = getAuthErrorMessage(error);

      // Track failed PIN attempts for client-side lockout
      if (msg.toLowerCase().includes("incorrect pin") || msg.toLowerCase().includes("pin")) {
        failCountRef.current += 1;
        if (failCountRef.current >= 5) {
          const until = Date.now() + 30_000;
          setLockout(until);
          failCountRef.current = 0;
          setFormError("Too many failed attempts. Please wait 30 seconds.");
        } else {
          setFormError(`${msg} (${failCountRef.current}/5)`);
        }
      } else {
        setFormError(msg);
      }
    } finally {
      setAuthFlowPending(false);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="relative mx-auto min-h-screen w-full max-w-[430px] overflow-hidden bg-background shadow-[0_0_40px_rgba(15,23,42,0.08)] dark:shadow-none">
        <div className="relative h-[455px] overflow-hidden bg-[#081529]">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_55%_0%,rgba(47,128,234,0.24),transparent_48%)]" />

          {LOGIN_WALL_CARDS.map((card, index) => (
            <div
              key={index}
              className="absolute overflow-hidden rounded-[9px] shadow-[0_8px_20px_rgba(0,0,0,0.24)]"
              style={{
                left: card.x,
                top: card.y,
                width: card.w,
                height: card.h,
                background: card.bg,
                opacity: 0.96,
              }}
            >
              <span className="absolute bottom-8 left-3 h-1 w-12 rounded-full bg-[#f7c548]/80" />
              <span className="absolute bottom-5 left-3 h-1 w-9 rounded-full bg-white/65" />
              <span className="absolute bottom-3 right-3 h-7 w-7 rounded-full bg-white/15" />
            </div>
          ))}

          <div className="absolute left-4 top-4 flex h-14 w-14 items-center justify-center rounded-[14px] border border-white/70 bg-white p-1.5 shadow-[0_8px_20px_rgba(0,0,0,0.35)]">
            <img src={logo} alt="MLM LIVE" className="h-full w-full object-contain" />
          </div>

          <div className="absolute right-4 top-4 flex items-center gap-1.5 rounded-full border border-white/45 bg-white/15 px-3 py-2 text-[12px] font-semibold text-white backdrop-blur-md">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="9" />
              <path d="M3 12h18M12 3a14 14 0 010 18M12 3a14 14 0 000 18" />
            </svg>
            English
          </div>

          <div className="absolute inset-x-0 bottom-0 h-48 bg-gradient-to-b from-transparent via-[var(--background)]/75 to-[var(--background)]" />
        </div>

        <div className="relative z-10 -mt-16 bg-background px-6 pb-8">
          <div className="mx-auto w-full">
            <h1 className="text-[23px] font-bold leading-tight text-foreground">
              Log in to your account
            </h1>
            <p className="mt-1.5 max-w-[360px] text-[15px] leading-5 text-muted-foreground">
              10,000+ ready designs with your photo and details already on them
            </p>

            <form className="mt-7 flex w-full flex-col gap-3" onSubmit={onSubmit}>
              <label className="sr-only" htmlFor="login-mobile">Mobile number</label>
              <div className="app-field flex h-[56px] items-center rounded-[16px] border px-3 shadow-sm focus-within:border-accent focus-within:ring-2 focus-within:ring-accent/15">
                <span className="flex h-9 items-center border-r border-border pr-3 text-[15px] font-medium text-foreground">+91</span>
                <input
                  id="login-mobile"
                  name="mobile"
                  type="tel"
                  className="min-w-0 flex-1 bg-transparent px-3 text-[15px] font-medium tracking-wide text-foreground outline-none placeholder:text-muted-foreground"
                  placeholder="10-digit mobile number"
                  maxLength={10}
                  autoComplete="username"
                  inputMode="numeric"
                  autoCapitalize="none"
                  required
                />
              </div>

              <div className="relative">
                <input
                  name="pin"
                  aria-label="Enter your password"
                  className="app-field h-[56px] w-full rounded-[16px] border px-4 pr-14 text-[16px] font-semibold tracking-[0.22em] outline-none shadow-sm transition focus:border-accent focus:ring-2 focus:ring-accent/15"
                  maxLength={4}
                  value={pin}
                  onChange={(event) =>
                    setPin(event.target.value.replace(/\D/g, "").slice(0, 4))
                  }
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  placeholder="••••"
                  required
                />
                <button
                  type="button"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  aria-pressed={showPassword}
                  onClick={() => setShowPassword((visible) => !visible)}
                  className="absolute inset-y-0 right-1 flex w-12 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:text-accent"
                >
                  {showPassword ? (
                    <EyeOff aria-hidden="true" className="size-5" />
                  ) : (
                    <Eye aria-hidden="true" className="size-5" />
                  )}
                </button>
              </div>

              <button
                type="button"
                onClick={() => navigate("/forgetpin")}
                className="self-end py-1 text-[12px] font-semibold text-accent"
              >
                Forgot password?
              </button>

              {formError && (
                <div className="rounded-[14px] border border-danger/25 bg-danger/10 px-4 py-3 text-center text-[13px] font-medium text-danger">
                  {formError}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="mt-1 flex h-[56px] w-full items-center justify-center rounded-[14px] bg-accent text-[16px] font-semibold text-white shadow-[0_8px_18px_rgba(40,119,233,0.2)] transition active:scale-[0.99] disabled:opacity-65"
              >
                {loading ? (
                  <span className="flex items-center gap-2.5">
                    <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/35 border-t-white" />
                    Logging in...
                  </span>
                ) : (
                  "Log in"
                )}
              </button>

              <p className="pt-1 text-center text-[12px] font-medium text-muted-foreground">
                New to MLM LIVE?{` `}
                <button
                  type="button"
                  onClick={() => navigate("/signup")}
                  className="font-semibold text-accent"
                >
                  Create account
                </button>
              </p>
            </form>
          </div>
        </div>
      </div>
    </div>
  );

}
