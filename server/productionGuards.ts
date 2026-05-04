import { logger } from "./logger";

const productionRequiredEnv = [
  "DATABASE_URL",
  "SESSION_SECRET",
  "ADMIN_KEY",
] as const;

export function assertProductionConfig() {
  if (process.env.NODE_ENV !== "production") return;

  const missing = productionRequiredEnv.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    throw new Error(`Missing production environment variables: ${missing.join(", ")}`);
  }

  if (process.env.ADMIN_KEY === "turftime-admin") {
    throw new Error("ADMIN_KEY must be changed before production startup");
  }

  if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_UPLOAD_PRESET) {
    logger.warn("config.cloudinary_missing", {
      message: "Cloudinary is not configured; uploads will rely on local storage unless you set CLOUDINARY_CLOUD_NAME and CLOUDINARY_UPLOAD_PRESET",
    });
  }

  logger.info("config.production_validated", {
    databaseConfigured: Boolean(process.env.DATABASE_URL),
    cloudinaryConfigured: Boolean(process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_UPLOAD_PRESET),
  });
}
