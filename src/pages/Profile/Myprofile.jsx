import React, { useEffect, useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router";
import {
  collection,
  getDocs,
  getFirestore,
  query,
  updateDoc,
  where,
} from "firebase/firestore";
import { Modal, toast } from "@heroui/react";
import {
  PencilLine,
  Check,
  Crown,
  ChevronRight,
  Sun,
  Globe2,
  CircleHelp,
  Users,
  MessageSquare,
  LockKeyhole,
  Star,
  UserRoundX,
  LogOut,
} from "lucide-react";
import { COLLECTIONS } from "../../collections";
import { getUser, setUser } from "../../utils/authStorage";
import { useAuth } from "../../Auth/AuthContext";
import { useSelectedCompany } from "../../Context/SelectedCompanyContext";
import { useGeneralData } from "../../Context/GeneralContext";
import { useAppLanguage } from "../../i18n/AppLanguageContext";
import {
  getMlmProfileFromStorage,
  MLM_PROFILE_CHANGED_EVENT,
} from "../../utils/companyStorage";
import {
  BANNER_SETTINGS_PATH,
  createBannerSettingsNavigationState,
} from "../../utils/bannerSettingsNavigation";
import ReferCard, { ReferEarnPage } from "./ReferCard";
import {
  ChangePinPage,
  CustomerCarePage,
  DeleteAccountPage,
  FeedbackPage,
  LanguagePage,
} from "./ProfileSubpages";

const hasCompanyProfile = (profile) =>
  !!(
    profile &&
    (profile.id || profile.companyId || profile.fullName || profile.mobile)
  );

const formatProfileName = (value) =>
  String(value || "").replace(/^([A-Za-z]+)\.(?=\S)/, "$1. ").trim();

const SUPPORT_PHONE = "+919341947815";

const formatMobile = (value) => {
  const raw = String(value || "").trim();
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 10) return `+91 ${digits}`;
  if (digits.length === 12 && digits.startsWith("91")) {
    return `+91 ${digits.slice(2)}`;
  }
  return raw;
};

function Toggle({ checked, onChange }) {
  return (
    <span
      role="switch"
      aria-checked={checked}
      onClick={(event) => { event.stopPropagation(); onChange?.(); }}
      className={`relative block h-8 w-12 rounded-full transition-colors ${checked ? "bg-[#2877e9]" : "bg-[#d8dde8]"}`}
    >
      <span className={`absolute top-1 h-6 w-6 rounded-full bg-white shadow-sm transition-transform ${checked ? "translate-x-5" : "translate-x-1"}`} />
    </span>
  );
}

function MainRow({ icon: Icon, label, onClick, rightContent, danger = false }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center gap-4 px-5 py-[18px] text-left active:bg-[#f7f9fc] dark:active:bg-white/[0.04] ${
        danger ? "text-[#ef2f36]" : "text-[#202634] dark:text-[#f5f7fb]"
      }`}
    >
      <Icon
        className={`h-5 w-5 flex-shrink-0 ${
          danger ? "text-[#ef2f36]" : "text-[#2877e9]"
        }`}
        strokeWidth={1.9}
      />
      <span className="flex-1 text-[15px] font-medium">{label}</span>
      {rightContent || (
        <ChevronRight
          className={`h-5 w-5 ${danger ? "text-[#ef2f36]" : "text-[#2877e9]/70"}`}
        />
      )}
    </button>
  );
}

function SectionTitle({ children }) {
  return (
    <div className="px-1 pb-2 pt-1 text-[11px] font-bold uppercase tracking-[0.08em] text-[#7d8aa2] dark:text-[#8995aa]">
      {children}
    </div>
  );
}

function MainProfileView({
  userData,
  profileData,
  selectedCompany,
  handleProfileEdit,
  editOpen,
  setEditOpen,
  newName,
  setNewName,
  loading,
  handleEditSave,
}) {
  const navigate = useNavigate();
  const location = useLocation();
  const { theme, toggleTheme } = useGeneralData();
  const { t } = useAppLanguage();

  const isCompanyProfile = hasCompanyProfile(profileData);
  const profileEditLabel = isCompanyProfile ? "Edit Profile" : "Edit Name";
  const displayName = isCompanyProfile
    ? formatProfileName(profileData.fullName || profileData.name)
    : userData?.name || "MLM LIVE User";
  const displayMobile = isCompanyProfile
    ? profileData.mobile || profileData.mobileNo
    : userData?.mobileNo || userData?.mobile;
  const displayCompanyName = isCompanyProfile
    ? profileData.companyName || selectedCompany?.name || ""
    : "";
  const designation = isCompanyProfile
    ? profileData.designation || profileData.rank || ""
    : "";
  const profileImageURL =
    (isCompanyProfile && profileData?.profileImageURLs?.[0]) ||
    userData?.photoURL ||
    userData?.photo ||
    `https://ui-avatars.com/api/?background=dbe9ff&color=1d4ed8&name=${encodeURIComponent(displayName || "User")}&bold=true`;


  return (
    <>
      <Modal
        isOpen={editOpen}
        onOpenChange={(open) => {
          if (!open) {
            setEditOpen(false);
            setNewName(userData?.name || "");
          }
        }}
      >
        <Modal.Backdrop>
          <Modal.Container placement="center">
            <Modal.Dialog className="w-full max-w-[400px]">
              <Modal.CloseTrigger className="absolute right-5 top-5 flex h-8 w-8 items-center justify-center rounded-full bg-muted/30" />
              <Modal.Body>
                <h3 className="mb-5 text-[18px] font-bold text-foreground">
                  Edit Name
                </h3>
                <label className="mb-2 ml-1 block text-[12px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Full Name
                </label>
                <input
                  type="text"
                  value={newName}
                  onChange={(event) => setNewName(event.target.value)}
                  className="h-12 w-full rounded-xl border border-border bg-background px-4 text-[15px] font-medium text-foreground outline-none focus:border-accent"
                  placeholder="Enter your name"
                  autoFocus
                />
                <div className="mt-5 flex gap-3">
                  <button
                    type="button"
                    onClick={() => setEditOpen(false)}
                    className="h-12 flex-1 rounded-xl bg-muted/30 text-[14px] font-semibold text-foreground"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleEditSave}
                    disabled={loading || !newName.trim()}
                    className="flex h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-[#2877e9] text-[14px] font-bold text-white disabled:opacity-50"
                  >
                    {loading ? (
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                    ) : (
                      <>
                        <Check className="h-4 w-4" /> Save
                      </>
                    )}
                  </button>
                </div>
              </Modal.Body>
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal>

      <div className="min-h-[100dvh] bg-[#f5f6fa] dark:bg-[#0f1420] pb-5">
        <div className="sticky top-0 z-30 overflow-hidden bg-[linear-gradient(135deg,#2F80EA_0%,#236FDE_48%,#1454C5_100%)] px-5 pb-6 pt-4 text-white shadow-[0_8px_24px_rgba(20,84,197,0.18)]">
          <div className="pointer-events-none absolute -right-12 -top-20 h-48 w-48 rounded-full bg-white/[0.08]" />
          <h1 className="relative text-[16px] font-semibold">
            {t("My Profile")}
          </h1>

          <div className="relative mt-4 flex items-center gap-4">
            <button
              type="button"
              onClick={handleProfileEdit}
              className="h-[76px] w-[76px] flex-shrink-0 overflow-hidden rounded-full border-2 border-white/45 bg-white/15"
            >
              <img
                src={profileImageURL}
                alt={displayName}
                className="h-full w-full object-contain"
              />
            </button>
            <div className=" flex-1">
              <h2 className="text-[16px]  font-bold">{displayName}</h2>
              {(designation || displayCompanyName) && (
                <p className="mt-0.5 truncate text-[12px] text-white/85">
                  {[designation, displayCompanyName].filter(Boolean).join(", ")}
                </p>
              )}
              <div className="w-full flex flex-row items-center justify-between">
                <p className="mb-5 text-[11px] text-white/70">
                  {formatMobile(displayMobile)}
                </p>
                <button
                  type="button"
                  onClick={handleProfileEdit}
                  aria-label={profileEditLabel}
                  className="flex flex-shrink-0 mt-1 ml-5 items-center gap-2 rounded-2xl bg-white dark:bg-[#171e2d] p-3 text-[10px] font-semibold text-[#2877e9]"
                >
                  <PencilLine className="h-4 w-4" />
                  {t("Edit")}
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-4 px-4 pt-6">
          {/* <button
            type="button"
            onClick={() => navigate("/subscription")}
            className="flex w-full items-center gap-4 rounded-[22px] border border-[#f0c14b]/35 bg-gradient-to-br from-[#111827] to-[#1f2a40] px-4 py-4 text-left text-white shadow-sm"
          >
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[#f7c443] text-[#111827]">
              <Crown className="h-5 w-5" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[15px] font-medium">
                {t("View available packs")}
              </span>
              <span className="mt-0.5 block text-[11px] text-white/60">
                {t("View your pack and plan details")}
              </span>
            </span>
            <ChevronRight className="h-5 w-5 text-[#f7c443]" />
          </button> */}

          {/* <ReferCard /> */}

          <div className="overflow-hidden rounded-[22px] bg-white dark:bg-[#171e2d]">
            <MainRow
              icon={Sun}
              label={t("Banner details")}
              onClick={() =>
                navigate(BANNER_SETTINGS_PATH, {
                  state: createBannerSettingsNavigationState(location),
                })
              }
            />
            <div className="ml-12 h-px bg-[#e7eaf0]" />
            <MainRow
              icon={Globe2}
              label={t("Language")}
              onClick={() => navigate("/profile/language")}
            />
            <div className="ml-12 h-px bg-[#e7eaf0]" />
            <MainRow
              icon={CircleHelp}
              label={t("Dark mode")}
              onClick={toggleTheme}
              rightContent={
                <Toggle checked={theme === "dark"} onChange={toggleTheme} />
              }
            />
          </div>

          <SectionTitle>{t("Settings & support")}</SectionTitle>

          <div className="overflow-hidden rounded-[22px] bg-white dark:bg-[#171e2d]">
            <MainRow
              icon={CircleHelp}
              label={t("Learn how to use the app")}
              onClick={() =>
                window.open(
                  "https://youtube.com/@mlmboosterapp?si=4AQiHvcR8x6CmOHX",
                  "_blank",
                )
              }
            />
            <div className="ml-12 h-px bg-[#e7eaf0] dark:bg-white/10" />
            <MainRow
              icon={Users}
              label={t("Customer care")}
              onClick={() => navigate("/profile/customer-care")}
            />
            <div className="ml-12 h-px bg-[#e7eaf0] dark:bg-white/10" />
            <MainRow
              icon={MessageSquare}
              label={t("Chat with an expert")}
              onClick={() =>
                window.open(
                  `https://wa.me/${SUPPORT_PHONE.replace(/\D/g, "")}`,
                  "_blank",
                )
              }
            />
          </div>

          <SectionTitle>{t("Security")}</SectionTitle>
          <div className="overflow-hidden rounded-[22px] bg-white dark:bg-[#171e2d]">
            <MainRow
              icon={LockKeyhole}
              label={t("Change PIN")}
              onClick={() => navigate("/profile/change-pin")}
            />
          </div>

          <SectionTitle>{t("About")}</SectionTitle>
          <div className="overflow-hidden rounded-[22px] bg-white dark:bg-[#171e2d]">
            <MainRow
              icon={Star}
              label={t("Feedback & review")}
              onClick={() => navigate("/profile/feedback")}
            />
            <div className="ml-12 h-px bg-[#e7eaf0] dark:bg-white/10" />
            <MainRow
              icon={CircleHelp}
              label={t("Privacy policy")}
              onClick={() => window.open("https://mlmlive.in/Privacy.html", "_blank")}
            />
            <div className="ml-12 h-px bg-[#e7eaf0] dark:bg-white/10" />
            <MainRow
              icon={MessageSquare}
              label={t("Terms & conditions")}
              onClick={() => window.open("https://mlmlive.in/Term.html", "_blank")}
            />
          </div>

          <SectionTitle>{t("Account")}</SectionTitle>
          <div className="overflow-hidden rounded-[22px] bg-white dark:bg-[#171e2d]">
            <MainRow
              icon={UserRoundX}
              label={t("Delete my account")}
              onClick={() => navigate("/profile/delete-account")}
              danger
            />
          </div>

          <button
            type="button"
            onClick={() => navigate("/logout")}
            className="flex h-14 w-full items-center justify-center gap-2 rounded-[18px] border border-[#ef2f36]/15 bg-[#fbecef] text-[15px] font-semibold text-[#ef2f36] active:scale-[0.99] dark:bg-[#ef2f36]/10"
          >
            <LogOut className="h-5 w-5" />
            {t("Log out securely")}
          </button>

          <p className="pb-3 pt-1 text-center text-[11px] font-bold uppercase tracking-[0.08em] text-[#8e98ac] dark:text-[#8995aa]">
            {t("Made in India")}
          </p>
        </div>
      </div>
    </>
  );
}

function Myprofile() {
  const { identity } = useAuth();
  const { selectedCompany } = useSelectedCompany();
  const navigate = useNavigate();
  const location = useLocation();
  const [userData, setUserData] = useState(null);
  const [profileData, setProfileData] = useState(() => getMlmProfileFromStorage());
  const [editOpen, setEditOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const parsed = getUser() || identity;
    if (parsed) {
      setUserData(parsed);
      setNewName(parsed.name || "");
    }
  }, [identity]);

  useEffect(() => {
    const syncProfile = () => setProfileData(getMlmProfileFromStorage());
    syncProfile();
    window.addEventListener(MLM_PROFILE_CHANGED_EVENT, syncProfile);
    return () => window.removeEventListener(MLM_PROFILE_CHANGED_EVENT, syncProfile);
  }, []);


  const handleEditSave = async () => {
    if (!newName.trim() || !userData) return;
    setLoading(true);
    try {
      const db = getFirestore();
      const q = query(collection(db, COLLECTIONS.USERS), where("mobileNo", "==", userData.mobileNo));
      const snap = await getDocs(q);
      if (!snap.empty) {
        await updateDoc(snap.docs[0].ref, { name: newName.trim() });
        const updated = { ...userData, name: newName.trim() };
        setUser(updated);
        setUserData(updated);
      }
      setEditOpen(false);
      toast.success("Name updated successfully");
    } catch {
      toast.danger("Failed to update name");
    } finally {
      setLoading(false);
    }
  };

  const isCompanyProfile = hasCompanyProfile(profileData);
  const handleProfileEdit = () => {
    if (isCompanyProfile) {
      navigate("/mlmprofile");
      return;
    }
    setNewName(userData?.name || "");
    setEditOpen(true);
  };

  if (location.pathname === "/profile/settings") return <Navigate to="/profile" replace />;
  if (location.pathname === "/profile/language") return <LanguagePage />;
  if (location.pathname === "/profile/change-pin") return <ChangePinPage />;
  if (location.pathname === "/profile/delete-account") return <DeleteAccountPage />;
  if (location.pathname === "/profile/feedback") return <FeedbackPage />;
  if (location.pathname === "/profile/customer-care") return <CustomerCarePage />;
  if (location.pathname === "/profile/refer") return <ReferEarnPage />;

  if (!userData) {
    return (
      <div className="flex h-full items-center justify-center bg-[#f5f6fa] dark:bg-[#0f1420]">
        <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-[#d9e2f1] border-t-[#2877e9]" />
      </div>
    );
  }

  return (
    <MainProfileView
      userData={userData}
      profileData={profileData}
      selectedCompany={selectedCompany}
      handleProfileEdit={handleProfileEdit}
      editOpen={editOpen}
      setEditOpen={setEditOpen}
      newName={newName}
      setNewName={setNewName}
      loading={loading}
      handleEditSave={handleEditSave}
    />
  );
}

export default Myprofile;
