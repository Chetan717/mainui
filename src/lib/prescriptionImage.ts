import {
  IMAGE_MAX_SIZE_BYTES,
  IMAGE_SIZE_LIMIT_MESSAGE,
} from "./fileValidation";

const MAX_IMAGE_EDGE = 1280;
const WEBP_QUALITY = 0.8;

const SAFE_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
]);

export type PreparedPrescriptionImage = {
  blob: Blob;
  previewUrl: string;
  originalBytes: number;
  optimizedBytes: number;
  width: number;
  height: number;
};

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("This image format could not be opened. Please use JPG, PNG, WEBP, HEIC, or your camera."));
    };
    image.src = url;
  });
}

function canvasToWebP(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => blob ? resolve(blob) : reject(new Error("Image optimization failed on this device.")),
      "image/webp",
      WEBP_QUALITY,
    );
  });
}

export async function preparePrescriptionImage(file: File): Promise<PreparedPrescriptionImage> {
  if (!file || file.size === 0) throw new Error("Please choose a valid image.");
  if (file.size > IMAGE_MAX_SIZE_BYTES) throw new Error(IMAGE_SIZE_LIMIT_MESSAGE);
  if (!SAFE_IMAGE_TYPES.has(file.type)) {
    throw new Error("Only JPG, PNG, WEBP, HEIC, and HEIF images are supported.");
  }

  const image = await loadImage(file);
  const longestEdge = Math.max(image.naturalWidth, image.naturalHeight);
  const scale = longestEdge > MAX_IMAGE_EDGE ? MAX_IMAGE_EDGE / longestEdge : 1;
  const width = Math.max(1, Math.round(image.naturalWidth * scale));
  const height = Math.max(1, Math.round(image.naturalHeight * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d", { alpha: false });
  if (!context) throw new Error("Image processing is not supported on this device.");

  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, width, height);
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";
  context.drawImage(image, 0, 0, width, height);

  const blob = await canvasToWebP(canvas);
  return {
    blob,
    previewUrl: URL.createObjectURL(blob),
    originalBytes: file.size,
    optimizedBytes: blob.size,
    width,
    height,
  };
}
