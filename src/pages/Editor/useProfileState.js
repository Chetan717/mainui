import { useState, useEffect, useRef } from "react";
import { clamp, STAGE_WIDTH, STAGE_HEIGHT } from "./Constants";

/**
 * Manages profileAttrs, stickerAttrs and all related
 * drag / transform / flip / click handlers for both images.
 */
export function useProfileState({ isRight, isSubGeneralType_bonanza }) {
  // ── Refs ───────────────────────────────────────────────────────
  const profileImageRef = useRef(null);
  const transformerRef = useRef(null);
  const stickerImageRef = useRef(null);
  const stickerTransformerRef = useRef(null);

  // ── Selection state ────────────────────────────────────────────
  const [isProfileSelected, setIsProfileSelected] = useState(false);
  const [isStickerSelected, setIsStickerSelected] = useState(false);

  // ── Position / size state ──────────────────────────────────────
  const [profileAttrs, setProfileAttrs] = useState({
    x: isRight && isSubGeneralType_bonanza ? 210 : 111,
    y: isRight && isSubGeneralType_bonanza ? 30 : 30,
    width: 115,
    height: 175,
    scaleX: isRight ? 1 : -1,
    offsetX: 0,
  });

  const [stickerAttrs, setStickerAttrs] = useState({
    x: isRight && isSubGeneralType_bonanza ? 176 : -10,
    y: isRight && isSubGeneralType_bonanza ? 180 : 180,
    width: isRight && isSubGeneralType_bonanza ? 160 : 160,
    height: isRight && isSubGeneralType_bonanza ? 110 : 110,
    scaleX: 1,
    offsetX: 0,
  });

  // ── Reset attrs when isRight changes ──────────────────────────
  useEffect(() => {
    setProfileAttrs((prev) => ({
      ...prev,
      x: isRight && isSubGeneralType_bonanza ? 210 : 111,
      y: 30,
      width: 115,
      height: 185,
      scaleX: isRight ? 1 : -1,
      offsetX: 0,
    }));
    setStickerAttrs((prev) => ({
      ...prev,
      x: isRight && isSubGeneralType_bonanza ? 176 : -10,
      y: 180,
      width: 160,
      height: 110,
      scaleX: 1,
      offsetX: 0,
    }));
  }, [isRight]);

  // ── Transformer attach / detach ────────────────────────────────
  useEffect(() => {
    if (!transformerRef.current || !profileImageRef.current) return;
    transformerRef.current.nodes(
      isProfileSelected ? [profileImageRef.current] : [],
    );
    transformerRef.current.getLayer()?.batchDraw();
  }, [isProfileSelected]);

  useEffect(() => {
    if (!stickerTransformerRef.current || !stickerImageRef.current) return;
    stickerTransformerRef.current.nodes(
      isStickerSelected ? [stickerImageRef.current] : [],
    );
    stickerTransformerRef.current.getLayer()?.batchDraw();
  }, [isStickerSelected]);

  // ── Profile handlers ───────────────────────────────────────────
  const handleProfileClick = () => {
    setIsStickerSelected(false);
    setIsProfileSelected((prev) => !prev);
  };

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

  // ── Sticker handlers ───────────────────────────────────────────
  const handleStickerClick = () => {
    setIsProfileSelected(false);
    setIsStickerSelected((prev) => !prev);
  };

  const handleStickerFlip = (e) => {
    e.stopPropagation();
    setStickerAttrs((prev) => {
      const isFlipped = prev.scaleX === -1;
      return {
        ...prev,
        scaleX: isFlipped ? 1 : -1,
        offsetX: isFlipped ? 0 : prev.width,
      };
    });
  };

  const handleStickerDragMove = (e) => {
    const node = e.target;
    const { width, height } = stickerAttrs;
    const isFlipped = stickerAttrs.scaleX === -1;
    const clampedX = isFlipped
      ? clamp(node.x(), width, STAGE_WIDTH)
      : clamp(node.x(), 0, STAGE_WIDTH - width);
    const clampedY = clamp(node.y(), 0, STAGE_HEIGHT - height);
    node.x(clampedX);
    node.y(clampedY);
  };

  const handleStickerDragEnd = (e) => {
    setStickerAttrs((prev) => ({ ...prev, x: e.target.x(), y: e.target.y() }));
  };

  const handleStickerTransformEnd = () => {
    const node = stickerImageRef.current;
    if (!node) return;
    const newWidth = Math.max(20, node.width() * Math.abs(node.scaleX()));
    const newHeight = Math.max(20, node.height() * Math.abs(node.scaleY()));
    const isFlipped = stickerAttrs.scaleX === -1;
    node.scaleX(isFlipped ? -1 : 1);
    node.scaleY(1);
    setStickerAttrs((prev) => ({
      ...prev,
      x: node.x(),
      y: node.y(),
      width: newWidth,
      height: newHeight,
      offsetX: isFlipped ? newWidth : 0,
    }));
  };

  // ── Deselect all ───────────────────────────────────────────────
  const deselectAll = () => {
    setIsProfileSelected(false);
    setIsStickerSelected(false);
  };

  return {
    // Refs
    profileImageRef,
    transformerRef,
    stickerImageRef,
    stickerTransformerRef,
    // State
    isProfileSelected,
    isStickerSelected,
    profileAttrs,
    stickerAttrs,
    // Handlers
    deselectAll,
    handleProfileClick,
    handleFlip,
    handleDragMove,
    handleDragEnd,
    handleTransformEnd,
    handleStickerClick,
    handleStickerFlip,
    handleStickerDragMove,
    handleStickerDragEnd,
    handleStickerTransformEnd,
  };
}
