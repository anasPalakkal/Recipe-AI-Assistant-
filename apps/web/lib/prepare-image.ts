const MAX_EDGE_PX = 1280;
const JPEG_QUALITY = 0.85;
// Vercel rejects request bodies above 4.5 MB; stay safely below that.
export const MAX_UPLOAD_BYTES = 4 * 1024 * 1024;

export class ImagePreparationError extends Error {}

export async function prepareImageForUpload(file: File): Promise<File> {
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    throw new ImagePreparationError("This image could not be read. Try a JPEG, PNG or WebP photo.");
  }

  try {
    const scale = Math.min(1, MAX_EDGE_PX / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);

    const context = canvas.getContext("2d");
    if (!context) {
      throw new ImagePreparationError("Image processing is not available in this browser.");
    }

    // JPEG has no alpha channel; without this, transparent PNGs turn black.
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", JPEG_QUALITY),
    );
    if (!blob) throw new ImagePreparationError("The image could not be compressed.");
    if (blob.size > MAX_UPLOAD_BYTES) {
      throw new ImagePreparationError("The image is too large. Try a smaller photo.");
    }

    const baseName = file.name.replace(/\.[^.]+$/, "") || "photo";
    return new File([blob], `${baseName}.jpg`, { type: "image/jpeg" });
  } finally {
    bitmap.close();
  }
}