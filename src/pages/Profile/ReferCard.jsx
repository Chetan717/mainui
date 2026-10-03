import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { collection, getDocs, getFirestore, query, where } from "firebase/firestore";
import {
  Gift,
  Copy,
  Check,
  Share2,
  ChevronRight,
} from "lucide-react";
import { COLLECTIONS } from "../../collections";
import { getUser } from "../../utils/authStorage";
import { createPlayStoreReferralLink } from "../../utils/referralCode";
import { useAppLanguage } from "../../i18n/AppLanguageContext";
import { ProfileHeader } from "./ProfileSubpages";

function useReferralData() {
  const [user, setUser] = useState(null);
  const [referrals, setReferrals] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const localUser = getUser();
    setUser(localUser || null);
    if (!localUser?.referCode) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const db = getFirestore();
        const q = query(
          collection(db, COLLECTIONS.USERS),
          where("referredBy", "==", localUser.referCode),
        );
        const snap = await getDocs(q);
        if (!cancelled) setReferrals(snap.docs.map((doc) => doc.data()));
      } catch {
        if (!cancelled) setReferrals([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return { user, referrals, loading };
}

function buildShareMessage(referCode) {
  const appLink = createPlayStoreReferralLink(referCode);
  return {
    appLink,
    message:
      `🌟 *Join MLM LIVE & Grow Your Network!*\n\n` +
      `Create marketing designs quickly with MLM LIVE.\n\n` +
      `🎁 *Use my referral code:* ${referCode}\n\n` +
      `📲 Download: ${appLink}`,
  };
}

async function shareReferral(referCode, preferWhatsApp = false) {
  if (!referCode || referCode === "—") return;
  const { appLink, message } = buildShareMessage(referCode);

  if (preferWhatsApp) {
    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, "_blank");
    return;
  }

  if (typeof window !== "undefined" && window.ReactNativeWebView?.postMessage) {
    window.ReactNativeWebView.postMessage(
      JSON.stringify({
        type: "SHARE_SOMETHING",
        title: "MLM LIVE",
        message,
        text: message,
        url: appLink,
      }),
    );
    return;
  }

  if (typeof navigator !== "undefined" && navigator.share) {
    try {
      await navigator.share({ title: "MLM LIVE", text: message, url: appLink });
      return;
    } catch {}
  }

  window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, "_blank");
}

export default function ReferCard() {
  const navigate = useNavigate();
  const { t } = useAppLanguage();

  return (
    <button
      type="button"
      onClick={() => navigate("/profile/refer")}
      className="flex w-full items-center gap-3 rounded-[20px] bg-[#e5f0ff] px-4 py-4 text-left active:scale-[0.99]"
    >
      <span className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-[#2877e9] text-white">
        <Share2 className="h-5 w-5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[15px] font-medium text-[#202634] dark:text-[#f5f7fb]">{t("Free credits per referral")}</span>
        <span className="mt-0.5 block text-[11px] text-[#667085] dark:text-[#b6c0d1]">{t("Share MLM LIVE with your team")}</span>
      </span>
      <ChevronRight className="h-5 w-5 text-[#2877e9]" />
    </button>
  );
}

export function ReferEarnPage() {
  const navigate = useNavigate();
  const { t } = useAppLanguage();
  const { user, referrals, loading } = useReferralData();
  const [copied, setCopied] = useState(false);
  const referCode = user?.referCode || "—";

  const copyCode = useCallback(async () => {
    if (!user?.referCode) return;
    try {
      await navigator.clipboard.writeText(user.referCode);
    } catch {
      const input = document.createElement("textarea");
      input.value = user.referCode;
      input.style.cssText = "position:fixed;opacity:0";
      document.body.appendChild(input);
      input.select();
      document.execCommand("copy");
      input.remove();
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }, [user?.referCode]);

  const steps = useMemo(() => [
    {
      title: t("Share your code with your team"),
      subtitle: t("They enter it while creating their account"),
    },
    {
      title: t("They start using MLM LIVE"),
      subtitle: t("Your credits are added once they download their first design"),
    },
    {
      title: t("Spend credits on premium packs"),
      subtitle: t("Credits are shown at checkout"),
    },
  ], [t]);

  return (
    <div className="min-h-[100dvh] bg-[#f5f6fa] dark:bg-[#0f1420] pb-10">
      <div className="overflow-hidden rounded-b-[32px] bg-[linear-gradient(135deg,#2F80EA_0%,#236FDE_48%,#1454C5_100%)] text-white">
        <ProfileHeader title={t("Refer & earn")} onBack={() => navigate("/profile")} />
        <div className="relative flex flex-col items-center px-4 pb-9 pt-2">
          <div className="pointer-events-none absolute -bottom-20 -left-20 h-52 w-52 rounded-full bg-white/[0.08]" />
          <div className="flex h-20 w-20 items-center justify-center rounded-[24px] bg-white dark:bg-[#171e2d] text-[#2877e9] shadow-sm">
            <Gift className="h-8 w-8" />
          </div>
          <h2 className="mt-4 text-[18px] font-semibold">{t("Free credits per referral!")}</h2>
        </div>
      </div>

      <div className="px-4 pt-5">
        <div className="rounded-[22px] bg-white dark:bg-[#171e2d] p-4">
          <p className="mb-2 text-center text-[11px] font-bold uppercase tracking-[0.08em] text-[#8e98ac] dark:text-[#8995aa]">{t("YOUR REFERRAL CODE")}</p>
          <div className="flex items-center gap-3 rounded-[16px] border-2 border-dashed border-[#2877e9] px-4 py-3">
            <span className="min-w-0 flex-1 truncate text-[17px] font-bold text-[#202634] dark:text-[#f5f7fb]">{referCode}</span>
            <button type="button" onClick={copyCode} className="flex items-center gap-1.5 rounded-full bg-[#edf4ff] px-3 py-2 text-[12px] font-medium text-[#2877e9]">
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              {copied ? t("Copied") : t("Copy")}
            </button>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-[1fr_104px] gap-3">
          <button type="button" onClick={() => shareReferral(referCode, true)} className="h-14 rounded-[14px] bg-[#2877e9] text-[14px] font-semibold text-white">
            {t("Share on WhatsApp")}
          </button>
          <button type="button" onClick={() => shareReferral(referCode)} className="h-14 rounded-[14px] border border-[#cbd3e2] bg-white dark:bg-[#171e2d] text-[14px] font-semibold text-[#202634] dark:text-[#f5f7fb]">
            {t("More")}
          </button>
        </div>

        <p className="mb-2 mt-5 text-[11px] font-bold uppercase tracking-[0.08em] text-[#8e98ac] dark:text-[#8995aa]">{t("HOW IT WORKS")}</p>
        <div className="overflow-hidden rounded-[22px] bg-white dark:bg-[#171e2d]">
          {steps.map((step, index) => (
            <React.Fragment key={step.title}>
              <div className="flex gap-3 px-4 py-4">
                <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-[#eaf3ff] text-[12px] font-semibold text-[#2877e9]">{index + 1}</span>
                <div className="min-w-0">
                  <p className="text-[14px] font-medium text-[#202634] dark:text-[#f5f7fb]">{step.title}</p>
                  <p className="mt-0.5 text-[11px] leading-4 text-[#8e98ac] dark:text-[#8995aa]">{step.subtitle}</p>
                </div>
              </div>
              {index < steps.length - 1 && <div className="ml-16 h-px bg-[#e7eaf0]" />}
            </React.Fragment>
          ))}
        </div>

        <div className="mt-4 flex items-center rounded-[20px] bg-[#e5f0ff] px-4 py-4">
          <div className="flex-1">
            <p className="text-[14px] font-medium text-[#202634] dark:text-[#f5f7fb]">
              {loading ? "…" : `${referrals.length} ${t("people joined using your code")}`}
            </p>
            <p className="text-[11px] text-[#8e98ac] dark:text-[#8995aa]">Credits are shown at checkout</p>
          </div>
          <ChevronRight className="h-5 w-5 text-[#2877e9]" />
        </div>
      </div>
    </div>
  );
}
