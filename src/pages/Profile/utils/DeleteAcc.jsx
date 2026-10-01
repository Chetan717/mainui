import React, { useState } from "react";
import { Modal, Button, Label, InputOTP } from "@heroui/react";
import { useNavigate } from "react-router";
import { deleteAccount, getAuthErrorMessage } from "../../../services/authService";
import { getUser, removeUser } from "../../../utils/authStorage";
import { useSelectedCompany } from "../../../Context/SelectedCompanyContext";

function DeleteAcc({ show, setDeleteAcc }) {
  const navigate = useNavigate();
  const { clearCompanySelection } = useSelectedCompany();

  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");
  const [step, setStep]       = useState(1); // 1 = first confirm, 2 = second confirm, 3 = enter PIN
  const [pin, setPin]         = useState("");

  const resetState = () => {
    setStep(1);
    setPin("");
    setError("");
  };

  const onClose = () => {
    resetState();
    setDeleteAcc(false);
  };

  // ── STEP 3: Verify PIN + Delete (server-side) ─────────────────────────────
  const onDeleteAccount = async () => {
    setError("");

    if (pin.length < 4) {
      setError("Please enter your 4-digit PIN to confirm");
      return;
    }

    try {
      setLoading(true);

      const localUser = getUser();
      if (!localUser) { setError("Session expired. Please login again."); return; }

      // PIN verification + deletion all happen server-side
      await deleteAccount(localUser.mobileNo, pin);

      // The callable removes the account/profile. The existing Firebase ID
      // token remains available for this final UID-scoped Firestore cleanup.
      // deleteDoc is idempotent, so this is also safe when the backend has
      // already removed the selection.
      await clearCompanySelection();

      // Clear local session
      removeUser();
      localStorage.removeItem("mlmProfile");
      sessionStorage.removeItem("mlmProfile");
      localStorage.removeItem("selectedCompany");
      sessionStorage.removeItem("selectedCompany");

      resetState();
      setDeleteAcc(false);
      navigate("/logout");
    } catch (err) {
      const msg = getAuthErrorMessage(err);
      setError(msg);
      setPin("");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={show} onOpenChange={(open) => { if (!open) onClose(); }}>
      <Modal.Backdrop>
        <Modal.Container>
          <Modal.Dialog className="sm:max-w-[360px]">

            {/* ── STEP 1: First Confirmation ── */}
            {step === 1 && (
              <>
                <Modal.Header>
                  <Modal.Heading className="font-bold text-red-500">
                    Delete Account
                  </Modal.Heading>
                </Modal.Header>

                <Modal.Body>
                  <div className="flex flex-col gap-3 items-center py-2 text-center">
                    <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center">
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                      </svg>
                    </div>
                    <p className="font-bold text-foreground text-[14px]">
                      Are you sure you want to delete your account?
                    </p>
                    <p className="text-muted-foreground text-[13px]">
                      This action is permanent and cannot be undone. All your data will be lost forever.
                    </p>
                  </div>
                </Modal.Body>

                <Modal.Footer className="flex flex-col gap-2">
                  <Button className="w-full bg-red-500 text-white" onClick={() => setStep(2)}>
                    Yes, Delete My Account
                  </Button>
                  <Button className="w-full" variant="secondary" onClick={onClose}>
                    Cancel
                  </Button>
                </Modal.Footer>
              </>
            )}

            {/* ── STEP 2: Second Confirmation ── */}
            {step === 2 && (
              <>
                <Modal.Header>
                  <Modal.Heading className="font-bold text-red-500">
                    Final Warning
                  </Modal.Heading>
                </Modal.Header>

                <Modal.Body>
                  <div className="flex flex-col gap-3 items-center py-2 text-center">
                    <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center">
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                      </svg>
                    </div>
                    <p className="font-bold text-foreground text-[14px]">
                      This is your last chance!
                    </p>
                    <p className="text-muted-foreground text-[13px]">
                      Your account, refer credits, and all associated data will be permanently deleted. There is no way to recover it.
                    </p>
                  </div>
                </Modal.Body>

                <Modal.Footer className="flex flex-col gap-2">
                  <Button className="w-full bg-red-500 text-white" onClick={() => setStep(3)}>
                    I Understand, Delete It
                  </Button>
                  <Button className="w-full" variant="secondary" onClick={onClose}>
                    No, Keep My Account
                  </Button>
                </Modal.Footer>
              </>
            )}

            {/* ── STEP 3: Enter PIN to confirm ── */}
            {step === 3 && (
              <>
                <Modal.Header>
                  <Modal.Heading className="font-bold text-red-500">
                    Enter PIN to Delete
                  </Modal.Heading>
                </Modal.Header>

                <Modal.Body>
                  <div className="flex flex-col gap-5 items-center py-2">
                    <p className="text-muted-foreground text-[13px] text-center">
                      Enter your 4-digit PIN to permanently delete your account.
                    </p>

                    <div className="flex flex-col gap-2 items-center w-full">
                      <Label className="font-bold text-red-500 text-sm">Your PIN</Label>
                      <InputOTP
                        maxLength={4}
                        value={pin}
                        onChange={(val) => { setPin(val); setError(""); }}
                      >
                        <InputOTP.Group className="gap-4">
                          {[0, 1, 2, 3].map((i) => (
                            <InputOTP.Slot
                              key={i}
                              index={i}
                              className="size-12 border-2 border-red-200"
                            />
                          ))}
                        </InputOTP.Group>
                      </InputOTP>
                    </div>

                    {error && (
                      <p className="text-red-500 text-sm text-center w-full">{error}</p>
                    )}
                  </div>
                </Modal.Body>

                <Modal.Footer className="flex flex-col gap-2">
                  <Button
                    className="w-full bg-red-500 text-white"
                    onClick={onDeleteAccount}
                    isLoading={loading}
                  >
                    {loading ? "Deleting..." : "Delete My Account"}
                  </Button>
                  <Button className="w-full" variant="secondary" onClick={onClose}>
                    Cancel
                  </Button>
                </Modal.Footer>
              </>
            )}

          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}

export default DeleteAcc;
