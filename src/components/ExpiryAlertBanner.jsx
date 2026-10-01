import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { db } from "@firebase-config";
import { collection, query, where, getDocs } from "firebase/firestore";
import { X, AlertTriangle } from "lucide-react";
import { COLLECTIONS } from "../collections";
import { getUser } from "../utils/authStorage";

const ALERT_KEY = "expiryAlertLastShown";

function todayISO() {
  return new Date().toISOString().split("T")[0];
}

function daysUntil(expirydate) {
  if (!expirydate) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expiry = expirydate?.seconds
    ? new Date(expirydate.seconds * 1000)
    : new Date(expirydate);
  expiry.setHours(0, 0, 0, 0);
  return Math.ceil((expiry - today) / (1000 * 60 * 60 * 24));
}

export default function ExpiryAlertBanner() {
  const [daysLeft, setDaysLeft] = useState(null);
  const [visible, setVisible]   = useState(false);
  const [animOut, setAnimOut]   = useState(false);
  const navigate                = useNavigate();

  useEffect(() => {
    const today = todayISO();
    if (localStorage.getItem(ALERT_KEY) === today) return;

    let mobileNo;
    try {
      const user = getUser();
      if (!user) return;
      mobileNo = user.mobileNo;
    } catch { return; }
    if (!mobileNo) return;

    const check = async () => {
      let activeSubs;
      try {
        const snap = await getDocs(
          query(
            collection(db, COLLECTIONS.SUBSCRIPTION),
            where("mobileNo", "==", mobileNo),
            where("Active", "==", true),
            where("Expire", "==", false),
          ),
        );
        activeSubs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      } catch { return; }

      if (!activeSubs || activeSubs.length === 0) return;

      let minDays = null;
      for (const sub of activeSubs) {
        const d = daysUntil(sub.expirydate);
        if (d !== null && d >= 0 && d <= 3) {
          if (minDays === null || d < minDays) minDays = d;
        }
      }

      if (minDays !== null) {
        setDaysLeft(minDays);
        setVisible(true);
        localStorage.setItem(ALERT_KEY, today);
      }
    };

    const t = setTimeout(check, 1400);
    return () => clearTimeout(t);
  }, []);

  const dismiss = () => {
    setAnimOut(true);
    setTimeout(() => { setVisible(false); setAnimOut(false); }, 350);
  };

  if (!visible) return null;

  const isToday = daysLeft === 0;
  const isTmrw  = daysLeft === 1;

  const label = isToday ? "Expires Today!" : isTmrw ? "Expires Tomorrow!" : `${daysLeft} Days Left`;
  const sub   = isToday
    ? "Renew now to keep your premium access."
    : "Your subscription is about to expire. Renew to stay uninterrupted.";

  const btnColor   = isToday ? "#c0392b" : isTmrw ? "#d35400" : "#e67e22";
  const bgGradient = isToday
    ? "linear-gradient(135deg,#c0392b 0%,#e74c3c 100%)"
    : isTmrw
      ? "linear-gradient(135deg,#c0392b 0%,#e67e22 100%)"
      : "linear-gradient(135deg,#e67e22 0%,#f39c12 100%)";

  return (
    <div
      className="md:hidden fixed left-3 right-3 z-[60] rounded-2xl shadow-2xl overflow-hidden"
      style={{
        bottom: "70px",
        background: bgGradient,
        animation: animOut
          ? "bExpOut 0.35s cubic-bezier(0.4,0,1,1) forwards"
          : "bExpIn 0.45s cubic-bezier(0.16,1,0.3,1) forwards",
      }}
    >
      <style>{`
        @keyframes bExpIn  { from{transform:translateY(120%);opacity:0} to{transform:translateY(0);opacity:1} }
        @keyframes bExpOut { from{transform:translateY(0);opacity:1}    to{transform:translateY(120%);opacity:0} }
      `}</style>

      <div className="absolute inset-0 pointer-events-none opacity-20"
        style={{ background: "radial-gradient(ellipse at 10% 50%,#fff 0%,transparent 60%)" }} />

      <div className="relative flex items-center gap-3 px-4 py-3">
        <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
          <AlertTriangle className="w-5 h-5 text-white" />
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-white font-bold text-[13px] leading-tight">{label}</p>
          <p className="text-white/80 text-[11px] mt-0.5 leading-tight">{sub}</p>
        </div>

        <button
          onClick={() => { dismiss(); navigate("/subscription"); }}
          style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent", color: btnColor }}
          className="shrink-0 bg-white text-[11px] font-bold px-3 py-1.5 rounded-full active:scale-95 transition-transform"
        >
          Renew
        </button>

        <button
          onClick={dismiss}
          style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}
          className="shrink-0 w-6 h-6 rounded-full bg-white/20 flex items-center justify-center active:scale-95 transition-transform ml-1"
        >
          <X className="w-3 h-3 text-white" />
        </button>
      </div>
    </div>
  );
}
