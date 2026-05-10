import { randomInt } from "crypto";
import type { Booking } from "@shared/schema";

export type VerificationResult =
  | { ok: true; booking: Booking }
  | { ok: false; status: number; message: string };

export function generateVerificationCode(): string {
  return randomInt(0, 10_000).toString().padStart(4, "0");
}

export function normalizeVerificationCode(value: unknown): string {
  return String(value ?? "").replace(/\D/g, "").slice(0, 4);
}

export function isVerificationCodeValid(booking: Booking, code: string): boolean {
  return booking.verificationCode === normalizeVerificationCode(code);
}
