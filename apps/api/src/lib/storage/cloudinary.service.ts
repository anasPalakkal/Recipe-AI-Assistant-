import { cloudinary } from "./cloudinary.client.js";

// "authenticated" delivery type prevents outsiders from constructing a
// valid URL on their own (no guessing, no public listing) - but on
// Cloudinary's free plan there is no real time-limited expiry on the
// signed URL itself (expires_at is ignored for this delivery type; true
// auto-expiring token URLs are an Enterprise feature). This is a known,
// accepted trade-off versus the original R2 signed-URL design - food
// photos don't warrant paying for stricter access control right now.
const DELIVERY_TYPE = "authenticated" as const;

// Namespaced by userId, same purpose as the R2 key prefix: a future
// account-deletion bulk purge can target a user's folder directly.
function buildPublicId(userId: string): string {
  return `chat-uploads/${userId}/${crypto.randomUUID()}`;
}

export async function uploadUserImage(userId: string, buffer: Buffer): Promise<string> {
  const publicId = buildPublicId(userId);

  await new Promise<void>((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        public_id: publicId,
        type: DELIVERY_TYPE,
        resource_type: "image",
        format: "jpg",
      },
      (err) => {
        if (err) reject(err);
        else resolve();
      },
    );
    uploadStream.end(buffer);
  });

  return publicId;
}

// Signed fresh on every call - local signing, no network round-trip, so
// there's no reason to cache or persist the result. See the trade-off
// note above: this restricts guessing/listing, not time-based expiry.
export function getSignedImageUrl(publicId: string): string {
  return cloudinary.url(publicId, {
    type: DELIVERY_TYPE,
    sign_url: true,
    secure: true,
    format: "jpg",
  });
}

// Best-effort - a failure here is logged, not thrown. An orphaned
// Cloudinary asset left after a failed delete is a minor storage cost;
// blocking the caller's own operation (e.g. conversation deletion) on a
// storage provider hiccup is a worse user-facing failure.
export async function deleteImage(
  publicId: string,
  logger: { warn: (obj: unknown, msg: string) => void },
): Promise<void> {
  try {
    await cloudinary.uploader.destroy(publicId, { type: DELIVERY_TYPE, resource_type: "image" });
  } catch (err) {
    logger.warn({ err, publicId }, "failed to delete Cloudinary asset, orphaned - needs manual cleanup");
  }
}