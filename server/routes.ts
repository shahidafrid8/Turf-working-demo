import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertBookingSchema } from "@shared/schema";
import bcrypt from "bcrypt";
import { z } from "zod";
import multer from "multer";
import path from "path";
import fs from "fs";

const uploadsDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

const fileStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`);
  },
});

const upload = multer({
  storage: fileStorage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ["image/jpeg", "image/jpg", "image/png"];
    if (allowed.includes(file.mimetype)) cb(null, true);
    else cb(new Error("Only PNG and JPEG images are allowed"));
  },
});

declare module "express-session" {
  interface SessionData {
    userId: string;
  }
}

const SALT_ROUNDS = 10;
const ADMIN_KEY = process.env.ADMIN_KEY || "turftime-admin";

const usernameRegex = /^(?!.*\.\.)(?!.*\.$)[a-zA-Z0-9_][a-zA-Z0-9_.]{0,28}[a-zA-Z0-9_]$|^[a-zA-Z0-9_]$/;

const passwordSchema = z
  .string()
  .min(6, "Password must be at least 6 characters")
  .refine(val => !/^\d+$/.test(val), "Password can't be all numbers — add a letter or symbol");

const baseRegisterSchema = z.object({
  username: z.string().regex(usernameRegex, "Username: letters, numbers, underscores, periods only — can't start or end with a period").max(30),
  email: z.string().email("Enter a valid email address").refine(val => val.toLowerCase().endsWith("@gmail.com"), "Only Gmail addresses (@gmail.com) are accepted"),
  phoneNumber: z.string().regex(/^\d{10}$/, "Phone number must be exactly 10 digits"),
  dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD"),
  password: passwordSchema,
});

const ownerRegisterSchema = baseRegisterSchema.extend({
  fullName: z.string().min(2, "Full name must be at least 2 characters").max(80),
});

const turfSubmitSchema = z.object({
  turfName: z.string().min(3, "Turf name must be at least 3 characters"),
  turfLocation: z.string().min(2, "Location is required"),
  turfAddress: z.string().min(5, "Full address is required"),
  turfPincode: z.string().regex(/^\d{6}$/, "Pincode must be exactly 6 digits"),
  turfImageUrls: z.array(z.string().min(1, "Image path is required")).min(1, "At least one turf image is required").max(5),
  turfLength: z.number().int().min(1, "Length must be at least 1 meter"),
  turfWidth: z.number().int().min(1, "Width must be at least 1 meter"),
});

const loginSchema = z.object({
  identifier: z.string().min(1),
  password: z.string().min(1),
});

const forgotPasswordSchema = z.object({
  identifier: z.string().min(1),
  dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  newPassword: passwordSchema,
});

function safeUserResponse(user: { id: string; username: string; fullName?: string | null; email: string; phoneNumber: string; dateOfBirth?: string; role: string; ownerStatus?: string | null; turfStatus?: string | null; turfName?: string | null; turfLocation?: string | null; turfAddress?: string | null; turfPincode?: string | null; turfImageUrls?: string[] | null; turfLength?: number | null; turfWidth?: number | null; profileImageUrl?: string | null }) {
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

async function findUserByIdentifier(identifier: string) {
  let user = await storage.getUserByUsername(identifier);
  if (!user) user = await storage.getUserByPhone(identifier);
  if (!user) user = await storage.getUserByEmail(identifier);
  return user;
}

export async function registerRoutes(httpServer: Server, app: Express): Promise<Server> {

  // ── Player Registration ───────────────────────────────────────────────────
  app.post("/api/auth/register", async (req: Request, res: Response) => {
    try {
      const data = baseRegisterSchema.parse(req.body);

      if (await storage.getUserByUsername(data.username)) return res.status(409).json({ error: "Username already taken" }) as any;
      if (await storage.getUserByEmail(data.email)) return res.status(409).json({ error: "Gmail address already registered" }) as any;
      if (await storage.getUserByPhone(data.phoneNumber)) return res.status(409).json({ error: "Phone number already registered" }) as any;

      const user = await storage.createUser({
        username: data.username,
        email: data.email.toLowerCase(),
        phoneNumber: data.phoneNumber,
        password: await bcrypt.hash(data.password, SALT_ROUNDS),
        dateOfBirth: data.dateOfBirth,
        role: "player",
      });

      req.session.userId = user.id;
      req.session.save(() => res.status(201).json(safeUserResponse(user)));
    } catch (err: any) {
      if (err?.name === "ZodError") return res.status(400).json({ error: err.errors[0]?.message || "Invalid data" }) as any;
      console.error("Register error:", err);
      res.status(500).json({ error: "Registration failed" });
    }
  });

  // ── Turf Owner Registration (account only — no turf details yet) ──────────
  app.post("/api/auth/register/owner", async (req: Request, res: Response) => {
    try {
      const data = ownerRegisterSchema.parse(req.body);

      if (await storage.getUserByUsername(data.username)) return res.status(409).json({ error: "Username already taken" }) as any;
      if (await storage.getUserByEmail(data.email)) return res.status(409).json({ error: "Gmail address already registered" }) as any;
      if (await storage.getUserByPhone(data.phoneNumber)) return res.status(409).json({ error: "Phone number already registered" }) as any;

      const user = await storage.createUser({
        username: data.username,
        fullName: data.fullName,
        email: data.email.toLowerCase(),
        phoneNumber: data.phoneNumber,
        password: await bcrypt.hash(data.password, SALT_ROUNDS),
        dateOfBirth: data.dateOfBirth,
        role: "turf_owner",
        ownerStatus: "pending_account",
      });

      req.session.userId = user.id;
      req.session.save(() => res.status(201).json(safeUserResponse(user)));
    } catch (err: any) {
      if (err?.name === "ZodError") return res.status(400).json({ error: err.errors[0]?.message || "Invalid data" }) as any;
      console.error("Owner register error:", err);
      res.status(500).json({ error: "Registration failed" });
    }
  });

  // ── Owner: submit turf details (after account is approved) ────────────────
  app.post("/api/owner/turf/submit", async (req: Request, res: Response) => {
    if (!req.session.userId) return res.status(401).json({ error: "Not authenticated" }) as any;
    const owner = await storage.getUser(req.session.userId);
    if (!owner || owner.role !== "turf_owner") return res.status(403).json({ error: "Not a turf owner" }) as any;
    if (owner.ownerStatus !== "account_approved") return res.status(403).json({ error: "Account must be approved before submitting a turf" }) as any;
    try {
      const data = turfSubmitSchema.parse(req.body);
      const updated = await storage.submitTurf(owner.id, data);
      if (!updated) return res.status(500).json({ error: "Failed to submit turf" }) as any;
      res.json(safeUserResponse(updated));
    } catch (err: any) {
      if (err?.name === "ZodError") return res.status(400).json({ error: err.errors[0]?.message || "Invalid data" }) as any;
      res.status(500).json({ error: "Turf submission failed" });
    }
  });

  // ── Login ─────────────────────────────────────────────────────────────────
  app.post("/api/auth/login", async (req: Request, res: Response) => {
    try {
      const { identifier, password } = loginSchema.parse(req.body);
      const user = await findUserByIdentifier(identifier);

      if (!user || !(await bcrypt.compare(password, user.password))) {
        return res.status(401).json({ error: "Invalid credentials" }) as any;
      }

      req.session.userId = user.id;
      req.session.save(() => res.json(safeUserResponse(user)));
    } catch (err: any) {
      console.error("Login error:", err);
      res.status(500).json({ error: "Login failed" });
    }
  });

  // ── Logout ────────────────────────────────────────────────────────────────
  app.post("/api/auth/logout", (req: Request, res: Response) => {
    req.session.destroy(() => res.json({ success: true }));
  });

  // ── Current user ──────────────────────────────────────────────────────────
  app.get("/api/auth/me", async (req: Request, res: Response) => {
    if (!req.session.userId) return res.status(401).json({ error: "Not authenticated" }) as any;
    const user = await storage.getUser(req.session.userId);
    if (!user) return res.status(401).json({ error: "User not found" }) as any;
    res.json(safeUserResponse(user));
  });

  // ── Forgot password ───────────────────────────────────────────────────────
  app.post("/api/auth/forgot-password", async (req: Request, res: Response) => {
    try {
      const { identifier, dateOfBirth, newPassword } = forgotPasswordSchema.parse(req.body);
      const user = await findUserByIdentifier(identifier);

      if (!user) return res.status(404).json({ error: "Account not found" }) as any;
      if (user.dateOfBirth !== dateOfBirth) return res.status(400).json({ error: "Date of birth does not match" }) as any;

      await storage.updateUserPassword(user.id, await bcrypt.hash(newPassword, SALT_ROUNDS));
      res.json({ success: true });
    } catch (err: any) {
      if (err?.name === "ZodError") return res.status(400).json({ error: err.errors[0]?.message || "Invalid data" }) as any;
      res.status(500).json({ error: "Password reset failed" });
    }
  });

  // ── Update profile ────────────────────────────────────────────────────────
  app.patch("/api/auth/profile", async (req: Request, res: Response) => {
    if (!req.session.userId) return res.status(401).json({ error: "Not authenticated" }) as any;
    try {
      const { username, fullName, email, phoneNumber } = req.body;
      const currentUser = await storage.getUser(req.session.userId);
      if (!currentUser) return res.status(404).json({ error: "User not found" }) as any;

      // Check for uniqueness conflicts
      if (username && username !== currentUser.username) {
        const existing = await storage.getUserByUsername(username);
        if (existing) return res.status(409).json({ error: "Username already taken" }) as any;
      }
      if (email && email !== currentUser.email) {
        const existing = await storage.getUserByEmail(email);
        if (existing) return res.status(409).json({ error: "Email already registered" }) as any;
      }
      if (phoneNumber && phoneNumber !== currentUser.phoneNumber) {
        const existing = await storage.getUserByPhone(phoneNumber);
        if (existing) return res.status(409).json({ error: "Phone number already registered" }) as any;
      }

      const updated = await storage.updateUserProfile(req.session.userId, {
        username: username || undefined,
        fullName: fullName || undefined,
        email: email ? email.toLowerCase() : undefined,
        phoneNumber: phoneNumber || undefined,
      });
      if (!updated) return res.status(500).json({ error: "Update failed" }) as any;
      res.json(safeUserResponse(updated));
    } catch (err: any) {
      console.error("Profile update error:", err);
      res.status(500).json({ error: "Profile update failed" });
    }
  });

  // ── Change password ───────────────────────────────────────────────────────
  app.post("/api/auth/change-password", async (req: Request, res: Response) => {
    if (!req.session.userId) return res.status(401).json({ error: "Not authenticated" }) as any;
    try {
      const { currentPassword, newPassword } = req.body;
      if (!currentPassword || !newPassword) return res.status(400).json({ error: "Both fields are required" }) as any;

      const user = await storage.getUser(req.session.userId);
      if (!user) return res.status(404).json({ error: "User not found" }) as any;

      const valid = await bcrypt.compare(currentPassword, user.password);
      if (!valid) return res.status(400).json({ error: "Current password is incorrect" }) as any;

      const parsed = passwordSchema.safeParse(newPassword);
      if (!parsed.success) return res.status(400).json({ error: parsed.error.errors[0]?.message || "Invalid password" }) as any;

      await storage.updateUserPassword(user.id, await bcrypt.hash(newPassword, SALT_ROUNDS));
      res.json({ success: true });
    } catch (err: any) {
      console.error("Change password error:", err);
      res.status(500).json({ error: "Password change failed" });
    }
  });

  // ── My bookings (for authenticated user) ──────────────────────────────────
  app.get("/api/auth/my-bookings", async (req: Request, res: Response) => {
    if (!req.session.userId) return res.status(401).json({ error: "Not authenticated" }) as any;
    const bookings = await storage.getBookingsByUserId(req.session.userId);
    res.json(bookings);
  });

  // ── Image upload ──────────────────────────────────────────────────────────
  app.post("/api/upload", upload.single("image"), (req: Request, res: Response) => {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" }) as any;
    res.json({ url: `/uploads/${req.file.filename}` });
  });

  // ── Profile picture upload ────────────────────────────────────────────────
  app.post("/api/auth/profile-image", upload.single("image"), async (req: Request, res: Response) => {
    if (!req.session.userId) return res.status(401).json({ error: "Not authenticated" }) as any;
    if (!req.file) return res.status(400).json({ error: "No file uploaded" }) as any;
    try {
      const imageUrl = `/uploads/${req.file.filename}`;
      const updated = await storage.updateUserProfile(req.session.userId, { profileImageUrl: imageUrl });
      if (!updated) return res.status(500).json({ error: "Update failed" }) as any;
      res.json(safeUserResponse(updated));
    } catch (err: any) {
      console.error("Profile image upload error:", err);
      res.status(500).json({ error: "Profile image upload failed" });
    }
  });

  // ── Public: locations ─────────────────────────────────────────────────────
  app.get("/api/locations", async (_req: Request, res: Response) => {
    res.json(await storage.getLocations());
  });

  // ── Admin: add location ───────────────────────────────────────────────────
  app.post("/api/admin/locations", async (req: Request, res: Response) => {
    if (req.query.adminKey !== ADMIN_KEY) return res.status(403).json({ error: "Forbidden" }) as any;
    const { name } = req.body;
    if (!name || typeof name !== "string" || !name.trim())
      return res.status(400).json({ error: "Location name is required" }) as any;
    res.json(await storage.addLocation(name));
  });

  // ── Admin: delete location ────────────────────────────────────────────────
  app.delete("/api/admin/locations/:name", async (req: Request, res: Response) => {
    if (req.query.adminKey !== ADMIN_KEY) return res.status(403).json({ error: "Forbidden" }) as any;
    res.json(await storage.removeLocation(decodeURIComponent(req.params.name)));
  });

  // ── Admin: stats ──────────────────────────────────────────────────────────
  app.get("/api/admin/stats", async (req: Request, res: Response) => {
    if (req.query.adminKey !== ADMIN_KEY) return res.status(403).json({ error: "Forbidden" }) as any;
    res.json(await storage.getAdminStats());
  });

  // ── Admin: all owners ─────────────────────────────────────────────────────
  app.get("/api/admin/all-owners", async (req: Request, res: Response) => {
    if (req.query.adminKey !== ADMIN_KEY) return res.status(403).json({ error: "Forbidden" }) as any;
    const owners = await storage.getAllOwners();
    res.json(owners.map(o => safeUserResponse(o)));
  });

  // ── Admin: all players ────────────────────────────────────────────────────
  app.get("/api/admin/players", async (req: Request, res: Response) => {
    if (req.query.adminKey !== ADMIN_KEY) return res.status(403).json({ error: "Forbidden" }) as any;
    const players = await storage.getAllPlayers();
    res.json(players.map(p => safeUserResponse(p)));
  });

  // ── Admin: all bookings ───────────────────────────────────────────────────
  app.get("/api/admin/bookings", async (req: Request, res: Response) => {
    if (req.query.adminKey !== ADMIN_KEY) return res.status(403).json({ error: "Forbidden" }) as any;
    res.json(await storage.getBookings());
  });

  // ── Admin: list pending accounts ──────────────────────────────────────────
  app.get("/api/admin/owners", async (req: Request, res: Response) => {
    if (req.query.adminKey !== ADMIN_KEY) return res.status(403).json({ error: "Forbidden" }) as any;
    const owners = await storage.getPendingAccounts();
    res.json(owners.map(o => safeUserResponse(o)));
  });

  // ── Admin: list pending turfs ─────────────────────────────────────────────
  app.get("/api/admin/pending-turfs", async (req: Request, res: Response) => {
    if (req.query.adminKey !== ADMIN_KEY) return res.status(403).json({ error: "Forbidden" }) as any;
    const owners = await storage.getPendingTurfs();
    res.json(owners.map(o => safeUserResponse(o)));
  });

  // ── Admin: approve account ────────────────────────────────────────────────
  app.post("/api/admin/owners/:id/approve", async (req: Request, res: Response) => {
    if (req.query.adminKey !== ADMIN_KEY) return res.status(403).json({ error: "Forbidden" }) as any;
    const user = await storage.updateOwnerStatus(req.params.id, "account_approved");
    if (!user) return res.status(404).json({ error: "Owner not found" }) as any;
    res.json(safeUserResponse(user));
  });

  // ── Admin: reject account ─────────────────────────────────────────────────
  app.post("/api/admin/owners/:id/reject", async (req: Request, res: Response) => {
    if (req.query.adminKey !== ADMIN_KEY) return res.status(403).json({ error: "Forbidden" }) as any;
    const user = await storage.updateOwnerStatus(req.params.id, "account_rejected");
    if (!user) return res.status(404).json({ error: "Owner not found" }) as any;
    res.json(safeUserResponse(user));
  });

  // ── Admin: approve turf ───────────────────────────────────────────────────
  app.post("/api/admin/owners/:id/approve-turf", async (req: Request, res: Response) => {
    if (req.query.adminKey !== ADMIN_KEY) return res.status(403).json({ error: "Forbidden" }) as any;
    const user = await storage.updateTurfStatus(req.params.id, "turf_approved");
    if (!user) return res.status(404).json({ error: "Owner not found" }) as any;
    res.json(safeUserResponse(user));
  });

  // ── Admin: reject turf ────────────────────────────────────────────────────
  app.post("/api/admin/owners/:id/reject-turf", async (req: Request, res: Response) => {
    if (req.query.adminKey !== ADMIN_KEY) return res.status(403).json({ error: "Forbidden" }) as any;
    const user = await storage.updateTurfStatus(req.params.id, "turf_rejected");
    if (!user) return res.status(404).json({ error: "Owner not found" }) as any;
    res.json(safeUserResponse(user));
  });

  // ── Owner turfs ───────────────────────────────────────────────────────────
  app.get("/api/owner/turfs", async (req: Request, res: Response) => {
    if (!req.session.userId) return res.status(401).json({ error: "Not authenticated" }) as any;
    const turfs = await storage.getTurfsByOwnerId(req.session.userId);
    res.json(turfs);
  });

  // ── Owner: view slots for their turf (includes isBlocked info) ────────────
  app.get("/api/owner/turfs/:turfId/slots/:date", async (req: Request, res: Response) => {
    if (!req.session.userId) return res.status(401).json({ error: "Not authenticated" }) as any;
    const turfs = await storage.getTurfsByOwnerId(req.session.userId);
    const owned = turfs.find(t => t.id === req.params.turfId);
    if (!owned) return res.status(403).json({ error: "Not your turf" }) as any;
    const slots = await storage.getTimeSlots(req.params.turfId, req.params.date);
    res.json(slots);
  });

  // ── Owner: block a slot ───────────────────────────────────────────────────
  app.post("/api/owner/slots/:slotId/block", async (req: Request, res: Response) => {
    if (!req.session.userId) return res.status(401).json({ error: "Not authenticated" }) as any;
    const slot = await storage.getTimeSlot(req.params.slotId);
    if (!slot) return res.status(404).json({ error: "Slot not found" }) as any;
    const turfs = await storage.getTurfsByOwnerId(req.session.userId);
    if (!turfs.find(t => t.id === slot.turfId)) return res.status(403).json({ error: "Not your turf" }) as any;
    if (slot.isBooked) return res.status(400).json({ error: "Slot is already booked by a player" }) as any;
    const updated = await storage.blockTimeSlot(req.params.slotId);
    res.json(updated);
  });

  // ── Owner: unblock a slot ─────────────────────────────────────────────────
  app.post("/api/owner/slots/:slotId/unblock", async (req: Request, res: Response) => {
    if (!req.session.userId) return res.status(401).json({ error: "Not authenticated" }) as any;
    const slot = await storage.getTimeSlot(req.params.slotId);
    if (!slot) return res.status(404).json({ error: "Slot not found" }) as any;
    const turfs = await storage.getTurfsByOwnerId(req.session.userId);
    if (!turfs.find(t => t.id === slot.turfId)) return res.status(403).json({ error: "Not your turf" }) as any;
    const updated = await storage.unblockTimeSlot(req.params.slotId);
    res.json(updated);
  });

  // ── Turf routes ───────────────────────────────────────────────────────────
  app.get("/api/turfs", async (req, res) => {
    try { res.json(await storage.getTurfs()); } catch { res.status(500).json({ error: "Failed to fetch turfs" }); }
  });

  app.get("/api/turfs/:id", async (req, res) => {
    try {
      const turf = await storage.getTurf(req.params.id);
      if (!turf) return res.status(404).json({ error: "Turf not found" }) as any;
      res.json(turf);
    } catch { res.status(500).json({ error: "Failed to fetch turf" }); }
  });

  app.get("/api/turfs/:id/slots/:date", async (req, res) => {
    try { res.json(await storage.getTimeSlots(req.params.id, req.params.date)); } catch { res.status(500).json({ error: "Failed to fetch time slots" }); }
  });

  // ── Booking routes ────────────────────────────────────────────────────────
  app.get("/api/bookings", async (req, res) => {
    try { res.json(await storage.getBookings()); } catch { res.status(500).json({ error: "Failed to fetch bookings" }); }
  });

  app.get("/api/bookings/:id", async (req, res) => {
    try {
      const booking = await storage.getBooking(req.params.id);
      if (!booking) return res.status(404).json({ error: "Booking not found" }) as any;
      res.json(booking);
    } catch { res.status(500).json({ error: "Failed to fetch booking" }); }
  });

  app.post("/api/bookings", async (req, res) => {
    try {
      const validatedData = insertBookingSchema.parse(req.body);
      // Attach session user info if logged in
      if (req.session.userId) {
        const user = await storage.getUser(req.session.userId);
        if (user) {
          validatedData.userId = user.id;
          validatedData.userName = user.fullName || user.username;
          validatedData.userPhone = user.phoneNumber;
        }
      }

      // ── Prevent double-booking ─────────────────────────────────────
      const slots = await storage.getTimeSlots(validatedData.turfId, validatedData.date);
      
      const durationHours = Math.ceil((validatedData.duration || 60) / 60);
      const startHour = parseInt(validatedData.startTime.split(':')[0]);
      
      const requiredSlots: any[] = [];
      let hasConflict = false;
      let conflictReason = "";

      for (let i = 0; i < durationHours; i++) {
        const requiredHour = startHour + i;
        const requiredHourStr = `${requiredHour.toString().padStart(2, '0')}:00`;
        const matchingSlot = slots.find(
          (s) => s.startTime === requiredHourStr && s.turfId === validatedData.turfId
        );

        if (!matchingSlot) {
           hasConflict = true;
           conflictReason = "Time slot is outside of operational hours or missing";
           break;
        }
        if (matchingSlot.isBooked) {
          hasConflict = true;
          conflictReason = "One or more of the selected time slots are already booked";
          break;
        }
        if (matchingSlot.isBlocked) {
          hasConflict = true;
          conflictReason = "One or more of the selected time slots are blocked by the owner";
          break;
        }
        requiredSlots.push(matchingSlot);
      }

      if (hasConflict) {
        return res.status(409).json({ error: conflictReason }) as any;
      }

      // Mark all required slots as booked
      for (const reqSlot of requiredSlots) {
        await storage.bookTimeSlot(reqSlot.id);
      }

      const booking = await storage.createBooking(validatedData);
      res.status(201).json(booking);
    } catch (err) {
      console.error("Booking creation error:", err);
      res.status(400).json({ error: "Invalid booking data" });
    }
  });

  // ── Owner: get all bookings for their turf ────────────────────────────────
  app.get("/api/owner/turfs/:turfId/bookings", async (req: Request, res: Response) => {
    if (!req.session.userId) return res.status(401).json({ error: "Not authenticated" }) as any;
    const turfs = await storage.getTurfsByOwnerId(req.session.userId);
    const owned = turfs.find(t => t.id === req.params.turfId);
    if (!owned) return res.status(403).json({ error: "Not your turf" }) as any;
    const bookings = await storage.getBookingsByTurfId(req.params.turfId);
    res.json(bookings.sort((a, b) => new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime()));
  });

  return httpServer;
}
