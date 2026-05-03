import type { Express } from "express";
import fs from "fs/promises";
import { logger } from "./logger";

export async function persistUploadedImage(file: Express.Multer.File): Promise<string> {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const uploadPreset = process.env.CLOUDINARY_UPLOAD_PRESET;

  if (!cloudName || !uploadPreset) {
    logger.warn("upload.local_fallback", {
      filename: file.filename,
      reason: "Cloudinary env vars are not configured",
    });
    return `/uploads/${file.filename}`;
  }

  const bytes = await fs.readFile(file.path);
  const form = new FormData();
  form.append("file", new Blob([bytes], { type: file.mimetype }), file.originalname);
  form.append("upload_preset", uploadPreset);

  const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
    method: "POST",
    body: form,
  });

  const body = await response.json() as { secure_url?: string; error?: { message?: string } };
  if (!response.ok || !body.secure_url) {
    throw new Error(body.error?.message || "Cloudinary upload failed");
  }

  await fs.unlink(file.path).catch(() => undefined);
  return body.secure_url;
}
