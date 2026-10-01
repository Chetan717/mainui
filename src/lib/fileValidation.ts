export const IMAGE_MAX_SIZE_BYTES = 20 * 1024 * 1024; // 20 MB
export const IMAGE_SIZE_LIMIT_MESSAGE =
  "Image का size 20 MB से ज्यादा है। कृपया 20 MB से कम की image select करें।";
const AUDIO_MAX_SIZE = 15 * 1024 * 1024; // 15 MB

const ALLOWED_IMAGE_MIMES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

const ALLOWED_IMAGE_EXTENSIONS = new Set([
  "jpg",
  "jpeg",
  "png",
  "webp",
]);

const ALLOWED_AUDIO_MIMES = new Set([
  "audio/mpeg",
  "audio/mp3",
  "audio/wav",
  "audio/x-wav",
  "audio/ogg",
  "audio/webm",
  "audio/mp4",
  "audio/aac",
  "audio/flac",
  "audio/x-flac",
  "audio/3gpp",
  "audio/3gpp2",
]);

const ALLOWED_AUDIO_EXTENSIONS = new Set([
  "mp3",
  "wav",
  "ogg",
  "webm",
  "m4a",
  "aac",
  "flac",
  "3gp",
  "3gpp",
  "3g2",
]);

const DISALLOWED_EXTENSIONS = new Set([
  "zip",
  "exe",
  "bat",
  "sh",
  "cmd",
  "js",
  "jsx",
  "ts",
  "tsx",
  "php",
  "py",
  "pl",
  "jar",
  "apk",
  "dll",
  "scr",
  "com",
  "vbs",
  "msi",
  "svg",
  "svgz",
  "json",
  "html",
  "htm",
  "xml",
  "gif",
  "avif",
  "bmp",
  "heic",
  "heif",
]);

function getExtension(fileName: string) {
  const parts = fileName.split(".");
  return parts.length > 1 ? parts.pop()?.toLowerCase() ?? "" : "";
}

function isDisallowedExtension(ext: string) {
  return DISALLOWED_EXTENSIONS.has(ext);
}

function isAllowedImage(file: File) {
  const ext = getExtension(file.name);
  if (!ext || isDisallowedExtension(ext)) return false;
  if (ALLOWED_IMAGE_EXTENSIONS.has(ext)) return true;
  if (file.type && ALLOWED_IMAGE_MIMES.has(file.type)) return true;
  return false;
}

function isAllowedAudio(file: File) {
  const ext = getExtension(file.name);
  if (!ext || isDisallowedExtension(ext)) return false;
  if (ALLOWED_AUDIO_EXTENSIONS.has(ext)) return true;
  if (file.type && ALLOWED_AUDIO_MIMES.has(file.type)) return true;
  return false;
}

export function validateUploadFile(file: File, type: "image" | "audio") {
  if (!file || !file.name) {
    return { valid: false, error: "Invalid file selected." };
  }

  const name = file.name.trim();
  const ext = getExtension(name);

  if (isDisallowedExtension(ext)) {
    return { valid: false, error: `File type .${ext} is not allowed.` };
  }

  if (type === "image") {
    // Check size before any image decoding, cropper, Remove-BG model preload,
    // FileReader work, or upload starts.
    if (file.size > IMAGE_MAX_SIZE_BYTES) {
      return { valid: false, error: IMAGE_SIZE_LIMIT_MESSAGE };
    }
    if (!isAllowedImage(file)) {
      return { valid: false, error: "Only JPG, PNG, and WEBP images are allowed." };
    }
    return { valid: true };
  }

  if (type === "audio") {
    if (!isAllowedAudio(file)) {
      return { valid: false, error: "Only MP3, WAV, OGG, WEBM, M4A, AAC, FLAC audio files are allowed." };
    }
    if (file.size > AUDIO_MAX_SIZE) {
      return { valid: false, error: "Audio must be smaller than 15 MB." };
    }
    return { valid: true };
  }

  return { valid: false, error: "Unsupported file type." };
}
