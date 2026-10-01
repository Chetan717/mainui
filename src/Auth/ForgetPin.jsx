import {
  Button,
  FieldError,
  Form,
  Input,
  Label,
  TextField,
  InputOTP,
} from "@heroui/react";
import { useNavigate } from "react-router";
import { useState } from "react";
import {
  forgetPinInit,
  forgetPinVerify,
  forgetPinReset,
  resendOtp,
  getAuthErrorMessage,
} from "../services/authService";

export function Forgetpin() {
  const navigate = useNavigate();

  const [step, setStep]               = useState(1);
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState("");
  const [mobile, setMobile]           = useState("");
  const [enteredOtp, setEnteredOtp]   = useState("");
  const [newPin, setNewPin]           = useState("");
  const [confirmPin, setConfirmPin]   = useState("");
  const [sessionId, setSessionId]     = useState("");

  // ── STEP 1: Send OTP ───────────────────────────────────────────────────────
  const onSendOtp = async (e) => {
    e.preventDefault();
    setError("");
    if (!/^[0-9]{10}$/.test(mobile)) {
      setError("Please enter a valid 10-digit mobile number");
      return;
    }

    try {
      setLoading(true);
      const result = await forgetPinInit(mobile);
      setSessionId(result.sessionId);
      setStep(2);
    } catch (err) {
      setError(getAuthErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  // ── STEP 2: Verify OTP ─────────────────────────────────────────────────────
  const onVerifyOtp = async () => {
    setError("");
    if (enteredOtp.length < 4) {
      setError("Please enter the 4-digit OTP");
      return;
    }

    try {
      setLoading(true);
      await forgetPinVerify(sessionId, enteredOtp);
      setStep(3);
    } catch (err) {
      setError(getAuthErrorMessage(err));
      setEnteredOtp("");
    } finally {
      setLoading(false);
    }
  };

  // ── STEP 3: Set New PIN ────────────────────────────────────────────────────
  const onSetNewPin = async () => {
    setError("");
    if (!/^[0-9]{4}$/.test(newPin)) {
      setError("PIN must be exactly 4 digits");
      return;
    }
    if (newPin !== confirmPin) {
      setError("PINs do not match");
      return;
    }

    try {
      setLoading(true);
      await forgetPinReset(sessionId, newPin);
      alert("PIN changed successfully! Please login.");
      navigate("/login");
    } catch (err) {
      setError(getAuthErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  // ── Resend OTP ─────────────────────────────────────────────────────────────
  const onResendOtp = async () => {
    try {
      setLoading(true);
      setError("");
      await resendOtp(sessionId, "forgetpin");
      alert("OTP resent successfully!");
    } catch (err) {
      setError(getAuthErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const titles = ["", "Forgot PIN", "Verify OTP", "Set New PIN"];
  const subs   = [
    "",
    "Enter your registered mobile number",
    `OTP sent to +91 ${mobile}`,
    "Choose a new 4-digit PIN",
  ];

  const pinSlots = (val, onChange) => (
    <InputOTP maxLength={4} value={val} onChange={onChange}>
      <InputOTP.Group className="gap-3 w-full justify-between">
        {[0, 1, 2, 3].map((i) => (
          <InputOTP.Slot
            key={i}
            index={i}
            className="flex-1 h-14 text-2xl font-bold bg-white dark:bg-black/20 border border-border data-[focus=true]:border-accent data-[focus=true]:ring-accent shadow-sm rounded-xl"
          />
        ))}
      </InputOTP.Group>
    </InputOTP>
  );

  return (
    <div className="flex flex-col min-h-screen bg-background overflow-hidden">

      <div className="relative h-[178px] md:h-[200px] bg-accent overflow-hidden shrink-0">
        <div className="absolute inset-0 bg-gradient-to-br from-accent via-[#1a3a8f] to-[#0a1744]" />
        <div className="absolute -top-12 -right-12 w-48 h-48 rounded-full bg-white/5" />
        <div className="absolute -bottom-8 -left-8 w-36 h-36 rounded-full bg-white/5" />

        <div className="relative z-10 flex flex-col items-center justify-center h-full gap-3 px-6">
          <div className="text-center">
            <h1 className="text-white font-display font-bold text-2xl leading-tight">
              {titles[step]}
            </h1>
            <p className="text-white/70 text-sm mt-1 font-medium">
              {subs[step]}
            </p>
          </div>

          <div className="flex items-center gap-2 mt-1">
            {[1, 2, 3].map((s) => (
              <div
                key={s}
                className={`rounded-full transition-all duration-300 ${
                  step === s
                    ? "w-6 h-2 bg-white"
                    : step > s
                    ? "w-2 h-2 bg-white/70"
                    : "w-2 h-2 bg-white/30"
                }`}
              />
            ))}
          </div>
        </div>

        <div className="absolute bottom-0 left-0 right-0 h-8 bg-background rounded-t-[32px]" />
      </div>

      <div className="flex-1 flex flex-col items-center px-6 pt-2 pb-8 bg-background -mt-1">
        <div className="w-full max-w-sm">

          {/* ── STEP 1: Enter Mobile ── */}
          {step === 1 && (
            <Form className="flex w-full flex-col gap-5" onSubmit={onSendOtp}>
              <TextField name="mobile" type="tel" className="w-full">
                <Label className="font-semibold text-sm text-foreground/80 mb-1.5 block">
                  Mobile Number
                </Label>
                <Input
                  className="w-full"
                  classNames={{
                    inputWrapper:
                      "h-13 bg-white dark:bg-black/20 border border-border hover:border-accent focus-within:!border-accent focus-within:!ring-accent shadow-sm rounded-xl",
                    input: "text-base font-medium tracking-wide",
                  }}
                  maxLength={10}
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value.trim())}
                  placeholder="10-digit number"
                />
                <FieldError className="text-danger mt-1 text-xs" />
              </TextField>

              {error && (
                <div className="bg-danger/10 border border-danger/20 text-danger text-sm text-center py-3 px-4 rounded-xl font-medium">
                  {error}
                </div>
              )}

              <Button
                className="w-full h-13 bg-accent hover:bg-accent/90 text-white font-bold text-base shadow-lg shadow-accent/25 rounded-xl mt-2"
                type="submit"
                isLoading={loading}
              >
                {loading ? "Sending OTP..." : "Send OTP"}
              </Button>

              <button
                type="button"
                onClick={() => navigate("/login")}
                className="w-full h-11 bg-white dark:bg-black/20 border border-border hover:bg-black/5 dark:hover:bg-white/5 text-foreground font-bold text-sm rounded-xl transition-colors"
              >
                Back to Login
              </button>
            </Form>
          )}

          {/* ── STEP 2: Verify OTP ── */}
          {step === 2 && (
            <div className="flex w-full flex-col gap-5 pt-2">
              <div className="flex flex-col gap-1 w-full">
                <Label className="font-semibold text-sm text-foreground/80 mb-1.5 block text-center">
                  Enter 4-Digit OTP
                </Label>
                {pinSlots(enteredOtp, (val) => setEnteredOtp(val))}
              </div>

              {error && (
                <div className="bg-danger/10 border border-danger/20 text-danger text-sm text-center py-3 px-4 rounded-xl font-medium">
                  {error}
                </div>
              )}

              <Button
                className="w-full h-13 bg-accent hover:bg-accent/90 text-white font-bold text-base shadow-lg shadow-accent/25 rounded-xl mt-1"
                onClick={onVerifyOtp}
                isLoading={loading}
              >
                {loading ? "Verifying..." : "Verify OTP"}
              </Button>

              <div className="flex justify-between items-center px-2">
                <span
                  onClick={() => setStep(1)}
                  className="text-sm text-muted-foreground font-semibold cursor-pointer hover:text-foreground transition-colors"
                >
                  Back
                </span>
                <span
                  onClick={onResendOtp}
                  className="text-sm text-accent font-bold cursor-pointer hover:underline"
                >
                  Resend OTP
                </span>
              </div>
            </div>
          )}

          {/* ── STEP 3: Set New PIN ── */}
          {step === 3 && (
            <div className="flex w-full flex-col gap-5 pt-2">
              <div className="flex flex-col gap-1 w-full">
                <Label className="font-semibold text-sm text-foreground/80 mb-1.5 block">
                  New PIN
                </Label>
                {pinSlots(newPin, (val) => setNewPin(val))}
              </div>

              <div className="flex flex-col gap-1 w-full">
                <Label className="font-semibold text-sm text-foreground/80 mb-1.5 block">
                  Confirm PIN
                </Label>
                {pinSlots(confirmPin, (val) => setConfirmPin(val))}
              </div>

              {error && (
                <div className="bg-danger/10 border border-danger/20 text-danger text-sm text-center py-3 px-4 rounded-xl font-medium">
                  {error}
                </div>
              )}

              <Button
                className="w-full h-13 bg-accent hover:bg-accent/90 text-white font-bold text-base shadow-lg shadow-accent/25 rounded-xl mt-1"
                onClick={onSetNewPin}
                isLoading={loading}
              >
                {loading ? "Saving..." : "Change PIN"}
              </Button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
