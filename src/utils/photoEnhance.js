const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

export function buildPhotoEnhanceFilter(enhance = 0, skinTone = 0) {
  const enhanceLevel = clamp(Number(enhance) || 0, 0, 100) / 100;
  const toneLevel = clamp(Number(skinTone) || 0, -50, 50) / 50;

  const brightness = 100 + enhanceLevel * 7 + Math.max(0, toneLevel) * 3;
  const contrast = 100 + enhanceLevel * 14;
  const saturation = 100 + enhanceLevel * 12 + Math.abs(toneLevel) * 4;
  const sepia = Math.max(0, toneLevel) * 12;
  const hueRotate = toneLevel < 0 ? toneLevel * 7 : toneLevel * -3;

  return [
    `brightness(${brightness.toFixed(1)}%)`,
    `contrast(${contrast.toFixed(1)}%)`,
    `saturate(${saturation.toFixed(1)}%)`,
    `sepia(${sepia.toFixed(1)}%)`,
    `hue-rotate(${hueRotate.toFixed(1)}deg)`,
  ].join(" ");
}
