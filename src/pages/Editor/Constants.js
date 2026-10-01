export const STAGE_WIDTH = 320;
export const STAGE_HEIGHT = 320;
export const EXPORT_PIXEL_RATIO = 6;

export const GENERAL_SELECT_TYPES = [];

export const GENERAL_SELECT_TYPES_birthday = [
  { name: "Anniversary & Birthday", value: "Anniversary_Birthday" },
];

export const GENERAL_SELECT_TYPES_bonanza = [
  { name: "Bonanza", value: "Bonanza" },
  { name: "Domestic Trip", value: "Domestic_Trip" },
];

export const clamp = (val, min, max) => Math.min(Math.max(val, min), max);