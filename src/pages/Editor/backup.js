import React, { useState, useEffect, useRef, useCallback } from "react";
import { Stage, Layer, Text, Image, Transformer } from "react-konva";
import useImage from "use-image";
import ListOfTemplates from "./components/ListOfTemplates";
import { Button } from "@heroui/react";
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  updateDoc,
} from "firebase/firestore";
import { db } from "@firebase-config"; // ← adjust to your firebase config path
import { getUser } from "../../utils/authStorage";

const STAGE_WIDTH = 320;
const STAGE_HEIGHT = 320;
const EXPORT_PIXEL_RATIO = 6;

export const GENERAL_SELECT_TYPES = [
  { name: "Motivational", value: "Motivational" },
  { name: "Greeting & Wishes", value: "Greeting_Wishes" },
  {
    name: "Thank You (Birthday & Anniversary)",
    value: "ThankYou_Birthday_Anniversary",
  },
];

const clamp = (val, min, max) => Math.min(Math.max(val, min), max);

// ── Parse "DD MMM YYYY" → Date ────────────────────────────────────────────────
const parseExpiryDate = (dateStr) => {
  if (!dateStr) return null;
  const months = {
    Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5,
    Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11,
  };
  const [day, mon, year] = dateStr.split(" ");
  const month = months[mon];
  if (month === undefined) return null;
  return new Date(Number(year), month, Number(day), 23, 59, 59);
};

// ── Share modal component ─────────────────────────────────────────────────────
function ShareModal({ imageUri, onClose }) {
  const [copied, setCopied] = useState(false);

  const handleNativeShare = async () => {
    try {
      if (navigator.share) {
        // Convert dataURL to Blob for native share
        const res = await fetch(imageUri);
        const blob = await res.blob();
        const file = new File([blob], "mlmbooster.png", { type: "image/png" });
        await navigator.share({
          title: "MLM LIVE",
          text: "Check this out!",
          files: [file],
        });
      } else {
        alert("Native sharing not supported on this browser.");
      }
    } catch (err) {
      
    }
  };

  const handleWhatsApp = () => {
    // WhatsApp can only share URLs, not blobs — open a generic message
    window.open(`https://wa.me/?text=Check%20this%20out!`, "_blank");
  };

  const handleCopyImage = async () => {
    try {
      const res = await fetch(imageUri);
      const blob = await res.blob();
      await navigator.clipboard.write([
        new ClipboardItem({ "image/png": blob }),
      ]);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      alert("Copy not supported on this browser.");
    }
  };

  const handleDownloadAgain = () => {
    const link = document.createElement("a");
    link.download = "mlmbooster.png";
    link.href = imageUri;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.55)",
        zIndex: 1000,
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "center",
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: "#fff",
          borderRadius: "20px 20px 0 0",
          padding: "24px 20px 32px",
          width: "100%",
          maxWidth: 480,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Preview */}
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 16 }}>
          <img
            src={imageUri}
            alt="Exported"
            style={{
              width: 120,
              height: 120,
              objectFit: "cover",
              borderRadius: 12,
              boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
            }}
          />
        </div>

        <p style={{ textAlign: "center", fontWeight: 700, fontSize: 16, marginBottom: 20 }}>
          🎉 Image Ready! Share it now
        </p>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          {/* Native Share */}
          <button onClick={handleNativeShare} style={btnStyle("#6C63FF")}>
            <span style={{ fontSize: 20 }}>📤</span>
            <span>Share</span>
          </button>

          {/* WhatsApp */}
          <button onClick={handleWhatsApp} style={btnStyle("#25D366")}>
            <span style={{ fontSize: 20 }}>💬</span>
            <span>WhatsApp</span>
          </button>

          {/* Copy Image */}
          <button onClick={handleCopyImage} style={btnStyle("#FF6B35")}>
            <span style={{ fontSize: 20 }}>📋</span>
            <span>{copied ? "Copied!" : "Copy Image"}</span>
          </button>

          {/* Download Again */}
          <button onClick={handleDownloadAgain} style={btnStyle("#0EA5E9")}>
            <span style={{ fontSize: 20 }}>⬇️</span>
            <span>Save Again</span>
          </button>
        </div>

        <button
          onClick={onClose}
          style={{
            marginTop: 16,
            width: "100%",
            padding: "10px",
            borderRadius: 12,
            border: "1.5px solid #e5e7eb",
            background: "transparent",
            fontSize: 14,
            cursor: "pointer",
            color: "#6b7280",
          }}
        >
          Close
        </button>
      </div>
    </div>
  );
}

const btnStyle = (bg) => ({
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  gap: 6,
  padding: "14px 8px",
  borderRadius: 14,
  border: "none",
  background: bg,
  color: "#fff",
  fontSize: 13,
  fontWeight: 600,
  cursor: "pointer",
  boxShadow: `0 4px 12px ${bg}55`,
});

// ── Toast component ───────────────────────────────────────────────────────────
function Toast({ message, type }) {
  const colors = { error: "#ef4444", success: "#22c55e", info: "#6366f1" };
  return (
    <div
      style={{
        position: "fixed",
        top: 20,
        left: "50%",
        transform: "translateX(-50%)",
        background: colors[type] || colors.info,
        color: "#fff",
        padding: "10px 20px",
        borderRadius: 30,
        fontWeight: 600,
        fontSize: 13,
        zIndex: 2000,
        boxShadow: "0 4px 16px rgba(0,0,0,0.2)",
        whiteSpace: "nowrap",
      }}
    >
      {message}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
function GeneralEditPage({
  selectedTopFrame,
  setIsOpenFtr,
  setIsOpen,
  selectedFooterFrame,
  middaleImage,
  setmiddaleImage,
}) {
  const stageRef = useRef(null);
  const profileImageRef = useRef(null);
  const transformerRef = useRef(null);
  const stageContainerRef = useRef(null);

  const [mlmForm, setMlmForm] = useState(null);
  const [mlmProfile, setMlmProfile] = useState(null);
  const [selected, setSelected] = useState(null);
  const [isProfileSelected, setIsProfileSelected] = useState(false);
  const [toolbarPos, setToolbarPos] = useState({ x: 0, y: 0, width: 0 });

  // ── Subscription & user state ─────────────────────────────────────────────
  const [activeSub, setActiveSub] = useState(null);   // single active sub object
  const [userData, setUserData] = useState(null);      // user doc
  const [subLoading, setSubLoading] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);
  const [toast, setToast] = useState(null);            // { message, type }
  const [exportedUri, setExportedUri] = useState(null); // for share modal

  const showToast = (message, type = "info", duration = 3000) => {
    setToast({ message, type });
    setTimeout(() => setToast(null), duration);
  };

  const isRight = selected?.position === "right";
  const selll = getSelType();
  const isSubGeneralType = GENERAL_SELECT_TYPES.some(
    (t) => t.value === selll?.type,
  );

  const [profileAttrs, setProfileAttrs] = useState({
    x: isRight ? 155 : 165,
    y: 80,
    width: 160,
    height: 210,
    scaleX: isRight ? -1 : 1,
    offsetX: 0,
  });

  useEffect(() => {
    setProfileAttrs((prev) => ({
      ...prev,
      x: isRight ? 155 : 165,
      y: 80,
      width: 160,
      height: 210,
      scaleX: isRight ? -1 : 1,
      offsetX: 0,
    }));
  }, [isRight]);

  function getSelType() {
    try {
      return JSON.parse(localStorage.getItem("selType")) || {};
    } catch {
      return {};
    }
  }

  // ── Load mlm form/profile from localStorage ───────────────────────────────
  useEffect(() => {
    const formData = localStorage.getItem("mlmform");
    const profileData = sessionStorage.getItem("mlmProfile");
    if (formData) setMlmForm(JSON.parse(formData));
    if (profileData) {
      const parsed = JSON.parse(profileData);
      setMlmProfile(parsed);
      setmiddaleImage(parsed?.profileImageURLs?.[0] || null);
    }
  }, []);

  // ── Fetch ONLY active subscription + user referCredits ────────────────────
  const fetchSubscriptionAndUser = useCallback(async () => {
    try {
      setSubLoading(true);
      const user = getUser();
      if (!user) return;
      const mobileNo = user?.mobileNo;
      if (!mobileNo) return;

      // Only active subscription
      const activeQuery = query(
        collection(db, "subscription"),
        where("mobileNo", "==", mobileNo),
        where("Active", "==", true),
        where("Expire", "==", false),
      );

      // Fetch user doc for referCredits
      const userQuery = query(
        collection(db, "users"),
        where("mobileNo", "==", mobileNo),
      );

      const [activeSnap, userSnap] = await Promise.all([
        getDocs(activeQuery),
        getDocs(userQuery),
      ]);

      // Take the most recent active sub
      const activeSubs = activeSnap.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .sort((a, b) => (b.PurchaseAt?.seconds ?? 0) - (a.PurchaseAt?.seconds ?? 0));

      setActiveSub(activeSubs[0] || null);

      if (!userSnap.empty) {
        setUserData({ id: userSnap.docs[0].id, ...userSnap.docs[0].data() });
      }
    } catch (err) {
      
    } finally {
      setSubLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSubscriptionAndUser();
  }, [fetchSubscriptionAndUser]);

  // ── Transformer sync ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!transformerRef.current || !profileImageRef.current) return;
    if (isProfileSelected) {
      transformerRef.current.nodes([profileImageRef.current]);
      updateToolbarPos();
    } else {
      transformerRef.current.nodes([]);
    }
    transformerRef.current.getLayer()?.batchDraw();
  }, [isProfileSelected]);

  const updateToolbarPos = () => {
    const { x, y, width, scaleX } = profileAttrs;
    const leftEdge = scaleX === -1 ? x - width : x;
    setToolbarPos({ x: leftEdge, y, width });
  };

  useEffect(() => {
    if (isProfileSelected) updateToolbarPos();
  }, [profileAttrs, isProfileSelected]);

  // ── Computed display values ───────────────────────────────────────────────

  const SocialURLs = mlmProfile?.socials || {};
  const trimText = (value, maxLength = 6) =>
    typeof value === "string" ? value.slice(0, maxLength) : "";
  const socialHandles = [
    trimText(SocialURLs.Youtube),
    trimText(SocialURLs.Instagram),
    trimText(SocialURLs.Facebook),
    trimText(SocialURLs.X),
  ].filter(Boolean);
  const socialText = socialHandles.join(" ");
  const topuplineURLs = mlmProfile?.topuplineURLs || [];
  const profileName = mlmForm?.promoter?.name
    ? mlmForm.promoter.name
    : mlmProfile?.fullName || "";
  const profileMobile = mlmForm?.promoter?.name
    ? mlmForm.promoter.mobile
    : mlmProfile?.mobile || "";
  const designation = mlmForm?.promoter?.name
    ? mlmForm.promoter.role
    : mlmProfile?.designation;

  const [bgImage] = useImage(`${selected?.url || ""}`, "anonymous");
  const [Imagefooter] = useImage(
    selectedFooterFrame?.value ||
      "https://firebasestorage.googleapis.com/v0/b/mlmbooster.firebasestorage.app/o/graphics%2Flinks%2F1775306097021_qqhdl6.webp?alt=media&token=54d461df-8c6a-459d-be1d-505e7471ba50",
    "anonymous",
  );
  const [Imagel2] = useImage(mlmProfile?.logoURLs?.[0] || "", "anonymous");
  const [Imagel3] = useImage(mlmProfile?.logoURLs?.[1] || "", "anonymous");
  const [Imagel4] = useImage(mlmProfile?.logoURLs?.[2] || "", "anonymous");
  const [ImagetopFrame] = useImage(selectedTopFrame?.value || "", "anonymous");
  const [Imagetop1] = useImage(topuplineURLs?.[0] || "", "anonymous");
  const [Imagetop2] = useImage(topuplineURLs?.[1] || "", "anonymous");
  const [Imagetop3] = useImage(topuplineURLs?.[2] || "", "anonymous");
  const [Imagetop4] = useImage(topuplineURLs?.[3] || "", "anonymous");
  const [Imagetop5] = useImage(topuplineURLs?.[4] || "", "anonymous");
  const [Imagetop6] = useImage(topuplineURLs?.[5] || "", "anonymous");
  const [Imagetop7] = useImage(topuplineURLs?.[6] || "", "anonymous");
  const [Imagetop8] = useImage(topuplineURLs?.[7] || "", "anonymous");
  const [ImageProfile] = useImage(
    mlmForm?.promoter?.name ? `${mlmForm.promoter.image}` : `${middaleImage || ""}`,
    "anonymous",
  );

  // ── Download badge: plan downloads + referCredits ─────────────────────────
  const planDownloads = activeSub?.download ?? 0;
  const referCredits = userData?.referCredit ?? 0;
  const totalDownloadsAvailable = planDownloads + referCredits;

  // ── Core export guard + decrement logic ───────────────────────────────────
  const handleExport = async () => {
    // 1️⃣ Check if there's an active subscription
    if (!activeSub) {
      showToast("No active subscription found. Please subscribe to export.", "error");
      return;
    }

    // 2️⃣ Check expiry date
    const expiry = parseExpiryDate(activeSub.expirydate);
    if (expiry && new Date() > expiry) {
      showToast("Your subscription has expired. Please renew to continue.", "error");
      return;
    }

    // 3️⃣ Check total downloads (plan + referCredits)
    if (totalDownloadsAvailable <= 0) {
      showToast("You have no downloads remaining. Please renew your plan.", "error");
      return;
    }

    setExportLoading(true);
    setIsProfileSelected(false);

    // Small delay to let transformer deselect before canvas capture
    await new Promise((res) => setTimeout(res, 80));

    try {
      // 4️⃣ Generate the image
      const uri = stageRef.current.toDataURL({
        pixelRatio: EXPORT_PIXEL_RATIO,
        mimeType: "image/png",
        quality: 1,
      });

      // 5️⃣ Trigger actual download / RN bridge
      if (window.ReactNativeWebView) {
        window.ReactNativeWebView.postMessage(
          JSON.stringify({ type: "DOWNLOAD_IMAGE", base64: uri, fileName: "mlmbooster.png" })
        );
      } else {
        const link = document.createElement("a");
        link.download = "mlmbooster.png";
        link.href = uri;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }

      // 6️⃣ Decrement plan download first; if 0 fall to referCredits
      if (planDownloads > 0) {
        const newDownload = planDownloads - 1;
        const isLastDownload = newDownload === 0 && referCredits === 0;

        const subRef = doc(db, "subscription", activeSub.id);
        await updateDoc(subRef, {
          download: newDownload,
          ...(isLastDownload ? { Active: false, Expire: true } : {}),
        });

        // Update local state
        setActiveSub((prev) => ({
          ...prev,
          download: newDownload,
          ...(isLastDownload ? { Active: false, Expire: true } : {}),
        }));

        if (isLastDownload) {
          showToast("Last download used! Your plan has now expired.", "error", 4000);
        } else {
          showToast(`Downloaded! ${newDownload} plan downloads remaining.`, "success");
        }
      } else if (referCredits > 0) {
        // Plan downloads exhausted — use referCredits
        const newCredits = referCredits - 1;
        const userRef = doc(db, "users", userData.id);
        await updateDoc(userRef, { referCredit: newCredits });

        setUserData((prev) => ({ ...prev, referCredit: newCredits }));

        if (newCredits === 0) {
          showToast("Last refer credit used! No downloads remaining.", "error", 4000);
        } else {
          showToast(`Downloaded! ${newCredits} refer credits remaining.`, "success");
        }
      }

      // 7️⃣ Show share modal
      setExportedUri(uri);
    } catch (err) {
      
      showToast("Export failed. Please try again.", "error");
    } finally {
      setExportLoading(false);
    }
  };

  // ── Flip horizontal ───────────────────────────────────────────────────────
  const handleFlip = (e) => {
    e.stopPropagation();
    setProfileAttrs((prev) => {
      const isFlipped = prev.scaleX === -1;
      return {
        ...prev,
        scaleX: isFlipped ? 1 : -1,
        offsetX: isFlipped ? 0 : prev.width,
      };
    });
  };

  const handleProfileClick = () => {
    setIsProfileSelected((prev) => !prev);
  };

  const handleDragMove = (e) => {
    const node = e.target;
    const { width, height } = profileAttrs;
    const isFlipped = profileAttrs.scaleX === -1;
    const clampedX = isFlipped
      ? clamp(node.x(), width, STAGE_WIDTH)
      : clamp(node.x(), 0, STAGE_WIDTH - width);
    const clampedY = clamp(node.y(), 0, STAGE_HEIGHT - height);
    node.x(clampedX);
    node.y(clampedY);
  };

  const handleDragEnd = (e) => {
    setProfileAttrs((prev) => ({ ...prev, x: e.target.x(), y: e.target.y() }));
  };

  const handleTransformEnd = () => {
    const node = profileImageRef.current;
    if (!node) return;
    const newWidth = Math.max(20, node.width() * Math.abs(node.scaleX()));
    const newHeight = Math.max(20, node.height() * Math.abs(node.scaleY()));
    const isFlipped = profileAttrs.scaleX === -1;
    node.scaleX(isFlipped ? -1 : 1);
    node.scaleY(1);
    setProfileAttrs((prev) => ({
      ...prev,
      x: node.x(),
      y: node.y(),
      width: newWidth,
      height: newHeight,
      offsetX: isFlipped ? newWidth : 0,
    }));
  };

  const handleStageMouseDown = (e) => {
    if (e.target === e.target.getStage()) setIsProfileSelected(false);
  };

  const boundBoxFunc = (oldBox, newBox) => {
    if (newBox.width < 20 || newBox.height < 20) return oldBox;
    const clampedX = clamp(newBox.x, 0, STAGE_WIDTH - newBox.width);
    const clampedY = clamp(newBox.y, 0, STAGE_HEIGHT - newBox.height);
    const clampedWidth = clamp(newBox.width, 20, STAGE_WIDTH - clamp(newBox.x, 0, STAGE_WIDTH));
    const clampedHeight = clamp(newBox.height, 20, STAGE_HEIGHT - clamp(newBox.y, 0, STAGE_HEIGHT));
    return { ...newBox, x: clampedX, y: clampedY, width: clampedWidth, height: clampedHeight };
  };

  const ActualProfilename = profileName?.toUpperCase() || "PROFILENAME";
  const ActualDesignation = designation?.toUpperCase() || "DESIGNATION";

  let ProfilefontSize = 10;
  if (ActualProfilename?.length > 10 && ActualProfilename?.length <= 19) ProfilefontSize = 7;
  else if (ActualProfilename?.length > 19) ProfilefontSize = 6;

  let DesignationfontSize = 8;
  if (ActualDesignation?.length > 10 && ActualDesignation?.length <= 19) DesignationfontSize = 6;
  else if (ActualDesignation?.length > 19) DesignationfontSize = 5;

  const TOOLBAR_HEIGHT = 28;
  const TOOLBAR_WIDTH = 36;
  const toolbarTop = Math.max(0, toolbarPos.y - TOOLBAR_HEIGHT - 6);
  const toolbarLeft = clamp(
    toolbarPos.x + toolbarPos.width / 2 - TOOLBAR_WIDTH / 2,
    0,
    STAGE_WIDTH - TOOLBAR_WIDTH,
  );

  // ── Download button label ─────────────────────────────────────────────────
  const downloadBtnLabel = () => {
    if (subLoading) return "Loading...";
    if (exportLoading) return "Exporting...";
    if (!activeSub) return "No Plan";
    return `Download (${totalDownloadsAvailable})`;
  };

  const canExport = !subLoading && !exportLoading && activeSub && totalDownloadsAvailable > 0;

  return (
    <div className="flex flex-col justify-start items-center h-full">
      {/* Toast notification */}
      {toast && <Toast message={toast.message} type={toast.type} />}

      {/* Share modal */}
      {exportedUri && (
        <ShareModal imageUri={exportedUri} onClose={() => setExportedUri(null)} />
      )}

      <div
        ref={stageContainerRef}
        className="relative mt-2"
        style={{ width: STAGE_WIDTH, height: STAGE_HEIGHT }}
      >
        {/* Floating flip toolbar */}
        {isProfileSelected && (
          <div
            style={{
              position: "absolute",
              top: toolbarTop,
              left: toolbarLeft,
              zIndex: 10,
              display: "flex",
              alignItems: "center",
              gap: 4,
              background: "rgba(203,202,202,0.7)",
              borderRadius: 30,
              padding: "4px",
              boxShadow: "0 2px 8px rgba(136,133,133,0.35)",
            }}
          >
            <button
              title="Flip horizontal"
              onClick={handleFlip}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                padding: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="white" xmlns="http://www.w3.org/2000/svg">
                <path d="M3 17.25V21h3.75L19.81 7.94l-3.75-3.75L3 17.25z" />
                <path d="M20.71 6.04a1 1 0 0 0 0-1.41L19.37 3.29a1 1 0 0 0-1.41 0l-1.13 1.13 3.75 3.75 1.13-1.13z" />
              </svg>
            </button>
          </div>
        )}

        <Stage
          ref={stageRef}
          width={STAGE_WIDTH}
          height={STAGE_HEIGHT}
          className="bg-slate-100 shadow-lg"
          onMouseDown={handleStageMouseDown}
          onTouchStart={handleStageMouseDown}
        >
          <Layer>
            <Image image={bgImage} x={0} y={0} width={STAGE_WIDTH} height={STAGE_HEIGHT} />
            <Image image={Imagel2} x={3} y={2} width={25} height={25} />
            <Image image={Imagel3} x={260} y={2} width={25} height={25} />
            <Image image={Imagel4} x={290} y={2} width={25} height={25} />

            {/* topupline — auto-centered */}
            {(() => {
              const slots = [
                { img: Imagetop1 }, { img: Imagetop2 }, { img: Imagetop3 },
                { img: Imagetop4 }, { img: Imagetop5 }, { img: Imagetop6 }, { img: Imagetop7 },
              ].filter((s) => s.img);
              const SLOT_SIZE = 30;
              const totalWidth = slots.length * SLOT_SIZE;
              const extraOffset = slots.length === 7 ? -10 : 0;
              const startX = (STAGE_WIDTH - totalWidth) / 2 + extraOffset;
              return slots.map((slot, i) => {
                const x = startX + i * SLOT_SIZE;
                return (
                  <React.Fragment key={i}>
                    <Image image={ImagetopFrame} x={x} y={2} width={SLOT_SIZE} height={SLOT_SIZE} />
                    <Image
                      image={slot.img}
                      x={x + 6} y={6} width={18} height={18}
                      onTap={() => setIsOpen(true)}
                      onClick={() => setIsOpen(true)}
                    />
                  </React.Fragment>
                );
              });
            })()}

            {isSubGeneralType ? (
              <Image
                ref={profileImageRef}
                image={ImageProfile}
                x={profileAttrs.x}
                y={profileAttrs.y}
                width={profileAttrs.width}
                height={profileAttrs.height}
                scaleX={profileAttrs.scaleX}
                offsetX={profileAttrs.offsetX}
                draggable
                onClick={handleProfileClick}
                onTap={handleProfileClick}
                onDragMove={handleDragMove}
                onDragEnd={handleDragEnd}
                onTransformEnd={handleTransformEnd}
              />
            ) : null}

            {isRight ? (
              <Image
                scaleX={-1} scaleY={1}
                image={Imagefooter}
                x={320} y={280} width={350} height={41}
                onClick={() => setIsOpenFtr(true)}
                onTap={() => setIsOpenFtr(true)}
              />
            ) : (
              <Image
                image={Imagefooter}
                x={0} y={280} width={350} height={41}
                onClick={() => setIsOpenFtr(true)}
                onTap={() => setIsOpenFtr(true)}
              />
            )}

            {isRight ? (
              <>
                <Text x={195} y={295} width={150} height={5} text="CALL FOR ASSOCIATION" fontSize={7} fill="white" fontStyle="bold" verticalAlign="middle" onClick={() => setIsOpenFtr(true)} onTap={() => setIsOpenFtr(true)} />
                <Text x={190} y={297} width={150} height={20} text={`+91${profileMobile}` || "+91XXXXXXXXXX"} fontSize={12} fill="white" fontStyle="bold" verticalAlign="middle" onClick={() => setIsOpenFtr(true)} onTap={() => setIsOpenFtr(true)} />
                <Text x={isSubGeneralType ? -10 : 70} y={295} width={isSubGeneralType ? 205 : 120} height={2} text={ActualProfilename} fontSize={ProfilefontSize} fill="white" fontStyle="1000" align="center" verticalAlign="middle" onClick={() => setIsOpenFtr(true)} onTap={() => setIsOpenFtr(true)} />
                <Text x={isSubGeneralType ? -10 : 76} y={303} width={isSubGeneralType ? 205 : 120} height={2} text={ActualDesignation} fontSize={DesignationfontSize} fill="white" fontStyle="bold" align="center" verticalAlign="middle" onClick={() => setIsOpenFtr(true)} onTap={() => setIsOpenFtr(true)} />
                <Text x={isSubGeneralType ? -10 : 76} y={311} width={isSubGeneralType ? 205 : 120} height={2} text={ActualDesignation} fontSize={DesignationfontSize} fill="white" fontStyle="bold" align="center" verticalAlign="middle" onClick={() => setIsOpenFtr(true)} onTap={() => setIsOpenFtr(true)} />
              </>
            ) : (
              <>
                <Text x={43} y={295} width={150} height={5} text="CALL FOR ASSOCIATION" fontSize={7} fill="white" fontStyle="bold" verticalAlign="middle" onClick={() => setIsOpenFtr(true)} onTap={() => setIsOpenFtr(true)} />
                <Text x={39} y={297} width={150} height={20} text={`+91${profileMobile}` || "+91XXXXXXXXXX"} fontSize={12} fill="white" fontStyle="bold" verticalAlign="middle" onClick={() => setIsOpenFtr(true)} onTap={() => setIsOpenFtr(true)} />

                <Text x={133} y={295} width={isSubGeneralType ? 205 : 120} height={2} text={ActualProfilename} fontSize={ProfilefontSize} fill="white" fontStyle="1000" align="center" verticalAlign="middle" onClick={() => setIsOpenFtr(true)} onTap={() => setIsOpenFtr(true)} />
                <Text x={133} y={303} width={isSubGeneralType ? 205 : 120} height={2} text={ActualDesignation} fontSize={DesignationfontSize} fill="white" fontStyle="bold" align="center" verticalAlign="middle" onClick={() => setIsOpenFtr(true)} onTap={() => setIsOpenFtr(true)} />
                {/* social media icon 4 youtube , instagram , facebook, x */}
                <Image image={ImageProfile} x={190} y={305} width={9} height={9} />
                <Image image={ImageProfile} x={196} y={305} width={9} height={9} />
                <Image image={ImageProfile} x={201} y={305} width={9} height={9} />
                <Image image={ImageProfile} x={206} y={305} width={9} height={9} />
                {/* trimmed social handles */}
                <Text
                  x={133}
                  y={311}
                  width={isSubGeneralType ? 205 : 120}
                  height={2}
                  text={socialText}
                  fontSize={10}
                  fill="white"
                  fontStyle="bold"
                  align="center"
                  verticalAlign="middle"
                  onClick={() => setIsOpenFtr(true)}
                  onTap={() => setIsOpenFtr(true)}
                />

              </>
            )}

            {isSubGeneralType ? null : isRight ? (
              <Image image={ImageProfile} x={69} y={230} scaleX={-1} width={70} height={90} />
            ) : (
              <Image image={ImageProfile} x={251} y={230} width={70} height={90} />
            )}

            <Transformer ref={transformerRef} keepRatio={false} boundBoxFunc={boundBoxFunc} />
          </Layer>
        </Stage>
      </div>

      {/* Bottom controls */}
      <div className="flex lg:w-1/3 w-full flex-row gap-2 justify-between items-center mt-2">
        <div className="flex flex-row justify-start items-center w-1/2 h-[40px] ml-3">
          {mlmProfile?.profileImageURLs?.map((img, index) => (
            <img
              key={index}
              src={img}
              onClick={() => setmiddaleImage(img)}
              className={`w-[35px] h-[35px] object-contain cursor-pointer transition-all
                ${middaleImage === img ? "border-2 border-accent rounded" : ""}`}
            />
          ))}
        </div>

        {/* Download badge + button */}
        <div className="flex flex-row items-center gap-2 mr-5">
          {/* Refer credits badge */}
          {/* {referCredits > 0 && (
            <span
              style={{
                background: "#f59e0b",
                color: "#fff",
                fontSize: 10,
                fontWeight: 700,
                padding: "2px 7px",
                borderRadius: 20,
              }}
            >
              +{referCredits} refer
            </span>
          )} */}
          <Button
            size="sm"
            onClick={handleExport}
            disabled={!canExport}
            style={{
              opacity: canExport ? 1 : 0.5,
              minWidth: 110,
              position: "relative",
            }}
          >
            {exportLoading ? (
              <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <svg
                  style={{ animation: "spin 1s linear infinite" }}
                  width="14" height="14" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" strokeWidth="2"
                >
                  <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
                </svg>
                Exporting...
              </span>
            ) : subLoading ? (
              "Loading..."
            ) : (
              downloadBtnLabel()
            )}
          </Button>
        </div>
      </div>

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>

      <ListOfTemplates selected={selected} setSelected={setSelected} />
    </div>
  );
}

export default GeneralEditPage;
