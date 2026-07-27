"use client";

/**
 * Shrink a field photo before it is queued.
 *
 * A modern phone camera hands us a 3-4 MB image. Forty of those queued on a
 * truck is 150 MB sitting in IndexedDB, and each one is a slow upload on one
 * bar of LTE. 1600 px on the long edge at quality 0.82 lands around 250-400 KB
 * and still reads a nameplate, a serial stamp, or a business card cleanly.
 *
 * Anything that fails to decode (odd HEIC variants, corrupt file) falls back
 * to the original bytes -- never drop a capture over a compression problem.
 */

export const MAX_DIMENSION = 1600;
export const JPEG_QUALITY = 0.82;

export type PreparedImage = { blob: Blob; type: string };

export async function prepareImage(file: File): Promise<PreparedImage> {
  const original: PreparedImage = {
    blob: file,
    type: file.type || "image/jpeg",
  };

  try {
    if (typeof createImageBitmap !== "function") return original;

    const bitmap = await createImageBitmap(file);
    const { width, height } = bitmap;
    if (!width || !height) {
      bitmap.close?.();
      return original;
    }

    const scale = Math.min(1, MAX_DIMENSION / Math.max(width, height));
    const w = Math.max(1, Math.round(width * scale));
    const h = Math.max(1, Math.round(height * scale));

    const blob = await drawToJpeg(bitmap, w, h);
    bitmap.close?.();

    // If shrinking somehow made it bigger (tiny source images), keep the original.
    if (!blob || blob.size >= file.size) return original;

    return { blob, type: "image/jpeg" };
  } catch {
    return original;
  }
}

async function drawToJpeg(
  bitmap: ImageBitmap,
  w: number,
  h: number,
): Promise<Blob | null> {
  if (typeof OffscreenCanvas === "function") {
    const canvas = new OffscreenCanvas(w, h);
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.drawImage(bitmap, 0, 0, w, h);
    return await canvas.convertToBlob({
      type: "image/jpeg",
      quality: JPEG_QUALITY,
    });
  }

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.drawImage(bitmap, 0, 0, w, h);

  return await new Promise<Blob | null>((resolve) =>
    canvas.toBlob((b) => resolve(b), "image/jpeg", JPEG_QUALITY),
  );
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
