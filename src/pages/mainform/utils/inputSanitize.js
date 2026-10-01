import DOMPurify from "dompurify";

const cleanString = (value) => {
  if (typeof value !== "string") return "";
  return DOMPurify.sanitize(value, {
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: [],
  });
};

export const sanitizeFormValue = (value, maxLength = 40) => {
  const cleaned = cleanString(value || "");
  return cleaned.slice(0, maxLength);
};

export const sanitizeName = (value) => sanitizeFormValue(value, 30);

export const sanitizePhone = (value) => {
  if (typeof value !== "string") return "";
  const digits = value.replace(/\D/g, "");
  return digits.slice(0, 10);
};

export const sanitizeAmount = (value) => {
  if (typeof value !== "string") return "";
  const cleaned = value.replace(/[^0-9.]/g, "");
  if (!cleaned) return "";

  const parts = cleaned.split(".");
  if (parts.length <= 2) {
    return cleaned.slice(0, 7);
  }

  const [integer, ...rest] = parts;
  return `${integer}.${rest.join("")}`.slice(0, 7);
};
