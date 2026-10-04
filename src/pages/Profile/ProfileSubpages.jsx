import React, { useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router";
import {
  ArrowLeft,
  ChevronRight,
  Globe2,
  Sun,
  CircleHelp,
  Users,
  MessageSquare,
  LockKeyhole,
  Star,
  UserRoundX,
  LogOut,
  Headphones,
  Phone,
  Share2,
  Check,
} from "lucide-react";
import { toast } from "@heroui/react";
import { useAppLanguage } from "../../i18n/AppLanguageContext";
import {
  BANNER_SETTINGS_PATH,
  createBannerSettingsNavigationState,
} from "../../utils/bannerSettingsNavigation";
import { changePin, getAuthErrorMessage } from "../../services/authService";
import { getUser } from "../../utils/authStorage";
import DeleteAcc from "./utils/DeleteAcc";

const SUPPORT_PHONE = "+919341947815";
const SUPPORT_EMAIL = "help@mlmlive.in";

export function ProfileHeader({ title, onBack }) {
  return (
    <div className="relative overflow-hidden bg-[linear-gradient(135deg,#2F80EA_0%,#236FDE_48%,#1454C5_100%)] px-4 py-2.5 text-white">
      <div className="pointer-events-none absolute -right-12 -top-24 h-48 w-48 rounded-full bg-white/[0.08]" />
      <div className="relative flex items-center gap-3">
        <button
          type="button"
          onClick={onBack}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-white/15 active:scale-95"
          aria-label="Back"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-[17px] font-semibold">{title}</h1>
      </div>
    </div>
  );
}

function SettingsCard({ children, className = "" }) {
  return (
    <div className={`overflow-hidden rounded-[22px] bg-white dark:bg-[#171e2d] shadow-[0_1px_0_rgba(17,24,39,0.03)] ${className}`}>
      {children}
    </div>
  );
}

function Divider() {
  return <div className="ml-12 h-px bg-[#e7eaf0]" />;
}

function SettingsRow({ icon: Icon, label, onClick, danger = false }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center gap-4 px-5 py-[18px] text-left active:bg-[#f7f9fc] ${danger ? "text-[#ef2f36]" : "text-[#202634] dark:text-[#f5f7fb]"}`}
    >
      <Icon className={`h-5 w-5 flex-shrink-0 ${danger ? "text-[#ef2f36]" : "text-[#667085] dark:text-[#b6c0d1]"}`} strokeWidth={1.9} />
      <span className="flex-1 text-[16px] font-medium">{label}</span>
      <ChevronRight className={`h-5 w-5 ${danger ? "text-[#ef2f36]" : "text-[#98a2b3] dark:text-[#8995aa]"}`} strokeWidth={2} />
    </button>
  );
}

function SectionTitle({ children }) {
  return (
    <div className="px-4 pb-2 pt-6 text-[12px] font-bold uppercase tracking-[0.08em] text-[#8e98ac] dark:text-[#8995aa]">
      {children}
    </div>
  );
}

export function SettingsSupportPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useAppLanguage();

  return (
    <div className="min-h-[100dvh] bg-[#f5f6fa] dark:bg-[#0f1420] pb-10">
      <ProfileHeader title={t("Settings & support")} onBack={() => navigate("/profile")} />
      <div className="px-4">
        <SectionTitle>{t("SETTINGS & SUPPORT")}</SectionTitle>
        <SettingsCard>
          <SettingsRow icon={Globe2} label={t("Language")} onClick={() => navigate("/profile/language")} />
          <Divider />
          <SettingsRow
            icon={Sun}
            label={t("Banner settings")}
            onClick={() =>
              navigate(BANNER_SETTINGS_PATH, {
                state: createBannerSettingsNavigationState(location),
              })
            }
          />
          <Divider />
          <SettingsRow
            icon={CircleHelp}
            label={t("Learn how to use the app")}
            onClick={() => window.open("https://youtube.com/@mlmboosterapp?si=4AQiHvcR8x6CmOHX", "_blank")}
          />
          <Divider />
          <SettingsRow icon={Users} label={t("Customer care")} onClick={() => navigate("/profile/customer-care")} />
          <Divider />
          <SettingsRow
            icon={MessageSquare}
            label={t("Chat with an expert")}
            onClick={() => window.open(`https://wa.me/${SUPPORT_PHONE.replace(/\D/g, "")}`, "_blank")}
          />
        </SettingsCard>

        <SectionTitle>Security</SectionTitle>
        <SettingsCard>
          <SettingsRow icon={LockKeyhole} label={t("Change PIN")} onClick={() => navigate("/profile/change-pin")} />
        </SettingsCard>

        <SectionTitle>About</SectionTitle>
        <SettingsCard>
          <SettingsRow icon={Star} label={t("Feedback & review")} onClick={() => navigate("/profile/feedback")} />
          <Divider />
          <SettingsRow icon={CircleHelp} label={t("Privacy policy")} onClick={() => window.open("https://mlmlive.in/Privacy.html", "_blank")} />
          <Divider />
          <SettingsRow icon={MessageSquare} label={t("Terms & conditions")} onClick={() => window.open("https://mlmlive.in/Term.html", "_blank")} />
        </SettingsCard>

        <SectionTitle>Account</SectionTitle>
        <SettingsCard>
          <SettingsRow icon={UserRoundX} label={t("Delete my account")} onClick={() => navigate("/profile/delete-account")} danger />
        </SettingsCard>

        <button
          type="button"
          onClick={() => navigate("/logout")}
          className="mt-5 flex h-16 w-full items-center justify-center gap-3 rounded-[22px] bg-[#fbecef] text-[16px] font-semibold text-[#ef2f36] active:scale-[0.99]"
        >
          <LogOut className="h-5 w-5" />
          {t("Log out securely")}
        </button>
        <p className="pb-4 pt-7 text-center text-[13px] font-bold uppercase tracking-[0.08em] text-[#8e98ac] dark:text-[#8995aa]">
          {t("Made in India")}
        </p>
      </div>
    </div>
  );
}

export function LanguagePage() {
  const navigate = useNavigate();
  const { language, setLanguage, t, languages } = useAppLanguage();
  const [draft, setDraft] = useState(language);

  return (
    <div className="flex min-h-[100dvh] flex-col bg-[#f5f6fa] dark:bg-[#0f1420]">
      <ProfileHeader title={t("Language")} onBack={() => navigate("/profile/settings")} />
      <div className="flex-1 px-4 pt-4">
        <div className="mb-4 flex items-center gap-3 rounded-[16px] bg-[#e9f2ff] px-4 py-3 text-[12px] text-[#667085] dark:text-[#b6c0d1]">
          <Globe2 className="h-4 w-4 flex-shrink-0 text-[#2F80EA]" />
          <span>{t("The whole app changes language, including template labels.")}</span>
        </div>

        <SettingsCard>
          {languages.map((item, index) => (
            <React.Fragment key={item.code}>
              <button
                type="button"
                onClick={() => setDraft(item.code)}
                className="flex w-full items-center gap-3 px-4 py-4 text-left"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-[14px] font-medium text-[#202634] dark:text-[#f5f7fb]">{item.nativeLabel}</p>
                  <p className="mt-0.5 text-[11px] text-[#98a2b3] dark:text-[#8995aa]">{item.label}</p>
                </div>
                <span className={`flex h-6 w-6 items-center justify-center rounded-full border ${draft === item.code ? "border-[#2F80EA] bg-[#2F80EA] text-white" : "border-[#d7ddea] bg-white dark:bg-[#171e2d] text-transparent"}`}>
                  {draft === item.code && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
                </span>
              </button>
              {index < languages.length - 1 && <div className="h-px bg-[#e7eaf0]" />}
            </React.Fragment>
          ))}
        </SettingsCard>
      </div>

      <div className="sticky bottom-0 bg-white/95 dark:bg-[#171e2d]/95 px-4 pb-[calc(env(safe-area-inset-bottom)+14px)] pt-3 backdrop-blur">
        <button
          type="button"
          onClick={() => {
            setLanguage(draft);
            toast.success("Language updated");
          }}
          className="h-14 w-full rounded-[14px] bg-[#2F80EA] text-[15px] font-semibold text-white"
        >
          {t("Save language")}
        </button>
      </div>
    </div>
  );
}

const NUM_KEYS = [
  ["1", ""], ["2", "ABC"], ["3", "DEF"],
  ["4", "GHI"], ["5", "JKL"], ["6", "MNO"],
  ["7", "PQRS"], ["8", "TUV"], ["9", "WXYZ"],
  ["", ""], ["0", ""], ["back", ""],
];

function PinDots({ value }) {
  return (
    <div className="flex justify-center gap-5 py-7">
      {[0, 1, 2, 3].map((index) => (
        <span
          key={index}
          className={`h-4 w-4 rounded-full border ${index < value.length ? "border-[#2F80EA] bg-[#2F80EA]" : "border-[#d5dce8] bg-white dark:bg-[#171e2d]"}`}
        />
      ))}
    </div>
  );
}

function PinPad({ onKey, disabled }) {
  return (
    <div className="grid grid-cols-3 gap-3 px-2">
      {NUM_KEYS.map(([key, letters], index) => {
        if (!key) return <div key={index} />;
        return (
          <button
            key={index}
            type="button"
            disabled={disabled}
            onClick={() => onKey(key)}
            className="flex h-16 flex-col items-center justify-center rounded-[18px] bg-white dark:bg-[#171e2d] text-[#151a26] dark:text-[#f5f7fb] shadow-[0_8px_18px_rgba(36,42,58,0.04)] active:scale-[0.98] disabled:opacity-50"
          >
            {key === "back" ? (
              <ArrowLeft className="h-5 w-5 text-[#657084]" />
            ) : (
              <>
                <span className="text-[22px] font-medium leading-none">{key}</span>
                {letters && <span className="mt-1 text-[9px] tracking-[0.12em] text-[#98a2b3] dark:text-[#8995aa]">{letters}</span>}
              </>
            )}
          </button>
        );
      })}
    </div>
  );
}

export function ChangePinPage() {
  const navigate = useNavigate();
  const { t } = useAppLanguage();
  const [step, setStep] = useState(0);
  const [pins, setPins] = useState(["", "", ""]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const headings = [
    t("Enter your current PIN"),
    t("Enter your new PIN"),
    t("Re-enter your new PIN"),
  ];

  const submit = async (allPins) => {
    const [oldPin, newPin, confirmPin] = allPins;
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
      const user = getUser();
      if (!user?.mobileNo) throw new Error("Session expired. Please login again.");
      await changePin(user.mobileNo, oldPin, newPin);
      toast.success("PIN changed successfully");
      navigate("/logout");
    } catch (err) {
      setError(getAuthErrorMessage(err));
      setPins(["", "", ""]);
      setStep(0);
    } finally {
      setLoading(false);
    }
  };

  const onKey = (key) => {
    if (loading) return;
    if (key === "back") {
      setPins((prev) => {
        const next = [...prev];
        next[step] = next[step].slice(0, -1);
        return next;
      });
      setError("");
      return;
    }

    if (pins[step].length >= 4) return;
    const value = pins[step] + key;
    const nextPins = [...pins];
    nextPins[step] = value;
    setPins(nextPins);
    setError("");

    if (value.length === 4) {
      window.setTimeout(() => {
        if (step < 2) setStep((current) => current + 1);
        else submit(nextPins);
      }, 180);
    }
  };

  return (
    <div className="min-h-[100dvh] bg-[#f5f6fa] dark:bg-[#0f1420]">
      <ProfileHeader title={t("Change PIN")} onBack={() => navigate("/profile/settings")} />
      <div className="px-4 pt-4">
        <div className="mb-6 flex gap-1.5">
          {[0, 1, 2].map((index) => (
            <div key={index} className={`h-1 flex-1 rounded-full ${index <= step ? "bg-[#2F80EA]" : "bg-[#e6e9ef]"}`} />
          ))}
        </div>
        <h2 className="text-[22px] font-bold text-[#151a26] dark:text-[#f5f7fb]">{headings[step]}</h2>
        <p className="mt-1 max-w-[340px] text-[14px] leading-6 text-[#667085] dark:text-[#b6c0d1]">
          {t("Step")} {step + 1} {t("of")} 3. {t("We ask for this so nobody else can change it.")}
        </p>
        <PinDots value={pins[step]} />
        <button type="button" onClick={() => navigate("/forgetpin")} className="mx-auto block text-[12px] font-medium text-[#2F80EA]">
          {t("Forgot your PIN?")}
        </button>
        {error && (
          <div className="mt-4 rounded-[14px] bg-[#fff0f1] px-4 py-3 text-[12px] text-[#e5363e]">{error}</div>
        )}
        <div className="mt-44 pb-8 sm:mt-24">
          <PinPad onKey={onKey} disabled={loading} />
        </div>
      </div>
    </div>
  );
}

export function DeleteAccountPage() {
  const navigate = useNavigate();
  const { t } = useAppLanguage();
  const [reason, setReason] = useState("designs");
  const [confirmOpen, setConfirmOpen] = useState(false);

  const reasons = [
    ["unused", t("I do not use it any more")],
    ["price", t("Too expensive")],
    ["designs", t("I could not find the designs I need")],
    ["other", t("Something else")],
  ];

  return (
    <div className="flex min-h-[100dvh] flex-col bg-[#f5f6fa] dark:bg-[#0f1420]">
      <DeleteAcc show={confirmOpen} setDeleteAcc={setConfirmOpen} />
      <ProfileHeader title={t("Delete my account")} onBack={() => navigate("/profile/settings")} />
      <div className="flex-1 px-4 pt-4">
        <div className="rounded-[22px] bg-[#fae9ec] px-4 py-4 text-[#667085] dark:text-[#b6c0d1]">
          <div className="mb-2 flex items-center gap-2 text-[14px] font-semibold text-[#ef2f36]">
            <UserRoundX className="h-5 w-5" />
            {t("This cannot be undone")}
          </div>
          <ul className="space-y-2 pl-4 text-[14px] leading-5">
            <li className="list-disc">{t("Your banner details and photo are removed")}</li>
            <li className="list-disc">{t("Packs you paid for stop working and are not refunded")}</li>
            <li className="list-disc">{t("Referral credits are lost")}</li>
            <li className="list-disc">{t("Downloads already saved to your gallery stay")}</li>
          </ul>
        </div>

        <SectionTitle>{t("WHY ARE YOU LEAVING?")}</SectionTitle>
        <SettingsCard>
          {reasons.map(([key, label], index) => (
            <React.Fragment key={key}>
              <button type="button" onClick={() => setReason(key)} className="flex w-full items-center gap-3 px-4 py-4 text-left">
                <span className={`flex h-6 w-6 items-center justify-center rounded-full border ${reason === key ? "border-[#2F80EA] bg-[#2F80EA] text-white" : "border-[#d7ddea] bg-white dark:bg-[#171e2d]"}`}>
                  {reason === key && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
                </span>
                <span className="text-[14px] text-[#202634] dark:text-[#f5f7fb]">{label}</span>
              </button>
              {index < reasons.length - 1 && <div className="h-px bg-[#e7eaf0]" />}
            </React.Fragment>
          ))}
        </SettingsCard>

        <button
          type="button"
          onClick={() => navigate("/profile/customer-care")}
          className="mt-4 flex w-full items-center gap-3 rounded-[20px] bg-[#e8f2ff] px-4 py-4 text-left"
        >
          <Headphones className="h-5 w-5 text-[#2F80EA]" />
          <div className="flex-1">
            <p className="text-[14px] font-medium text-[#202634] dark:text-[#f5f7fb]">{t("Let us try to fix it first")}</p>
            <p className="text-[11px] text-[#667085] dark:text-[#b6c0d1]">{t("Most problems are sorted in one call")}</p>
          </div>
          <ChevronRight className="h-5 w-5 text-[#2F80EA]" />
        </button>
      </div>

      <div className="sticky bottom-0 space-y-2 bg-white/95 dark:bg-[#171e2d]/95 px-4 pb-[calc(env(safe-area-inset-bottom)+14px)] pt-3 backdrop-blur">
        <button type="button" onClick={() => setConfirmOpen(true)} className="h-14 w-full rounded-[14px] bg-[#ef2f36] text-[15px] font-semibold text-white">
          {t("Delete my account")}
        </button>
        <button type="button" onClick={() => navigate("/profile")} className="h-12 w-full rounded-[14px] border border-[#cbd3e2] bg-white dark:bg-[#171e2d] text-[14px] font-semibold text-[#202634] dark:text-[#f5f7fb]">
          {t("Keep my account")}
        </button>
      </div>
    </div>
  );
}

export function FeedbackPage() {
  const navigate = useNavigate();
  const { t } = useAppLanguage();
  const [rating, setRating] = useState(4);
  const [tags, setTags] = useState(["designs", "speed"]);
  const [message, setMessage] = useState("");
  const options = [
    ["designs", t("The designs")],
    ["easy", t("Easy to use")],
    ["speed", t("Speed")],
    ["support", t("Support")],
    ["variety", t("Variety")],
  ];

  const toggleTag = (key) => {
    setTags((prev) => prev.includes(key) ? prev.filter((item) => item !== key) : [...prev, key]);
  };

  const submit = () => {
    try {
      localStorage.setItem("mlmlive.feedback.last", JSON.stringify({ rating, tags, message, at: Date.now() }));
    } catch {}
    toast.success("Thanks for your feedback");
  };

  return (
    <div className="flex min-h-[100dvh] flex-col bg-[#f5f6fa] dark:bg-[#0f1420]">
      <ProfileHeader title={t("Feedback & review")} onBack={() => navigate("/profile/settings")} />
      <div className="flex-1 px-6 pt-5 text-center">
        <h2 className="text-[22px] font-bold text-[#151a26] dark:text-[#f5f7fb]">{t("How is MLM LIVE working for you?")}</h2>
        <p className="mt-1 text-[14px] leading-5 text-[#667085] dark:text-[#b6c0d1]">{t("Your answer goes straight to the team, not to the Play Store.")}</p>

        <div className="my-8 flex justify-center gap-4">
          {[1, 2, 3, 4, 5].map((value) => (
            <button key={value} type="button" onClick={() => setRating(value)} aria-label={`${value} stars`}>
              <Star className={`h-8 w-8 ${value <= rating ? "fill-[#f8c141] text-[#f8c141]" : "text-[#dce3ef]"}`} strokeWidth={1.5} />
            </button>
          ))}
        </div>

        <div className="text-left">
          <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.08em] text-[#8e98ac] dark:text-[#8995aa]">{t("WHAT STOOD OUT?")}</p>
          <div className="flex flex-wrap gap-2">
            {options.map(([key, label]) => {
              const active = tags.includes(key);
              return (
                <button key={key} type="button" onClick={() => toggleTag(key)} className={`rounded-full border px-4 py-2 text-[12px] font-medium ${active ? "border-[#2F80EA] bg-[#2F80EA] text-white" : "border-[#d7ddeb] bg-white dark:bg-[#171e2d] text-[#667085] dark:text-[#b6c0d1]"}`}>
                  {label}
                </button>
              );
            })}
          </div>

          <textarea
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            placeholder={t("Anything we should fix or add? (optional)")}
            className="mt-5 h-28 w-full resize-none rounded-[18px] border border-[#d7ddeb] bg-white dark:bg-[#171e2d] p-4 text-[14px] text-[#202634] dark:text-[#f5f7fb] outline-none focus:border-[#2F80EA]"
          />
        </div>
      </div>

      <div className="sticky bottom-0 bg-white/95 dark:bg-[#171e2d]/95 px-6 pb-[calc(env(safe-area-inset-bottom)+12px)] pt-3 backdrop-blur">
        <button type="button" onClick={submit} className="h-14 w-full rounded-[14px] bg-[#2F80EA] text-[15px] font-semibold text-white">
          {t("Send feedback")}
        </button>
        <button type="button" onClick={() => window.open("https://play.google.com/store", "_blank")} className="mt-2 w-full text-center text-[11px] text-[#2F80EA]">
          {t("Happy with the app? Rate us on the Play Store")}
        </button>
      </div>
    </div>
  );
}

export function CustomerCarePage() {
  const navigate = useNavigate();
  const { t } = useAppLanguage();
  const questions = [
    "My photo is not showing on the banner",
    "I paid but the pack is still locked",
    "How do I change my mobile number?",
    "The download is blurry",
  ];

  const contactRows = useMemo(() => [
    {
      icon: Phone,
      title: t("Call us"),
      value: SUPPORT_PHONE.replace("+91", "+91 "),
      subtitle: t("Fastest for account and payment issues"),
      action: () => window.open(`tel:${SUPPORT_PHONE}`),
    },
    {
      icon: MessageSquare,
      title: t("WhatsApp us"),
      value: t("Usually replies in 15 minutes"),
      subtitle: t("Send a screenshot of the problem"),
      action: () => window.open(`https://wa.me/${SUPPORT_PHONE.replace(/\D/g, "")}`, "_blank"),
    },
    {
      icon: Share2,
      title: t("Email us"),
      value: SUPPORT_EMAIL,
      subtitle: t("For anything that needs a document"),
      action: () => window.open(`mailto:${SUPPORT_EMAIL}`),
    },
  ], [t]);

  return (
    <div className="min-h-[100dvh] bg-[#f5f6fa] dark:bg-[#0f1420] pb-10">
      <ProfileHeader title={t("Customer care")} onBack={() => navigate("/profile/settings")} />
      <div className="px-4 pt-4">
        <div className="mb-4 flex items-center gap-2 rounded-[16px] bg-[#dff3ec] px-4 py-3 text-[11px] text-[#667085] dark:text-[#b6c0d1]">
          <span className="h-2 w-2 rounded-full bg-[#28ad72]" />
          {t("We're open now · 10:00 am to 7:00 pm, Monday to Saturday")}
        </div>

        <div className="space-y-3">
          {contactRows.map(({ icon: Icon, title, value, subtitle, action }) => (
            <button key={title} type="button" onClick={action} className="flex w-full items-center gap-4 rounded-[20px] bg-white dark:bg-[#171e2d] p-4 text-left shadow-[0_5px_16px_rgba(31,41,55,0.03)]">
              <span className="flex h-12 w-12 items-center justify-center rounded-[14px] bg-[#e8f2ff] text-[#2F80EA]">
                <Icon className="h-5 w-5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[14px] font-semibold text-[#202634] dark:text-[#f5f7fb]">{title}</span>
                <span className="mt-0.5 block text-[12px] font-medium text-[#2F80EA]">{value}</span>
                <span className="mt-0.5 block text-[11px] text-[#8e98ac] dark:text-[#8995aa]">{subtitle}</span>
              </span>
              <ChevronRight className="h-5 w-5 text-[#98a2b3] dark:text-[#8995aa]" />
            </button>
          ))}
        </div>

        <SectionTitle>{t("COMMON QUESTIONS")}</SectionTitle>
        <SettingsCard>
          {questions.map((question, index) => (
            <React.Fragment key={question}>
              <button type="button" onClick={() => window.open(`https://wa.me/${SUPPORT_PHONE.replace(/\D/g, "")}?text=${encodeURIComponent(question)}`, "_blank")} className="flex w-full items-center gap-3 px-4 py-4 text-left">
                <CircleHelp className="h-4 w-4 flex-shrink-0 text-[#667085] dark:text-[#b6c0d1]" />
                <span className="flex-1 text-[14px] text-[#202634] dark:text-[#f5f7fb]">{t(question)}</span>
                <ChevronRight className="h-5 w-5 text-[#98a2b3] dark:text-[#8995aa]" />
              </button>
              {index < questions.length - 1 && <div className="h-px bg-[#e7eaf0]" />}
            </React.Fragment>
          ))}
        </SettingsCard>
      </div>
    </div>
  );
}
