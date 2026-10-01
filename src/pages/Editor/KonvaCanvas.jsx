import React from "react";
import { Stage, Layer, Image, Text, Transformer } from "react-konva";
import { STAGE_WIDTH, STAGE_HEIGHT, clamp } from "./Constants";

/**
 * KonvaCanvas
 * Renders the Konva Stage with all image layers, text overlays, and transformers.
 * All image objects and event handlers are passed in as props — this component
 * is purely presentational with no internal state.
 */
function KonvaCanvas({
  stageRef,
  // Images (from useImage)
  bgImage,
  StckerImage,
  Imagel2,
  Imagel3,
  Imagel4,
  ImagetopFrame,
  Imagetop1,
  Imagetop2,
  Imagetop3,
  Imagetop4,
  ImageForm,
  ImageProfile,
  // Profile image
  profileImageRef,
  profileAttrs,
  handleProfileClick,
  handleDragMove,
  handleDragEnd,
  handleTransformEnd,
  transformerRef,
  // Sticker image
  stickerImageRef,
  stickerAttrs,
  handleStickerClick,
  handleStickerDragMove,
  handleStickerDragEnd,
  handleStickerTransformEnd,
  stickerTransformerRef,
  // Stage events
  handleStageMouseDown,
  // Text data
  profileMobile,
  ActualProfilename,
  ActualDesignation,
  ActualAchvrname,
  ActualAchvrCity,
  // Font sizes
  ProfilefontSize,
  DesignationfontSize,
  AchieverNamefontSize,
  AchieverCityfontSize,
  // Layout flags
  isRight,
  isSubGeneralType,
  isSubGeneralType_birthday,
  isSubGeneralType_bonanza,
  // Modal triggers
  setIsOpen,
  setIsOpenFtr,
}) {
  const boundBoxFunc = (oldBox, newBox) => {
    if (newBox.width < 20 || newBox.height < 20) return oldBox;
    return {
      ...newBox,
      x: clamp(newBox.x, 0, STAGE_WIDTH - newBox.width),
      y: clamp(newBox.y, 0, STAGE_HEIGHT - newBox.height),
      width: clamp(
        newBox.width,
        20,
        STAGE_WIDTH - clamp(newBox.x, 0, STAGE_WIDTH),
      ),
      height: clamp(
        newBox.height,
        20,
        STAGE_HEIGHT - clamp(newBox.y, 0, STAGE_HEIGHT),
      ),
    };
  };

  return (
    <Stage
      ref={stageRef}
      width={STAGE_WIDTH}
      height={STAGE_HEIGHT}
      className="bg-background border border-border shadow-lg"
      onMouseDown={handleStageMouseDown}
      onTouchStart={handleStageMouseDown}
    >
      <Layer>
        {/* Background */}
        <Image
          image={bgImage}
          x={0}
          y={0}
          width={STAGE_WIDTH}
          height={STAGE_HEIGHT}
        />

        {/* Logos */}
        <Image image={Imagel2} x={3} y={2} width={25} height={25} />
        <Image image={Imagel3} x={260} y={2} width={25} height={25} />
        <Image image={Imagel4} x={290} y={2} width={25} height={25} />

        {/* Top frames */}
        <Image image={ImagetopFrame} x={95} y={2} width={30} height={30} />
        <Image image={ImagetopFrame} x={125} y={2} width={30} height={30} />
        <Image image={ImagetopFrame} x={155} y={2} width={30} height={30} />
        <Image image={ImagetopFrame} x={185} y={2} width={30} height={30} />

        {/* Top-line profile images */}
        <Image
          image={Imagetop1}
          x={101}
          y={6}
          width={18}
          height={18}
          onTap={() => setIsOpen(true)}
          onClick={() => setIsOpen(true)}
        />
        <Image
          image={Imagetop2}
          x={131}
          y={6}
          width={18}
          height={18}
          onTap={() => setIsOpen(true)}
          onClick={() => setIsOpen(true)}
        />
        <Image
          image={Imagetop3}
          x={161}
          y={6}
          width={18}
          height={18}
          onTap={() => setIsOpen(true)}
          onClick={() => setIsOpen(true)}
        />
        <Image
          image={Imagetop4}
          x={191}
          y={6}
          width={18}
          height={18}
          onTap={() => setIsOpen(true)}
          onClick={() => setIsOpen(true)}
        />

        {/* Draggable profile image */}
        <Image
          ref={profileImageRef}
          image={ImageForm}
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

        {/* Draggable sticker image */}
        <Image
          ref={stickerImageRef}
          image={StckerImage}
          x={stickerAttrs.x}
          y={stickerAttrs.y}
          width={stickerAttrs.width}
          height={stickerAttrs.height}
          scaleX={stickerAttrs.scaleX}
          offsetX={stickerAttrs.offsetX}
          draggable
          onClick={handleStickerClick}
          onTap={handleStickerClick}
          onDragMove={handleStickerDragMove}
          onDragEnd={handleStickerDragEnd}
          onTransformEnd={handleStickerTransformEnd}
        />

        {/* Footer text */}
        {isRight ? (
          <>
            <Text
              x={218}
              y={295}
              width={150}
              height={5}
              text="CALL FOR ASSOCIATION"
              fontSize={5}
              fill="white"
              fontStyle="bold"
              verticalAlign="middle"
              onClick={() =>
                setIsOpenFtr(isSubGeneralType_bonanza ? false : true)
              }
              onTap={() =>
                setIsOpenFtr(isSubGeneralType_bonanza ? false : true)
              }
            />
            <Text
              x={205}
              y={297}
              width={150}
              height={20}
              text={`+91${profileMobile}` || "+91XXXXXXXXXX"}
              fontSize={11}
              fill="white"
              fontStyle="bold"
              verticalAlign="middle"
              onClick={() =>
                setIsOpenFtr(isSubGeneralType_bonanza ? false : true)
              }
              onTap={() =>
                setIsOpenFtr(isSubGeneralType_bonanza ? false : true)
              }
            />
            <Text
              x={isSubGeneralType ? -10 : 70}
              y={297}
              width={isSubGeneralType ? 205 : 120}
              height={2}
              text={ActualProfilename}
              fontSize={ProfilefontSize}
              fill="white"
              fontStyle="1000"
              align="center"
              verticalAlign="middle"
              onClick={() =>
                setIsOpenFtr(isSubGeneralType_bonanza ? false : true)
              }
              onTap={() =>
                setIsOpenFtr(isSubGeneralType_bonanza ? false : true)
              }
            />
            <Text
              x={isSubGeneralType ? -10 : 70}
              y={305}
              width={isSubGeneralType ? 205 : 120}
              height={2}
              text={ActualDesignation}
              fontSize={DesignationfontSize}
              fill="white"
              fontStyle="bold"
              align="center"
              verticalAlign="middle"
              onClick={() =>
                setIsOpenFtr(isSubGeneralType_bonanza ? false : true)
              }
              onTap={() =>
                setIsOpenFtr(isSubGeneralType_bonanza ? false : true)
              }
            />
          </>
        ) : (
          <>
            <Text
              x={37}
              y={295}
              width={150}
              height={5}
              text="CALL FOR ASSOCIATION"
              fontSize={5}
              fill="white"
              fontStyle="bold"
              verticalAlign="middle"
              onClick={() =>
                setIsOpenFtr(isSubGeneralType_bonanza ? false : true)
              }
              onTap={() =>
                setIsOpenFtr(isSubGeneralType_bonanza ? false : true)
              }
            />
            <Text
              x={30}
              y={297}
              width={150}
              height={20}
              text={`+91${profileMobile}` || "+91XXXXXXXXXX"}
              fontSize={11}
              fill="white"
              fontStyle="bold"
              verticalAlign="middle"
              onClick={() =>
                setIsOpenFtr(isSubGeneralType_bonanza ? false : true)
              }
              onTap={() =>
                setIsOpenFtr(isSubGeneralType_bonanza ? false : true)
              }
            />
            <Text
              x={133}
              y={297}
              width={isSubGeneralType ? 205 : 120}
              height={2}
              text={ActualProfilename}
              fontSize={ProfilefontSize}
              fill="white"
              fontStyle="1000"
              align="center"
              verticalAlign="middle"
              onClick={() =>
                setIsOpenFtr(isSubGeneralType_bonanza ? false : true)
              }
              onTap={() =>
                setIsOpenFtr(isSubGeneralType_bonanza ? false : true)
              }
            />
            <Text
              x={133}
              y={305}
              width={isSubGeneralType ? 205 : 120}
              height={2}
              text={ActualDesignation}
              fontSize={DesignationfontSize}
              fill="white"
              fontStyle="bold"
              align="center"
              verticalAlign="middle"
              onClick={() =>
                setIsOpenFtr(isSubGeneralType_bonanza ? false : true)
              }
              onTap={() =>
                setIsOpenFtr(isSubGeneralType_bonanza ? false : true)
              }
            />
          </>
        )}

        {/* Achiever details */}
        {isRight ? (
          <>
            <Text
              x={isSubGeneralType_birthday ? 35 : 55}
              y={isSubGeneralType_birthday ? 157 : 97}
              width={120}
              height={2}
              text={ActualAchvrname}
              fontSize={AchieverNamefontSize}
              fill="white"
              fontStyle="1000"
              align="center"
              verticalAlign="middle"
              onClick={() => setIsOpenFtr(true)}
              onTap={() => setIsOpenFtr(true)}
            />
            <Text
              x={isSubGeneralType_birthday ? 35 : 55}
              y={isSubGeneralType_birthday ? 172 : 110}
              width={120}
              height={2}
              text={ActualAchvrCity}
              fontSize={AchieverCityfontSize}
              fill="white"
              fontStyle="1000"
              align="center"
              verticalAlign="middle"
              onClick={() => setIsOpenFtr(true)}
              onTap={() => setIsOpenFtr(true)}
            />
          </>
        ) : (
          <>
            <Text
              x={isSubGeneralType_birthday ? 170 : 142}
              y={isSubGeneralType_birthday ? 157 : 97}
              width={120}
              height={2}
              text={ActualAchvrname}
              fontSize={AchieverNamefontSize}
              fill="white"
              fontStyle="1000"
              align="center"
              verticalAlign="middle"
              onClick={() => setIsOpenFtr(true)}
              onTap={() => setIsOpenFtr(true)}
            />
            <Text
              x={isSubGeneralType_birthday ? 170 : 142}
              y={isSubGeneralType_birthday ? 172 : 111}
              width={120}
              height={2}
              text={ActualAchvrCity}
              fontSize={AchieverCityfontSize}
              fill="white"
              fontStyle="1000"
              align="center"
              verticalAlign="middle"
              onClick={() => setIsOpenFtr(true)}
              onTap={() => setIsOpenFtr(true)}
            />
          </>
        )}

        {/* Small promoter profile image */}
        {!isSubGeneralType &&
          (isRight ? (
            <Image
              image={ImageProfile}
              x={69}
              y={230}
              scaleX={-1}
              width={70}
              height={90}
            />
          ) : (
            <Image
              image={ImageProfile}
              x={251}
              y={230}
              scaleX={1}
              width={70}
              height={90}
            />
          ))}

        {/* Transformers */}
        <Transformer
          ref={transformerRef}
          keepRatio={false}
          boundBoxFunc={boundBoxFunc}
        />
        <Transformer
          ref={stickerTransformerRef}
          keepRatio={false}
          boundBoxFunc={boundBoxFunc}
        />
      </Layer>
    </Stage>
  );
}

export default KonvaCanvas;

// import React, { useEffect, useRef, useState } from "react";
// import { Stage, Layer, Image, Text, Transformer } from "react-konva";
// import Konva from "konva";
// import { STAGE_WIDTH, STAGE_HEIGHT, clamp } from "./Constants";

// /**
//  * KonvaCanvas
//  * Renders the Konva Stage with all image layers, text overlays, and transformers.
//  * Supports a video URL as background; falls back to bgImage if no video is set.
//  */
// function KonvaCanvas({
//   stageRef,
//   // Background
//   bgImage,          // <-- NEW: optional video URL string
//   // Images (from useImage)
//   StckerImage,
//   Imagel2,
//   Imagel3,
//   Imagel4,
//   ImagetopFrame,
//   Imagetop1,
//   Imagetop2,
//   Imagetop3,
//   Imagetop4,
//   ImageForm,
//   ImageProfile,
//   // Profile image
//   profileImageRef,
//   profileAttrs,
//   handleProfileClick,
//   handleDragMove,
//   handleDragEnd,
//   handleTransformEnd,
//   transformerRef,
//   // Sticker image
//   stickerImageRef,
//   stickerAttrs,
//   handleStickerClick,
//   handleStickerDragMove,
//   handleStickerDragEnd,
//   handleStickerTransformEnd,
//   stickerTransformerRef,
//   // Stage events
//   handleStageMouseDown,
//   // Text data
//   profileMobile,
//   ActualProfilename,
//   ActualDesignation,
//   ActualAchvrname,
//   ActualAchvrCity,
//   // Font sizes
//   ProfilefontSize,
//   DesignationfontSize,
//   AchieverNamefontSize,
//   AchieverCityfontSize,
//   // Layout flags
//   isRight,
//   isSubGeneralType,
//   isSubGeneralType_birthday,
//   isSubGeneralType_bonanza,
//   // Modal triggers
//   setIsOpen,
//   setIsOpenFtr,
// }) {
//   // Holds the HTMLVideoElement once loaded; null means use static bgImage
//   const [videoElement, setVideoElement] = useState(null);
//   const videoRef = useRef(null);
//   const animRef = useRef(null);

//   const videoBgUrl = "https://firebasestorage.googleapis.com/v0/b/mlmbooster.firebasestorage.app/o/file_example_MP4_480_1_5MG.mp4?alt=media&token=307283d2-d029-4c97-8a96-f650c61bc4bc"
//   // ── Video lifecycle ──────────────────────────────────────────────────────────
//   useEffect(() => {
//     // Clean up previous video + animation
//     if (animRef.current) {
//       animRef.current.stop();
//       animRef.current = null;
//     }
//     if (videoRef.current) {
//       videoRef.current.pause();
//       videoRef.current.src = "";
//       videoRef.current = null;
//     }
//     setVideoElement(null);

//     if (!videoBgUrl || videoBgUrl.trim() === "") return;

//     const vid = document.createElement("video");
//     vid.src = videoBgUrl.trim();
//     vid.crossOrigin = "anonymous";
//     vid.loop = true;
//     vid.muted = true;
//     vid.autoplay = true;
//     vid.playsInline = true;
//     videoRef.current = vid;

//     const onCanPlay = () => {
//       vid.play().catch(() => {});
//       setVideoElement(vid);
//     };

//     vid.addEventListener("canplay", onCanPlay);

//     return () => {
//       vid.removeEventListener("canplay", onCanPlay);
//       vid.pause();
//       vid.src = "";
//     };
//   }, [videoBgUrl]);

//   // ── Konva animation to repaint video frames ──────────────────────────────────
//   useEffect(() => {
//     if (!videoElement || !stageRef?.current) return;

//     const layer = stageRef.current.getLayers()[0];
//     if (!layer) return;

//     const anim = new Konva.Animation(() => {}, layer);
//     anim.start();
//     animRef.current = anim;

//     return () => {
//       anim.stop();
//       animRef.current = null;
//     };
//   }, [videoElement, stageRef]);

//   // ── Use video if available, otherwise static image ───────────────────────────
//   const backgroundSource = videoElement;

//   // ── Transformer bound box ────────────────────────────────────────────────────
//   const boundBoxFunc = (oldBox, newBox) => {
//     if (newBox.width < 20 || newBox.height < 20) return oldBox;
//     return {
//       ...newBox,
//       x: clamp(newBox.x, 0, STAGE_WIDTH - newBox.width),
//       y: clamp(newBox.y, 0, STAGE_HEIGHT - newBox.height),
//       width: clamp(newBox.width, 20, STAGE_WIDTH - clamp(newBox.x, 0, STAGE_WIDTH)),
//       height: clamp(newBox.height, 20, STAGE_HEIGHT - clamp(newBox.y, 0, STAGE_HEIGHT)),
//     };
//   };

//   return (
//     <Stage
//       ref={stageRef}
//       width={STAGE_WIDTH}
//       height={STAGE_HEIGHT}
//       className="bg-background border border-border shadow-lg"
//       onMouseDown={handleStageMouseDown}
//       onTouchStart={handleStageMouseDown}
//     >
//       <Layer>
//         {/* Background — video or static image */}
//         <Image
//           image={backgroundSource}
//           x={0}
//           y={0}
//           width={STAGE_WIDTH}
//           height={STAGE_HEIGHT}
//         />

//         {/* Logos */}
//         <Image image={Imagel2} x={3} y={2} width={25} height={25} />
//         <Image image={Imagel3} x={260} y={2} width={25} height={25} />
//         <Image image={Imagel4} x={290} y={2} width={25} height={25} />

//         {/* Top frames */}
//         <Image image={ImagetopFrame} x={95} y={2} width={30} height={30} />
//         <Image image={ImagetopFrame} x={125} y={2} width={30} height={30} />
//         <Image image={ImagetopFrame} x={155} y={2} width={30} height={30} />
//         <Image image={ImagetopFrame} x={185} y={2} width={30} height={30} />

//         {/* Top-line profile images */}
//         <Image image={Imagetop1} x={101} y={6} width={18} height={18} onTap={() => setIsOpen(true)} onClick={() => setIsOpen(true)} />
//         <Image image={Imagetop2} x={131} y={6} width={18} height={18} onTap={() => setIsOpen(true)} onClick={() => setIsOpen(true)} />
//         <Image image={Imagetop3} x={161} y={6} width={18} height={18} onTap={() => setIsOpen(true)} onClick={() => setIsOpen(true)} />
//         <Image image={Imagetop4} x={191} y={6} width={18} height={18} onTap={() => setIsOpen(true)} onClick={() => setIsOpen(true)} />

//         {/* Draggable profile image */}
//         <Image
//           ref={profileImageRef}
//           image={ImageForm}
//           x={profileAttrs.x}
//           y={profileAttrs.y}
//           width={profileAttrs.width}
//           height={profileAttrs.height}
//           scaleX={profileAttrs.scaleX}
//           offsetX={profileAttrs.offsetX}
//           draggable
//           onClick={handleProfileClick}
//           onTap={handleProfileClick}
//           onDragMove={handleDragMove}
//           onDragEnd={handleDragEnd}
//           onTransformEnd={handleTransformEnd}
//         />

//         {/* Draggable sticker image */}
//         <Image
//           ref={stickerImageRef}
//           image={StckerImage}
//           x={stickerAttrs.x}
//           y={stickerAttrs.y}
//           width={stickerAttrs.width}
//           height={stickerAttrs.height}
//           scaleX={stickerAttrs.scaleX}
//           offsetX={stickerAttrs.offsetX}
//           draggable
//           onClick={handleStickerClick}
//           onTap={handleStickerClick}
//           onDragMove={handleStickerDragMove}
//           onDragEnd={handleStickerDragEnd}
//           onTransformEnd={handleStickerTransformEnd}
//         />

//         {/* Footer text */}
//         {isRight ? (
//           <>
//             <Text x={218} y={295} width={150} height={5} text="CALL FOR ASSOCIATION" fontSize={5} fill="white" fontStyle="bold" verticalAlign="middle" onClick={() => setIsOpenFtr(isSubGeneralType_bonanza ? false : true)} onTap={() => setIsOpenFtr(isSubGeneralType_bonanza ? false : true)} />
//             <Text x={205} y={297} width={150} height={20} text={`+91${profileMobile}` || "+91XXXXXXXXXX"} fontSize={11} fill="white" fontStyle="bold" verticalAlign="middle" onClick={() => setIsOpenFtr(isSubGeneralType_bonanza ? false : true)} onTap={() => setIsOpenFtr(isSubGeneralType_bonanza ? false : true)} />
//             <Text x={isSubGeneralType ? -10 : 70} y={297} width={isSubGeneralType ? 205 : 120} height={2} text={ActualProfilename} fontSize={ProfilefontSize} fill="white" fontStyle="1000" align="center" verticalAlign="middle" onClick={() => setIsOpenFtr(isSubGeneralType_bonanza ? false : true)} onTap={() => setIsOpenFtr(isSubGeneralType_bonanza ? false : true)} />
//             <Text x={isSubGeneralType ? -10 : 70} y={305} width={isSubGeneralType ? 205 : 120} height={2} text={ActualDesignation} fontSize={DesignationfontSize} fill="white" fontStyle="bold" align="center" verticalAlign="middle" onClick={() => setIsOpenFtr(isSubGeneralType_bonanza ? false : true)} onTap={() => setIsOpenFtr(isSubGeneralType_bonanza ? false : true)} />
//           </>
//         ) : (
//           <>
//             <Text x={37} y={295} width={150} height={5} text="CALL FOR ASSOCIATION" fontSize={5} fill="white" fontStyle="bold" verticalAlign="middle" onClick={() => setIsOpenFtr(isSubGeneralType_bonanza ? false : true)} onTap={() => setIsOpenFtr(isSubGeneralType_bonanza ? false : true)} />
//             <Text x={30} y={297} width={150} height={20} text={`+91${profileMobile}` || "+91XXXXXXXXXX"} fontSize={11} fill="white" fontStyle="bold" verticalAlign="middle" onClick={() => setIsOpenFtr(isSubGeneralType_bonanza ? false : true)} onTap={() => setIsOpenFtr(isSubGeneralType_bonanza ? false : true)} />
//             <Text x={133} y={297} width={isSubGeneralType ? 205 : 120} height={2} text={ActualProfilename} fontSize={ProfilefontSize} fill="white" fontStyle="1000" align="center" verticalAlign="middle" onClick={() => setIsOpenFtr(isSubGeneralType_bonanza ? false : true)} onTap={() => setIsOpenFtr(isSubGeneralType_bonanza ? false : true)} />
//             <Text x={133} y={305} width={isSubGeneralType ? 205 : 120} height={2} text={ActualDesignation} fontSize={DesignationfontSize} fill="white" fontStyle="bold" align="center" verticalAlign="middle" onClick={() => setIsOpenFtr(isSubGeneralType_bonanza ? false : true)} onTap={() => setIsOpenFtr(isSubGeneralType_bonanza ? false : true)} />
//           </>
//         )}

//         {/* Achiever details */}
//         {isRight ? (
//           <>
//             <Text x={isSubGeneralType_birthday ? 35 : 55} y={isSubGeneralType_birthday ? 157 : 97} width={120} height={2} text={ActualAchvrname} fontSize={AchieverNamefontSize} fill="white" fontStyle="1000" align="center" verticalAlign="middle" onClick={() => setIsOpenFtr(true)} onTap={() => setIsOpenFtr(true)} />
//             <Text x={isSubGeneralType_birthday ? 35 : 55} y={isSubGeneralType_birthday ? 172 : 110} width={120} height={2} text={ActualAchvrCity} fontSize={AchieverCityfontSize} fill="white" fontStyle="1000" align="center" verticalAlign="middle" onClick={() => setIsOpenFtr(true)} onTap={() => setIsOpenFtr(true)} />
//           </>
//         ) : (
//           <>
//             <Text x={isSubGeneralType_birthday ? 170 : 142} y={isSubGeneralType_birthday ? 157 : 97} width={120} height={2} text={ActualAchvrname} fontSize={AchieverNamefontSize} fill="white" fontStyle="1000" align="center" verticalAlign="middle" onClick={() => setIsOpenFtr(true)} onTap={() => setIsOpenFtr(true)} />
//             <Text x={isSubGeneralType_birthday ? 170 : 142} y={isSubGeneralType_birthday ? 172 : 111} width={120} height={2} text={ActualAchvrCity} fontSize={AchieverCityfontSize} fill="white" fontStyle="1000" align="center" verticalAlign="middle" onClick={() => setIsOpenFtr(true)} onTap={() => setIsOpenFtr(true)} />
//           </>
//         )}

//         {/* Small promoter profile image */}
//         {!isSubGeneralType &&
//           (isRight ? (
//             <Image image={ImageProfile} x={69} y={230} scaleX={-1} width={70} height={90} />
//           ) : (
//             <Image image={ImageProfile} x={251} y={230} scaleX={1} width={70} height={90} />
//           ))}

//         {/* Transformers */}
//         <Transformer ref={transformerRef} keepRatio={false} boundBoxFunc={boundBoxFunc} />
//         <Transformer ref={stickerTransformerRef} keepRatio={false} boundBoxFunc={boundBoxFunc} />
//       </Layer>
//     </Stage>
//   );
// }

// export default KonvaCanvas;
