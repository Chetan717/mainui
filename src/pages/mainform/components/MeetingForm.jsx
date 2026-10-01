import React, { useEffect, useMemo, useState } from "react";
import { Facebook, Instagram, Upload, Video, ZoomIn, Youtube } from "lucide-react";
import ImageUploadWithBgRemove from "./ImageUploadWithBgRemove";
import ImageEditorCanvas from "./ImageEditorCanvas";
import RemoveBgLoadingOverlay from "./RemoveBgLoadingOverlay";
import { Modal } from "@heroui/react";
import { useNavigate } from "react-router";
import { useSelectedCompany } from "../../../Context/SelectedCompanyContext";
import {
  sanitizeAmount,
  sanitizeFormValue,
  sanitizeName,
} from "../utils/inputSanitize";
import {
  getTemplateFlowReturnTarget,
  rememberEditorBackTarget,
} from "../../../utils/editorNavigation";

const toBase64 = (blob) =>
  new Promise((resolve) => {
    if (!blob) return resolve(null);
    if (typeof blob === "string") return resolve(blob);
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.readAsDataURL(blob);
  });

// Format date from YYYY-MM-DD to DD-MM-YYYY
const formatDateDisplay = (dateStr) => {
  if (!dateStr) return "";
  const [year, month, day] = dateStr.split("-");
  return `${day}-${month}-${year}`;
};

// Format time from 24-hour (HH:MM) to 12-hour (H:MM AM/PM)
const formatTimeDisplay = (timeStr) => {
  if (!timeStr) return "";
  const [hours, minutes] = timeStr.split(":");
  const hour = parseInt(hours, 10);
  const isPM = hour >= 12;
  const displayHour = hour % 12 || 12;
  const ampm = isPM ? "PM" : "AM";
  return `${displayHour}:${minutes} ${ampm}`;
};

// Parse date from DD-MM-YYYY back to YYYY-MM-DD
const parseFormattedDate = (dateStr) => {
  if (!dateStr) return "";
  const [day, month, year] = dateStr.split("-");
  return `${year}-${month}-${day}`;
};

// Parse time from H:MM AM/PM back to HH:MM
const parseFormattedTime = (timeStr) => {
  if (!timeStr) return "";
  const timePart = timeStr.split(" ")[0];
  const ampm = timeStr.split(" ")[1];
  const [hours, minutes] = timePart.split(":");
  let hour = parseInt(hours, 10);

  if (ampm === "PM" && hour !== 12) {
    hour += 12;
  } else if (ampm === "AM" && hour === 12) {
    hour = 0;
  }

  return `${String(hour).padStart(2, "0")}:${minutes}`;
};

const platformButtons = [
  { id: "zoom", label: "Zoom", Icon: ZoomIn },
  { id: "meet", label: "Google Meet", Icon: Video },
  { id: "facebook", label: "Facebook", Icon: Facebook },
  { id: "instagram", label: "Instagram", Icon: Instagram },
  { id: "youtube", label: "YouTube", Icon: Youtube },
];

export default function MeetingForm() {
  const { selectedCompany } = useSelectedCompany();
  const navigate = useNavigate();
  // default to today's date and current time
  const getTodayDate = () => {
    const d = new Date();
    return d.toISOString().slice(0, 10);
  };
  const getNowTime = () => {
    const d = new Date();
    const hh = String(d.getHours()).padStart(2, "0");
    const mm = String(d.getMinutes()).padStart(2, "0");
    return `${hh}:${mm}`;
  };
  const [teamName, setTeamName] = useState("");
  const [date, setDate] = useState(getTodayDate());
  const [time, setTime] = useState(getNowTime());
  const [meetingMode, setMeetingMode] = useState("online");
  const [platformType, setPlatformType] = useState("zoom");
  const [platformInput, setPlatformInput] = useState("");
  const [meetingId, setMeetingId] = useState("");
  const [meetingPassword, setMeetingPassword] = useState("");
  const [address1, setAddress1] = useState("");
  const [address2, setAddress2] = useState("");

  const [companyImages, setCompanyImages] = useState([]);
  const [companyDesignations, setCompanyDesignations] = useState([]);
  const [chiefImageOption, setChiefImageOption] = useState("company");
  const [chiefImage, setChiefImage] = useState(null);
  const [chiefName, setChiefName] = useState("");
  const [chiefDesignation, setChiefDesignation] = useState("");

  const [hostMode, setHostMode] = useState("add");
  const [hostName, setHostName] = useState("");
  const [hostDesignation, setHostDesignation] = useState("");

  const [errors, setErrors] = useState({});
  const [savedMessage, setSavedMessage] = useState("");
  const [isSaved, setIsSaved] = useState(false);

  const [editingImage, setEditingImage] = useState(null);
  const [onImageDone, setOnImageDone] = useState(null);
  const [enhanceEnabled, setEnhanceEnabled] = useState(false);
  const [open, setOpen] = useState(false);
  const [editingType, setEditingType] = useState("chiefGuest");
  const [showChiefImageModal, setShowChiefImageModal] = useState(false);
  const [removeBgProcessing, setRemoveBgProcessing] = useState({
    active: false,
    previewUrl: null,
    progressMessage: "",
    progressPct: 0,
    onCancel: null,
  });
  const [companyImageSearch, setCompanyImageSearch] = useState("");
  const [companyImagePage, setCompanyImagePage] = useState(1);

  const normalizedCompanyImages = useMemo(() => {
    return (companyImages || []).map((item, index) => {
      if (!item) return { id: `img-${index}`, link: "", name: "" };
      if (typeof item === "string") {
        return { id: item, link: item, name: "" };
      }
      return {
        id: item.id || item.link || item.url || `img-${index}`,
        link: item.link || item.url || "",
        name: item.name || item.label || item.title || "",
      };
    });
  }, [companyImages]);

  const filteredCompanyImages = useMemo(() => {
    const query = companyImageSearch.trim().toLowerCase();
    if (!query) return normalizedCompanyImages;
    return normalizedCompanyImages.filter((item) =>
      item.name.toLowerCase().includes(query),
    );
  }, [companyImageSearch, normalizedCompanyImages]);

  const COMPANY_PAGE_SIZE = 12;
  const totalCompanyPages = Math.max(
    1,
    Math.ceil(filteredCompanyImages.length / COMPANY_PAGE_SIZE),
  );
  const companyPageItems = filteredCompanyImages.slice(
    (companyImagePage - 1) * COMPANY_PAGE_SIZE,
    companyImagePage * COMPANY_PAGE_SIZE,
  );

  useEffect(() => {
    if (companyImagePage > totalCompanyPages) {
      setCompanyImagePage(totalCompanyPages);
    }
  }, [companyImagePage, totalCompanyPages]);

  useEffect(() => {
    setCompanyImagePage(1);
  }, [companyImageSearch]);

  useEffect(() => {
    try {
      const mlmprofile =
        JSON.parse(sessionStorage.getItem("mlmProfile") || "{}") || {};

      const companyUrls = Array.isArray(selectedCompany?.topuplines)
        ? selectedCompany.topuplines
        : Array.isArray(mlmprofile.topuplineURLs)
          ? mlmprofile.topuplineURLs
          : [];

      setCompanyImages(companyUrls);
      setCompanyDesignations(
        Array.isArray(selectedCompany?.profile)
          ? selectedCompany.profile.map((item) => item.profilename)
          : [],
      );

      // Always set host values from mlmprofile (non-editable fields)
      const hostFullName = mlmprofile.fullName || mlmprofile.name || mlmprofile.firstName || "";
      const hostDesig = mlmprofile.designation || mlmprofile.role || mlmprofile.position || "";
      setHostName(hostFullName);
      setHostDesignation(hostDesig);

      const saved = JSON.parse(localStorage.getItem("Meeting") || "{}") || {};
      if (Object.keys(saved).length) {
        setTeamName(saved.teamName || "");
        setDate(parseFormattedDate(saved.date) || "");
        setTime(parseFormattedTime(saved.time) || "");
        setMeetingMode(saved.meetingMode || "online");
        setPlatformType(saved.platformType || "zoom");
        setPlatformInput(saved.platformInput || "");
        setMeetingId(saved.meetingId || "");
        setMeetingPassword(saved.meetingPassword || "");
        setAddress1(saved.address1 || "");
        setAddress2(saved.address2 || "");
        setChiefImage(saved.chiefImage || null);
        setChiefName(saved.chiefName || "");
        setChiefDesignation(saved.chiefDesignation || "");
        setHostMode(saved.hostMode || "add");
        setIsSaved(true);
        setChiefImageOption(
          saved.chiefImage && companyUrls.includes(saved.chiefImage)
            ? "company"
            : "upload",
        );
      }
    } catch (err) {
      
    }
  }, [selectedCompany]);

  useEffect(() => {
    if (!savedMessage) return;
    const timer = window.setTimeout(() => setSavedMessage(""), 3000);
    return () => window.clearTimeout(timer);
  }, [savedMessage]);

  const openEditor = (image) => {
    setEditingType("chiefGuest");
    setEnhanceEnabled(false);
    setEditingImage(image);
    setOnImageDone(() => (blob) => {
      setChiefImage(blob);
      setEditingImage(null);
      setOpen(false);
      setChiefImageOption("upload");
    });
    setOpen(true);
  };

  const validate = () => {
    const next = {};
    if (!teamName.trim()) next.teamName = "Team name is required.";
    if (!date) next.date = "Select a date.";
    if (!time) next.time = "Select a time.";
    if (meetingMode === "online") {
      if (platformType === "zoom" || platformType === "meet") {
        if (!meetingId.trim()) next.meetingId = "Meeting ID is required.";
        if (!meetingPassword.trim())
          next.meetingPassword = "Password is required.";
      } else if (!platformInput.trim()) {
        next.platformInput = "Link or username is required.";
      }
    } else {
      if (!address1.trim()) next.address1 = "Address line 1 is required.";
      if (!address2.trim()) next.address2 = "Address line 2 is required.";
    }
    if (!chiefName.trim()) next.chiefName = "Chief guest name is required.";
    if (!chiefDesignation.trim())
      next.chiefDesignation = "Choose a designation.";
    // Host fields are read-only and auto-filled, no validation needed
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;

    const payload = {
      teamName,
      date: formatDateDisplay(date),
      time: formatTimeDisplay(time),
      meetingMode,
      platformType,
      platformInput,
      meetingId,
      meetingPassword,
      address1,
      address2,
      chiefImage: await toBase64(chiefImage),
      chiefImageOption,
      chiefName,
      chiefDesignation,
      hostMode,
      hostName,
      hostDesignation,
      updatedAt: new Date().toISOString(),
    };

    try {
      localStorage.setItem("Meeting", JSON.stringify(payload));
      setSavedMessage("Meeting saved successfully.");
      const editorBackTarget = getTemplateFlowReturnTarget({
        fallback: "/mlmform",
      });
      rememberEditorBackTarget(editorBackTarget);
      navigate("/editor", {
        state: { editorBackTarget },
      });
      setIsSaved(true);
    } catch (err) {
      
      setSavedMessage("Unable to save data. Please try again.");
    }
  };

  return (
    <div className="w-full">
      <div className=" rounded-2xl border border-border bg-background ">
        <div className="grid gap-6 p-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="text-[11px] font-semibold text-foreground/60">
                Team Name *
              </span>
              <input
                type="text"
                value={teamName}
                onChange={(e) => setTeamName(sanitizeName(e.target.value))}
                placeholder="Team Name"
                className="mt-2 w-full rounded-xl border border-border bg-background px-4 py-2.5 text-[13px] text-foreground outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/15"
                maxLength={30}
              />
              {errors.teamName && (
                <p className="mt-2 text-[11px] text-danger">{errors.teamName}</p>
              )}
            </label>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="text-[11px] font-semibold text-foreground/60">
                  Select date *
                </span>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="mt-2 w-full rounded-xl border border-border bg-background px-4 py-2.5 text-[13px] text-foreground outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/15"
                />
                {errors.date && (
                  <p className="mt-2 text-[11px] text-danger">{errors.date}</p>
                )}
              </label>
              <label className="block">
                <span className="text-[11px] font-semibold text-foreground/60">
                  Select time *
                </span>
                <input
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  className="mt-2 w-full rounded-xl border border-border bg-background px-4 py-2.5 text-[13px] text-foreground outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/15"
                />
                {errors.time && (
                  <p className="mt-2 text-[11px] text-danger">{errors.time}</p>
                )}
              </label>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                Meeting Mode
              </p>
              <div className="mt-3 flex flex-wrap gap-3">
                {[
                  { id: "online", label: "ONLINE" },
                  { id: "offline", label: "OFFLINE" },
                ].map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => setMeetingMode(option.id)}
                    className={`rounded-full px-5 py-3 text-xs font-medium transition ${
                      meetingMode === option.id
                        ? "bg-accent text-white"
                        : "border border-border bg-background text-foreground hover:bg-muted/30"
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-border p-4">
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                {meetingMode === "online"
                  ? "Online details"
                  : "Offline address"}
              </p>
              {meetingMode === "online" ? (
                <div className="mt-4 space-y-4">
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                    {platformButtons.map((btn) => {
                      const Icon = btn.Icon;
                      return (
                        <button
                          key={btn.id}
                          type="button"
                          onClick={() => setPlatformType(btn.id)}
                          className={`rounded-2xl border p-2 text-sm font-medium transition ${
                            platformType === btn.id
                              ? "border-accent bg-accent text-white"
                              : "border-border bg-background text-foreground hover:border-accent"
                          }`}
                        >
                          <div className="flex items-center justify-center gap-2">
                            <Icon className="size-4" />
                            <span>{btn.label}</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  {platformType === "zoom" || platformType === "meet" ? (
                    <div className="grid gap-4 sm:grid-cols-2">
                      <label className="block">
                        <span className="text-[11px] font-semibold text-foreground/60">
                          Meeting ID *
                        </span>
                        <input
                          value={meetingId}
                          onChange={(e) => setMeetingId(sanitizeFormValue(e.target.value, 40))}
                          placeholder="Meeting Id"
                          className="mt-2 w-full rounded-xl border border-border bg-background px-4 py-2.5 text-[13px] text-foreground outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/15"
                          maxLength={40}
                        />
                        {errors.meetingId && (
                          <p className="mt-2 text-[11px] text-danger">
                            {errors.meetingId}
                          </p>
                        )}
                      </label>
                      <label className="block">
                        <span className="text-[11px] font-semibold text-foreground/60">
                          Meeting Password *
                        </span>
                        <input
                          value={meetingPassword}
                          onChange={(e) => setMeetingPassword(sanitizeFormValue(e.target.value, 40))}
                          placeholder="Password"
                          className="mt-2 w-full rounded-xl border border-border bg-background px-4 py-2.5 text-[13px] text-foreground outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/15"
                          maxLength={40}
                        />
                        {errors.meetingPassword && (
                          <p className="mt-2 text-[11px] text-danger">
                            {errors.meetingPassword}
                          </p>
                        )}
                      </label>
                    </div>
                  ) : (
                    <label className="block">
                      <span className="text-[11px] font-semibold text-foreground/60">
                        Meeting Link or Username *
                      </span>
                      <input
                        value={platformInput}
                        onChange={(e) => setPlatformInput(sanitizeFormValue(e.target.value, 40))}
                        placeholder="Enter link or username"
                        className="mt-2 w-full rounded-xl border border-border bg-background px-4 py-2.5 text-[13px] text-foreground outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/15"
                        maxLength={40}
                      />
                      {errors.platformInput && (
                        <p className="mt-2 text-[11px] text-danger">
                          {errors.platformInput}
                        </p>
                      )}
                    </label>
                  )}
                </div>
              ) : (
                <div className="mt-4 grid gap-4">
                  <label className="block">
                    <span className="text-[11px] font-semibold text-foreground/60">
                      Address line 1 *
                    </span>
                    <input
                      value={address1}
                      onChange={(e) => setAddress1(sanitizeFormValue(e.target.value, 40))}
                      placeholder="Address line 1"
                      className="mt-2 w-full rounded-xl border border-border bg-background px-4 py-2.5 text-[13px] text-foreground outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/15"
                      maxLength={40}
                    />
                    {errors.address1 && (
                      <p className="mt-2 text-[11px] text-danger">
                        {errors.address1}
                      </p>
                    )}
                  </label>
                  <label className="block">
                    <span className="text-[11px] font-semibold text-foreground/60">
                      Address line 2 *
                    </span>
                    <input
                      value={address2}
                      onChange={(e) => setAddress2(sanitizeFormValue(e.target.value, 40))}
                      placeholder="Address line 2"
                      className="mt-2 w-full rounded-xl border border-border bg-background px-4 py-2.5 text-[13px] text-foreground outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/15"
                      maxLength={40}
                    />
                    {errors.address2 && (
                      <p className="mt-2 text-[11px] text-danger">
                        {errors.address2}
                      </p>
                    )}
                  </label>
                </div>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-border p-6">

            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-[13px] font-bold text-foreground">
                  Chief Guest details
                </h2>
              </div>
            </div>

            <div className="mt-5 flex gap-3 flex-row w-full">
          

              <div className="grid gap-4 w-[60%]">
                <label className="block">
                  <span className="text-[11px] font-semibold text-foreground/60">
                    Full Name *
                  </span>
                  <input
                    type="text"
                    value={chiefName}
                    onChange={(e) => setChiefName(sanitizeName(e.target.value))}
                    placeholder="Full Name"
                    className="mt-2 w-full rounded-xl border border-border bg-background px-4 py-2.5 text-[13px] text-foreground outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/15"
                    maxLength={30}
                  />
                  {errors.chiefName && (
                    <p className="mt-2 text-[11px] text-danger">
                      {errors.chiefName}
                    </p>
                  )}
                </label>
                <label className="block">
                  <span className="text-[9px] font-semibold text-foreground/60">
                    Designation *
                  </span>
                  <select
                    value={chiefDesignation}
                    onChange={(e) => setChiefDesignation(sanitizeFormValue(e.target.value, 40))}
                    className="mt-2 w-full rounded-xl border border-border bg-background px-4 py-2.5 text-[13px] text-foreground outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/15"
                  >
                    <option value="">Select designation</option>
                    {companyDesignations.length ? (
                      companyDesignations.map((label, index) => (
                        <option key={`${label}-${index}`} value={label}>
                          {label}
                        </option>
                      ))
                    ) : (
                      <option value="">No designations found</option>
                    )}
                  </select>
                  {errors.chiefDesignation && (
                    <p className="mt-2 text-[11px] text-danger">
                      {errors.chiefDesignation}
                    </p>
                  )}
                </label>
              </div>

                  <div className="flex justify-center h-full items-center w-[40%]">
                <div className="rounded-3xl ">
                  <div className="flex items-center mt-1 justify-between gap-4">
                    <div>
                      <p className="text-[11px] font-semibold text-foreground/60">
                        Chief Image
                      </p>
                     
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setShowChiefImageModal(true)}
                    className=" w-[100px] mt-4 h-[120px] rounded-xl border border-dashed border-border bg-muted/10 p-4 text-left transition hover:border-accent/60"
                  >
                    {chiefImage ? (
                      <div className="flex items-center gap-4">
                        <img
                          src={
                            typeof chiefImage === "string"
                              ? chiefImage
                              : URL.createObjectURL(chiefImage)
                          }
                          alt="Chief selected"
                          className=" rounded-3xl object-cover"
                        />
                        
                      </div>
                    ) : (
                      <div onClick={() => setShowChiefImageModal(true)} className="flex justify-center flex-col items-center gap-3">
                        <span className="flex h-10 w-10 items-center justify-center rounded-full border border-dashed border-border text-muted-foreground">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground group-hover:text-accent transition-colors">
              <path d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Zm10.5-11.25h.008v.008h-.008V8.25Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z"/>
            </svg>
                        </span>
                        <span className="text-[9px] text-foreground/80">
                          Add Image
                        </span>
                      </div>
                    )}
                  </button>
                </div>
              </div>
            </div>


          </div>
          <div className="rounded-2xl border border-border p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-[13px] font-bold text-foreground">
                  Host Details
                </h2>
                
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setHostMode("add")}
                  className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                    hostMode === "add"
                      ? "bg-accent text-white"
                      : "border border-border bg-background text-foreground hover:bg-muted/30"
                  }`}
                >
                  ADD HOST
                </button>
                <button
                  type="button"
                  onClick={() => setHostMode("none")}
                  className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                    hostMode === "none"
                      ? "bg-accent text-white"
                      : "border border-border bg-background text-foreground hover:bg-muted/30"
                  }`}
                >
                  NONE
                </button>
              </div>
            </div>

            {hostMode === "add" ? (
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className="text-[11px] font-semibold text-foreground/60">
                    Name *
                  </span>
                  <input
                    type="text"
                    value={hostName}
                    readOnly
                    placeholder="Name"
                    className="mt-2 w-full rounded-xl border border-border bg-muted/20 px-4 py-2.5 text-[13px] text-foreground outline-none cursor-not-allowed"
                  />
                  {errors.hostName && (
                    <p className="mt-2 text-[11px] text-danger">
                      {errors.hostName}
                    </p>
                  )}
                </label>
                <label className="block">
                  <span className="text-[11px] font-semibold text-foreground/60">
                    Designation *
                  </span>
                  <input
                    type="text"
                    value={hostDesignation}
                    readOnly
                    placeholder="Designation"
                    className="mt-2 w-full rounded-xl border border-border bg-muted/20 px-4 py-2.5 text-[13px] text-foreground outline-none cursor-not-allowed"
                  />
                  {errors.hostDesignation && (
                    <p className="mt-2 text-[11px] text-danger">
                      {errors.hostDesignation}
                    </p>
                  )}
                </label>
              </div>
            ) : (
             null
            )}
          </div>

          <div className="flex flex-col gap-4 rounded-2xl p-2 sm:flex-row sm:items-center sm:justify-between">
           
            <button
              type="button"
              onClick={handleSave}
              className="inline-flex items-center justify-center rounded-2xl bg-accent px-6 py-3 text-[13px] font-bold text-white transition hover:bg-accent/90 shadow-lg shadow-accent/20"
            >
              Save & Create
            </button>
          </div>

          {savedMessage && (
            <div className="rounded-3xl border border-border bg-muted p-4 text-[13px] text-foreground/80">
              {savedMessage}
            </div>
          )}
        </div>
      </div>

      <Modal isOpen={open} onOpenChange={(o) => { if (!o) { setOpen(false); setEditingImage(null); } }}>
        <Modal.Backdrop>
          <Modal.Container placement="center" size="full">
            <Modal.Dialog className="w-full max-w-3xl bg-transparent shadow-none">
              <ImageEditorCanvas
                src={editingImage}
                onDone={(blob) => onImageDone && onImageDone(blob)}
                onCancel={() => {
                  setOpen(false);
                  setEditingImage(null);
                }}
                setOpen={setOpen}
                editingType={editingType}
                setEditingType={setEditingType}
                enableEnhance={enhanceEnabled}
              />
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal>

      <Modal isOpen={showChiefImageModal} onOpenChange={setShowChiefImageModal}>
        <Modal.Backdrop>
          <Modal.Container className="w-full" placement="center">
            <Modal.Dialog className="rounded-2xl shadow-2xl bg-background">
              <Modal.CloseTrigger />

              <Modal.Header>
                <Modal.Heading className="text-xl font-bold text-foreground">
                  Select Chief Guest Image
                </Modal.Heading>
              </Modal.Header>

              <Modal.Body
                data-keyboard-modal-scroll
                className="space-y-6 p-5"
              >
                <div className="rounded-2xl border border-border p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-[13px] font-bold text-foreground">
                        Upload manually
                      </p>
                     
                    </div>
                    
                  </div>
                  <div className="mt-4">
                    <ImageUploadWithBgRemove
                      onImageReady={(blob) => {
                        setChiefImage(blob);
                        setChiefImageOption("upload");
                      }}
                      setEditingImage={setEditingImage}
                      setOnImageDone={setOnImageDone}
                      setEnhanceEnabled={setEnhanceEnabled}
                      onProcessingChange={setRemoveBgProcessing}
                      currentImage={chiefImage}
                      setOpen={(val) => {
                        // Close modal instantly when editor opens (file selected)
                        if (val === true) setShowChiefImageModal(false);
                        setOpen(val);
                      }}
                      open={open}
                      type="chiefGuest"
                      editingType={editingType}
                      setEditingType={setEditingType}
                    />

                    {/* {(editingImage || chiefImage) && (
                      <div className="flex flex-col justify-center items-centermt-4 rounded-3xl border border-border bg-background p-4">
                        <p className="text-[11px] font-semibold text-foreground/60">Preview</p>
                        <img
                          src={
                            editingImage
                              ? editingImage
                              : typeof chiefImage === "string"
                              ? chiefImage
                              : chiefImage
                              ? URL.createObjectURL(chiefImage)
                              : ""
                          }
                          alt="Manual preview"
                          className="mt-3 w-[100px] h-[150px] rounded-3xl object-contain bg-background"
                        />
                      </div>
                    )} */}
                  </div>
                </div>

                <div className="rounded-2xl border border-border p-4">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-[13px] font-bold text-foreground">
                        Select from company
                      </p>
                  
                    </div>
                   
                  </div>
                  <div className="mt-4">
                    {normalizedCompanyImages.length === 0 ? (
                      <div className="rounded-3xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
                        No company images available.
                      </div>
                    ) : (
                      <>
                        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                          <div className="relative w-full sm:max-w-xs">
                            <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-muted-foreground">
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="11" cy="11" r="8" />
                                <path d="m21 21-4.35-4.35" />
                              </svg>
                            </span>
                            <input
                              type="search"
                              value={companyImageSearch}
                              onChange={(e) => setCompanyImageSearch(e.target.value)}
                              placeholder="Search by name"
                              aria-label="Search top upline by name"
                              autoComplete="off"
                              enterKeyHint="search"
                              className="w-full rounded-full border border-border bg-background py-2.5 pl-10 pr-3 text-[12px] text-foreground outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/15"
                            />
                          </div>
                          <div className="text-[11px] text-muted-foreground">
                            {filteredCompanyImages.length} image{filteredCompanyImages.length === 1 ? "" : "s"}
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                          {companyPageItems.map((item, index) => {
                            const isSelected = item.link === chiefImage;
                            return (
                              <button
                                key={item.id || `company-${index}`}
                                type="button"
                                onClick={() => {
                                  setChiefImage(item.link);
                                  setChiefImageOption("company");
                                  setShowChiefImageModal(false);
                                }}
                                className={`group flex flex-col items-center rounded-3xl border-2 p-2 text-left transition ${
                                  isSelected
                                    ? "border-accent bg-accent/10"
                                    : "border-border bg-background hover:border-accent"
                                }`}
                              >
                                <div className="relative w-full overflow-hidden rounded-3xl bg-muted/10">
                                  {item.link ? (
                                    <img
                                      src={item.link}
                                      alt={item.name || `Company option ${index + 1}`}
                                      className="h-20 w-full object-cover"
                                    />
                                  ) : (
                                    <div className="flex h-20 items-center justify-center text-[11px] text-muted-foreground">
                                      No image
                                    </div>
                                  )}
                                  {isSelected && (
                                    <span className="absolute right-2 top-2 inline-flex h-5 w-5 items-center justify-center rounded-full bg-accent text-white shadow-md">
                                      ✓
                                    </span>
                                  )}
                                </div>
                                <p className="mt-2 w-full truncate text-[11px] font-semibold text-foreground">
                                  {item.name || `Image ${index + 1}`}
                                </p>
                              </button>
                            );
                          })}
                        </div>

                        {totalCompanyPages > 1 && (
                          <div className="mt-4 flex items-center justify-between gap-2 text-[11px] text-muted-foreground">
                            <div>
                              Page {companyImagePage} of {totalCompanyPages}
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                disabled={companyImagePage <= 1}
                                onClick={() => setCompanyImagePage((page) => Math.max(1, page - 1))}
                                className="inline-flex h-8 items-center justify-center rounded-full border border-border px-3 text-sm transition disabled:opacity-40"
                              >
                                ‹
                              </button>
                              <button
                                type="button"
                                disabled={companyImagePage >= totalCompanyPages}
                                onClick={() => setCompanyImagePage((page) => Math.min(totalCompanyPages, page + 1))}
                                className="inline-flex h-8 items-center justify-center rounded-full border border-border px-3 text-sm transition disabled:opacity-40"
                              >
                                ›
                              </button>
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </Modal.Body>
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal>

      {removeBgProcessing.active && (
        <RemoveBgLoadingOverlay
          previewUrl={removeBgProcessing.previewUrl}
          progressMessage={removeBgProcessing.progressMessage}
          progressPct={removeBgProcessing.progressPct}
          onCancel={removeBgProcessing.onCancel}
        />
      )}
    </div>
  );
}
