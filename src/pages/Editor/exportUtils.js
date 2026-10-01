export const NATIVE_APP_IMAGE_EXPORT_SIZE = 1080;

/**
 * Keep browser exports at their existing quality, but cap the mobile app
 * WebView export to a 1080px square. Sending a 2560px PNG as a base64 bridge
 * message is unnecessarily memory-heavy on lower-memory Android devices and
 * can result in a partially written/decoded image.
 */
export function getImageExportPixelRatio({
  stageWidth,
  defaultPixelRatio,
  isNativeWebView,
}) {
  const safeStageWidth = Number(stageWidth);
  const safeDefaultRatio = Number(defaultPixelRatio);

  if (
    isNativeWebView &&
    Number.isFinite(safeStageWidth) &&
    safeStageWidth > 0
  ) {
    return NATIVE_APP_IMAGE_EXPORT_SIZE / safeStageWidth;
  }

  return Number.isFinite(safeDefaultRatio) && safeDefaultRatio > 0
    ? safeDefaultRatio
    : 1;
}
