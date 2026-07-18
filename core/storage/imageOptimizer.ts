export type ImageOptimizeOptions = { maxWidth?: number; maxHeight?: number; quality?: number; mimeType?: "image/jpeg" | "image/webp" | "image/png" };

export async function optimizeImage(file: File, options: ImageOptimizeOptions = {}) {
  if (typeof window === "undefined") return file;
  if (!file.type.startsWith("image/")) return file;

  const maxWidth = options.maxWidth ?? 1600;
  const maxHeight = options.maxHeight ?? 1600;
  const quality = options.quality ?? 0.82;
  const mimeType = options.mimeType ?? "image/webp";

  const imageBitmap = await createImageBitmap(file);
  const ratio = Math.min(maxWidth / imageBitmap.width, maxHeight / imageBitmap.height, 1);
  const width = Math.round(imageBitmap.width * ratio);
  const height = Math.round(imageBitmap.height * ratio);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return file;
  ctx.drawImage(imageBitmap, 0, 0, width, height);

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, mimeType, quality));
  if (!blob) return file;

  const newName = file.name.replace(/\.[^.]+$/, mimeType === "image/webp" ? ".webp" : mimeType === "image/jpeg" ? ".jpg" : ".png");
  return new File([blob], newName, { type: mimeType, lastModified: Date.now() });
}

export const ImageOptimizer = { optimize: optimizeImage };

