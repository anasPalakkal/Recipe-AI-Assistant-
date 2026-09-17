import { fileTypeFromBuffer } from "file-type";
import sharp from "sharp";
import { BadRequestError } from "../errors.js";

// Checked before any processing - a raw upload larger than this is
// rejected outright rather than decoded.
export const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;
const ALLOWED_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
// Longest edge after resize - bounds Gemini vision token cost regardless
// of the original photo's resolution.
const MAX_DIMENSION = 1024;

export interface ProcessedImage {
  base64: string;
  mimeType: "image/jpeg";
}

// Validates and normalizes an uploaded image before it's sent to Gemini.
// Always re-encodes as JPEG regardless of input format - this strips EXIF
// (which can carry GPS coordinates) as a side effect of the re-encode,
// not as a separate step, and caps resolution to bound cost.
export async function validateAndProcessImage(buffer: Buffer): Promise<ProcessedImage> {
  if (buffer.byteLength > MAX_UPLOAD_BYTES) {
    throw new BadRequestError("Image exceeds the 8MB upload limit", "IMAGE_TOO_LARGE");
  }

  const detected = await fileTypeFromBuffer(buffer);
  if (!detected || !ALLOWED_MIME_TYPES.has(detected.mime)) {
    throw new BadRequestError(
      "Unsupported image format. Upload a JPEG, PNG, or WebP image.",
      "UNSUPPORTED_IMAGE_TYPE",
    );
  }

  const resized = await sharp(buffer)
    .resize({ width: MAX_DIMENSION, height: MAX_DIMENSION, fit: "inside", withoutEnlargement: true })
    .jpeg({ quality: 85 })
    .toBuffer();

  return { base64: resized.toString("base64"), mimeType: "image/jpeg" };
}