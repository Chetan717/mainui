import { useState } from "react";
import { Modal } from "@heroui/react";
import { useNavigate } from "react-router";
import { changePin, getAuthErrorMessage } from "../../../services/authService";
import { getUser } from "../../../utils/authStorage";

const STEPS = ["Current PIN", "New PIN", "Confirm PIN"];

function PinDots({ value, maxLength = 4 }) {
  return (
    <div className="flex items-center justify-center gap-4 my-2">
      {Array.from({ length: maxLength }).map((_, i) => (
        <div
          key={i}
          className={`w-12 h-12 rounded-xl border-2 flex items-center justify-center text-xl font-bold transition-all duration-200 ${
            i < value.length
              ? "border-accent bg-accent/10 text-accent"
              : "border-border bg-muted/20 text-transparent"
          }`}
        >
          {i < value.length ? "●" : "○"}
        </div>
      ))}
    </div>
  );
}

const NUM_KEYS = ["1","2","3","4","5","6","7","8","9","","0","⌫"];

function NumPad({ onPress, disabled }) {
  return (
    <div className="grid grid-cols-3 gap-2.5 mt-4">
      {NUM_KEYS.map((key, i) => (
        key === "" ? (
          <div key={i} />
        ) : (
          <button
            key={i}
            onClick={() => !disabled && onPress(key)}
            disabled={disabled}
            className={`h-[52px] rounded-2xl font-bold text-[18px] text-foreground transition-all duration-150 active:scale-95 select-none
              ${key === "⌫"
                ? "bg-danger/10 text-danger hover:bg-danger/20"
                : "bg-accent/6 hover:bg-accent/12 text-accent"
              } ${disabled ? "opacity-40 cursor-not-allowed" : ""}`}
          >
            {key}
          </button>
        )
      ))}
    </div>
  );
}

function ChangePin({ show, setChngePin }) {
  const navigate = useNavigate();

  const [step, setStep]       = useState(0);
  const [pins, setPins]       = useState(["", "", ""]);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");
  const [success, setSuccess] = useState(false);

  const currentPinValue = pins[step] ?? "";

  const handleKey = (key) => {
    if (key === "⌫") {
      setPins((prev) => {
        const next = [...prev];
        next[step] = next[step].slice(0, -1);
        return next;
      });
      setError("");
      return;
    }
    if (pins[step].length >= 4) return;

    const newVal = pins[step] + key;
    setPins((prev) => {
      const next = [...prev];
      next[step] = newVal;
      return next;
    });
    setError("");

    if (newVal.length === 4) {
      setTimeout(() => {
        if (step < 2) {
          setStep((s) => s + 1);
        } else {
          handleSubmit(newVal, [...pins.slice(0, 2), newVal]);
        }
      }, 280);
    }
  };

  const handleSubmit = async (confirmPinOverride, pinsOverride) => {
    const p          = pinsOverride || pins;
    const oldPin     = p[0];
    const newPin     = p[1];
    const confirmPin = confirmPinOverride || p[2];

    setError("");

    if (newPin !== confirmPin) {
      setError("New PIN and Confirm PIN do not match. Please try again.");
      setPins(["", "", ""]);
      setStep(0);
      return;
    }
    if (oldPin === newPin) {
      setError("New PIN must be different from your current PIN.");
      setPins(["", "", ""]);
      setStep(0);
      return;
    }

    try {
      setLoading(true);

      const localUser = getUser();
      if (!localUser) { setError("Session expired. Please login again."); return; }

      // PIN comparison happens server-side — never reads password to client
      await changePin(localUser.mobileNo, oldPin, newPin);

      setSuccess(true);
      setTimeout(() => {
        handleClose();
        navigate("/logout");
      }, 1800);
    } catch (err) {
      const msg = getAuthErrorMessage(err);
      setError(msg);
      setPins(["", "", ""]);
      setStep(0);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setPins(["", "", ""]);
    setStep(0);
    setError("");
    setSuccess(false);
    setChngePin(false);
  };

  return (
    <Modal isOpen={show} onOpenChange={(open) => { if (!open) handleClose(); }}>
      <Modal.Backdrop>
        <Modal.Container placement="top">
          <Modal.Dialog className="w-full max-w-[400px]">
            <Modal.CloseTrigger className="absolute top-5 right-5 w-8 h-8 rounded-full bg-muted/30 hover:bg-muted/50 flex items-center justify-center transition-colors">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <path d="M18 6 6 18M6 6l12 12"/>
              </svg>
            </Modal.CloseTrigger>

            <Modal.Body>
              {success ? (
                <div className="flex flex-col items-center justify-center py-8 gap-4">
                  <div className="w-16 h-16 rounded-full bg-green-500/10 border border-green-500/20 flex items-center justify-center">
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20 6 9 17l-5-5"/>
                    </svg>
                  </div>
                  <div className="text-center">
                    <p className="text-[17px] font-bold text-accent">PIN Changed!</p>
                    <p className="text-[13px] text-muted-accent mt-1">You will be logged out now.</p>
                  </div>
                </div>
              ) : (
                <>
                  <div className="mb-5">
                    <h2 className="text-[18px] font-display font-bold text-foreground">Change PIN</h2>
                    <p className="text-[13px] text-muted-foreground mt-0.5">You will be logged out after changing</p>
                  </div>

                  <div className="flex items-center gap-1.5 mb-5">
                    {STEPS.map((label, i) => (
                      <div key={i} className="flex-1 flex flex-col items-center gap-1">
                        <div className={`h-1 w-full rounded-full transition-all duration-300 ${
                          i < step ? "bg-green-500" : i === step ? "bg-accent" : "bg-border"
                        }`} />
                        <span className={`text-[10px] font-semibold transition-colors ${
                          i === step ? "text-accent" : i < step ? "text-green-500" : "text-muted-accent/50"
                        }`}>
                          {label}
                        </span>
                      </div>
                    ))}
                  </div>

                  <div className="text-center mb-1">
                    <p className="text-[14px] font-semibold text-accent">
                      Enter <span className="text-accent">{STEPS[step]}</span>
                    </p>
                  </div>
                  <PinDots value={currentPinValue} />

                  {error && (
                    <div className="mt-3 px-4 py-2.5 rounded-xl bg-danger/10 border border-danger/20 flex items-center gap-2">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="text-danger flex-shrink-0">
                        <circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/>
                      </svg>
                      <p className="text-[12px] font-medium text-danger">{error}</p>
                    </div>
                  )}

                  <NumPad onPress={handleKey} disabled={loading} />

                  {step > 0 && !loading && (
                    <button
                      onClick={() => {
                        setStep((s) => s - 1);
                        setPins((prev) => { const n = [...prev]; n[step] = ""; return n; });
                        setError("");
                      }}
                      className="w-full mt-3 py-2 text-[13px] font-medium text-muted-accent hover:text-accent transition-colors"
                    >
                      Back to {STEPS[step - 1]}
                    </button>
                  )}
                </>
              )}
            </Modal.Body>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}

export default ChangePin;
