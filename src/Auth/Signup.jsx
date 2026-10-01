"use client";

import { useEffect, useState } from "react";
import { InputOTP, toast } from "@heroui/react";
import { useNavigate, useLocation } from "react-router";
import logo from "/mlmboo2.ico";
import { Eye, EyeOff } from "lucide-react";
import { ChevronLeft } from "lucide-react";

import {
  signupInit,
  signupVerify,
  verifyUser,
  resendOtp,
  getAuthErrorMessage,
} from "../services/authService";

import { setAuthFlowPending, setUser } from "../utils/authStorage";

import {
  clearCompanyProfileStorage,
  saveMlmProfileToStorage,
} from "../utils/companyStorage";

import {
  DEFAULT_COUPON_CODE,
  REFERRAL_CODE_UPDATED_EVENT,
  clearPendingReferralCode,
  getInitialSignupCouponCode,
  getSignupCouponCode,
  getPendingReferralCode,
  getReferralCodeFromSearch,
  getStoredReferralSource,
  normalizeReferralCode,
  notifyNativeReferralCleared,
  requestNativeReferralCode,
  savePendingReferralCode,
  storeReferralSource,
} from "../utils/referralCode";

export function Signup() {
  const navigate = useNavigate();
  const location = useLocation();

  const verifyState = location.state?.verifyMode ? location.state : null;

  const [step, setStep] = useState(verifyState ? 2 : 1);
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState("");
  const [enteredOtp, setEnteredOtp] = useState("");
  const [otpError, setOtpError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [referInput, setReferInput] = useState(() => {
    const queryCode = getReferralCodeFromSearch(window.location.search);
    return getInitialSignupCouponCode({
      queryCode,
      pendingCode: getPendingReferralCode(),
      pendingSource: getStoredReferralSource(),
    });
  });

  const [sessionId, setSessionId] = useState(verifyState?.sessionId || "");

  const [userMobile, setUserMobile] = useState(verifyState?.mobile || "");

  /*
   * Referral code can arrive from:
   * 1. Website/deep-link query
   * 2. Expo React Native WebView
   * 3. Google Play Install Referrer
   */
  useEffect(() => {
    const queryCode = getReferralCodeFromSearch(location.search);

    if (queryCode) {
      setReferInput(savePendingReferralCode(queryCode, "automatic"));
    }

    const handleReferralUpdate = (event) => {
      const code = normalizeReferralCode(event.detail?.code);
      if (!code) return;

      setReferInput(code);
      setFormError("");
    };

    window.addEventListener(
      REFERRAL_CODE_UPDATED_EVENT,
      handleReferralUpdate,
    );

    // Ask again after Signup mounts so an install-referrer message cannot be
    // lost behind Splash/Onboarding or lazy route loading.
    requestNativeReferralCode();

    return () => {
      window.removeEventListener(
        REFERRAL_CODE_UPDATED_EVENT,
        handleReferralUpdate,
      );
    };
  }, [location.search]);

  // STEP 1: Send signup OTP
  const onSignupSubmit = async (event) => {
    event.preventDefault();

    const formData = new FormData(event.currentTarget);
    const data = {};

    formData.forEach((value, key) => {
      data[key] = value.toString().trim();
    });

    if (!/^[0-9]{4}$/.test(data.pin || "")) {
      setFormError(
        "Password must be 4 digits / पासवर्ड 4 अंकों का होना चाहिए।",
      );
      return;
    }

    const couponCode = getSignupCouponCode(referInput);
    setReferInput(couponCode);

    try {
      setLoading(true);
      setFormError("");

      const result = await signupInit(
        data.name,
        data.mobile,
        data.pin,
        couponCode,
      );

      setSessionId(result.sessionId);
      setUserMobile(data.mobile);
      setStep(2);
    } catch (error) {
      setFormError(getAuthErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  // STEP 2: Verify OTP
  const onVerifyOtp = async () => {
    if (enteredOtp.length < 4) {
      setOtpError("Please enter the 4-digit OTP");
      return;
    }

    try {
      setLoading(true);
      setOtpError("");
      setAuthFlowPending(true);

      let result;

      if (verifyState) {
        result = await verifyUser(sessionId, enteredOtp);
      } else {
        result = await signupVerify(sessionId, enteredOtp);
      }

      setUser(result.user, true);

      // Clear referral only after successful signup.
      clearPendingReferralCode();
      storeReferralSource("");

      notifyNativeReferralCleared("REFERRAL_CODE_CONSUMED");

      clearCompanyProfileStorage();

      if (result.mlmProfile) {
        saveMlmProfileToStorage(result.mlmProfile);

        toast.success("Account created! Welcome to MLM LIVE 🎉");

        navigate("/");
      } else {
        toast.success("Account created! Welcome to MLM LIVE 🎉");

        navigate("/selectcomp");
      }
    } catch (error) {
      setOtpError(getAuthErrorMessage(error));
      setEnteredOtp("");
    } finally {
      setAuthFlowPending(false);
      setLoading(false);
    }
  };

  // Resend OTP
  const onResendOtp = async () => {
    try {
      setLoading(true);
      setOtpError("");

      const type = verifyState ? "login_verify" : "signup";

      await resendOtp(sessionId, type);

      alert("OTP resent successfully!");
    } catch (error) {
      setOtpError(getAuthErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  const stepTitles = [
    "",
    "Create Account / अकाउंट बनाएं",
    "Verify OTP / OTP सत्यापित करें",
  ];

  const stepSubs = [
    "",
    "Join MLM LIVE today / आज ही MLM LIVE से जुड़ें",
    `OTP sent to +91 ${userMobile} / OTP भेज दिया गया है`,
  ];

  if (step === 2) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <div className="mx-auto min-h-screen w-full max-w-[430px] overflow-hidden bg-background shadow-[0_0_40px_rgba(15,23,42,0.08)] dark:shadow-none">
          <header
            className="relative flex h-[60px] items-center gap-3 overflow-hidden px-4 text-white"
            style={{ background: "linear-gradient(135deg,var(--app-blue-start),var(--app-blue-end))" }}
          >
            <span className="pointer-events-none absolute -right-16 -top-24 h-56 w-56 rounded-full bg-white/[0.055]" />
            <button
              type="button"
              aria-label="Go back"
              onClick={() => {
                if (verifyState) navigate("/login");
                else {
                  setEnteredOtp("");
                  setOtpError("");
                  setStep(1);
                }
              }}
              className="relative z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white/15 text-white transition active:scale-95"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <h1 className="relative z-10 text-[16px] font-bold">Verify number</h1>
          </header>

          <main className="px-7 pt-8 pb-10">
            <h2 className="text-[23px] font-bold leading-tight text-foreground">Enter the code</h2>
            <span className="sr-only">Enter 4-Digit OTP / 4 अंकों का OTP दर्ज करें</span>
            <p className="mt-2 text-[15px] text-muted-foreground">
              We sent a 4-digit code to +91 {userMobile}
            </p>

            {verifyState && (
              <div className="mt-4 rounded-[14px] border border-accent/20 bg-accent/10 px-4 py-3 text-[12px] font-medium text-accent">
                A new OTP was sent because this account still needs verification.
              </div>
            )}

            <div className="mt-8">
              <InputOTP
                maxLength={4}
                value={enteredOtp}
                onChange={setEnteredOtp}
                autoComplete="one-time-code"
                inputMode="numeric"
              >
                <InputOTP.Group className="flex w-full justify-between gap-2.5">
                  {[0, 1, 2, 3].map((index) => (
                    <InputOTP.Slot
                      key={index}
                      index={index}
                      className="app-field h-[60px] flex-1 rounded-[14px] border text-[20px] font-bold text-foreground shadow-sm data-[focus=true]:border-accent data-[focus=true]:ring-2 data-[focus=true]:ring-accent/20"
                    />
                  ))}
                </InputOTP.Group>
              </InputOTP>
            </div>

            <div className="mt-5 flex items-center justify-center gap-1.5 text-[12px]">
              <span className="text-muted-foreground">Didn't get it?</span>
              <button
                type="button"
                onClick={onResendOtp}
                disabled={loading}
                className="font-semibold text-accent disabled:opacity-60"
              >
                Resend OTP
              </button>
            </div>

            {otpError && (
              <div className="mt-5 rounded-[14px] border border-danger/25 bg-danger/10 px-4 py-3 text-center text-[13px] font-medium text-danger">
                {otpError}
              </div>
            )}

            <button
              type="button"
              onClick={onVerifyOtp}
              disabled={loading}
              className="mt-7 flex h-[56px] w-full items-center justify-center rounded-[14px] bg-accent text-[16px] font-semibold text-white shadow-[0_8px_18px_rgba(40,119,233,0.2)] disabled:opacity-65"
            >
              {loading ? (
                <span className="flex items-center gap-2.5">
                  <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/35 border-t-white" />
                  Verifying...
                </span>
              ) : (
                "Verify"
              )}
            </button>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto min-h-screen w-full max-w-[430px] overflow-hidden bg-background shadow-[0_0_40px_rgba(15,23,42,0.08)] dark:shadow-none">
        <section
          className="relative h-[220px] overflow-hidden text-white"
          style={{ background: "linear-gradient(135deg,var(--app-blue-start),var(--app-blue-end))" }}
        >
          <span className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full bg-white/[0.055]" />
          <span className="pointer-events-none absolute -left-16 bottom-[-60px] h-44 w-44 rounded-full bg-white/[0.045]" />

          <div className="flex h-full flex-col items-center justify-center px-6">
            <div className="flex h-[58px] w-[58px] items-center justify-center rounded-[14px] bg-white p-1.5 shadow-[0_10px_28px_rgba(17,61,132,0.3)]">
              <img src={logo} alt="MLM LIVE" className="h-full w-full object-contain" />
            </div>
            <h1 className="mt-4 text-[24px] font-bold leading-tight">Create account</h1>
            <p className="mt-1.5 text-[15px] font-medium text-white/80">Join MLM LIVE today</p>
            <div className="mt-4 flex items-center gap-2">
              <span className="h-1.5 w-5 rounded-full bg-white" />
              <span className="h-1.5 w-1.5 rounded-full bg-white/45" />
            </div>
          </div>
        </section>

        <section className="relative -mt-[18px] rounded-t-[28px] bg-[var(--auth-sheet)] px-6 pt-7 pb-8 shadow-[0_-6px_24px_rgba(15,23,42,0.07)]">
          <form className="flex w-full flex-col gap-4" onSubmit={onSignupSubmit}>
            <div>
              <label htmlFor="signup-name" className="mb-2 block text-[12px] font-medium text-muted-foreground">
                Full name
                <span className="sr-only">Full Name / पूरा नाम</span>
              </label>
              <input
                id="signup-name"
                name="name"
                type="text"
                className="app-field h-[54px] w-full rounded-[15px] border px-4 text-[15px] font-medium outline-none shadow-sm transition focus:border-accent focus:ring-2 focus:ring-accent/15"
                placeholder="Enter your full name"
                autoComplete="name"
                required
              />
            </div>

            <div>
              <label htmlFor="signup-mobile" className="mb-2 block text-[12px] font-medium text-muted-foreground">
                Mobile number
                <span className="sr-only">Mobile Number / मोबाइल नंबर</span>
              </label>
              <div className="app-field flex h-[54px] items-center rounded-[15px] border px-3 shadow-sm focus-within:border-accent focus-within:ring-2 focus-within:ring-accent/15">
                <span className="border-r border-border pr-3 text-[15px] text-muted-foreground">+91</span>
                <input
                  id="signup-mobile"
                  name="mobile"
                  type="tel"
                  className="min-w-0 flex-1 bg-transparent px-3 text-[15px] font-medium text-foreground outline-none placeholder:text-muted-foreground"
                  placeholder="10-digit mobile number"
                  maxLength={10}
                  autoComplete="username"
                  inputMode="numeric"
                  autoCapitalize="none"
                  required
                />
              </div>
            </div>

            <div>
              <label htmlFor="signup-pin" className="mb-2 block text-[12px] font-medium text-muted-foreground">
                Create a password
                <span className="sr-only">Add Your Password / अपना पासवर्ड जोड़ें</span>
              </label>
              <div className="relative">
                <input
                  id="signup-pin"
                  name="pin"
                  aria-label="Add Your Password / अपना पासवर्ड जोड़ें"
                  className="app-field h-[54px] w-full rounded-[15px] border px-4 pr-14 text-[16px] font-semibold tracking-[0.22em] outline-none shadow-sm transition focus:border-accent focus:ring-2 focus:ring-accent/15"
                  maxLength={4}
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  onInput={(event) => {
                    event.currentTarget.value = event.currentTarget.value
                      .replace(/\D/g, "")
                      .slice(0, 4);
                  }}
                  placeholder="••••"
                  required
                />
                <button
                  type="button"
                  aria-label={showPassword ? "Hide password / पासवर्ड छिपाएं" : "Show password / पासवर्ड दिखाएं"}
                  aria-pressed={showPassword}
                  onClick={() => setShowPassword((visible) => !visible)}
                  className="absolute inset-y-0 right-1 flex w-12 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:text-accent"
                >
                  {showPassword ? <EyeOff aria-hidden="true" className="size-5" /> : <Eye aria-hidden="true" className="size-5" />}
                </button>
              </div>
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between">
                <label htmlFor="signup-coupon" className="text-[12px] font-medium text-muted-foreground">Coupon code</label>
                <span className="rounded-full bg-accent/10 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.08em] text-accent">Editable</span>
              </div>
              <input
                id="signup-coupon"
                type="text"
                aria-label="Coupon Code / कूपन कोड"
                maxLength={8}
                value={referInput}
                onChange={(event) => {
                  const code = normalizeReferralCode(event.target.value);
                  setReferInput(code);
                  if (code) savePendingReferralCode(code, "manual");
                  else {
                    clearPendingReferralCode();
                    notifyNativeReferralCleared();
                  }
                  setFormError("");
                }}
                onBlur={() => {
                  const couponCode = getSignupCouponCode(referInput);
                  setReferInput(couponCode);
                  if (couponCode === DEFAULT_COUPON_CODE && !getStoredReferralSource()) {
                    clearPendingReferralCode();
                  } else {
                    savePendingReferralCode(couponCode, getStoredReferralSource());
                  }
                }}
                className="app-field h-[54px] w-full rounded-[15px] border px-4 text-[15px] font-medium uppercase outline-none shadow-sm transition focus:border-accent focus:ring-2 focus:ring-accent/15"
              />
              <p className="mt-2 text-[11px] leading-4 text-muted-foreground">
                MLM100 is filled in for you. Change it only if your upline gave you a different code.
              </p>
            </div>

            {formError && (
              <div className="rounded-[14px] border border-danger/25 bg-danger/10 px-4 py-3 text-center text-[13px] font-medium text-danger">
                {formError}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="mt-3 flex h-[56px] w-full items-center justify-center rounded-[14px] bg-accent text-[16px] font-semibold text-white shadow-[0_8px_18px_rgba(40,119,233,0.2)] disabled:opacity-65"
            >
              {loading ? (
                <span className="flex items-center gap-3">
                  <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/35 border-t-white" />
                  Sending OTP
                </span>
              ) : (
                "Continue"
              )}
            </button>

            <p className="text-center text-[12px] font-medium text-muted-foreground">
              Already have an account?{` `}
              <button type="button" onClick={() => navigate("/login")} className="font-semibold text-accent">
                Log in
              </button>
            </p>
          </form>
        </section>
      </div>
    </div>
  );

}
