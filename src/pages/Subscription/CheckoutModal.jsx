import React, { useRef, useState, useCallback, useEffect } from "react";
import { Modal } from "@heroui/react";
import { db } from "@firebase-config";
import { addDoc, serverTimestamp, query, where, getDocs } from "firebase/firestore";
import { collection } from "firebase/firestore";
import { COLLECTIONS } from "../../collections";
import { getUser } from "../../utils/authStorage";
import { useSelectedCompany } from "../../Context/SelectedCompanyContext";

const RAZORPAY_KEY_ID  = import.meta.env.VITE_RAZORPAY_KEY_ID  || "";
const PSERVER_API_KEY  = import.meta.env.VITE_PSERVER_API_KEY  || "";
const PSERVER_BASE_URL = import.meta.env.VITE_PSERVER_URL       || "";

const loadRazorpayScript = () =>
  new Promise((resolve) => {
    if (window.Razorpay) return resolve(true);
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload  = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });

const getUserFromStorage = () => {
  try { return getUser() || {}; }
  catch { return {}; }
};

const fmtDisplay = (date) =>
  date.toLocaleDateString("en-GB", { day: "2-digit", month: "2-digit", year: "numeric" });

const pserverHeaders = () => ({
  "Content-Type": "application/json",
  "X-Api-Key": PSERVER_API_KEY,
});

export function CheckoutModal({ plan, isOpen, setIsOpen, onBack, onPaymentSuccess }) {
  const { selectedCompany: company } = useSelectedCompany();


  const [coupon,          setCoupon]          = useState(["", "", "", "", "", ""]);
  const [couponStatus,    setCouponStatus]    = useState(null);
  const [couponLoading,   setCouponLoading]   = useState(false);
  const [discountPercent, setDiscountPercent] = useState(0);
  const [paymentLoading,  setPaymentLoading]  = useState(false);
  const [paymentError,    setPaymentError]    = useState(null);
  const inputRefs = useRef([]);

  // Fetch mteam coupon directly from Firestore (not from stale localStorage)
  useEffect(() => {
    if (!isOpen) return;

    setCoupon(["", "", "", "", "", ""]);
    setCouponStatus(null);
    setDiscountPercent(0);
    setPaymentError(null);

    const fetchMteamCoupon = async () => {
      const user   = getUserFromStorage();
      const mobile = user?.mobileNo;
      if (!mobile) return;

      setCouponLoading(true);
      try {
        const q    = query(collection(db, COLLECTIONS.USERS), where("mobileNo", "==", mobile));
        const snap = await getDocs(q);
        if (snap.empty) return;

        const mteamCouponCode = snap.docs[0].data()?.mteamCouponCode;
        if (!mteamCouponCode || mteamCouponCode.length !== 6) return;

        setCoupon(mteamCouponCode.toUpperCase().split(""));

        const res = await fetch(`${PSERVER_BASE_URL}/validate-coupon`, {
          method: "POST",
          headers: pserverHeaders(),
          body: JSON.stringify({ code: mteamCouponCode.toUpperCase() }),
        });
        if (res.ok) {
          const data = await res.json();
          if (data.valid) {
            setCouponStatus("valid");
            setDiscountPercent(Number(data.discountPercent ?? 0));
          } else {
            setCouponStatus(data.reason === "inactive" ? "inactive" : "invalid");
          }
        }
      } catch { /* silent — user can enter coupon manually */ }
      finally  { setCouponLoading(false); }
    };

    fetchMteamCoupon();
  }, [isOpen]);

  const handleConfirmPurchase = useCallback(async () => {
    if (!plan || paymentLoading) return;
    setPaymentError(null);
    setPaymentLoading(true);

    const user    = getUserFromStorage();
    try {
      const sdkLoaded = await loadRazorpayScript();
      if (!sdkLoaded) {
        setPaymentError("Payment gateway failed to load. Check your connection.");
        setPaymentLoading(false);
        return;
      }

      const companyDocId = company?.id || company?.companyId;
      if (!companyDocId) {
        setPaymentError("Company ID missing. Please re-select your company and try again.");
        setPaymentLoading(false);
        return;
      }

      const orderRes = await fetch(PSERVER_BASE_URL, {
        method: "POST",
        headers: pserverHeaders(),
        body: JSON.stringify({
          companyId:  companyDocId,
          planName:  plan.PlanName || "",
          couponCode: couponStatus === "valid" ? coupon.join("") : null,
          userMobile: user?.mobileNo || "",
          userName:   user?.name     || "",
        }),
      });

      if (!orderRes.ok) {
        const errData = await orderRes.json().catch(() => ({}));
        setPaymentError("Order creation failed. Please try again.");
        setPaymentLoading(false);
        return;
      }

      const orderData = await orderRes.json();
      const orderId = orderData?.order_id;

      if (!orderId) {
        setPaymentError("Invalid order response. Please try again.");
        setPaymentLoading(false);
        return;
      }

      // Use server-confirmed amounts (these are what Razorpay will actually charge)
      const confirmedAmount      = orderData.payableAmount;
      const confirmedDiscount    = orderData.discountPercent ?? 0;
      const confirmedDiscountAmt = orderData.discountAmount  ?? 0;
      const confirmedGst         = orderData.gstAmount       ?? 0;

      // Log for dismissed / failed payments — low-risk (doesn't grant access)
      const buildFailLog = (status, extra = {}) => ({
        OrderId:       orderId,
        payment:       status,
        plan:          plan.PlanName || "",
        planType:      plan.Type     || "",
        company:       company?.name || company?.id || "",
        PaymentAmount: confirmedAmount,
        mobileNo:      user?.mobileNo || "",
        UserName:      user?.name     || "",
        PurchaseAt:    serverTimestamp(),
        Active:        false,
        Expire:        true,
        UTRID:         orderId,
        ...extra,
      });

      setIsOpen(false);
      await new Promise((r) => setTimeout(r, 350));

      const options = {
        key:         RAZORPAY_KEY_ID,
        // ── amount comes from the server's order, not the browser's calculation ──
        amount:      Number(confirmedAmount),
        currency:    "INR",
        name:        company?.name || "Subscription",
        description: plan.PlanName || "Plan Purchase",
        order_id:    orderId,
        prefill: {
          name:    user?.name     || "",
          contact: user?.mobileNo || "",
          email:   user?.email    || "",
        },
        notes: {
          plan:     plan.PlanName  || "",
          planType: plan.Type      || "",
          company:  company?.name  || "",
        },
        theme: { color: "#0088DA" },

        handler: async (response) => {
          try {
            // ── SECURE: signature verified server-side ───────────────────────
            // Server checks the HMAC, then writes the subscription to Firestore
            // using Firebase Admin SDK. The browser never writes to the
            // subscription collection directly.
            const verifyRes = await fetch(`${PSERVER_BASE_URL}/verify-payment`, {
              method: "POST",
              headers: pserverHeaders(),
              body: JSON.stringify({
                razorpay_order_id:   response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature:  response.razorpay_signature,
              }),
            });

            if (!verifyRes.ok) {
              const errData = await verifyRes.json().catch(() => ({}));
              
              setPaymentError(
                "Payment verified but record save failed. Contact support with order ID: " + orderId
              );
              setIsOpen(true);
              return;
            }

            // Subscription is now written by the server — nothing to do here.
          } catch (e) {
            
          } finally {
            setPaymentLoading(false);
            if (onPaymentSuccess) onPaymentSuccess();
          }
        },

        modal: {
          ondismiss: async () => {
            // Log the dismissal (no subscription — just an audit entry)
            await addDoc(
              collection(db, COLLECTIONS.PAYMENTLOG),
              buildFailLog("Dismissed")
            ).catch(() => {});
            setPaymentLoading(false);
            setIsOpen(true);
            setPaymentError("Payment cancelled. You can try again anytime.");
          },
        },
      };

      const rzp = new window.Razorpay(options);

      rzp.on("payment.failed", async (failRes) => {
        const failedId =
          failRes?.error?.metadata?.order_id  ||
          failRes?.error?.metadata?.payment_id ||
          orderId;
        await addDoc(
          collection(db, COLLECTIONS.PAYMENTLOG),
          buildFailLog("Failed", {
            OrderId:          failedId,
            UTRID:            failedId,
            errorCode:        failRes?.error?.code        || "",
            errorDescription: failRes?.error?.description || "",
            errorReason:      failRes?.error?.reason      || "",
          })
        ).catch(() => {});
      });

      rzp.open();
    } catch (err) {
      
      setPaymentError("Something went wrong. Please try again.");
      setIsOpen(true);
      setPaymentLoading(false);
    }
  }, [company, plan, discountPercent, couponStatus, coupon, paymentLoading, onPaymentSuccess]);

  if (!plan) return null;

  // Display-only amounts (server will recalculate; these are for UI preview only)
  const baseAmount        = plan.PlanAmount ?? 0;
  const discountAmount    = Math.floor((baseAmount * discountPercent) / 100);
  const amountAfterDiscount = baseAmount - discountAmount;
  const gstAmount         = Math.round(amountAfterDiscount * 0.18);
  const finalAmount       = amountAfterDiscount + gstAmount;

  const today      = new Date();
  const expiryDate = new Date(today);
  expiryDate.setDate(expiryDate.getDate() + (plan.Day_value ?? 0));

  const couponString   = coupon.join("");
  const isCouponFilled = couponString.length === 6;

  const handleCouponChange = (val, idx) => {
    const char = val.replace(/[^a-zA-Z0-9]/g, "").toUpperCase().slice(-1);
    const next = [...coupon];
    next[idx] = char;
    setCoupon(next);
    setCouponStatus(null);
    setDiscountPercent(0);
    if (char && idx < 5) inputRefs.current[idx + 1]?.focus();
  };

  const handleCouponKeyDown = (e, idx) => {
    if (e.key === "Backspace" && !coupon[idx] && idx > 0) {
      inputRefs.current[idx - 1]?.focus();
    }
  };

  const handleCouponPaste = (e) => {
    const text = e.clipboardData.getData("text")
      .replace(/[^a-zA-Z0-9]/g, "").toUpperCase().slice(0, 6);
    if (text.length === 6) {
      setCoupon(text.split(""));
      setCouponStatus(null);
      setDiscountPercent(0);
      inputRefs.current[5]?.focus();
    }
    e.preventDefault();
  };

  const handleApplyCoupon = async () => {
    if (!isCouponFilled || couponLoading) return;
    setCouponLoading(true);
    setPaymentError(null);
    try {
      const res = await fetch(`${PSERVER_BASE_URL}/validate-coupon`, {
        method: "POST",
        headers: pserverHeaders(),
        body: JSON.stringify({ code: couponString }),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        setPaymentError("Coupon check failed. Please try again.");
        setCouponStatus(null);
        setDiscountPercent(0);
        return;
      }
      const data = await res.json();
      if (!data.valid) {
        setCouponStatus(data.reason === "inactive" ? "inactive" : "invalid");
        setDiscountPercent(0);
        return;
      }
      setCouponStatus("valid");
      setDiscountPercent(Number(data.discountPercent ?? 0));
    } catch (err) {
      
      setPaymentError("Could not validate coupon. Check your connection.");
      setCouponStatus(null);
      setDiscountPercent(0);
    } finally {
      setCouponLoading(false);
    }
  };

  const handleClearCoupon = () => {
    setCoupon(["", "", "", "", "", ""]);
    setCouponStatus(null);
    setDiscountPercent(0);
    setPaymentError(null);
    inputRefs.current[0]?.focus();
  };

  return (
    <Modal isOpen={isOpen}>
      <Modal.Backdrop className="bg-black/60 backdrop-blur-sm">
        <Modal.Container placement="center" className="px-4">
          <Modal.Dialog className="w-full max-w-md mx-auto rounded-2xl border border-border shadow-2xl bg-background overflow-hidden max-h-[92vh] flex flex-col">
            <Modal.Body className="space-y-3 pt-0 px-4 overflow-y-auto flex-1">

              {/* Plan summary */}
              <div className="rounded-xl border border-accent/25 bg-accent/5 p-4 flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-accent/10 flex items-center justify-center shrink-0">
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-foreground text-[13px] truncate">{plan.PlanName || "Unnamed Plan"}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">{plan.Type || "—"}&nbsp;·&nbsp;{plan.Day_value ?? 0} Days</p>
                </div>
                <p className="text-lg font-extrabold text-accent shrink-0">₹{baseAmount}</p>
              </div>

              {/* Date timeline */}
              <div className="rounded-xl bg-black/5 bg-muted/5 border border-border/30 border-black/10 px-4 py-3 flex items-center justify-between gap-2">
                <div className="text-center">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-0.5">Start</p>
                  <p className="text-[12px] font-semibold text-foreground">{fmtDisplay(today)}</p>
                </div>
                <div className="flex-1 flex flex-col items-center gap-0.5">
                  <div className="w-full flex items-center gap-1">
                    <div className="flex-1 h-px bg-accent/30" />
                    <div className="w-2 h-2 rounded-full bg-accent" />
                    <div className="flex-1 h-px bg-accent/30" />
                  </div>
                  <p className="text-[10px] text-accent font-semibold">{plan.Day_value ?? 0} Days</p>
                </div>
                <div className="text-center">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-0.5">Expiry</p>
                  <p className="text-xs font-semibold text-red-500 dark:text-red-400">{fmtDisplay(expiryDate)}</p>
                </div>
              </div>

              {/* Coupon */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-px dark:bg-white/10 bg-black/10" />
                  <p className="text-[10px] text-muted-foreground uppercase tracking-widest">Coupon Code</p>
                  <div className="flex-1 h-px dark:bg-white/10 bg-black/10" />
                </div>

                <div className="flex items-center justify-center gap-2" onPaste={handleCouponPaste}>
                  {coupon.map((char, idx) => (
                    <input key={idx} ref={(el) => (inputRefs.current[idx] = el)}
                      type="text" inputMode="text" maxLength={1} value={char}
                      disabled={couponLoading || couponStatus === "valid"}
                      onChange={(e) => handleCouponChange(e.target.value, idx)}
                      onKeyDown={(e) => handleCouponKeyDown(e, idx)}
                      className={[
                        "w-10 h-11 text-center text-sm font-bold rounded-xl border-2 outline-none",
                        "transition-all duration-150 bg-muted/10 text-foreground",
                        "focus:border-accent focus:bg-accent/5 disabled:opacity-60 disabled:cursor-not-allowed",
                        couponStatus === "valid"
                          ? "border-green-500 bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400"
                          : couponStatus === "invalid" || couponStatus === "inactive"
                          ? "border-red-400 bg-red-50 dark:bg-red-900/20 text-red-500"
                          : "border-border/30 border-black/15",
                      ].join(" ")}
                    />
                  ))}
                </div>

                <div className="flex items-center justify-between px-1 min-h-[20px]">
                  <span className="text-xs font-medium">
                    {couponStatus === "valid"    && <span className="text-green-500">{discountPercent}% discount applied!</span>}
                    {couponStatus === "invalid"  && <span className="text-red-500">Coupon not found</span>}
                    {couponStatus === "inactive" && <span className="text-orange-500">Coupon is no longer active</span>}
                  </span>
                  <div className="flex items-center gap-3">
                    {couponLoading && <span className="text-xs text-muted-foreground animate-pulse">Checking…</span>}
                    {!couponLoading && isCouponFilled && couponStatus !== "valid" && (
                      <button onClick={handleApplyCoupon}
                        className="text-xs font-bold text-accent underline underline-offset-2">
                        Apply
                      </button>
                    )}
                    {couponString && (
                      <button onClick={handleClearCoupon}
                        className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                        Clear
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Price breakdown (preview — server confirms the actual charge) */}
              <div className="rounded-xl bg-black/5 bg-muted/5 border border-border/30 border-black/10 p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Plan Amount</span>
                  <span className="text-foreground font-medium">₹{baseAmount}</span>
                </div>
                {couponStatus === "valid" && discountAmount > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-green-500">Coupon Discount ({discountPercent}%)</span>
                    <span className="text-green-500 font-medium">− ₹{discountAmount}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">GST (18%)</span>
                  <span className="text-foreground font-medium">+ ₹{gstAmount}</span>
                </div>
                <div className="h-px dark:bg-white/10 bg-black/10 my-1" />
                <div className="flex justify-between text-base font-bold">
                  <span className="text-foreground">Total Payable</span>
                  <span className="text-accent">₹{finalAmount}</span>
                </div>
              </div>

              {paymentError && (
                <div className="rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-500/30 px-4 py-3">
                  <p className="text-xs text-red-600 dark:text-red-400 text-center">{paymentError}</p>
                </div>
              )}
            </Modal.Body>

            <Modal.Footer className="flex flex-col gap-2 pt-2 px-4 pb-3 border-t border-border bg-background flex-shrink-0">
              <button onClick={handleConfirmPurchase} disabled={paymentLoading}
                className={[
                  "w-full py-3.5 rounded-xl font-bold text-sm text-white",
                  "flex items-center justify-center gap-2 shadow-lg shadow-accent/25",
                  "transition-all duration-150",
                  paymentLoading
                    ? "bg-accent/60 cursor-not-allowed"
                    : "bg-accent hover:opacity-90 active:scale-[0.98]",
                ].join(" ")}>
                {paymentLoading ? (
                  <>
                    <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                    Processing…
                  </>
                ) : <>Confirm Purchase &nbsp;·&nbsp; ₹{finalAmount}</>}
              </button>
              <button disabled={paymentLoading}
                onClick={() => { if (paymentLoading) return; setIsOpen(false); if (onBack) onBack(); }}
                className="w-full py-2.5 rounded-xl text-sm font-medium text-muted-foreground dark:hover:bg-white/5 hover:bg-black/5 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-150">
                ← Back to Plan Details
              </button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}
