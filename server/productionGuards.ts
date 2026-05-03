import { logger } from "./logger";

const productionRequiredEnv = [
  "DATABASE_URL",
  "SESSION_SECRET",
  "ADMIN_KEY",
  "CLOUDINARY_CLOUD_NAME",
  "CLOUDINARY_UPLOAD_PRESET",
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

  logger.info("config.production_validated", {
    databaseConfigured: Boolean(process.env.DATABASE_URL),
    cloudinaryConfigured: Boolean(process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_UPLOAD_PRESET),
  });
}
