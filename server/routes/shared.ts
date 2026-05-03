import type { Request } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { z } from "zod";
import bcrypt from "bcrypt";
import { insertBookingSchema } from "@shared/schema";
import { storage } from "../storage";

const uploadsDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

const fileStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`);
  },
});

export const upload = multer({
  storage: fileStorage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ["image/jpeg", "image/jpg", "image/png"];
    if (allowed.includes(file.mimetype)) cb(null, true);
    else cb(new Error("Only PNG and JPEG images are allowed"));
  },
});

export const SALT_ROUNDS = 10;
export const ADMIN_KEY = process.env.ADMIN_KEY || "turftime-admin";

export function getAdminKey(req: Request): string | undefined {
  return (req.headers["x-admin-key"] as string) || (req.query.adminKey as string);
}

export function sanitizeText(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;");
}

export const usernameRegex = /^(?!.*\.\.)(?!.*\.$)[a-zA-Z0-9_][a-zA-Z0-9_.]{0,28}[a-zA-Z0-9_]$|^[a-zA-Z0-9_]$/;

export const passwordSchema = z
  .string()
  .min(6, "Password must be at least 6 characters")
  .refine(val => !/^\d+$/.test(val), "Password can't be all numbers - add a letter or symbol");

export const baseRegisterSchema = z.object({
  username: z.string().regex(usernameRegex, "Username: letters, numbers, underscores, periods only - can't start or end with a period").max(30),
  email: z.string().email("Enter a valid email address").refine(val => val.toLowerCase().endsWith("@gmail.com"), "Only Gmail addresses (@gmail.com) are accepted"),
  phoneNumber: z.string().regex(/^\d{10}$/, "Phone number must be exactly 10 digits"),
  dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD"),
  password: passwordSchema,
});

export const ownerRegisterSchema = baseRegisterSchema.extend({
  fullName: z.string().min(2, "Full name must be at least 2 characters").max(80),
});

export const turfSubmitSchema = z.object({
  turfName: z.string().min(3, "Turf name must be at least 3 characters"),
  turfLocation: z.string().min(2, "Location is required"),
  turfAddress: z.string().min(5, "Full address is required"),
  turfPincode: z.string().regex(/^\d{6}$/, "Pincode must be exactly 6 digits"),
  turfImageUrls: z.array(z.string().min(1, "Image path is required")).min(1, "At least one turf image is required").max(5),
  turfLength: z.number().int().min(1, "Length must be at least 1 meter"),
  turfWidth: z.number().int().min(1, "Width must be at least 1 meter"),
});

export const loginSchema = z.object({
  identifier: z.string().min(1),
  password: z.string().min(1),
});

export const forgotPasswordSchema = z.object({
  identifier: z.string().min(1),
  dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  newPassword: passwordSchema,
});

export const profileUpdateSchema = z.object({
  username: z.string().regex(usernameRegex).max(30).optional(),
  fullName: z.string().min(2).max(80).optional(),
  email: z.string().email().optional(),
  phoneNumber: z.string().regex(/^\d{10}$/).optional(),
}).strict();

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: passwordSchema,
}).strict();

export const staffRegisterSchema = baseRegisterSchema.extend({
  fullName: z.string().min(2, "Full name must be at least 2 characters").max(80),
}).strict();

export const slotPriceSchema = z.object({
  price: z.number().int().positive(),
  applyToAllDays: z.boolean().optional().default(false),
}).strict();

export const bookingRequestSchema = insertBookingSchema.extend({
  turfId: z.string().min(1),
  turfName: z.string().min(1),
  turfAddress: z.string().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  endTime: z.string().regex(/^\d{2}:\d{2}$/),
  duration: z.number().int().positive().max(24 * 60),
  totalAmount: z.number().int().nonnegative(),
  paidAmount: z.number().int().nonnegative(),
  balanceAmount: z.number().int().nonnegative(),
  paymentMethod: z.string().min(1).max(40),
  bookingCode: z.string().min(1).max(80),
}).strict();

export const ownerTurfProfileSchema = z.object({
  name: z.string().min(3).max(120).optional(),
  address: z.string().min(5).max(500).optional(),
  pricePerHour: z.number().int().positive().optional(),
  amenities: z.array(z.string().min(1).max(60)).max(30).optional(),
  imageUrls: z.array(z.string().min(1).max(500)).max(5).optional(),
}).strict();

export const feedbackSchema = z.object({
  rating: z.number().int().min(1).max(5),
  feedback: z.string().max(1000).optional(),
}).strict();

export const reviewSchema = z.object({
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(1000).optional(),
}).strict();

export const weekendSurchargeSchema = z.object({
  surcharge: z.number().int().nonnegative().optional(),
  weekendSurcharge: z.number().int().nonnegative().optional(),
}).strict().transform((data, ctx) => {
  const surcharge = data.surcharge ?? data.weekendSurcharge;
  if (surcharge === undefined) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Surcharge is required" });
    return z.NEVER;
  }
  return { surcharge };
});

export const adminLocationSchema = z.object({
  name: z.string().min(2).max(80),
}).strict();

export const banUserSchema = z.object({
  reason: z.string().min(1).max(500),
}).strict();

type SafeUser = {
  id: string;
  username: string;
  fullName?: string | null;
  email: string;
  phoneNumber: string;
  dateOfBirth?: string;
  role: string;
  ownerStatus?: string | null;
  turfStatus?: string | null;
  turfName?: string | null;
  turfLocation?: string | null;
  turfAddress?: string | null;
  turfPincode?: string | null;
  turfImageUrls?: string[] | null;
  turfLength?: number | null;
  turfWidth?: number | null;
  profileImageUrl?: string | null;
};

export function safeUserResponse(user: SafeUser) {
  return {
    id: user.id,
    username: user.username,
    fullName: user.fullName ?? null,
    email: user.email,
    phoneNumber: user.phoneNumber,
    dateOfBirth: user.dateOfBirth ?? null,
    role: user.role,
    ownerStatus: user.ownerStatus ?? null,
    turfStatus: user.turfStatus ?? null,
    turfName: user.turfName ?? null,
    turfLocation: user.turfLocation ?? null,
    turfAddress: user.turfAddress ?? null,
    turfPincode: user.turfPincode ?? null,
    turfImageUrls: user.turfImageUrls ?? null,
    turfLength: user.turfLength ?? null,
    turfWidth: user.turfWidth ?? null,
    profileImageUrl: user.profileImageUrl ?? null,
  };
}

export async function findUserByIdentifier(identifier: string) {
  let user = await storage.getUserByUsername(identifier);
  if (!user) user = await storage.getUserByPhone(identifier);
  if (!user) user = await storage.getUserByEmail(identifier);
  return user;
}

export async function resolveOwnerIdForContext(userId: string): Promise<string | null> {
  const user = await storage.getUser(userId);
  if (!user) return null;
  if (user.role === "turf_owner") return user.id;
  if (user.role === "turf_staff") return user.managerId || null;
  return null;
}

export async function hashPassword(password: string) {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}
