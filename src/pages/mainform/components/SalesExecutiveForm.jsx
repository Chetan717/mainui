import { useState, useEffect, useRef, useMemo } from "react";
import {
  Person,
  PersonPlus,
  PersonGear,
  Persons,
  LocationArrow,
  Handset,
  CircleDollar,
  Picture,
  Briefcase,
  Medal,
  TriangleRightFill,
  CircleCheck,
  TriangleExclamationFill,
  TriangleRight,
  Calendar,
} from "@gravity-ui/icons";
import {
  sanitizeAmount,
  sanitizeFormValue,
  sanitizeName,
  sanitizePhone,
} from "../utils/inputSanitize";
import {
  Button,
  Card,
  Input,
  Label,
  TextField,
  FieldError,
  InputGroup,
  Select,
  ListBox,
  Tabs,
  toast,
} from "@heroui/react";
import {
  getTemplateFlowReturnTarget,
  rememberEditorBackTarget,
} from "../../../utils/editorNavigation";
import {
  EDITOR_TEMPLATE_SEED_KEY,
  getEditorGraphicSelectionKey,
} from "../../../utils/editorTemplateSelection";
import { db, app } from "@firebase-config";
import {
  arrayRemove,
  arrayUnion,
  doc,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
import {
  deleteObject,
  getDownloadURL,
  getStorage,
  ref as storageRef,
  uploadBytes,
} from "firebase/storage";
import { convertToWebP } from "../../../lib/convertToWebP";
import MultiImagePicker from "./MultiImagePicker";
import ImageUploadWithBgRemove from "./ImageUploadWithBgRemove";
import ImageEditorCanvas from "./ImageEditorCanvas";
import RemoveBgLoadingOverlay from "./RemoveBgLoadingOverlay";
import AchievementForm from "./AchievementForm";
import { useNavigate } from "react-router";
import IncomeForm from "./IncomeForm";
import MeetingForm from "./MeetingForm";
import { useSelectedCompany } from "../../../Context/SelectedCompanyContext";
import {
  isBonanzaFlowType,
  RANK_PROMOTION_TYPES,
} from "../../../utils/templateTypeConfig";
import GeneralEditPage from "../../Editor/GenralEditPage";

import Bike from "../formshow/BIKE.webp";
import CarPurchase from "../formshow/CAR PURCHASE.webp";
import Car from "../formshow/CAR.webp";
import Birthday from "../formshow/birthday.webp";
import Capping from "../formshow/capping.webp";
import GiftOther from "../formshow/GIFT other.webp";
import Incomee from "../formshow/incomee.webp";
import Laptop from "../formshow/LAPTOP.webp";
import MeetingImage from "../formshow/meeting.webp";
import Mobile from "../formshow/mobile.webp";
import Rank from "../formshow/rank.webp";
import Closing from "../formshow/closing.webp";
import Welcome from "../formshow/welcome.webp";

const storage = getStorage(app);
const RANK_PROMOTION_FORM_IMAGES = Object.freeze(
  Object.fromEntries(RANK_PROMOTION_TYPES.map((type) => [type, Rank])),
);
const ACHIEVER_TITLE_OPTIONS = Object.freeze(["Mr.", "Mrs.", "Miss", "Dr.", "Prof.", "Er."]);
const ACHIEVER_TITLE_BY_KEY = Object.freeze({
  mr: "Mr.",
  mrs: "Mrs.",
  miss: "Miss",
  dr: "Dr.",
  prof: "Prof.",
  er: "Er.",
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Convert a base64 data-URL back to a Blob so image state stays consistent */
function base64ToBlob(dataUrl) {
  if (!dataUrl) return null;
  try {
    const [header, data] = dataUrl.split(",");
    const mime = header.match(/:(.*?);/)[1];
    const binary = atob(data);
    const arr = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) arr[i] = binary.charCodeAt(i);
    return new Blob([arr], { type: mime });
  } catch {
    return null;
  }
}

function parseAchieverName(savedAchiever = {}) {
  const rawTitle = String(savedAchiever.title || "").trim().toLowerCase().replace(/\./g, "");
  const title = ACHIEVER_TITLE_BY_KEY[rawTitle] || "Mr.";
  const hasValidTitle = Boolean(ACHIEVER_TITLE_BY_KEY[rawTitle]);
  let name = savedAchiever.name || "";

  if (!hasValidTitle && savedAchiever.achieverName) {
    const raw = savedAchiever.achieverName.trim();
    const match = raw.match(/^(Mr\.?|Mrs\.?|Miss|Dr\.?)\s*(.*)$/i);
    if (match) {
      const matchedTitleKey = match[1].toLowerCase().replace(/\./g, "");
      return {
        title: ACHIEVER_TITLE_BY_KEY[matchedTitleKey] || "Mr.",
        name: match[2] || "",
      };
    }
    name = raw;
  }

  return { title, name };
}

const toBase64 = (blob) =>
  new Promise((res) => {
    if (!blob) return res(null);
    // Already a data-URL string (restored from storage)
    if (typeof blob === "string") return res(blob);
    const reader = new FileReader();
    reader.onloadend = () => res(reader.result);
    reader.readAsDataURL(blob);
  });

function formatTrainingDateText(values = []) {
  const validValues = (values || []).filter(Boolean);
  if (!validValues.length) return "";

  const parsedDates = validValues.map((value) => new Date(`${value}T00:00:00`));
  const monthIndex = parsedDates[0].getMonth();
  const monthAbbrev = [
    "JAN",
    "FEB",
    "MAR",
    "APR",
    "MAY",
    "JUN",
    "JUL",
    "AUG",
    "SEP",
    "OCT",
    "NOV",
    "DEC",
  ][monthIndex];
  const year = parsedDates[0].getFullYear();
  const dayList = parsedDates.map((date) => date.getDate()).join(",");

  return `${dayList},${monthAbbrev} ${year}`;
}

function readSelectedSuggestionImage() {
  try {
    const raw = sessionStorage.getItem(EDITOR_TEMPLATE_SEED_KEY);
    if (!raw) return "";
    const seed = JSON.parse(raw);
    const items = Array.isArray(seed?.items) ? seed.items : [];
    if (!items.length) return "";

    const selected =
      items.find(
        (item) =>
          getEditorGraphicSelectionKey(item, seed?.templateId || "") ===
          seed?.selectedGraphicKey,
      ) || items[0];

    return String(selected?.suggestionImage || "").trim();
  } catch {
    return "";
  }
}

// ─── Inline field error ───────────────────────────────────────────────────────
function InlineError({ message }) {
  if (!message) return null;
  return (
    <div className="flex items-center gap-1 mt-1">
      <TriangleExclamationFill
        width={12}
        height={12}
        className="text-danger flex-shrink-0"
      />
      <p className="text-danger text-xs">{message}</p>
    </div>
  );
}

// ─── Upload zone ─────────────────────────────────────────────────────────────
function UploadZone({ label, hasError, onClick }) {
  return (
    <div
      onClick={onClick}
      className={[
        "flex flex-col items-center justify-center gap-2 py-5 px-4",
        "border-2 border-dashed rounded-xl cursor-pointer transition-colors",
        hasError
          ? "border-danger bg-danger-50"
          : "border-default-300 bg-default-50 hover:border-primary hover:bg-primary-50",
      ].join(" ")}
    >
      <Picture
        width={28}
        height={28}
        className={hasError ? "text-danger" : "text-primary"}
      />
      <p className="text-sm text-default-600 font-medium">{label}</p>
      <p className="text-xs text-default-400">
        PNG, JPG · Background removal supported
      </p>
    </div>
  );
}

// ─── Upload success row ───────────────────────────────────────────────────────
function UploadedRow({ onRemove }) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-xl bg-success-50 border border-success-200">
      <CircleCheck width={18} height={18} className="text-success" />
      <p className="text-sm text-success-700 font-medium">Photo uploaded</p>
      <button
        className="ml-auto text-xs text-default-500 underline"
        onClick={onRemove}
      >
        Remove
      </button>
    </div>
  );
}

// ─── Reusable text field with icon prefix ─────────────────────────────────────
function IconTextField({
  label,
  placeholder,
  type = "text",
  inputMode,
  icon: Icon,
  value,
  onChange,
  error,
  maxLength,
  style,
  className = "",
}) {
  return (
    <div className={className}>
      <TextField isInvalid={!!error} className="w-full">
        <Label className="text-xs text-accent/70 font-medium">{label}</Label>
        <InputGroup>
          <InputGroup.Input
            type={type}
            inputMode={inputMode}
            placeholder={placeholder}
            value={value}
            maxLength={maxLength}
            onChange={(e) => onChange(e.target.value)}
            style={style}
            className="w-full pl-2 text-xs text-foreground dark:text-white"
          />
        </InputGroup>
        <FieldError />
      </TextField>
      <InlineError message={error} />
    </div>
  );
}

export default function SalesExecutiveForm() {
  const { selectedCompany: company } = useSelectedCompany();
  const [tab, setTab] = useState("team");

  useEffect(() => {
    // Force the window to top when Editor opens
    window.scrollTo(0, 0);
  }, []); // Empty array means it runs exactly once on load

  const [open, setOpen] = useState(false);
  const [bonanzaDays, setBonanzaDays] = useState("None");
  const [bonanzaForWhom, setBonanzaForWhom] = useState("SELF");
  const [incomeSaved, setIncomeSaved] = useState(() => {
    try {
      return !!localStorage.getItem("income_form");
    } catch {
      return false;
    }
  });
  const [achievementSaved, setAchievementSaved] = useState(() => {
    try {
      return !!localStorage.getItem("achieve_form");
    } catch {
      return false;
    }
  });

  const navigate = useNavigate();
  const [selectedLinks, setSelectedLinks] = useState([]);
  const [selectedType, setSelectedType] = useState("");
  const [customFiles, setCustomFiles] = useState([]);
  const [editingType, setEditingType] = useState("main");
  const inputRef = useRef();
  const formScrollRef = useRef(null);
  const [hasStartedEditing, setHasStartedEditing] = useState(false);
  const [selectedSuggestionImage] = useState(() => readSelectedSuggestionImage());

  const [editingImage, setEditingImage] = useState(null);
  const [onImageDone, setOnImageDone] = useState(null);
  const [enhanceEnabled, setEnhanceEnabled] = useState(false);
  const [removeBgProcessing, setRemoveBgProcessing] = useState({
    active: false,
    previewUrl: null,
    progressMessage: "",
    progressPct: 0,
    onCancel: null,
  });

  const [achiever, setAchiever] = useState({
    title: "Mr.",
    name: "",
    achieverName: "",
  });
  const [promoter, setPromoter] = useState({});
  const [previewMiddleImage, setPreviewMiddleImage] = useState(() => {
    try {
      const profile = JSON.parse(sessionStorage.getItem("mlmProfile") || "{}");
      return profile?.profileImageURLs?.[0] || null;
    } catch {
      return null;
    }
  });
  const [achieverPreviewSrc, setAchieverPreviewSrc] = useState("");
  const [promoterPreviewSrc, setPromoterPreviewSrc] = useState("");
  const [trainingDates, setTrainingDates] = useState(() => {
    try {
      const savedTrainingDates = localStorage.getItem("trainingDates");
      if (savedTrainingDates) {
        const parsed = JSON.parse(savedTrainingDates);
        return Array.isArray(parsed) && parsed.length ? parsed : [];
      }
    } catch {}
    return [];
  });
  const [trainingDateInput, setTrainingDateInput] = useState("");

  useEffect(() => {
    if (!achiever?.image) {
      setAchieverPreviewSrc("");
      return undefined;
    }
    if (typeof achiever.image === "string") {
      setAchieverPreviewSrc(achiever.image);
      return undefined;
    }
    const url = URL.createObjectURL(achiever.image);
    setAchieverPreviewSrc(url);
    return () => URL.revokeObjectURL(url);
  }, [achiever?.image]);

  useEffect(() => {
    if (!promoter?.image) {
      setPromoterPreviewSrc("");
      return undefined;
    }
    if (typeof promoter.image === "string") {
      setPromoterPreviewSrc(promoter.image);
      return undefined;
    }
    const url = URL.createObjectURL(promoter.image);
    setPromoterPreviewSrc(url);
    return () => URL.revokeObjectURL(url);
  }, [promoter?.image]);

  const [errors, setErrors] = useState({});
  const [closeFilter, setCloseFilter] = useState(() => {
    try {
      return localStorage.getItem("close_filter") || "SP";
    } catch {
      return "SP";
    }
  });

  function getSelType() {
    try {
      return JSON.parse(localStorage.getItem("selType")) || {};
    } catch {
      return {};
    }
  }
  const selll = getSelType();
  const isWelcome = selll?.Subtype === "WELCOME";
  const isTraining = selll?.type === "Training";
  const isClosing = selll?.Subtype === "CLOSING";

  useEffect(() => {
    try {
      localStorage.setItem("close_filter", closeFilter);
    } catch {}
  }, [closeFilter]);

  useEffect(() => {
    try {
      if (!isTraining) {
        localStorage.removeItem("selectedDate");
        localStorage.removeItem("trainingDates");
        return;
      }

      const formattedValue = formatTrainingDateText(trainingDates);
      localStorage.setItem("selectedDate", formattedValue);
      localStorage.setItem("trainingDates", JSON.stringify(trainingDates));
    } catch {}
  }, [isTraining, trainingDates]);
  const isAchievment = selll?.type === "Achievements";
  const isAnyversary = selll?.type === "Anniversary_Birthday";
  const isIncome = selll?.type === "Income";
  const isMeeting = selll?.type === "Meeting" || selll?.type === "General_Meeting";
  const isBonanza = isBonanzaFlowType(selll?.type);
  const rankPromotionFormImage = RANK_PROMOTION_FORM_IMAGES[selll?.type];
  const formImage =
    selll?.Subtype === "WELCOME"
      ? Welcome
      : selll?.Subtype === "CLOSING"
        ? Closing
        : selll?.type === "Achievements" && selll?.Subtype === "BIKE"
          ? Bike
          : selll?.type === "Achievements" && selll?.Subtype === "CAR"
            ? Car
            : selll?.type === "Achievements" && selll?.Subtype === "MOBILE"
              ? Mobile
              : selll?.type === "Achievements" && selll?.Subtype === "LAPTOP"
                ? Laptop
                : selll?.type === "Achievements"
                  ? GiftOther
                  : selll?.type === "Anniversary_Birthday"
                    ? Birthday
                    : selll?.type === "Income"
                      ? Incomee
                      : selll?.type === "Meeting" || selll?.type === "General_Meeting"
                        ? MeetingImage
                        : isBonanzaFlowType(selll?.type)
                          ? GiftOther
                          : rankPromotionFormImage || Rank;
  const formImageLabel = selll?.Subtype;

  const maintypelabel = selll?.type;

  const livePreviewFormData = useMemo(
    () => ({
      tab,
      selectedDate: isTraining ? formatTrainingDateText(trainingDates) : "",
      achiever: {
        ...achiever,
        title: ACHIEVER_TITLE_OPTIONS.includes(achiever?.title)
          ? achiever.title
          : "Mr.",
        achieverName: `${ACHIEVER_TITLE_OPTIONS.includes(achiever?.title) ? achiever.title : "Mr."} ${achiever?.name || ""}`.trim(),
        image: achieverPreviewSrc || null,
      },
      promoter:
        tab === "self"
          ? {
              ...promoter,
              image: promoterPreviewSrc || null,
            }
          : null,
      selectedLinks,
      topuplineURLs: selectedLinks,
      bonanzaForWhom,
      bonanzaDays,
    }),
    [
      tab,
      isTraining,
      trainingDates,
      achiever,
      achieverPreviewSrc,
      promoter,
      promoterPreviewSrc,
      selectedLinks,
      bonanzaForWhom,
      bonanzaDays,
    ],
  );

  const hasMeaningfulFormInput = useMemo(
    () =>
      Boolean(
        achiever?.name?.trim() ||
          achiever?.city?.trim() ||
          achiever?.amount?.toString()?.trim() ||
          achiever?.image ||
          promoter?.name?.trim() ||
          promoter?.mobile?.trim() ||
          promoter?.role ||
          promoter?.image ||
          trainingDates.length > 0 ||
          bonanzaDays !== "None",
      ),
    [achiever, promoter, trainingDates, bonanzaDays],
  );

  const selectedShowcaseUrl = String(selll?.ShowCaseForm || "").trim();
  const initialPreviewImage =
    selectedSuggestionImage ||
    String(selll?.suggestionImage || "").trim() ||
    selectedShowcaseUrl ||
    formImage ||
    "";

  const markEditingStarted = () => {
    setHasStartedEditing(true);
  };


  useEffect(() => {
    let da = {};
    let mlmProfile = null;
    let saved = null;

    try {
      da = JSON.parse(localStorage.getItem("selType")) || {};
      mlmProfile = JSON.parse(sessionStorage.getItem("mlmProfile"));
      saved = JSON.parse(localStorage.getItem("mlmform"));
    } catch {}

    setSelectedType(da.type || "");

    if (saved) {
      setTab(saved.tab === "self" ? "self" : "team");

      const parsedName = parseAchieverName(saved.achiever || {});
      setAchiever({
        title: "Mr.",
        name: "",
        achieverName: "",
        ...(saved.achiever || {}),
        ...parsedName,
        image:
          base64ToBlob(saved.achiever?.image) ||
          saved.achiever?.image ||
          null,
      });

      const savedPromoter = saved.promoter || {};
      setPromoter({
        ...savedPromoter,
        image:
          base64ToBlob(savedPromoter.image) || savedPromoter.image || null,
      });
      setBonanzaForWhom(saved.bonanzaForWhom || "SELF");
      setBonanzaDays(saved.bonanzaDays || "None");

      if (Array.isArray(saved.selectedLinks)) {
        setSelectedLinks(saved.selectedLinks);
      } else if (mlmProfile?.topuplineURLs?.length) {
        setSelectedLinks(mlmProfile.topuplineURLs);
      }

      const selectedLinkSet = new Set(saved.selectedLinks || []);
      const restoredCustomFiles = (saved.topuplineURLs || [])
        .filter(
          (url) =>
            typeof url === "string" &&
            url.startsWith("data:image/") &&
            !selectedLinkSet.has(url),
        )
        .map((previewURL) => ({
          file: base64ToBlob(previewURL),
          previewURL,
        }))
        .filter(({ file }) => file);
      setCustomFiles(restoredCustomFiles);
    } else if (mlmProfile?.topuplineURLs?.length) {
      // No saved form yet — seed from mlmProfile
      setSelectedLinks(mlmProfile.topuplineURLs);
    }
  }, []);

  // ─── Validation ────────────────────────────────────────────────────────────
  const validate = isAchievment
    ? () => {
        const newErrors = {};
        if (!achiever.name?.trim()) newErrors.achieverName = "Name is required";
        if (!achiever.city?.trim()) newErrors.achieverCity = "City is required";

        if (tab === "self") {
          if (!promoter.name?.trim())
            newErrors.promoterName = "Name is required";
          if (!promoter.role) newErrors.promoterRole = "Role is required";
          if (!promoter.mobile?.trim())
            newErrors.promoterMobile = "Mobile is required";
          if (!promoter.image) newErrors.promoterImage = "Photo is required";
        }
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
      }
    : () => {
        const newErrors = {};
        if (!achiever.name?.trim()) newErrors.achieverName = "Name is required";
        if (!achiever.city?.trim()) newErrors.achieverCity = "City is required";
        if (
          !isBonanzaFlowType(selectedType) &&
          isWelcome &&
          isAchievment &&
          !achiever.amount?.toString().trim()
        )
          newErrors.achieverAmount = "Amount is required";

        if (!achiever.image) newErrors.achieverImage = "Photo is required";

        if (tab === "self") {
          if (!promoter.name?.trim())
            newErrors.promoterName = "Name is required";
          if (!promoter.role) newErrors.promoterRole = "Role is required";
          if (!promoter.mobile?.trim())
            newErrors.promoterMobile = "Mobile is required";
          if (!promoter.image) newErrors.promoterImage = "Photo is required";
        }
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
      };

  const clearError = (key) => {
    if (errors[key])
      setErrors((prev) => {
        const e = { ...prev };
        delete e[key];
        return e;
      });
  };

  const toggleLink = (link) => {
    setSelectedLinks((prev) =>
      prev.includes(link) ? prev.filter((l) => l !== link) : [...prev, link],
    );
  };

  const saveTopuplineToMlmProfile = async (files) => {
    if (!files?.length) return;

    try {
      const profile = JSON.parse(sessionStorage.getItem("mlmProfile") || "{}");
      if (!profile?.id) throw new Error("MLM profile was not found");

      const uploadedURLs = await Promise.all(
        files.map(async (item, index) => {
          const webpBlob = await convertToWebP(item.file);
          const fileRef = storageRef(
            storage,
            `mlmprofiles/${profile.id}/topup_form_${Date.now()}_${index}.webp`,
          );
          await uploadBytes(fileRef, webpBlob, { contentType: "image/webp", cacheControl: "public,max-age=31536000,immutable" });
          return getDownloadURL(fileRef);
        }),
      );

      await updateDoc(doc(db, "mlmprofiles", profile.id), {
        topuplineURLs: arrayUnion(...uploadedURLs),
        updatedAt: serverTimestamp(),
      });

      const mergedURLs = Array.from(
        new Set([...(profile.topuplineURLs || []), ...uploadedURLs]),
      );
      sessionStorage.setItem(
        "mlmProfile",
        JSON.stringify({ ...profile, topuplineURLs: mergedURLs }),
      );

      const savedForm = JSON.parse(localStorage.getItem("mlmform") || "null");
      if (savedForm) {
        const formSelectedLinks = Array.from(
          new Set([...(savedForm.selectedLinks || []), ...uploadedURLs]),
        );
        localStorage.setItem(
          "mlmform",
          JSON.stringify({
            ...savedForm,
            selectedLinks: formSelectedLinks,
            topuplineURLs: Array.from(
              new Set([...(savedForm.topuplineURLs || []), ...uploadedURLs]),
            ),
          }),
        );
      }

      setSelectedLinks((prev) => Array.from(new Set([...prev, ...uploadedURLs])));
      clearError("topupline");
      toast.success("Top upline photo saved to MLM Profile!");
    } catch (error) {
      
      // Keep the processed photo usable in the current form if permanent
      // storage fails, so the user's crop work is not lost.
      setCustomFiles((prev) => [...prev, ...files]);
      toast.danger("Could not save to MLM Profile. Photo kept in this form.");
    }
  };

  const getStoragePathFromUrl = (url) => {
    try {
      const match = url?.match(/\/o\/([^?]+)/);
      return match ? decodeURIComponent(match[1]) : null;
    } catch {
      return null;
    }
  };

  const removeTopupline = async (link) => {
    const storagePath = getStoragePathFromUrl(link);

    // Company-provided images are not owned by this profile and must never be
    // deleted from Storage; removing those only clears the current selection.
    if (!storagePath?.startsWith("mlmprofiles/")) {
      toggleLink(link);
      return;
    }

    try {
      const profile = JSON.parse(sessionStorage.getItem("mlmProfile") || "{}");
      if (!profile?.id) throw new Error("MLM profile was not found");

      try {
        await deleteObject(storageRef(storage, storagePath));
      } catch (storageError) {
        if (storageError?.code !== "storage/object-not-found") throw storageError;
      }

      await updateDoc(doc(db, "mlmprofiles", profile.id), {
        topuplineURLs: arrayRemove(link),
        updatedAt: serverTimestamp(),
      });

      const withoutLink = (values = []) => values.filter((url) => url !== link);
      sessionStorage.setItem(
        "mlmProfile",
        JSON.stringify({ ...profile, topuplineURLs: withoutLink(profile.topuplineURLs) }),
      );

      const savedForm = JSON.parse(localStorage.getItem("mlmform") || "null");
      if (savedForm) {
        localStorage.setItem(
          "mlmform",
          JSON.stringify({
            ...savedForm,
            selectedLinks: withoutLink(savedForm.selectedLinks),
            topuplineURLs: withoutLink(savedForm.topuplineURLs),
          }),
        );
      }

      setSelectedLinks((prev) => withoutLink(prev));
      toast.success("Top upline photo removed from MLM Profile.");
    } catch (error) {
      
      toast.danger("Could not remove the top upline photo. Please try again.");
    }
  };

  // ─── Submit & persist ──────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!validate()) return;

    // customFiles were never persisted before — they only lived in this
    // form's local state, so any photo a user cropped/removed the
    // background from (topupline manual upload) silently vanished on
    // submit and never reached the editor canvas. Convert each to base64
    // and combine with the picked company links into one ordered list.
    const customFileUrls = await Promise.all(
      customFiles.map((item) => toBase64(item.file)),
    );
    const topuplineURLs = [...selectedLinks, ...customFileUrls];

    const formData = {
      tab,
      selectedDate: isTraining ? formatTrainingDateText(trainingDates) : "",
      achiever: {
        ...achiever,
        title: ACHIEVER_TITLE_OPTIONS.includes(achiever.title)
          ? achiever.title
          : "Mr.",
        achieverName:
          `${ACHIEVER_TITLE_OPTIONS.includes(achiever.title) ? achiever.title : "Mr."} ${achiever.name || ""}`.trim(),
        // If image is already a base64 string (restored), keep it; else convert Blob
        image: achiever.image ? await toBase64(achiever.image) : null,
      },
      promoter:
        tab === "self"
          ? {
              ...promoter,
              image: promoter.image ? await toBase64(promoter.image) : null,
            }
          : null,
      selectedLinks,
      topuplineURLs,
      bonanzaForWhom,
      bonanzaDays,
    };

    localStorage.setItem("mlmform", JSON.stringify(formData));
    const editorBackTarget = getTemplateFlowReturnTarget({
      fallback: "/mlmform",
    });
    rememberEditorBackTarget(editorBackTarget);
    navigate("/editor", {
      state: { editorBackTarget },
    });
  };

  const addTrainingDate = () => {
    if (!trainingDateInput) return;
    if (trainingDates.includes(trainingDateInput)) return;
    setTrainingDates((prev) =>
      prev.length < 4 ? [...prev, trainingDateInput] : prev,
    );
    setTrainingDateInput("");
  };

  const removeTrainingDate = (value) => {
    setTrainingDates((prev) => prev.filter((date) => date !== value));
  };

  // ─── Clear saved form (optional reset button) ──────────────────────────────
  const handleReset = () => {
    localStorage.removeItem("mlmform");
    setTab("team");
    setAchiever({});
    setPromoter({});
    setSelectedLinks(() => {
      const mlmProfile = JSON.parse(sessionStorage.getItem("mlmProfile"));
      return mlmProfile?.topuplineURLs || [];
    });
    setCustomFiles([]);
    setErrors({});
  };

  const previewSizeCss = "min(220px, 64vw, calc(30dvh - 20px))";
  // Form state is persisted before opening the editor. When the user returns
  // to this screen, meaningful saved details must immediately render the live
  // design instead of falling back to the showcase/suggestion image.
  const showLiveCanvas = hasMeaningfulFormInput;

  return (
    <div className="relative h-full min-h-0 w-full overflow-hidden bg-background">
      {/* Fixed 30% preview. Canvas stays square and never resizes while scrolling. */}
      <div className="absolute inset-x-0 top-0 z-0 flex h-[30%] items-center justify-center overflow-hidden px-3 py-2">
        <div className="flex w-full max-w-[340px] items-center justify-center gap-2">
          <div
            className="pointer-events-none relative flex aspect-square shrink-0 items-center justify-center"
            style={{ width: previewSizeCss, height: previewSizeCss }}
          >
            {!showLiveCanvas ? (
              <div className="relative h-full w-full overflow-hidden rounded-none border border-[#d6dce8] bg-background shadow-[0_8px_20px_rgba(15,23,42,0.10)] dark:border-[#344158]">
                {initialPreviewImage ? (
                  <img
                    src={initialPreviewImage}
                    alt={formImageLabel || "Selected design preview"}
                    className="h-full w-full object-contain"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-xs font-medium text-muted-foreground">
                    Design preview
                  </div>
                )}
              </div>
            ) : (
              <GeneralEditPage
                previewOnly
                previewSize={previewSizeCss}
                previewFormData={livePreviewFormData}
                middaleImage={previewMiddleImage}
                setmiddaleImage={setPreviewMiddleImage}
              />
            )}
          </div>

        </div>
      </div>

      {/* Fixed 70% form area. Only this area scrolls; preview remains unchanged. */}
      <div
        ref={formScrollRef}
        onInputCapture={markEditingStarted}
        onChangeCapture={markEditingStarted}
        className={`absolute inset-x-0 top-[30%] z-10 space-y-5 overflow-y-auto rounded-t-[16px] border-t border-white/70 bg-background/95 px-4 pt-4 shadow-[0_-10px_24px_rgba(15,23,42,0.10)] backdrop-blur-xl dark:border-white/10 dark:bg-[#0f1726]/95 ${isMeeting ? "bottom-0 pb-8" : "bottom-[84px] pb-6"}`}
        style={{
          WebkitOverflowScrolling: "touch",
          touchAction: "pan-y",
          overscrollBehaviorY: "contain",
        }}
      >
        {/* ── Tabs ── */}
        {isMeeting ? null : (
          <div className="flex gap-1.5 p-1 bg-muted/30 rounded-2xl border border-border/50" data-guide="design-audience">
            {[
              {
                key: "team",
                label: "For Team",
                icon: <Persons width={13} height={13} />,
              },
              {
                key: "self",
                label: "For Self",
                icon: <Person width={13} height={13} />,
              },
            ].map(({ key, label, icon }) => (
              <button
                key={key}
                type="button"
                onClick={() => {
                  markEditingStarted();
                  setTab(key);
                }}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-[13px] font-bold transition-all duration-200 ${
                  tab === key
                    ? "bg-accent text-white shadow-md shadow-accent/20"
                    : "text-muted-foreground"
                }`}
              >
                {icon}
                {label}
              </button>
            ))}
          </div>
        )}

        {/* Top upline selection is intentionally hidden here; saved profile uplines are used automatically by the design. */}

        {isMeeting ? <MeetingForm /> : null}

        {isMeeting ? null : (
          <div className="rounded-2xl border border-border bg-background p-4 space-y-4" data-guide="design-details">
            <div className="flex items-center gap-2">
              <div className="w-1 h-4 rounded-full bg-accent flex-shrink-0" />
              <p className="text-[13px] font-bold text-foreground">
                Achiever Details
              </p>
            </div>

            <div className="flex w-full gap-2 justify-center items-center">
              <div
                className={
                  isAchievment
                    ? `flex flex-col w-[100%] gap-2 items-center`
                    : `flex flex-col w-[60%] gap-2 items-center`
                }
              >
                <div className="flex flex-row gap-2 w-full">
                  <div className="w-[25%] mt-1.5 flex-shrink-0">
                    <select
                      value={achiever.title || "Mr."}
                      onChange={(e) => {
                        const key = e.target.value;
                        setAchiever((p) => ({
                          ...p,
                          title: key,
                          achieverName:
                            `${key || "Mr."} ${p.name || ""}`.trim(),
                        }));
                      }}
                      className="border border-border bg-[var(--field-background)] text-foreground"
                      style={{
                        width: "100%",
                        height: 36,
                        fontSize: 13,
                        fontWeight: 600,
                        border: "2px solid var(--border)",
                        borderRadius: 10,

                        // padding: "0 8px",
                        background: "var(--field-background)",
                        color: "var(--field-foreground)",
                        appearance: "auto",
                        cursor: "pointer",
                        outline: "none",
                      }}
                    >
                      {ACHIEVER_TITLE_OPTIONS.map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className={`w-[70%] flex-1 min-w-0`}>
                    <IconTextField
                      placeholder="Full Name"
                      icon={Person}
                      value={achiever.name || ""}
                      style={{
                        height: 36,
                        fontSize: 13,
                        fontWeight: 600,
                        border: "1px solid var(--border)",
                        borderRadius: 10,
                        // padding: "0 8px",
                        background: "var(--field-background)",
                        color: "var(--field-foreground)",
                        appearance: "auto",
                        cursor: "pointer",
                        outline: "none",
                      }}
                      onChange={(v) => {
                        const sanitized = sanitizeName(v);
                        setAchiever((p) => ({
                          ...p,
                          name: sanitized,
                          achieverName:
                            `${p.title || "Mr."} ${sanitized}`.trim(),
                        }));
                        clearError("achieverName");
                      }}
                      error={errors.achieverName}
                      maxLength={30}
                    />
                  </div>
                </div>

                {isWelcome ? (
                  <div className="flex-1 w-full h-[36px]"></div>
                ) : null}
                <div className="flex-1 w-full">
                  <IconTextField
                    label="From team / City"
                    placeholder="City or Team Name"
                    icon={LocationArrow}
                    value={achiever.city || ""}
                    style={{
                      height: 36,
                      fontSize: 13,
                      fontWeight: 600,
                      border: "1px solid var(--border)",
                      borderRadius: 10,
                      // padding: "0 8px",
                      background: "var(--field-background)",
                      color: "var(--field-foreground)",
                      appearance: "auto",
                      cursor: "pointer",
                      outline: "none",
                    }}
                    onChange={(v) => {
                      setAchiever((p) => ({
                        ...p,
                        city: sanitizeFormValue(v, 40),
                      }));
                      clearError("achieverCity");
                    }}
                    error={errors.achieverCity}
                    maxLength={40}
                  />

                  {isTraining ? (
                    <div className="mt-3 space-y-3">
                      <p className="text-[11px] font-semibold text-foreground/60">
                        Training Dates (up to 4)
                      </p>
                      <div className="space-y-2">
                        <div className="relative">
                          <input
                            type="date"
                            value={trainingDateInput}
                            onChange={(e) => setTrainingDateInput(e.target.value)}
                            className="w-full rounded-xl border border-border bg-background px-3 py-2 pr-10 text-[12px] text-foreground"
                          />
                          <Calendar className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        </div>
                        <button
                          type="button"
                          onClick={addTrainingDate}
                          disabled={!trainingDateInput || trainingDates.length >= 4}
                          className="w-full inline-flex justify-center items-center gap-2 rounded-xl bg-accent px-4 py-2 text-[12px] font-semibold text-white transition hover:bg-accent-dark disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <span className="text-xs">+</span>
                          Add Date
                        </button>
                      </div>
                      {trainingDates.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {trainingDates.map((dateValue) => (
                            <div
                              key={dateValue}
                              className="inline-flex items-center gap-2 rounded-full border border-border bg-muted/20 px-3 py-1 text-[11px] text-foreground"
                            >
                              {new Date(`${dateValue}T00:00:00`).getDate()},
                              {new Date(`${dateValue}T00:00:00`).toLocaleString("en-US", {
                                month: "short",
                              }).toUpperCase()} {new Date(`${dateValue}T00:00:00`).getFullYear()}
                              <button
                                type="button"
                                onClick={() => removeTrainingDate(dateValue)}
                                className="ml-2 text-xs font-bold text-danger"
                              >
                                ×
                              </button>
                            </div>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                </div>
                <div className="flex-1 w-full">
                  {isAchievment ||
                  isWelcome ||
                  isAnyversary ||
                  isIncome ||
                  isBonanza ||
                  isTraining ? null : (
                    <IconTextField
                      label={
                        isClosing ? `Enter ${closeFilter} Amount` : "Amount (₹)"
                      }
                      placeholder="XXXX"
                      type="number"
                      icon={CircleDollar}
                      style={{
                        height: 36,
                        fontSize: 13,
                        fontWeight: 600,
                        border: "1px solid var(--border)",
                        borderRadius: 10,
                        // padding: "0 8px",
                        background: "var(--field-background)",
                        color: "var(--field-foreground)",
                        appearance: "auto",
                        cursor: "pointer",
                        outline: "none",
                      }}
                      value={achiever.amount || ""}
                      onChange={(v) => {
                        setAchiever((p) => ({
                          ...p,
                          amount: sanitizeAmount(v),
                        }));
                        clearError("achieverAmount");
                      }}
                      error={errors.achieverAmount}
                      maxLength={7}
                      inputMode="numeric"
                    />
                  )}
                </div>
              </div>

              {isAchievment ? null : (
                <div className="w-[40%]">
                  <ImageUploadWithBgRemove
                    guideTarget="design-photo"
                    onImageReady={(img) => {
                      setAchiever((p) => ({ ...p, image: img }));
                      clearError("achieverImage");
                    }}
                    setEditingImage={setEditingImage}
                    setOnImageDone={setOnImageDone}
                    setEnhanceEnabled={setEnhanceEnabled}
                    onProcessingChange={setRemoveBgProcessing}
                    currentImage={achiever.image}
                    trigger={
                      <UploadZone
                        label="Upload achiever photo"
                        hasError={!!errors.achieverImage}
                      />
                    }
                    setOpen={setOpen}
                    open={open}
                    type="form"
                    editingType={editingType}
                    setEditingType={setEditingType}
                  />
                  <InlineError message={errors.achieverImage} />
                </div>
              )}
            </div>

            {isClosing && (
              <div>
                <Select
                  placeholder="Select"
                  selectedKey={closeFilter}
                  onSelectionChange={(k) => setCloseFilter(k)}
                  className="w-full text-xs"
                >
                  <Label className="text-xs text-accent/70 font-medium">
                    Filter
                  </Label>
                  <Select.Trigger>
                    <Select.Value />
                    <Select.Indicator />
                  </Select.Trigger>
                  <Select.Popover>
                    <ListBox>
                      {["SP", "BV", "SI", "PV"].map((k) => (
                        <ListBox.Item key={k} id={k} textValue={k}>
                          {k}
                          <ListBox.ItemIndicator />
                        </ListBox.Item>
                      ))}
                    </ListBox>
                  </Select.Popover>
                </Select>
              </div>
            )}
          </div>
        )}
        {isIncome ? <IncomeForm onSaved={() => setIncomeSaved(true)} /> : null}
        {/* ── Bonanza: Days + For Whom ── */}
        {isBonanza && (
          <div className="rounded-2xl border border-border bg-background p-4 space-y-4">
            <div className="flex items-center gap-2">
              <div className="w-1 h-4 rounded-full bg-accent flex-shrink-0" />
              <p className="text-[13px] font-bold text-foreground">
                {selll?.type === "Domestic_Trip" ? "Domestic Trip Details" : "Bonanza Details"}
              </p>
            </div>

            <div>
              <p className="text-[11px] font-semibold text-foreground/60 mb-2">
                Days
              </p>
              <div className="flex gap-2 flex-wrap">
                {[
                  "None",
                  "1 Night/2 Day",
                  "2 Night/3 Day",
                  "3 Night/4 Day",
                ].map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => {
                      markEditingStarted();
                      setBonanzaDays(opt);
                    }}
                    className={`px-3 py-2 rounded-xl text-[10px] font-semibold border transition-all active:scale-95 ${
                      bonanzaDays === opt
                        ? "bg-accent text-white border-accent shadow-sm shadow-accent/20"
                        : "bg-muted/30 text-foreground border-border"
                    }`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="text-[11px] font-semibold text-foreground/60 mb-2">
                For Whom
              </p>
              <div className="flex gap-2">
                {["SELF", "FAMILY"].map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => {
                      markEditingStarted();
                      setBonanzaForWhom(opt);
                    }}
                    className={`flex-1 py-2.5 rounded-xl text-[13px] font-bold border transition-all active:scale-95 ${
                      bonanzaForWhom === opt
                        ? "bg-accent text-white border-accent shadow-sm shadow-accent/20"
                        : "bg-muted/30 text-foreground border-border"
                    }`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {isAchievment ? (
          <div className="rounded-2xl border border-border bg-background p-4">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-1 h-4 rounded-full bg-accent flex-shrink-0" />
              <p className="text-[13px] font-bold text-foreground">
                Achievement Details
              </p>
            </div>
            <AchievementForm
              editingType={editingType}
              setEditingType={setEditingType}
              onSaved={() => setAchievementSaved(true)}
            />
          </div>
        ) : null}

        {!isMeeting && tab === "self" && company ? (
          <div className="rounded-2xl border border-border bg-background p-4 space-y-4">
            <div className="flex items-center gap-2">
              <div className="w-1 h-4 rounded-full bg-accent flex-shrink-0" />
              <p className="text-[13px] font-bold text-foreground">
                Promoter Details
              </p>
            </div>

            <IconTextField
              label="Name"
              placeholder="Promoter full name"
              icon={PersonPlus}
              value={promoter.name || ""}
              onChange={(v) => {
                setPromoter((p) => ({ ...p, name: sanitizeName(v) }));
                clearError("promoterName");
              }}
              error={errors.promoterName}
              maxLength={30}
            />

            <div>
              <Select
                placeholder="Select role"
                isInvalid={!!errors.promoterRole}
                selectedKey={promoter.role || null}
                onSelectionChange={(key) => {
                  setPromoter((p) => ({ ...p, role: key }));
                  clearError("promoterRole");
                }}
                className="w-full text-xs"
              >
                <Label className="text-xs text-accent/70 font-medium">
                  Role
                </Label>
                <Select.Trigger>
                  <Select.Value style={{ fontSize: 12 }} />
                  <Select.Indicator />
                </Select.Trigger>
                <Select.Popover>
                  <ListBox>
                    {(company.profile || []).map((p) => (
                      <ListBox.Item
                        key={p.profilename}
                        id={p.profilename}
                        textValue={p.profilename}
                        style={{ fontSize: 12 }}
                      >
                        {p.profilename}
                        <ListBox.ItemIndicator />
                      </ListBox.Item>
                    ))}
                  </ListBox>
                </Select.Popover>
              </Select>
              <InlineError message={errors.promoterRole} />
            </div>

            <IconTextField
              label="Mobile"
              placeholder="10-digit mobile number"
              type="tel"
              inputMode="tel"
              icon={Handset}
              value={promoter.mobile || ""}
              onChange={(v) => {
                setPromoter((p) => ({ ...p, mobile: sanitizePhone(v) }));
                clearError("promoterMobile");
              }}
              error={errors.promoterMobile}
              maxLength={10}
            />

            <div>
              <p className="text-[11px] font-semibold text-foreground/60 mb-2">
                Promoter Photo
              </p>
              <ImageUploadWithBgRemove
                guideTarget="design-photo"
                onImageReady={(img) => {
                  setPromoter((p) => ({ ...p, image: img }));
                  clearError("promoterImage");
                }}
                setEditingImage={setEditingImage}
                setOnImageDone={setOnImageDone}
                setEnhanceEnabled={setEnhanceEnabled}
                onProcessingChange={setRemoveBgProcessing}
                currentImage={promoter.image}
                trigger={
                  <UploadZone
                    label="Upload promoter photo"
                    hasError={!!errors.promoterImage}
                  />
                }
                setOpen={setOpen}
                open={open}
              />
              <InlineError message={errors.promoterImage} />
            </div>
          </div>
        ) : null}
      </div>

      {isMeeting ? null : (
        <div className="absolute inset-x-0 bottom-0 z-20 border-t border-border bg-background/98 px-4 py-3 backdrop-blur-xl space-y-2">
          {(() => {
            const isLocked =
              (isIncome && !incomeSaved) || (isAchievment && !achievementSaved);
            return (
              <button
                type="button"
                data-guide="design-submit"
                onClick={isLocked ? undefined : handleSubmit}
                disabled={isLocked}
                className={
                  "w-full py-4 rounded-2xl text-white font-bold text-[15px] transition-all shadow-xl shadow-accent/20" +
                  (isLocked
                    ? " opacity-40 blur-[1px] cursor-not-allowed"
                    : " active:scale-[0.98]")
                }
                style={{
                  background:
                    "linear-gradient(135deg,#2F80EA 0%,#236FDE 48%,#1454C5 100%)",
                }}
              >
                Save &amp; Create Design
              </button>
            );
          })()}
          {/* <button
            type="button"
            onClick={handleReset}
            className="w-full py-2 text-[12px] font-medium text-muted-foreground hover:text-foreground transition-colors text-center"
          >
            Reset Form
          </button> */}
        </div>
      )}

      {open && editingImage ? (
        <div className="fixed inset-0 z-[99998] h-[100dvh] w-full overflow-hidden bg-[#181818]">
          <ImageEditorCanvas
            src={editingImage}
            onDone={(blob) => {
              const shouldClose = onImageDone?.(blob) !== false;
              if (shouldClose) setEditingImage(null);
              return shouldClose;
            }}
            onCancel={() => setEditingImage(null)}
            setOpen={setOpen}
            enableEnhance={enhanceEnabled}
          />
        </div>
      ) : null}

      {removeBgProcessing.active ? (
        <RemoveBgLoadingOverlay
          previewUrl={removeBgProcessing.previewUrl}
          progressMessage={removeBgProcessing.progressMessage}
          progressPct={removeBgProcessing.progressPct}
          onCancel={removeBgProcessing.onCancel}
        />
      ) : null}
    </div>
  );
}
