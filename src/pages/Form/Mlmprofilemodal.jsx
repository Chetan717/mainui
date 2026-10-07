import { useState, useRef, useEffect, useCallback } from "react";
import { getUser as _getAuthUser } from "../../utils/authStorage";
import { db, app } from "@firebase-config";
import {
  collection,
  addDoc,
  updateDoc,
  doc,
  serverTimestamp,
  query,
  where,
  getDocs,
} from "firebase/firestore";
import {
  getStorage,
  ref as storageRef,
  uploadBytes,
  getDownloadURL,
  deleteObject,
} from "firebase/storage";
import { convertToWebP } from "../../lib/convertToWebP";
import {
  IMAGE_MAX_SIZE_BYTES,
  IMAGE_SIZE_LIMIT_MESSAGE,
} from "../../lib/fileValidation";
import MultiImagePicker from "./MultiImagePicker";
import { ImageEditorCanvas } from "./ImageEditorCanvas";
import { toast, Button } from "@heroui/react";
import { useNavigate, useLocation } from "react-router";
import photoupload from "./photoupload.png";
import { COLLECTIONS } from "../../collections";
import { saveMlmProfileToStorage } from "../../utils/companyStorage";
import { useSelectedCompany } from "../../Context/SelectedCompanyContext";
import { PAGE_REFRESH_EVENT } from "../../utils/pageRefresh";
import RemoveBgLoadingOverlay from "../mainform/components/RemoveBgLoadingOverlay";
import { getBannerSettingsReturn } from "../../utils/bannerSettingsNavigation";
import { syncRemovedProfileTopuplinesToLocalForm } from "../../utils/topuplineStorageSync";
import { canChangeCompanyBeforeProfile } from "../../utils/companyChangePolicy";
import {
  getProfileCompanyIdentity,
  getSelectedCompanyIdentity,
  hasCompleteCompanyIdentity,
  selectPreferredMlmProfile,
} from "../../utils/mlmProfileCompanyIdentity";
import { invalidateVerifiedMlmProfileCache } from "../../utils/mlmProfileVerification";
import { createProfileDeletedNavigationState } from "../../utils/profileDeletionNavigation";
const storage = getStorage(app);

// Background removal — shared utility (GPU-accelerated, edge cleanup included).
import {
  preloadBgModel,
  removeBg as removeBackground,
} from "../mainform/utils/removeBg";

// ════════════════════════════════════════════════════════════
// SOCIAL ICONS
// ════════════════════════════════════════════════════════════
const SocialIcon = ({ name, active }) => {
  const icons = {
    Facebook: (
      <svg
        viewBox="0 0 24 24"
        fill={active ? "#fff" : "#1877F2"}
        className="w-6 h-6"
      >
        <path d="M22 12a10 10 0 1 0-11.56 9.87V14.89h-2.9V12h2.9v-1.8c0-2.87 1.7-4.45 4.32-4.45 1.25 0 2.56.22 2.56.22v2.82h-1.44c-1.42 0-1.86.88-1.86 1.79V12h3.17l-.5 2.89h-2.67v6.98A10 10 0 0 0 22 12z" />
      </svg>
    ),
    Instagram: (
      <svg viewBox="0 0 24 24" className="w-6 h-6">
        <defs>
          <linearGradient id="ig-grad" x1="0%" y1="100%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={active ? "#fff" : "#f09433"} />
            <stop offset="50%" stopColor={active ? "#fff" : "#e6683c"} />
            <stop offset="100%" stopColor={active ? "#fff" : "#bc1888"} />
          </linearGradient>
        </defs>
        <path
          fill="url(#ig-grad)"
          d="M12 2.163c3.204 0 3.584.012 4.85.07 1.17.053 1.805.249 2.227.415.562.217.96.477 1.382.896.419.42.679.819.896 1.381.164.422.36 1.057.413 2.227.058 1.265.07 1.645.07 4.849s-.012 3.584-.07 4.85c-.053 1.17-.249 1.805-.413 2.227-.217.562-.477.96-.896 1.382-.42.419-.82.679-1.382.896-.422.164-1.057.36-2.227.413-1.265.058-1.645.07-4.85.07s-3.584-.012-4.849-.07c-1.17-.053-1.805-.249-2.227-.413a3.7 3.7 0 0 1-1.381-.896 3.7 3.7 0 0 1-.896-1.382c-.164-.422-.36-1.057-.413-2.227C2.175 15.584 2.163 15.204 2.163 12s.012-3.584.07-4.849c.053-1.17.249-1.805.413-2.227a3.7 3.7 0 0 1 .896-1.382 3.7 3.7 0 0 1 1.381-.896c.422-.164 1.057-.36 2.227-.413C8.416 2.175 8.796 2.163 12 2.163zM12 0C8.741 0 8.332.014 7.052.072c-1.28.058-2.155.261-2.918.558a5.9 5.9 0 0 0-2.126 1.384A5.9 5.9 0 0 0 .63 4.134C.333 4.897.13 5.772.072 7.052.014 8.332 0 8.741 0 12c0 3.259.014 3.668.072 4.948.058 1.28.261 2.155.558 2.918a5.9 5.9 0 0 0 1.384 2.126 5.9 5.9 0 0 0 2.126 1.384c.763.297 1.638.5 2.918.558C8.332 23.986 8.741 24 12 24s3.668-.014 4.948-.072c1.28-.058 2.155-.261 2.918-.558a5.9 5.9 0 0 0 2.126-1.384 5.9 5.9 0 0 0 1.384-2.126c.297-.763.5-1.638.558-2.918.058-1.28.072-1.689.072-4.948s-.014-3.668-.072-4.948c-.058-1.28-.261-2.155-.558-2.918a5.9 5.9 0 0 0-1.384-2.126A5.9 5.9 0 0 0 19.866.63C19.103.333 18.228.13 16.948.072 15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z"
        />
      </svg>
    ),
    Youtube: (
      <svg
        viewBox="0 0 24 24"
        fill={active ? "#fff" : "#FF0000"}
        className="w-6 h-6"
      >
        <path d="M23.495 6.205a3.007 3.007 0 0 0-2.088-2.088c-1.87-.501-9.396-.501-9.396-.501s-7.507-.01-9.396.501A3.007 3.007 0 0 0 .527 6.205a31.247 31.247 0 0 0-.522 5.805 31.247 31.247 0 0 0 .522 5.783 3.007 3.007 0 0 0 2.088 2.088c1.868.502 9.396.502 9.396.502s7.506 0 9.396-.502a3.007 3.007 0 0 0 2.088-2.088 31.247 31.247 0 0 0 .5-5.783 31.247 31.247 0 0 0-.5-5.805zM9.609 15.601V8.408l6.264 3.602z" />
      </svg>
    ),
    X: (
      <svg
        viewBox="0 0 24 24"
        fill={active ? "#fff" : "#000"}
        className="w-6 h-6"
      >
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.748l7.73-8.835L2.125 2.25H8.06l4.264 5.633 5.92-5.633zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
      </svg>
    ),
  };
  return icons[name] || null;
};

// ════════════════════════════════════════════════════════════
// HELPERS
// ════════════════════════════════════════════════════════════
function getUserMlm() {
  try {
    return _getAuthUser() || {};
  } catch {
    return {};
  }
}

const SOCIAL_PLATFORMS = ["Facebook", "Instagram", "Youtube", "X"];

const normalizeLogoSelections = (value) =>
  (Array.isArray(value) ? value : []).reduce((acc, item) => {
    if (typeof item === "string" && item) {
      acc.push({ link: item, size: "" });
    } else if (item && typeof item === "object" && item.link) {
      acc.push({ link: item.link, size: item.size || "" });
    }
    return acc;
  }, []);

const initialForm = (mobile = "", signupName = "") => ({
  logoSelectedLinks: [],
  salutation: "Mr",
  name: String(signupName || "").trim(),
  mobile,
  designation: "",
  profileImageBlobs: [],
  profileImageBlobPreviews: [],
  existingProfileImageURLs: [],
  _pendingProfileBlobs: [],
  topupSelectedLinks: [],
  topupCustomFiles: [],
  socials: { Facebook: "", Instagram: "", Youtube: "", X: "" },
  socialSameId: "",
  socialSameSelected: [],
});

const getProfileFormSignature = (value) =>
  JSON.stringify({
    logoSelectedLinks: value.logoSelectedLinks || [],
    salutation: value.salutation || "",
    name: value.name || "",
    designation: value.designation || "",
    existingProfileImageURLs: value.existingProfileImageURLs || [],
    newProfileImages: (value.profileImageBlobs || []).length,
    pendingProfileImages: (value._pendingProfileBlobs || []).length,
    topupSelectedLinks: value.topupSelectedLinks || [],
    newTopupImages: (value.topupCustomFiles || []).map((item) => ({
      name: item?.file?.name || "custom-photo",
      size: item?.file?.size || 0,
      modified: item?.file?.lastModified || 0,
    })),
    socials: value.socials || {},
    socialSameId: value.socialSameId || "",
    socialSameSelected: value.socialSameSelected || [],
  });

// ════════════════════════════════════════════════════════════
// DELETE CONFIRMATION MODAL
// ════════════════════════════════════════════════════════════
function DeleteConfirmModal({ userMobile, onConfirm, onCancel, deleting }) {
  const [inputMobile, setInputMobile] = useState("");
  const isMatch = inputMobile.trim() === userMobile.trim();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
      <div className="bg-background dark:bg-zinc-900 rounded-2xl shadow-2xl w-full max-w-sm p-6 flex flex-col gap-4">
        {/* Icon + Title */}
        <div className="flex flex-col items-center gap-2 text-center">
          <div className="w-14 h-14 rounded-full bg-red-100 flex items-center justify-center">
            <svg
              className="w-7 h-7 text-red-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
              />
            </svg>
          </div>
          <h2 className="text-[17px] font-bold text-foreground">
            Delete Profile?
          </h2>
          <p className="text-[13px] text-muted-foreground leading-relaxed">
            This action is{" "}
            <span className="font-semibold text-red-500">Permanent</span> and
            cannot be undone. Your entire MLM profile will be deleted.
          </p>
        </div>

        {/* Mobile confirmation input */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[11px] font-semibold text-foreground/70 uppercase tracking-wide">
            Confirm by entering your mobile number
          </label>
          <input
            type="tel"
            placeholder="Enter Mobile Number"
            value={inputMobile}
            onChange={(e) => setInputMobile(e.target.value)}
            className={`w-full border rounded-xl px-4 py-2.5 text-sm font-mono tracking-wider focus:outline-none focus:ring-2 transition dark:bg-zinc-800 dark:text-white
              ${
                inputMobile.length > 0
                  ? isMatch
                    ? "border-green-400 focus:ring-green-300 bg-green-50"
                    : "border-red-300 dark:border-red-500/60 focus:ring-red-200 bg-red-50 dark:bg-red-500/10"
                  : "border-danger/50 focus:ring-danger/20"
              }`}
          />
          {inputMobile.length > 0 && !isMatch && (
            <p className="text-xs text-red-500">Mobile number doesn't match</p>
          )}
          {isMatch && (
            <p className="text-xs text-green-600 font-medium">
              ✓ Mobile number confirmed
            </p>
          )}
        </div>

        {/* Buttons */}
        <div className="flex gap-3 mt-1">
          <button
            type="button"
            onClick={onCancel}
            disabled={deleting}
            className="flex-1 py-2.5 rounded-xl border border-border text-foreground/80  text-sm font-medium hover:bg-muted/30 transition disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={!isMatch || deleting}
            className="flex-1 py-2.5 rounded-xl bg-red-600 text-white text-sm font-semibold hover:bg-red-700 transition disabled:opacity-40 flex items-center justify-center gap-2 shadow-md"
          >
            {deleting ? (
              <>
                <svg
                  className="animate-spin w-4 h-4"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8v8z"
                  />
                </svg>
                Deleting…
              </>
            ) : (
              <>
                <svg
                  className="w-4 h-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"
                  />
                </svg>
                Delete Profile
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

function UnsavedProfileModal({ saving, onSave, onLeave, onStay }) {
  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/45 p-4" role="dialog" aria-modal="true" aria-labelledby="unsaved-profile-title">
      <div className="w-full max-w-sm rounded-3xl bg-background border border-border shadow-2xl overflow-hidden">
        <div className="h-1.5 bg-accent" />
        <div className="p-6">
          <div className="w-12 h-12 rounded-2xl bg-accent/10 text-accent flex items-center justify-center mb-4">
            <svg width="23" height="23" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2Z" />
              <path d="M17 21v-8H7v8M7 3v5h8" />
            </svg>
          </div>

          <h2 id="unsaved-profile-title" className="text-[18px] font-extrabold text-foreground">
            Save profile information?
          </h2>
          <p className="text-[14px] font-bold text-accent mt-1">Save profile information?</p>
          <p className="text-[12px] leading-relaxed text-muted-foreground mt-3">
            You have unsaved changes. Save now so your updated details and photos appear in designs.
          </p>
          <p className="text-[12px] leading-relaxed text-muted-foreground mt-1">
            You changed some information. Save now to show the updated details and photo in your design.
          </p>

          <button
            type="button"
            onClick={onSave}
            disabled={saving}
            className="w-full mt-5 py-3 rounded-xl bg-accent text-white text-[13px] font-bold shadow-md shadow-accent/20 disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {saving && <span className="w-4 h-4 rounded-full border-2 border-white/35 border-t-white animate-spin" />}
            {saving ? "Saving…" : "Save Information"}
          </button>

          <button
            type="button"
            onClick={onLeave}
            disabled={saving}
            className="w-full mt-2 py-3 rounded-xl border border-red-200 text-red-600 bg-red-50/60 text-[13px] font-bold disabled:opacity-50"
          >
           Cancel
          </button>

          <button
            type="button"
            onClick={onStay}
            disabled={saving}
            className="w-full mt-2 py-2 text-[12px] font-semibold text-muted-foreground disabled:opacity-50"
          >
            Continue Editing 
          </button>
        </div>
      </div>
    </div>
  );
}

function ChangeCompanyConfirmModal({ onConfirm, onCancel }) {
  return (
    <div
      className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="change-company-title"
    >
      <div className="w-full max-w-sm overflow-hidden rounded-3xl border border-border bg-background shadow-2xl">
        <div className="h-1.5 bg-accent" />
        <div className="p-6">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-accent/10 text-accent">
            <svg
              className="h-6 w-6"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M7 7h11l-3-3" />
              <path d="m18 7-3 3" />
              <path d="M17 17H6l3 3" />
              <path d="m6 17 3-3" />
            </svg>
          </div>

          <h2
            id="change-company-title"
            className="text-[18px] font-extrabold text-foreground"
          >
            Change Company?
          </h2>
          <p className="mt-3 text-[12px] leading-relaxed text-muted-foreground">
            Your unsaved profile details will be cleared when you choose another
            company.
          </p>
          <p className="mt-1 text-[12px] leading-relaxed text-muted-foreground">
            Choosing another company will discard unsaved changes in this form.
          </p>

          <button
            type="button"
            onClick={onConfirm}
            className="mt-5 w-full rounded-xl bg-accent py-3 text-[13px] font-bold text-white shadow-md shadow-accent/20"
          >
            Continue to Companies
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="mt-2 w-full rounded-xl border border-border py-3 text-[13px] font-bold text-foreground"
          >
            Keep Editing
          </button>
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// PAGE COMPONENT
// ════════════════════════════════════════════════════════════
function DisplaySettings({ accent = false }) {
  const [showTopupline, setShowTopupline] = useState(
    () => localStorage.getItem("showTopuplineImages") ?? "yes",
  );
  const [showLogo, setShowLogo] = useState(
    () => localStorage.getItem("showCompanyLogo") ?? "yes",
  );
  const [showMobile, setShowMobile] = useState(
    () => localStorage.getItem("showMobileNumber") ?? "yes",
  );

  const toggleTopupline = () => {
    const next = showTopupline === "yes" ? "no" : "yes";
    setShowTopupline(next);
    localStorage.setItem("showTopuplineImages", next);
  };
  const toggleLogo = () => {
    const next = showLogo === "yes" ? "no" : "yes";
    setShowLogo(next);
    localStorage.setItem("showCompanyLogo", next);
  };
  const toggleMobile = () => {
    const next = showMobile === "yes" ? "no" : "yes";
    setShowMobile(next);
    localStorage.setItem("showMobileNumber", next);
  };

  return (
    <div className="rounded-[22px] border border-[#E8ECF3] bg-white p-4 shadow-[0_6px_20px_rgba(31,53,88,0.035)] space-y-5 dark:border-border/60 dark:bg-[#141824]">
      <label
        className={`block text-sm font-semibold ${
          accent ? "text-accent" : "text-foreground/80"
        }`}
      >
        Display Settings
      </label>

      {/* Show Topupline Images */}
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-foreground/70">
          Show Top Upline Images
        </p>
        <button
          type="button"
          role="switch"
          aria-checked={showTopupline === "yes"}
          onClick={toggleTopupline}
          className={`relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors duration-200 ${
            showTopupline === "yes" ? "bg-[#2478EA]" : "bg-[#D7DDE7] dark:bg-foreground/20"
          }`}
        >
          <span
            className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition-transform duration-200 ${
              showTopupline === "yes" ? "translate-x-[22px]" : "translate-x-0.5"
            }`}
          />
        </button>
      </div>

      {/* Show Company Logo 
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-foreground/70">
          Show Company Logo
        </p>
        <button
          type="button"
          role="switch"
          aria-checked={showLogo === "yes"}
          onClick={toggleLogo}
          className={`relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors duration-200 ${
            showLogo === "yes" ? "bg-accent" : "bg-foreground/20"
          }`}
        >
          <span
            className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition-transform duration-200 ${
              showLogo === "yes" ? "translate-x-[22px]" : "translate-x-0.5"
            }`}
          />
        </button>
      </div>*/}

      {/* Show Mobile Number 
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-foreground/70">
          Show Mobile Number
        </p>
        <button
          type="button"
          role="switch"
          aria-checked={showMobile === "yes"}
          onClick={toggleMobile}
          className={`relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors duration-200 ${
            showMobile === "yes" ? "bg-accent" : "bg-foreground/20"
          }`}
        >
          <span
            className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition-transform duration-200 ${
              showMobile === "yes" ? "translate-x-[22px]" : "translate-x-0.5"
            }`}
          />
        </button>
      </div>
*/}
    </div>
  );
}

export default function MLMProfilePage() {
  const navigate = useNavigate();
  const {
    selectedCompany: companyData,
    loading: loadingCompany,
    refreshCompany,
    deleteProfileAndCompanySelection,
  } = useSelectedCompany();
  const userMlm = getUserMlm();
  const userMobile = (userMlm.mobileNo || "").trim();
  const signupName = String(
    userMlm.name || userMlm.fullName || userMlm.displayName || "",
  ).trim();

  const [form, setForm] = useState(() => initialForm(userMobile, signupName));
  const [errors, setErrors] = useState({});
  const [step, setStep] = useState("form");
  const [editorSrc, setEditorSrc] = useState(null);
  const [editingProfileIndex, setEditingProfileIndex] = useState(null);
  const [removingBg, setRemovingBg] = useState(false);
  const [removingTopupBg, setRemovingTopupBg] = useState(false);
  const [editorContext, setEditorContext] = useState("profile");
  const [editorStage, setEditorStage] = useState("final");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [existingDocId, setExistingDocId] = useState(null);
  const [profileLookupState, setProfileLookupState] = useState("checking");
  const [showSocial, setShowSocial] = useState(() => {
    return localStorage.getItem("socialradio") ?? "yes";
  });
  const handleShowSocialChange = (val) => {
    setShowSocial(val);
    localStorage.setItem("socialradio", val);
  };
  // Delete states
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmRemovePhoto, setConfirmRemovePhoto] = useState(null);
  const [rankPickerOpen, setRankPickerOpen] = useState(false);
  const [manualRankInput, setManualRankInput] = useState("");
  const [bgProgressMsg, setBgProgressMsg] = useState("Please wait…");
  const [bgProgressPct, setBgProgressPct] = useState(0);
  const [bgDots, setBgDots] = useState("");
  const [bgPreviewUrl, setBgPreviewUrl] = useState(null);
  const [pendingNavigation, setPendingNavigation] = useState(null);
  const [showCompanyChangeConfirm, setShowCompanyChangeConfirm] = useState(false);

  const abortProfileRef = useRef(null);
  const abortTopupRef = useRef(null);
  const profileInputRef = useRef(null);
  const topupInputRef = useRef(null);
  const rankDialogRef = useRef(null);
  const originalProfileImageURLsRef = useRef([]);
  const originalTopupURLsRef = useRef([]);
  const originalAllTopupURLsRef = useRef([]);
  const existingCompanyIdentityRef = useRef({
    companyId: "",
    companyName: "",
  });
  const savedFormSignatureRef = useRef(null);
  const restoringMobileBackRef = useRef(false);
  const allowMobileBackRef = useRef(false);

  const isBgRemoving = removingBg || removingTopupBg;

  useEffect(() => {
    if (!rankPickerOpen) return undefined;

    const previousOverflow = document.body.style.overflow;
    const focusFrame = window.requestAnimationFrame(() => {
      rankDialogRef.current?.focus();
    });
    const closeRankPickerOnEscape = (event) => {
      if (event.key === "Escape") {
        setRankPickerOpen(false);
      }
    };

    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", closeRankPickerOnEscape);

    return () => {
      window.cancelAnimationFrame(focusFrame);
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", closeRankPickerOnEscape);
    };
  }, [rankPickerOpen]);

  useEffect(() => {
    if (!isBgRemoving) {
      setBgDots("");
      return;
    }
    const id = setInterval(
      () => setBgDots((d) => (d.length >= 3 ? "" : d + ".")),
      400,
    );
    return () => clearInterval(id);
  }, [isBgRemoving]);

  const isEditMode = !!existingDocId;
  const location = useLocation();
  const isSettingsMode =
    new URLSearchParams(location.search).get("mode") === "settings";

  const logos = Array.isArray(companyData?.logos) ? companyData.logos : [];
  const topuplines = Array.isArray(companyData?.topuplines)
    ? companyData.topuplines
    : [];
  const designations = Array.isArray(companyData?.profile)
    ? companyData.profile
    : [];
  const isListedRank = designations.some(
    (designation) => designation.profilename === form.designation,
  );
  const selectedCompanyName =
    companyData?.name || companyData?.companyName || "Selected Company";
  const selectedCompanyLogo =
    logos.find((logo) => typeof logo?.link === "string" && logo.link.trim())
      ?.link ||
    logos.find((logo) => typeof logo === "string" && logo.trim()) ||
    companyData?.logoURL ||
    companyData?.logoUrl ||
    "";
  const currentFormSignature = getProfileFormSignature(form);
  const hasUnsavedProfileChanges =
    savedFormSignatureRef.current !== null &&
    currentFormSignature !== savedFormSignatureRef.current;
  const canChangeCompany =
    !saving &&
    canChangeCompanyBeforeProfile({
      profileLookupState,
      existingDocId,
    });

  const goToCompanySelection = () => {
    savedFormSignatureRef.current = currentFormSignature;
    setShowCompanyChangeConfirm(false);
    navigate("/selectcomp?mode=change");
  };

  const handleChangeCompany = () => {
    if (!canChangeCompany) return;
    if (hasUnsavedProfileChanges) {
      setShowCompanyChangeConfirm(true);
      return;
    }
    goToCompanySelection();
  };

  // ── fetchProfile (extracted so it can be called after save too) ──
  const fetchProfile = useCallback(async () => {
    if (!userMobile) {
      setProfileLookupState("error");
      setLoadingProfile(false);
      return;
    }
    setLoadingProfile(true);
    setProfileLookupState("checking");
    try {
      const q = query(
        collection(db, COLLECTIONS.MLMPROFILES),
        where("mobile", "==", userMobile),
      );
      const snap = await getDocs(q);

      const data = selectPreferredMlmProfile(
        snap.docs.map((profileDoc) => ({
          ...profileDoc.data(),
          id: profileDoc.id,
        })),
      );
      if (data) {
        setExistingDocId(data.id);
        setProfileLookupState("existing");
        existingCompanyIdentityRef.current = getProfileCompanyIdentity(data);
        saveMlmProfileToStorage(data);

        const fullName = data.fullName || "";
        const dotIdx = fullName.indexOf(".");
        const salutation = dotIdx !== -1 ? fullName.slice(0, dotIdx) : "Mr";
        const name = dotIdx !== -1 ? fullName.slice(dotIdx + 1) : fullName;

        const profileImageURLs = data.profileImageURLs || [];
        originalProfileImageURLsRef.current = profileImageURLs;

        const rawTopupURLs = data.topuplineURLs || [];
        originalAllTopupURLsRef.current = rawTopupURLs;
        originalTopupURLsRef.current = rawTopupURLs.filter(
          isManuallyUploadedUrl,
        );

        setForm({
          logoSelectedLinks: normalizeLogoSelections(data.logoURLs || []),
          salutation,
          name,
          mobile: userMobile,
          designation: data.designation || "",
          profileImageBlobs: [],
          profileImageBlobPreviews: [],
          existingProfileImageURLs: profileImageURLs,
          _pendingProfileBlobs: [],
          topupSelectedLinks: data.topuplineURLs || [],
          topupCustomFiles: [],
          socials: data.socials || {
            Facebook: "",
            Instagram: "",
            Youtube: "",
            X: "",
          },
          socialSameId: "",
          socialSameSelected: [],
        });
      } else {
        setExistingDocId(null);
        setProfileLookupState("missing");
        existingCompanyIdentityRef.current = {
          companyId: "",
          companyName: "",
        };
        setForm(initialForm(userMobile, signupName));
      }
    } catch (err) {
      setProfileLookupState("error");
      existingCompanyIdentityRef.current = {
        companyId: "",
        companyName: "",
      };
      setForm(initialForm(userMobile, signupName));
    } finally {
      setLoadingProfile(false);
    }
  }, [signupName, userMobile]);

  // ── Fetch on mount ─────────────────────────────────────────
  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  useEffect(() => {
    const handlePageRefresh = (event) => {
      if (event.detail?.target !== "mlm-profile") return;
      event.detail.handled = true;

      // Never overwrite form edits silently with a server refetch.
      if (hasUnsavedProfileChanges) {
        toast.warning("Please save or discard your profile changes before refreshing.");
        event.detail?.complete?.();
        return;
      }

      Promise.all([fetchProfile(), refreshCompany()])
        .then(() => event.detail?.complete?.())
        .catch((error) => event.detail?.complete?.(error));
    };

    window.addEventListener(PAGE_REFRESH_EVENT, handlePageRefresh);
    return () => window.removeEventListener(PAGE_REFRESH_EVENT, handlePageRefresh);
  }, [fetchProfile, hasUnsavedProfileChanges, refreshCompany]);

  useEffect(() => {
    if (!loadingProfile && savedFormSignatureRef.current === null) {
      savedFormSignatureRef.current = currentFormSignature;
    }
  }, [currentFormSignature, loadingProfile]);

  useEffect(() => {
    const handleNavigationRequest = (event) => {
      if (!hasUnsavedProfileChanges) return;
      event.preventDefault();
      if (!saving) {
        setPendingNavigation(() => event.detail?.proceed || (() => navigate(-1)));
      }
    };

    const handleBeforeUnload = (event) => {
      if (!hasUnsavedProfileChanges) return;
      event.preventDefault();
      event.returnValue = "";
    };

    // Mobile browsers and some native WebViews call history.back() directly
    // instead of dispatching the app's webviewBackPressed event. Capture the
    // popstate before React Router handles it, restore this page, and ask the
    // user whether the unsaved profile should be saved or discarded.
    const handleMobileHistoryBack = (event) => {
      if (allowMobileBackRef.current) {
        allowMobileBackRef.current = false;
        return;
      }

      if (restoringMobileBackRef.current) {
        event.stopImmediatePropagation();
        restoringMobileBackRef.current = false;
        return;
      }

      if (!hasUnsavedProfileChanges) return;

      event.preventDefault();
      event.stopImmediatePropagation();
      restoringMobileBackRef.current = true;
      window.history.forward();

      setPendingNavigation(() => () => {
        allowMobileBackRef.current = true;
        window.history.back();
      });
    };

    window.addEventListener("mlmProfileNavigationRequest", handleNavigationRequest);
    window.addEventListener("beforeunload", handleBeforeUnload);
    window.addEventListener("popstate", handleMobileHistoryBack, true);
    return () => {
      window.removeEventListener("mlmProfileNavigationRequest", handleNavigationRequest);
      window.removeEventListener("beforeunload", handleBeforeUnload);
      window.removeEventListener("popstate", handleMobileHistoryBack, true);
    };
  }, [hasUnsavedProfileChanges, navigate, saving]);

  const setField = (key, val) => setForm((f) => ({ ...f, [key]: val }));
  const clearError = (key) =>
    setErrors((prev) => ({ ...prev, [key]: undefined }));

  const openRankPicker = () => {
    setManualRankInput(isListedRank ? "" : form.designation);
    setRankPickerOpen(true);
  };

  const selectManualRank = () => {
    const rank = manualRankInput.trim();
    if (!rank) return;

    setField("designation", rank);
    clearError("designation");
    setRankPickerOpen(false);
  };

  const selectListedRank = (rank) => {
    setField("designation", rank);
    clearError("designation");
    setRankPickerOpen(false);
  };

  // ── Logo ───────────────────────────────────────────────────
  const handleLogoToggleLink = (link, size = "") =>
    setForm((f) => {
      const alreadySelected = f.logoSelectedLinks.some(
        (item) => item?.link === link,
      );

      return {
        ...f,
        logoSelectedLinks: alreadySelected
          ? f.logoSelectedLinks.filter((item) => item?.link !== link)
          : [...f.logoSelectedLinks, { link, size }],
      };
    });

  // ── Topupline ──────────────────────────────────────────────
  const handleTopupToggleLink = (link) =>
    setForm((f) => ({
      ...f,
      topupSelectedLinks: f.topupSelectedLinks.includes(link)
        ? f.topupSelectedLinks.filter((l) => l !== link)
        : [...f.topupSelectedLinks, link],
    }));

  const handleTopupAddCustomFiles = (files) => {
    if (!files.length) return;
    void preloadBgModel().catch(() => {
      // The processing step will retry or use the bundled fallback.
    });
    setEditorSrc(URL.createObjectURL(files[0]));
    setEditorContext("topup");
    setEditorStage("initial");
    setStep("editor");
  };

  const _addTopupBlob = (blob) => {
    const file = new File([blob], "topup.png", { type: "image/png" });
    setForm((f) => ({
      ...f,
      topupCustomFiles: [
        ...f.topupCustomFiles,
        { file, previewURL: URL.createObjectURL(blob) },
      ],
    }));
  };

  const cancelTopupBg = () => {
    if (abortTopupRef.current) {
      abortTopupRef.current.abort();
      abortTopupRef.current = null;
    }
    setRemovingTopupBg(false);
    setBgProgressMsg("Please wait…");
    setBgProgressPct(0);
    setBgPreviewUrl(null);
    setEditorSrc(null);
    setEditorStage("final");
    setStep("form");
    toast("Background removal cancelled.");
  };

  const processTopupFile = async (file) => {
    const previewUrl = URL.createObjectURL(file);
    setBgPreviewUrl(previewUrl);
    setRemovingTopupBg(true);
    setBgProgressMsg("AI is preparing your photo…");
    setBgProgressPct(0);
    const controller = new AbortController();
    abortTopupRef.current = controller;
    try {
      let blob = await removeBackground(
        file,
        (stage, pct) => {
          setBgProgressMsg(stage);
          setBgProgressPct(pct);
        },
        controller.signal,
      );
      if (controller.signal.aborted) return;
      toast.success("Background removed successfully! ✨");
      setEditorSrc(URL.createObjectURL(blob));
      setEditorContext("topup");
      setEditorStage("final");
      setStep("editor");
      toast("Adjust the final crop, then tap Done.");
    } catch (err) {
      if (err?.name === "AbortError" || controller.signal.aborted) return;
      
      console.error("[removeBg] Top-up image processing failed:", err, err?.cause);
      setEditorSrc(null);
      setEditorStage("final");
      setStep("form");
      toast.danger(
        "Background removal could not start. Please select the photo again and retry.",
      );
    } finally {
      abortTopupRef.current = null;
      setRemovingTopupBg(false);
      setBgProgressMsg("Please wait…");
      setBgProgressPct(0);
      setBgPreviewUrl(null);
      URL.revokeObjectURL(previewUrl);
    }
  };

  const handleTopupRemoveCustomFile = (index) =>
    setForm((f) => ({
      ...f,
      topupCustomFiles: f.topupCustomFiles.filter((_, i) => i !== index),
    }));

  const MAX_PROFILE_PHOTOS = 5;

  // ── Profile photo ──────────────────────────────────────────
  const handleProfileFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    e.target.value = "";

    const allCount =
      form.existingProfileImageURLs.length + form.profileImageBlobs.length;
    if (allCount >= MAX_PROFILE_PHOTOS) {
      toast.danger(
        `You can upload a maximum of ${MAX_PROFILE_PHOTOS} profile photos.`,
      );
      return;
    }

    const allowed = ["image/jpeg", "image/png"];
    const ext = file.name.split(".").pop()?.toLowerCase();
    if (
      !allowed.includes(file.type) &&
      ext !== "jpg" &&
      ext !== "jpeg" &&
      ext !== "png"
    ) {
      toast.danger("Only JPG and PNG images are allowed.");
      return;
    }
    if (file.size > IMAGE_MAX_SIZE_BYTES) {
      toast.danger(IMAGE_SIZE_LIMIT_MESSAGE);
      return;
    }

    void preloadBgModel().catch(() => {
      // The processing step will retry or use the bundled fallback.
    });

    setEditorSrc(URL.createObjectURL(file));
    setEditingProfileIndex("new");
    setEditorContext("profile");
    setEditorStage("initial");
    setStep("editor");
  };

  const cancelProfileBg = () => {
    if (abortProfileRef.current) {
      abortProfileRef.current.abort();
      abortProfileRef.current = null;
    }
    setRemovingBg(false);
    setBgProgressMsg("Please wait…");
    setBgProgressPct(0);
    setBgPreviewUrl(null);
    setEditorSrc(null);
    setEditingProfileIndex(null);
    setEditorStage("final");
    setStep("form");
    toast("Background removal cancelled.");
  };

  const processProfileFile = async (file) => {
    const previewUrl = URL.createObjectURL(file);
    setBgPreviewUrl(previewUrl);
    setRemovingBg(true);
    setBgProgressMsg("AI is preparing your photo…");
    setBgProgressPct(0);
    const controller = new AbortController();
    abortProfileRef.current = controller;
    try {
      let blob = await removeBackground(
        file,
        (stage, pct) => {
          setBgProgressMsg(stage);
          setBgProgressPct(pct);
        },
        controller.signal,
      );
      if (controller.signal.aborted) return;
      toast.success("Background removed successfully! ✨");
      setEditorSrc(URL.createObjectURL(blob));
      setEditingProfileIndex("new");
      setForm((f) => ({ ...f, _pendingProfileBlobs: [] }));
      setEditorContext("profile");
      setEditorStage("final");
      setStep("editor");
      toast("Adjust the final crop, then tap Done.");
    } catch (err) {
      if (err?.name === "AbortError" || controller.signal.aborted) return;
      
      console.error("[removeBg] Profile image processing failed:", err, err?.cause);
      setEditorSrc(null);
      setEditingProfileIndex(null);
      setEditorStage("final");
      setStep("form");
      toast.danger(
        "Background removal could not start. Please select the photo again and retry.",
      );
    } finally {
      abortProfileRef.current = null;
      setRemovingBg(false);
      setBgProgressMsg("Please wait…");
      setBgProgressPct(0);
      setBgPreviewUrl(null);
      URL.revokeObjectURL(previewUrl);
    }
  };

  const handleEditorDone = (blob) => {
    if (editorStage === "initial" && editorContext === "topup") {
      processTopupFile(blob);
      return;
    }
    if (editorStage === "initial" && editorContext === "profile") {
      processProfileFile(blob);
      return;
    }
    if (editorContext === "logo") {
      setStep("form");
      setEditorSrc(null);
      setEditorStage("final");
      return;
    }
    if (editorContext === "topup") {
      _addTopupBlob(blob);
      setStep("form");
      setEditorSrc(null);
      setEditorStage("final");
      return;
    }
    clearError("profileImage");
    setForm((f) => {
      if (editingProfileIndex === "new") {
        const pending = f._pendingProfileBlobs || [];
        const newBlobs = [blob, ...pending];
        const newPreviews = newBlobs.map((b) => URL.createObjectURL(b));
        return {
          ...f,
          profileImageBlobs: [...f.profileImageBlobs, ...newBlobs],
          profileImageBlobPreviews: [
            ...f.profileImageBlobPreviews,
            ...newPreviews,
          ],
          _pendingProfileBlobs: [],
        };
      } else if (typeof editingProfileIndex === "number") {
        const existingCount = f.existingProfileImageURLs.length;
        if (editingProfileIndex < existingCount) {
          const urls = [...f.existingProfileImageURLs];
          urls.splice(editingProfileIndex, 1);
          return {
            ...f,
            existingProfileImageURLs: urls,
            profileImageBlobs: [...f.profileImageBlobs, blob],
            profileImageBlobPreviews: [
              ...f.profileImageBlobPreviews,
              URL.createObjectURL(blob),
            ],
          };
        } else {
          const blobIdx = editingProfileIndex - existingCount;
          const blobs = [...f.profileImageBlobs];
          const previews = [...f.profileImageBlobPreviews];
          blobs[blobIdx] = blob;
          previews[blobIdx] = URL.createObjectURL(blob);
          return {
            ...f,
            profileImageBlobs: blobs,
            profileImageBlobPreviews: previews,
          };
        }
      }
      return f;
    });
    setEditingProfileIndex(null);
    setStep("form");
    setEditorSrc(null);
    setEditorStage("final");
  };

  const handleRemoveProfileImage = (combinedIdx) => {
    setForm((f) => {
      const existingCount = f.existingProfileImageURLs.length;
      if (combinedIdx < existingCount) {
        return {
          ...f,
          existingProfileImageURLs: f.existingProfileImageURLs.filter(
            (_, i) => i !== combinedIdx,
          ),
        };
      }
      const blobIdx = combinedIdx - existingCount;
      return {
        ...f,
        profileImageBlobs: f.profileImageBlobs.filter((_, i) => i !== blobIdx),
        profileImageBlobPreviews: f.profileImageBlobPreviews.filter(
          (_, i) => i !== blobIdx,
        ),
      };
    });
  };

  const handleEditProfileImage = async (combinedIdx) => {
    const existingCount = form.existingProfileImageURLs.length;
    if (combinedIdx < existingCount) {
      setRemovingBg(true);
      try {
        const res = await fetch(form.existingProfileImageURLs[combinedIdx]);
        if (!res.ok) throw new Error("Fetch failed");
        const blob = await res.blob();
        const blobURL = URL.createObjectURL(blob);
        setEditingProfileIndex(combinedIdx);
        setEditorSrc(blobURL);
        setEditorContext("profile");
        setEditorStage("final");
        setStep("editor");
      } catch (err) {
        
      } finally {
        setRemovingBg(false);
      }
    } else {
      const blobIdx = combinedIdx - existingCount;
      const blobURL = form.profileImageBlobPreviews[blobIdx];
      setEditingProfileIndex(combinedIdx);
      setEditorSrc(blobURL);
      setEditorContext("profile");
      setEditorStage("final");
      setStep("editor");
    }
  };

  const allProfileImages = [
    ...form.existingProfileImageURLs.map((url) => ({ url, isExisting: true })),
    ...form.profileImageBlobPreviews.map((url) => ({ url, isExisting: false })),
  ];
  const canAddProfilePhoto =
    !removingBg && allProfileImages.length < MAX_PROFILE_PHOTOS;

  // ── Social ─────────────────────────────────────────────────
  const handleSocialSameToggle = (platform) => {
    setForm((f) => {
      const sel = f.socialSameSelected.includes(platform)
        ? f.socialSameSelected.filter((p) => p !== platform)
        : [...f.socialSameSelected, platform];
      const socials = { ...f.socials };
      sel.forEach((p) => (socials[p] = f.socialSameId));
      return { ...f, socialSameSelected: sel, socials };
    });
  };

  const handleSocialSameIdChange = (val) => {
    setForm((f) => {
      const socials = { ...f.socials };
      f.socialSameSelected.forEach((p) => (socials[p] = val));
      return { ...f, socialSameId: val, socials };
    });
  };

  // ── Validation ─────────────────────────────────────────────
  const validate = () => {
    const e = {};
    if (!form.name.trim()) e.name = "Name is required";
    if (!form.designation) {
      e.designation = "Select a rank";
    }
    const profilePhotoCount =
      form.existingProfileImageURLs.length + form.profileImageBlobs.length;
    if (profilePhotoCount < 1) {
      e.profileImage =
        "At least one profile photo is required";
    }
    if (profilePhotoCount > MAX_PROFILE_PHOTOS) {
      e.profileImage =
        `A maximum of ${MAX_PROFILE_PHOTOS} profile photos is allowed`;
    }
    setErrors(e);
    if (e.profileImage) {
      toast.danger(e.profileImage);
      window.setTimeout(() => {
        document
          .querySelector('[data-guide="profile-photo"]')
          ?.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 80);
    }
    return Object.keys(e).length === 0;
  };

  // ── Firebase helpers ───────────────────────────────────────
  const uploadFile = async (file, path) => {
    const webpBlob = await convertToWebP(file);
    const r = storageRef(storage, path.replace(/\.png$/, ".webp"));
    await uploadBytes(r, webpBlob, { contentType: "image/webp", cacheControl: "public,max-age=31536000,immutable" });
    return getDownloadURL(r);
  };

  const uploadBlob = async (blob, path) => {
    const webpBlob = await convertToWebP(blob);
    const r = storageRef(storage, path.replace(/\.png$/, ".webp"));
    await uploadBytes(r, webpBlob, { contentType: "image/webp", cacheControl: "public,max-age=31536000,immutable" });
    return getDownloadURL(r);
  };

  function getStoragePathFromUrl(url) {
    try {
      const match = url.match(/\/o\/([^?]+)/);
      if (!match) return null;
      return decodeURIComponent(match[1]);
    } catch {
      return null;
    }
  }

  async function deleteStorageUrl(url) {
    try {
      const path = getStoragePathFromUrl(url);
      if (!path) return;
      const r = storageRef(storage, path);
      await deleteObject(r);
    } catch (err) {
      // console.warn("Could not delete storage object:", err);
    }
  }

  function isManuallyUploadedUrl(url) {
    if (!url) return false;
    const path = getStoragePathFromUrl(url);
    return !!(path && path.startsWith("mlmprofiles/"));
  }

  // ── Save ───────────────────────────────────────────────────
  const handleSave = async (afterSave = null) => {
    if (!validate()) {
      setPendingNavigation(null);
      return;
    }
    const continueAfterSave = typeof afterSave === "function" ? afterSave : null;
    setSaving(true);
    setSaveError(null);
    try {
      let companyIdentity = getSelectedCompanyIdentity(companyData);
      if (!hasCompleteCompanyIdentity(companyIdentity)) {
        const existingIdentity = existingCompanyIdentityRef.current;
        if (hasCompleteCompanyIdentity(existingIdentity)) {
          companyIdentity = existingIdentity;
        }
      }
      if (!hasCompleteCompanyIdentity(companyIdentity)) {
        let refreshedCompany = null;
        try {
          refreshedCompany = await refreshCompany();
        } catch {
          // The same validation message below is clearer than a generic save
          // failure and, importantly, no image upload/profile write has begun.
        }
        companyIdentity = getSelectedCompanyIdentity(refreshedCompany);
      }
      if (!hasCompleteCompanyIdentity(companyIdentity)) {
        const message =
          "Selected company could not be verified. Please select your company again.";
        setSaveError(message);
        toast.danger(message);
        return;
      }

      const uid = existingDocId || Date.now().toString(36);

      const allLogoURLs = form.logoSelectedLinks.map(({ link, size }) => ({
        link,
        size: size || "",
      }));

      const removedProfileImageURLs =
        originalProfileImageURLsRef.current.filter(
          (url) => !form.existingProfileImageURLs.includes(url),
        );

      const newlyUploadedProfileURLs = await Promise.all(
        form.profileImageBlobs.map((blob, i) =>
          uploadBlob(blob, `mlmprofiles/${uid}/profile_${Date.now()}_${i}.png`),
        ),
      );
      const allProfileImageURLs = [
        ...form.existingProfileImageURLs,
        ...newlyUploadedProfileURLs,
      ];

      await Promise.all(removedProfileImageURLs.map(deleteStorageUrl));
      originalProfileImageURLsRef.current = allProfileImageURLs;

      const uploadedTopupURLs = await Promise.all(
        form.topupCustomFiles.map((item, i) =>
          uploadFile(item.file, `mlmprofiles/${uid}/topup_custom_${Date.now()}_${i}.png`),
        ),
      );
      const allTopupURLs = [...form.topupSelectedLinks, ...uploadedTopupURLs];

      const currentTopupLinkSet = new Set(form.topupSelectedLinks);
      const removedManualTopupURLs = originalTopupURLsRef.current.filter(
        (url) => !currentTopupLinkSet.has(url),
      );
      await Promise.all(removedManualTopupURLs.map(deleteStorageUrl));

      const keptManualTopupURLs = form.topupSelectedLinks.filter(
        isManuallyUploadedUrl,
      );
      originalTopupURLsRef.current = [
        ...keptManualTopupURLs,
        ...uploadedTopupURLs.filter(isManuallyUploadedUrl),
      ];

      const profileData = {
        fullName: `${form.salutation}.${form.name.trim()}`,
        mobile: userMobile,
        designation: form.designation,
        logoURLs: allLogoURLs,
        profileImageURLs: allProfileImageURLs,
        topuplineURLs: allTopupURLs,
        socials: form.socials,
        companyId: companyIdentity.companyId,
        companyName: companyIdentity.companyName,
        updatedAt: serverTimestamp(),
      };

      if (isEditMode) {
        await updateDoc(
          doc(db, COLLECTIONS.MLMPROFILES, existingDocId),
          profileData,
        );
        sessionStorage.setItem(
          "mlmProfile",
          JSON.stringify({ id: existingDocId, ...profileData }),
        );
      } else {
        const newDoc = await addDoc(collection(db, COLLECTIONS.MLMPROFILES), {
          ...profileData,
          createdAt: serverTimestamp(),
        });
        sessionStorage.setItem(
          "mlmProfile",
          JSON.stringify({ id: newDoc.id, ...profileData }),
        );
      }
      invalidateVerifiedMlmProfileCache();

      // Banner Settings updates the profile, while Editor also keeps the
      // current form selection in localStorage. Remove deleted profile URLs
      // from that form copy so the canvas cannot render a stale photo after
      // returning to Editor. Additions and form-only custom images stay as-is.
      syncRemovedProfileTopuplinesToLocalForm(
        originalAllTopupURLsRef.current,
        allTopupURLs,
      );
      originalAllTopupURLsRef.current = allTopupURLs;

      toast.success(
        isEditMode
          ? "Profile updated successfully!"
          : "Profile saved successfully!",
      );

      // ✅ Re-fetch from Firestore and update state — no page reload needed
      savedFormSignatureRef.current = null;
      await fetchProfile();
      setPendingNavigation(null);

      // Navigate after save: settings → back to editor, otherwise → homepage
      if (continueAfterSave) {
        continueAfterSave();
      } else if (isSettingsMode) {
        const returnRoute = getBannerSettingsReturn(location.state);
        navigate(returnRoute.to, {
          replace: true,
          state: returnRoute.state,
        });
      } else {
        navigate("/");
      }
    } catch (err) {
      
      setSaveError("Failed to save. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  // ── Delete ─────────────────────────────────────────────────
  const handleDeleteConfirm = async () => {
    if (!existingDocId) return;
    setDeleting(true);
    try {
      await deleteProfileAndCompanySelection(existingDocId);

      toast.success("Profile deleted successfully.");
      setShowDeleteModal(false);
      navigate("/selectcomp", {
        replace: true,
        state: createProfileDeletedNavigationState(),
      });
    } catch (err) {
      
      toast.danger("Failed to delete profile. Please try again.");
    } finally {
      setDeleting(false);
    }
  };

  // ════════════════════════════════════════════════════════════
  // RENDER
  // ════════════════════════════════════════════════════════════

  // ── Editor view ────────────────────────────────────────────
  if (step === "editor" && editorSrc) {
    return (
      <>
        <div className="flex flex-col w-full h-full items-center justify-center bg-muted/20">
          <div className="w-full h-full bg-background rounded-2xl border border-border shadow-md">
            {!isBgRemoving && (
              <ImageEditorCanvas
                key={editorSrc}
                src={editorSrc}
                ratio={
                  editorContext === "logo" || editorContext === "topup"
                    ? 1
                    : 2 / 2.5
                }
                constrainToImage
                enableEnhance={
                  editorStage === "final" &&
                  (editorContext === "profile" || editorContext === "topup")
                }
                onDone={handleEditorDone}
                onCancel={() => {
                  setStep("form");
                  setEditorSrc(null);
                  setEditingProfileIndex(null);
                  setEditorStage("final");
                }}
              />
            )}
          </div>
        </div>

        {isBgRemoving && (
          <RemoveBgLoadingOverlay
            previewUrl={bgPreviewUrl}
            progressMessage={`${bgProgressMsg}${bgDots}`}
            progressPct={bgProgressPct}
            onCancel={removingTopupBg ? cancelTopupBg : cancelProfileBg}
          />
        )}
      </>
    );
  }

  // ── Loading skeleton ───────────────────────────────────────
  if (loadingProfile || loadingCompany) {
    return (
      <div className="max-w-lg mx-auto px-4 py-8 flex flex-col gap-4 animate-pulse">
        <div className="h-8 w-48 bg-muted rounded-xl" />
        {[...Array(6)].map((_, i) => (
          <div key={i} className="h-12 bg-muted/60 rounded-xl" />
        ))}
      </div>
    );
  }

  // ── Main form ──────────────────────────────────────────────
  return (
    <>
      {pendingNavigation && (
        <UnsavedProfileModal
          saving={saving}
          onSave={() => handleSave(pendingNavigation)}
          onLeave={() => {
            const proceed = pendingNavigation;
            savedFormSignatureRef.current = currentFormSignature;
            setPendingNavigation(null);
            proceed?.();
          }}
          onStay={() => setPendingNavigation(null)}
        />
      )}

      {showCompanyChangeConfirm && canChangeCompany && (
        <ChangeCompanyConfirmModal
          onConfirm={goToCompanySelection}
          onCancel={() => setShowCompanyChangeConfirm(false)}
        />
      )}

      {/* ── Confirm Remove Photo ── */}
      {confirmRemovePhoto !== null && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-xs rounded-2xl bg-background dark:bg-zinc-900 border border-border shadow-2xl p-5 flex flex-col gap-4">
            <div className="flex flex-col items-center gap-2 text-center">
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                <svg
                  className="w-6 h-6 text-red-500"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916"
                  />
                </svg>
              </div>
              <p className="text-[15px] font-bold text-foreground">
                Remove Photo?
              </p>
              <p className="text-[12px] text-muted-foreground">
                This photo will be removed from your profile.
              </p>
            </div>
            <div className="flex gap-2.5">
              <button
                type="button"
                onClick={() => setConfirmRemovePhoto(null)}
                className="flex-1 py-2.5 rounded-xl border border-border text-[13px] font-semibold text-foreground/80 hover:bg-muted/30 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  handleRemoveProfileImage(confirmRemovePhoto);
                  setConfirmRemovePhoto(null);
                }}
                className="flex-1 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-white text-[13px] font-bold transition shadow-sm"
              >
                Remove
              </button>
            </div>
          </div>
        </div>
      )}

      {rankPickerOpen && (
        <div
          className="fixed inset-0 z-[99990] flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center sm:p-4"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setRankPickerOpen(false);
            }
          }}
        >
          <div
            id="mlm-rank-picker"
            ref={rankDialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="mlm-rank-picker-title"
            tabIndex={-1}
            className="flex max-h-[85dvh] w-full max-w-md flex-col overflow-hidden rounded-t-3xl border border-border bg-background shadow-2xl outline-none sm:rounded-3xl"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="flex shrink-0 items-center justify-between border-b border-border px-4 py-3.5">
              <div>
                <h2
                  id="mlm-rank-picker-title"
                  className="text-base font-bold text-foreground"
                >
                  Select Rank
                </h2>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Enter manually or choose from the list
                </p>
              </div>
              <button
                type="button"
                aria-label="Close rank selection"
                onClick={() => setRankPickerOpen(false)}
                className="ml-3 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border text-muted-foreground transition hover:bg-muted/40 hover:text-foreground focus:outline-none focus:ring-2 focus:ring-accent/40"
              >
                <svg
                  className="h-5 w-5"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="m6 6 12 12M18 6 6 18" strokeLinecap="round" />
                </svg>
              </button>
            </div>

            <div className="flex min-h-0 flex-1 flex-col overflow-hidden p-4">
              <div className="shrink-0">
                <label
                  htmlFor="manual-rank"
                  className="mb-2 block text-[11px] font-bold text-foreground/60"
                >
                  Enter Rank Manually
                </label>
                <input
                  id="manual-rank"
                  type="text"
                  placeholder="Type your rank"
                  value={manualRankInput}
                  onChange={(event) => setManualRankInput(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      selectManualRank();
                    }
                  }}
                  maxLength={40}
                  className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent/40"
                />
                <button
                  type="button"
                  disabled={!manualRankInput.trim()}
                  onClick={selectManualRank}
                  className="mt-2.5 w-full rounded-xl bg-accent px-4 py-2.5 text-sm font-bold text-white transition hover:bg-accent/90 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Use Manual Rank
                </button>
              </div>

              <div className="my-3 flex shrink-0 items-center gap-3">
                <span className="h-px flex-1 bg-border" />
                <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Select from rank list
                </p>
                <span className="h-px flex-1 bg-border" />
              </div>

              <div
                role="listbox"
                aria-label="Rank list"
                className="max-h-[48dvh] min-h-0 overflow-y-auto overscroll-contain rounded-xl border border-border divide-y divide-border"
              >
                {designations.length > 0 ? (
                  designations.map((designation) => {
                    const selected =
                      designation.profilename === form.designation;
                    return (
                      <button
                        key={designation.id || designation.profilename}
                        type="button"
                        role="option"
                        aria-selected={selected}
                        onClick={() =>
                          selectListedRank(designation.profilename)
                        }
                        className={`flex w-full items-center justify-between gap-3 px-3.5 py-3 text-left text-sm transition ${
                          selected
                            ? "bg-accent/10 text-accent font-bold"
                            : "bg-background text-foreground hover:bg-muted/30"
                        }`}
                      >
                        <span>{designation.profilename}</span>
                        {selected && (
                          <svg
                            className="h-4 w-4 shrink-0"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2.5"
                          >
                            <path
                              d="m5 12 4 4L19 6"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        )}
                      </button>
                    );
                  })
                ) : (
                  <p className="px-3 py-4 text-center text-xs text-muted-foreground">
                    No ranks found
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <DeleteConfirmModal
          userMobile={userMobile}
          onConfirm={handleDeleteConfirm}
          onCancel={() => setShowDeleteModal(false)}
          deleting={deleting}
        />
      )}

      {/* Full-screen BG removal overlay — shared for both profile & topup */}
      {(removingBg || removingTopupBg) && (
        <RemoveBgLoadingOverlay
          previewUrl={bgPreviewUrl}
          progressMessage={`${bgProgressMsg}${bgDots}`}
          progressPct={bgProgressPct}
          onCancel={removingTopupBg ? cancelTopupBg : cancelProfileBg}
          zIndex="z-[9999]"
        />
      )}

      <div className="mlm-profile-ui min-h-full max-w-lg mx-auto bg-[#F5F7FC] px-4 py-4 dark:bg-[#0B0F19] [--accent:#2478EA]">
        {/* Page header */}
        <div className="mb-2">
          <h1 className="text-[15px] font-bold text-foreground">
            {isEditMode ? "" : "Create Profile"}
          </h1>
        </div>

        {companyData?.id && (
          <div className="mb-4 flex items-center gap-3 rounded-[22px] border border-[#E8ECF3] bg-white p-4 shadow-[0_6px_20px_rgba(31,53,88,0.035)] dark:border-border dark:bg-[#141824]">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full border border-[#E1E6EF] bg-[#0F1420] dark:border-border">
              {selectedCompanyLogo ? (
                <img
                  src={selectedCompanyLogo}
                  alt={`${selectedCompanyName} logo`}
                  className="h-full w-full object-contain p-1"
                />
              ) : (
                <span className="text-lg font-bold text-accent">
                  {selectedCompanyName.trim().charAt(0).toUpperCase() || "C"}
                </span>
              )}
            </div>
            <div className="min-w-0 flex-1">
              {/* <p className="text-[11px] font-semibold text-muted-foreground">
              Your selected company
              </p> */}
              <p className="truncate text-[15px] font-bold text-foreground">
                {selectedCompanyName}
              </p>
            </div>
            {canChangeCompany && (
              <button
                type="button"
                onClick={handleChangeCompany}
                aria-label="Change Company"
                className="ml-auto inline-flex shrink-0 flex-col items-center justify-center rounded-xl px-2 py-2 text-[10px] font-bold leading-tight text-[#0875F5] transition hover:bg-[#EAF3FF] focus:outline-none focus:ring-2 focus:ring-[#2478EA]/30"
              >
                <span>Change Company</span>
                <span className="mt-0.5 text-[10px]">Change Company</span>
              </button>
            )}
          </div>
        )}

        <div className="flex flex-col gap-4">
          {/* Settings mode: Display Settings shown first (accent heading) */}
          {isSettingsMode && <DisplaySettings accent />}

          {/* ── LOGO ──────────────────────────────────────────── */}
          {/* <div className="bg-background rounded-2xl border border-border p-4">
            <label className="block text-[11px] font-bold text-foreground/60 mb-2">
              Company Logo
            </label>
            <div className="flex flex-col gap-2">
              <MultiImagePicker
                companyImages={logos}
                selectedLinks={form.logoSelectedLinks}
                onToggleLink={handleLogoToggleLink}
                customFiles={[]}
                onAddCustomFiles={() => {}}
                onRemoveCustomFile={() => {}}
                companyGridCols={4}
                thumbHeight="h-14"
                type="Logo"
                inlineStrip
                hideUpload
              />
            </div>
          </div> */}

          {/* ── FULL NAME + MOBILE + DESIGNATION ─────────────── */}
          {!isSettingsMode && (
            <div className="rounded-[22px] border border-[#E8ECF3] bg-white p-4 shadow-[0_6px_20px_rgba(31,53,88,0.035)] dark:border-border dark:bg-[#141824]" data-guide="profile-basic">
              {/* Full Name */}
              <label className="block text-[11px] font-bold text-foreground/60 mb-2">
                Full Name <span className="text-red-500">*</span>
              </label>
              <div className="flex gap-2 mb-3">
                <select
                  value={form.salutation}
                  onChange={(e) => setField("salutation", e.target.value)}
                  className="border border-[#DDE3ED] rounded-[14px] px-3 py-2.5 text-[13px] bg-[#F1F4F9] text-foreground focus:outline-none focus:ring-2 focus:ring-accent/25 focus:border-[#2478EA] transition-all dark:border-border dark:bg-[#1A2236]"
                >
                  {["Mr", "Mrs", "Miss", "Ms", "Dr",
                    "Prof","Er",
                  ].map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
                <input
                  type="text"
                  placeholder="Enter name"
                  value={form.name}
                  onChange={(e) => {
                    setField("name", e.target.value);
                    clearError("name");
                  }}
                  max={30}
                  maxLength={30}
                  className={`flex-1 border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent/40 ${errors.name ? "border-red-400 bg-red-50 dark:bg-red-500/10" : "border-[#DDE3ED] bg-[#F1F4F9] dark:border-border dark:bg-[#1A2236]"}`}
                />
              </div>
              {errors.name && (
                <p className="text-xs text-red-500 mt-1 mb-2">{errors.name}</p>
              )}

              {/* Mobile */}
              <label className="block text-[11px] font-bold text-foreground/60 mb-2">
                Mobile Number
                {/* <span className="ml-2 text-xs font-normal text-muted-foreground/70 bg-muted/40 px-2 py-0.5 rounded-full">
                🔒 Locked
              </span> */}
              </label>
              <div className="relative mb-3">
                <input
                  type="tel"
                  value={`+91 ${userMobile}`}
                  readOnly
                  className="w-full border border-[#DDE3ED] rounded-[14px] px-3 py-2.5 text-[13px] bg-background bg-[#EDEFF5] text-[#6F7B91] cursor-default dark:border-border dark:bg-[#1A2236] dark:text-foreground"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground/70">
                  from account
                </span>
              </div>

              {/* Rank picker trigger: manual entry and company ranks open in a modal */}
              <label className="block text-[11px] font-bold text-foreground/60 mb-2">
                Select Rank <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <button
                  type="button"
                  aria-haspopup="dialog"
                  aria-expanded={rankPickerOpen}
                  aria-controls="mlm-rank-picker"
                  onClick={openRankPicker}
                  className={`w-full min-h-11 border rounded-[14px] px-3 py-2.5 text-sm bg-[#F1F4F9] focus:outline-none focus:ring-2 focus:ring-accent/25 flex items-center justify-between gap-3 text-left dark:bg-[#1A2236] ${errors.designation ? "border-red-400 dark:bg-red-500/10" : "border-[#DDE3ED] dark:border-border"}`}
                >
                  <span className={form.designation ? "text-foreground font-medium" : "text-muted-foreground"}>
                    {form.designation || "Select Rank"}
                  </span>
                  <svg
                    className={`w-4 h-4 shrink-0 text-muted-foreground transition-transform ${rankPickerOpen ? "rotate-180" : ""}`}
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="m6 9 6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
              </div>

              {errors.designation && (
                <p className="text-xs text-red-500 mt-1">
                  {errors.designation}
                </p>
              )}
            </div>
          )}
          {/* ── TOPUP LINE ────────────────────────────────────── */}
          <div className="rounded-[22px] border border-[#E8ECF3] bg-white p-4 shadow-[0_6px_20px_rgba(31,53,88,0.035)] dark:border-border dark:bg-[#141824]" data-guide="profile-topupline">
            <label className="block text-sm font-semibold text-foreground/80 mb-6">
              Add Top Upline/Seniors Image
            </label>
            <div className="flex flex-col gap-2">
              <MultiImagePicker
                companyImages={topuplines}
                selectedLinks={form.topupSelectedLinks}
                onToggleLink={handleTopupToggleLink}
                customFiles={form.topupCustomFiles}
                onAddCustomFiles={handleTopupAddCustomFiles}
                onRemoveCustomFile={handleTopupRemoveCustomFile}
                inputRef={topupInputRef}
                companyGridCols={3}
                thumbHeight="h-16"
                type="TopupLine"
                inlineStrip
                processingBg={removingTopupBg}
              />
            </div>
          </div>
          {/* ── PROFILE PHOTO ─────────────────────────────────── */}
          <div className="rounded-[22px] border border-[#E8ECF3] bg-white p-4 shadow-[0_6px_20px_rgba(31,53,88,0.035)] dark:border-border dark:bg-[#141824]" data-guide="profile-photo">
            <div className="flex items-center justify-between mb-5">
              <label className="block text-sm font-semibold text-foreground/80">
                Add Profile Photo <span className="text-red-500">*</span>
              </label>
              <span
                className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${allProfileImages.length >= MAX_PROFILE_PHOTOS ? "bg-red-100 text-red-600" : "bg-muted/50 text-muted-foreground"}`}
              >
                {allProfileImages.length} / {MAX_PROFILE_PHOTOS}
              </span>
            </div>
            <div className="flex flex-col gap-2">
              {/* Scrollable thumbnails + pinned upload, one combined border */}
              <div
                role="button"
                tabIndex={canAddProfilePhoto ? 0 : -1}
                aria-disabled={!canAddProfilePhoto}
                aria-label="Add Profile Photo"
                onClick={() => {
                  if (canAddProfilePhoto) profileInputRef.current?.click();
                }}
                onKeyDown={(event) => {
                  if (
                    canAddProfilePhoto &&
                    (event.key === "Enter" || event.key === " ")
                  ) {
                    event.preventDefault();
                    profileInputRef.current?.click();
                  }
                }}
                className={`w-full flex items-center gap-2 rounded-2xl border border-border p-2 transition focus:outline-none focus:ring-2 focus:ring-accent/30 ${
                  canAddProfilePhoto
                    ? "cursor-pointer hover:border-accent/60 hover:bg-accent/5"
                    : "cursor-not-allowed opacity-60"
                }`}
              >
                {/* Horizontally scrollable thumbnails area */}
                <div className="flex-1 min-w-0 flex items-center gap-2 overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
                  {allProfileImages.length === 0 && (
                    <span className="text-[11px] text-muted-foreground px-2 py-3">
                      Tap anywhere to add up to {MAX_PROFILE_PHOTOS} photos
                    </span>
                  )}
                  {allProfileImages.map(({ url, isExisting }, idx) => (
                    <div
                      key={url || `prof-${idx}`}
                      className="relative flex-shrink-0 mb-1 "
                    >
                      <img
                        src={url}
                        alt={`Profile ${idx + 1}`}
                        className="w-14 h-14 rounded-full object-contain bg-gradient-to-r from-yellow-200 via-amber-400 to-yellow-600 font-bold text-transparent"
                      />
                      {/* {isExisting && (
                        <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 bg-accent text-white text-[8px] px-1 rounded-full leading-tight ring-2 ring-background">
                          saved
                        </span>
                      )} */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setConfirmRemovePhoto(idx);
                        }}
                        className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full bg-rose-500 text-white text-[9px] flex items-center justify-center shadow ring-2 ring-background"
                        title="Remove"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
                {/* Circular upload icon pinned at the end (does not scroll) */}
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    if (canAddProfilePhoto) profileInputRef.current?.click();
                  }}
                  disabled={
                    removingBg || allProfileImages.length >= MAX_PROFILE_PHOTOS
                  }
                  className="flex-shrink-0 text-center w-20 h-20 rounded-full border-2 border-dashed border-border hover:border-accent/60 hover:bg-accent/5 flex items-center justify-center transition disabled:opacity-40 disabled:cursor-not-allowed"
                  title={
                    removingBg
                      ? "Removing Background…"
                      : allProfileImages.length >= MAX_PROFILE_PHOTOS
                        ? `Max ${MAX_PROFILE_PHOTOS} photos allowed`
                        : "Upload profile image"
                  }
                >
                  {removingBg ? (
                    <svg
                      className="animate-spin w-7 h-7 text-accent"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8v8z"
                      />
                    </svg>
                  ) : (
                    <img
                      src={photoupload}
                      alt="Upload"
                      className="w-7 h-7 opacity-70"
                    />
                  )}
                </button>
              </div>
              <input
                ref={profileInputRef}
                type="file"
                accept="image/jpeg,image/png,.jpg,.jpeg,.png"
                onChange={handleProfileFileSelect}
                className="hidden"
              />
              {errors.profileImage && (
                <p className="text-[11px] font-semibold text-red-500 mt-1">
                  {errors.profileImage}
                </p>
              )}
            </div>
          </div>

          {/* ── DISPLAY SETTINGS (shown at bottom in full profile mode) ── */}
          {!isSettingsMode && <DisplaySettings />}

          {/* ── SHOW SOCIAL MEDIA RADIO ──────────────────────── 
          <div className="bg-background rounded-2xl border border-border/60 shadow-sm p-4">
            <label className="block text-sm font-semibold text-foreground/80 mb-3">
              Show Social Media on Profile?
            </label>
            <div className="flex gap-4">
              {["yes", "no"].map((val) => (
                <label
                  key={val}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 cursor-pointer transition font-medium text-sm capitalize
          ${
            showSocial === val
              ? "border-accent bg-accent/10 text-accent"
              : "border-border bg-muted/20 text-muted-foreground hover:border-accent"
          }`}
                >
                  <input
                    type="radio"
                    name="socialradio"
                    value={val}
                    checked={showSocial === val}
                    onChange={() => handleShowSocialChange(val)}
                    className="accent"
                  />
                  {val === "yes" ? "Yes" : "No"}
                </label>
              ))}
            </div>
          </div>
           ── SOCIAL MEDIA ──────────────────────────────────── 
          <div className="bg-background rounded-2xl border border-border/60 shadow-sm p-4">
            <label className="block text-sm font-semibold text-foreground/80 mb-3">
              Social Media Links{" "}
              <span className="text-muted-foreground/70 font-normal">(Optional)</span>
            </label>
            <div className="flex flex-col gap-3">
              {SOCIAL_PLATFORMS.map((platform) => (
                <div key={platform} className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-muted/20 border border-border flex items-center justify-center shrink-0">
                    <SocialIcon name={platform} active={false} />
                  </div>
                  <input
                    type="text"
                    placeholder={`${platform} user ID`}
                    maxLength={60}
                    value={form.socials[platform]}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        socials: { ...f.socials, [platform]: e.target.value },
                      }))
                    }
                    className="flex-1 border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/40"
                  />
                </div>
              ))}
            </div>
            <div className="mt-4 p-4 bg-muted/20 rounded-xl border border-accent/20">
              <p className="text-sm font-medium text-foreground/80 mb-2">
                Same ID across platforms?
              </p>
              <input
                type="text"
                placeholder="Shared user ID"
                maxLength={40}
                value={form.socialSameId}
                onChange={(e) => handleSocialSameIdChange(e.target.value)}
                className="w-full border border-accent/25 rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-accent/40 mb-3"
              />
              <p className="text-xs text-muted-foreground mb-2">
                Select platforms to apply:
              </p>
              <div className="flex gap-3 flex-wrap">
                {SOCIAL_PLATFORMS.map((platform) => (
                  <button
                    key={platform}
                    type="button"
                    onClick={() => handleSocialSameToggle(platform)}
                    className={`flex items-center justify-center w-12 h-12 rounded-full border-2 transition ${
                      form.socialSameSelected.includes(platform)
                        ? "border-accent bg-accent"
                        : "border-border bg-background hover:border-accent"
                    }`}
                  >
                    <SocialIcon
                      name={platform}
                      active={form.socialSameSelected.includes(platform)}
                    />
                  </button>
                ))}
              </div>
            </div>
          </div>*/}

          {/* ── ERROR FEEDBACK ────────────────────────────────── */}
          {saveError && (
            <div className="bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 rounded-xl p-3 text-sm text-red-700 dark:text-red-300">
              {saveError}
            </div>
          )}

          {/* ── SAVE BUTTON ───────────────────────────────────── */}
          <button
            type="button"
            data-guide="profile-save"
            onClick={handleSave}
            disabled={saving}
            className="w-full py-3.5 rounded-[12px] bg-[#2478EA] text-white text-sm font-semibold hover:bg-[#1769DA] transition disabled:opacity-60 flex items-center justify-center gap-2 shadow-[0_6px_16px_rgba(36,120,234,0.18)]"
          >
            {saving ? (
              <>
                <svg
                  className="animate-spin w-4 h-4"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8v8z"
                  />
                </svg>
                {isEditMode ? "Updating…" : "Saving…"}
              </>
            ) : isEditMode ? (
              " Update Profile"
            ) : (
              " Save Profile"
            )}
          </button>

          {/* ── DELETE PROFILE SECTION ────────────────────────── */}
          {isEditMode && !isSettingsMode && (
            // <div className="rounded-2xl mt-4 w-full border border-red-100 bg-red-50/60 p-4">
            <Button
              type="button"
              onClick={() => setShowDeleteModal(true)}
              className="inline-flex w-full items-center justify-center gap-2 p-3 mt-0 rounded-[14px] bg-transparent border border-red-400 text-red-500 text-xs font-semibold hover:bg-red-50 dark:hover:bg-red-500/10 transition"
            >
              <svg
                className="w-3.5 h-3.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"
                />
              </svg>
              Delete My Company Profile
            </Button>
            // </div>
          )}

          {/* bottom spacing for mobile nav bars */}
          <div className="h-6" />
        </div>
      </div>
    </>
  );
}
