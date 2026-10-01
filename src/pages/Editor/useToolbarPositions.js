import { useState, useEffect } from "react";
import { clamp, STAGE_WIDTH } from "./Constants";

const TOOLBAR_HEIGHT = 28;
const TOOLBAR_WIDTH = 36;

/**
 * Computes the pixel position of the flip toolbar for a given image attrs object.
 * Returns { top, left } ready for use as absolute CSS positioning.
 */
function calcToolbarPos(attrs) {
  const { x, y, width, scaleX } = attrs;
  const leftEdge = scaleX === -1 ? x - width : x;
  const top = Math.max(0, y - TOOLBAR_HEIGHT - 6);
  const left = clamp(
    leftEdge + width / 2 - TOOLBAR_WIDTH / 2,
    0,
    STAGE_WIDTH - TOOLBAR_WIDTH
  );
  return { top, left };
}

/**
 * Derives toolbar CSS positions for profile and sticker images,
 * recalculating whenever their attrs or selection state change.
 */
export function useToolbarPositions({ profileAttrs, isProfileSelected, stickerAttrs, isStickerSelected }) {
  const [profileToolbar, setProfileToolbar] = useState({ top: 0, left: 0 });
  const [stickerToolbar, setStickerToolbar] = useState({ top: 0, left: 0 });

  useEffect(() => {
    if (isProfileSelected) setProfileToolbar(calcToolbarPos(profileAttrs));
  }, [profileAttrs, isProfileSelected]);

  useEffect(() => {
    if (isStickerSelected) setStickerToolbar(calcToolbarPos(stickerAttrs));
  }, [stickerAttrs, isStickerSelected]);

  return { profileToolbar, stickerToolbar };
}