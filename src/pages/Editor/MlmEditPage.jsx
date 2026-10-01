import React, { useState, useEffect, useLayoutEffect, useRef } from "react";
import useImage from "use-image";
import { Button } from "@heroui/react";
import CaptionModal from "../../components/CaptionModal";

import {
  STAGE_WIDTH,
  STAGE_HEIGHT,
  EXPORT_PIXEL_RATIO,
  GENERAL_SELECT_TYPES,
  GENERAL_SELECT_TYPES_birthday,
  GENERAL_SELECT_TYPES_bonanza,
} from "./Constants";
import { useProfileState } from "./useProfileState";
import { useToolbarPositions } from "./useToolbarPositions";
import KonvaCanvas from "./KonvaCanvas";
import FlipToolbar from "./FlipToolbar";
import ListOfTemplates from "./components/ListOfTemplates";
import { getAchieverDisplayName } from "./utils/canvasDataUtils";

// ── Font-size helper ──────────────────────────────────────────────
function calcFontSize(text, large, medium, small) {
  if (text.length > 19) return small;
  if (text.length > 10) return medium;
  return large;
}

function getSelType() {
  try {
    return JSON.parse(localStorage.getItem("selType")) || {};
  } catch {
    return {};
  }
}

function MlmEditPage({
  selectedTopFrame,
  setSelectedTopFrame,
  frames,
  isOpenFtr,
  setIsOpenFtr,
  isOpen,
  setIsOpen,
  selectedFooterFrame,
  middaleImage,
  setmiddaleImage,
}) {
  const stageRef = useRef(null);
  const stageContainerRef = useRef(null);
  const [stageScale, setStageScale] = useState(1);

  useLayoutEffect(() => {
    const el = stageContainerRef.current;
    if (!el) return;
    const update = () => {
      const w = el.getBoundingClientRect().width;
      if (w > 0) setStageScale(w / STAGE_WIDTH);
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // ── Form / profile data ───────────────────────────────────────
  const [mlmForm, setMlmForm] = useState(null);
  const [mlmProfile, setMlmProfile] = useState(null);
  const [selected, setSelected] = useState(null);

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

  // ── Type flags ────────────────────────────────────────────────
  const selll = getSelType();
  const isRight = selected?.position === "right";
  const isSubGeneralType = GENERAL_SELECT_TYPES.some(
    (t) => t.value === selll?.type,
  );
  const isSubGeneralType_birthday = GENERAL_SELECT_TYPES_birthday.some(
    (t) => t.value === selll?.type,
  );
  const isSubGeneralType_bonanza = GENERAL_SELECT_TYPES_bonanza.some(
    (t) => t.value === selll?.type,
  );

  // ── Profile + sticker state (custom hook) ─────────────────────
  const profileState = useProfileState({ isRight, isSubGeneralType_bonanza });

  // ── Toolbar positions (custom hook) ───────────────────────────
  const { profileToolbar, stickerToolbar } = useToolbarPositions({
    profileAttrs: profileState.profileAttrs,
    isProfileSelected: profileState.isProfileSelected,
    stickerAttrs: profileState.stickerAttrs,
    isStickerSelected: profileState.isStickerSelected,
  });

  // ── Stage deselect ────────────────────────────────────────────
  const handleStageMouseDown = (e) => {
    if (e.target === e.target.getStage()) profileState.deselectAll();
  };

  // ── Derived text ──────────────────────────────────────────────
  const showTopupline = localStorage.getItem("showTopuplineImages") ?? "yes";
  const showLogo = localStorage.getItem("showCompanyLogo") ?? "yes";
  const topuplineURLs = showTopupline === "no" ? [] : (mlmProfile?.topuplineURLs || []);
  const logoEntries = showLogo === "no" ? [] : (mlmProfile?.logoURLs || []);
  const logoURLs = Array.isArray(logoEntries)
    ? logoEntries.reduce((acc, item) => {
        if (typeof item === "string") acc.push(item);
        else if (item?.link) acc.push(item.link);
        return acc;
      }, [])
    : [];

    const logo1size = logoEntries[0]?.size || 0;
    const logo2size = logoEntries[1]?.size || 0;
    const logo3size = logoEntries[2]?.size || 0;
    
  const achieverName =
    getAchieverDisplayName(mlmForm?.achiever) || "ACHIEVER NAME";
  const achieverCity = mlmForm?.achiever?.city || "ACHIEVER CITY";
  const profileName = mlmForm?.promoter?.name
    ? mlmForm.promoter.name
    : mlmProfile?.fullName || "";
  const profileMobile = mlmForm?.promoter?.name
    ? mlmForm.promoter.mobile
    : mlmProfile?.mobile || "";
  const designation = mlmForm?.promoter?.name
    ? mlmForm.promoter.role
    : mlmProfile?.designation;

  const ActualProfilename = profileName?.toUpperCase() || "PROFILENAME";
  const ActualDesignation = designation?.toUpperCase() || "DESIGNATION";
  const ActualAchvrname = achieverName?.toUpperCase() || "ACHIEVER NAME";
  const ActualAchvrCity = achieverCity?.toUpperCase() || "ACHIEVER CITY";

  const ProfilefontSize = calcFontSize(ActualProfilename, 10, 7, 6);
  const DesignationfontSize = calcFontSize(ActualDesignation, 8, 6, 5);
  const AchieverNamefontSize = calcFontSize(ActualAchvrname, 10, 8, 6);
  const AchieverCityfontSize = calcFontSize(ActualAchvrCity, 6, 6, 5);

  // ── Images ───────────────────────────────────────────────────
  const [bgImage] = useImage(
    selected?.url || "url suggestionImage",
    "anonymous",
  );
  const [StckerImage] = useImage(selected?.bannerId || "", "anonymous");
  const [Imagel2] = useImage(logoURLs?.[0] || "", "anonymous");
  const [Imagel3] = useImage(logoURLs?.[1] || "", "anonymous");
  const [Imagel4] = useImage(logoURLs?.[2] || "", "anonymous");
  const [ImagetopFrame] = useImage(selectedTopFrame?.value || "", "anonymous");
  const [Imagetop1] = useImage(topuplineURLs?.[0] || "", "anonymous");
  const [Imagetop2] = useImage(topuplineURLs?.[1] || "", "anonymous");
  const [Imagetop3] = useImage(topuplineURLs?.[2] || "", "anonymous");
  const [Imagetop4] = useImage(topuplineURLs?.[3] || "", "anonymous");
  const [ImageForm] = useImage(
    `${mlmForm?.achiever?.image}` || "",
    "anonymous",
  );
  const [ImageProfile] = useImage(
    mlmForm?.promoter?.name ? `${mlmForm.promoter.image}` : `${middaleImage}`,
    "anonymous",
  );

  const [captionModalOpen, setCaptionModalOpen] = useState(false);

  const handleExport = () => {
    profileState.deselectAll();
    setTimeout(() => {
      const uri = stageRef.current.toDataURL({
        pixelRatio: EXPORT_PIXEL_RATIO,
        mimeType: "video/mp4",
        quality: 1,
      });
      const link = document.createElement("a");
      link.download = "stage-hd.mp4";
      link.href = uri;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }, 50);
  };
//   const handleExportVideo = () => {
//   profileState.deselectAll();

//   const canvas = stageRef.current.getLayers()[0].getCanvas()._canvas;
//   const stream = canvas.captureStream(30); // 30 fps
//   const recorder = new MediaRecorder(stream, { mimeType: "video/webm" });
//   const chunks = [];

//   recorder.ondataavailable = (e) => {
//     if (e.data.size > 0) chunks.push(e.data);
//   };

//   recorder.onstop = () => {
//     const blob = new Blob(chunks, { type: "video/webm" });
//     const url = URL.createObjectURL(blob);
//     const link = document.createElement("a");
//     link.download = "stage-hd.webm";  // browsers save as .webm, not .mp4
//     link.href = url;
//     document.body.appendChild(link);
//     link.click();
//     document.body.removeChild(link);
//     URL.revokeObjectURL(url);
//   };

//   recorder.start();

//   // Record for X seconds then stop (change 5000 to however long you want)
//   setTimeout(() => recorder.stop(), 5000);
// };

  return (
    <div className="flex flex-col justify-start items-center h-full">
      <div
        ref={stageContainerRef}
        data-no-ui-translate="true"
        className="relative mt-2"
        style={{
          width: "min(320px, 96vw)",
          height: `${STAGE_WIDTH * stageScale}px`,
          overflow: "hidden",
          touchAction: "none",
        }}
      >
        <div
          style={{
            width: STAGE_WIDTH,
            height: STAGE_HEIGHT,
            transform: `scale(${stageScale})`,
            transformOrigin: "top left",
          }}
        >
        <KonvaCanvas
          stageRef={stageRef}
          // Images
          bgImage={bgImage}
          StckerImage={StckerImage}
          Imagel2={Imagel2}
          Imagel3={Imagel3}
          Imagel4={Imagel4}
          ImagetopFrame={ImagetopFrame}
          Imagetop1={Imagetop1}
          Imagetop2={Imagetop2}
          Imagetop3={Imagetop3}
          Imagetop4={Imagetop4}
          ImageForm={ImageForm}
          ImageProfile={ImageProfile}
          // Profile
          profileImageRef={profileState.profileImageRef}
          profileAttrs={profileState.profileAttrs}
          handleProfileClick={profileState.handleProfileClick}
          handleDragMove={profileState.handleDragMove}
          handleDragEnd={profileState.handleDragEnd}
          handleTransformEnd={profileState.handleTransformEnd}
          transformerRef={profileState.transformerRef}
          // Sticker
          stickerImageRef={profileState.stickerImageRef}
          stickerAttrs={profileState.stickerAttrs}
          handleStickerClick={profileState.handleStickerClick}
          handleStickerDragMove={profileState.handleStickerDragMove}
          handleStickerDragEnd={profileState.handleStickerDragEnd}
          handleStickerTransformEnd={profileState.handleStickerTransformEnd}
          stickerTransformerRef={profileState.stickerTransformerRef}
          // Stage
          handleStageMouseDown={handleStageMouseDown}
          // Text
          profileMobile={profileMobile}
          ActualProfilename={ActualProfilename}
          ActualDesignation={ActualDesignation}
          ActualAchvrname={ActualAchvrname}
          ActualAchvrCity={ActualAchvrCity}
          ProfilefontSize={ProfilefontSize}
          DesignationfontSize={DesignationfontSize}
          AchieverNamefontSize={AchieverNamefontSize}
          AchieverCityfontSize={AchieverCityfontSize}
          // Flags
          isRight={isRight}
          isSubGeneralType={isSubGeneralType}
          isSubGeneralType_birthday={isSubGeneralType_birthday}
          isSubGeneralType_bonanza={isSubGeneralType_bonanza}
          // Modals
          setIsOpen={setIsOpen}
          setIsOpenFtr={setIsOpenFtr}
        />
        </div>
      </div>
      <div className="flex lg:w-1/3 w-full  flex-row gap-2 justify-between Items-center mt-2 ">
        <div className="flex flex-row justify-start items-center w-1/2 h-[40px]  ml-3">
          {mlmProfile?.profileImageURLs?.map((img, index) => (
            <img
              key={index}
              src={img}
              onClick={() => setmiddaleImage(img)}
              className={`w-[35px] h-[35px] object-contain cursor-pointer transition-all
        ${middaleImage === img ? "border-2 border-accent rounded " : ""}`}
            />
          ))}
        </div>
        <Button size="sm" onClick={() => setCaptionModalOpen(true)} className=" mr-5">
          Download
        </Button>
      </div>

      <ListOfTemplates selected={selected} setSelected={setSelected} />

      {/* ── Caption modal ───────────────────────────────────────────── */}
      <CaptionModal
        isOpen={captionModalOpen}
        onClose={() => setCaptionModalOpen(false)}
        onDownload={handleExport}
      />
    </div>
  );
}

export default MlmEditPage;
