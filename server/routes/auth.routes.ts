import type { Express, Request, Response } from "express";
import { z } from "zod";
import { OAuth2Client } from "google-auth-library";
import { storage } from "../storage";
import { captureError } from "../logger";
import {
  baseRegisterSchema,
  changePasswordSchema,
  findUserByIdentifier,
  forgotPasswordSchema,
  hashPassword,
  loginSchema,
  ownerRegisterSchema,
  profileUpdateSchema,
  safeUserResponse,
  sanitizeText,
  verifyPassword,
} from "./shared";

const googleLoginSchema = z.object({
  credential: z.string().min(1, "Missing Google credential"),
}).strict();

export function registerAuthRoutes(app: Express) {
  app.post("/api/auth/google", async (req: Request, res: Response) => {
    try {
      const { credential } = googleLoginSchema.parse(req.body);
      const clientId = process.env.GOOGLE_CLIENT_ID;
      if (!clientId) return res.status(500).json({ error: "Google login is not configured" }) as any;

      const client = new OAuth2Client(clientId);
      const ticket = await client.verifyIdToken({
        idToken: credential,
        audience: clientId,
      });

      const payload = ticket.getPayload();
      const email = payload?.email?.toLowerCase();
      if (!email) return res.status(400).json({ error: "Invalid Google token" }) as any;
      if (payload?.email_verified === false) return res.status(400).json({ error: "Google account email is not verified" }) as any;
      if (!email.endsWith("@gmail.com")) return res.status(400).json({ error: "Only Gmail addresses (@gmail.com) are accepted" }) as any;

      const existing = await storage.getUserByEmail(email);

      if (!existing) {
        return res.json({
          needsRegistration: true,
          email,
          fullName: payload?.name ?? null,
          profileImageUrl: payload?.picture ?? null,
        });
      }

      if (existing.isBanned) {
        return res.status(403).json({
          error: `Your account has been suspended. Reason: ${existing.banReason || "Policy violation"}`,
        }) as any;
      }

      req.session.userId = existing.id;
      req.session.userRole = existing.role;
      req.session.save(() => res.json({ needsRegistration: false, user: safeUserResponse(existing) }));
    } catch (err: any) {
      if (err?.name === "ZodError") return res.status(400).json({ error: err.errors[0]?.message || "Invalid data" }) as any;
      captureError(err, { route: "POST /api/auth/google" });
      res.status(500).json({ error: "Google login failed" });
    }
  });

  app.post("/api/auth/register", async (req: Request, res: Response) => {
    try {
      const data = baseRegisterSchema.parse(req.body);
      const fullName = data.fullName ? sanitizeText(data.fullName) : undefined;

      if (await storage.getUserByUsername(data.username)) return res.status(409).json({ error: "Username already taken" }) as any;
      if (await storage.getUserByEmail(data.email)) return res.status(409).json({ error: "Gmail address already registered" }) as any;
      if (await storage.getUserByPhone(data.phoneNumber)) return res.status(409).json({ error: "Phone number already registered" }) as any;

      const user = await storage.createUser({
        username: sanitizeText(data.username),
        fullName,
        email: data.email.toLowerCase(),
        phoneNumber: data.phoneNumber,
        password: await hashPassword(data.password),
        dateOfBirth: data.dateOfBirth,
        role: "player",
      });

      req.session.userId = user.id;
      req.session.userRole = user.role;
      req.session.save(() => res.status(201).json(safeUserResponse(user)));
    } catch (err: any) {
      if (err?.name === "ZodError") return res.status(400).json({ error: err.errors[0]?.message || "Invalid data" }) as any;
      captureError(err, { route: "POST /api/auth/register" });
      res.status(500).json({ error: "Registration failed" });
    }
  });

  app.post("/api/auth/register/owner", async (req: Request, res: Response) => {
    try {
      const data = ownerRegisterSchema.parse(req.body);

      if (await storage.getUserByUsername(data.username)) return res.status(409).json({ error: "Username already taken" }) as any;
      if (await storage.getUserByEmail(data.email)) return res.status(409).json({ error: "Gmail address already registered" }) as any;
      if (await storage.getUserByPhone(data.phoneNumber)) return res.status(409).json({ error: "Phone number already registered" }) as any;

      const user = await storage.createUser({
        username: sanitizeText(data.username),
        fullName: sanitizeText(data.fullName),
        email: data.email.toLowerCase(),
        phoneNumber: data.phoneNumber,
        password: await hashPassword(data.password),
        dateOfBirth: data.dateOfBirth,
        role: "turf_owner",
        ownerStatus: "pending_account",
      });

      req.session.userId = user.id;
      req.session.userRole = user.role;
      req.session.save(() => res.status(201).json(safeUserResponse(user)));
    } catch (err: any) {
      if (err?.name === "ZodError") return res.status(400).json({ error: err.errors[0]?.message || "Invalid data" }) as any;
      captureError(err, { route: "POST /api/auth/register/owner" });
      res.status(500).json({ error: "Registration failed" });
    }
  });

  app.post("/api/auth/login", async (req: Request, res: Response) => {
    try {
      const { identifier, password } = loginSchema.parse(req.body);
      const user = await findUserByIdentifier(identifier);

      if (!user || !(await verifyPassword(password, user.password))) {
        return res.status(401).json({ error: "Invalid credentials" }) as any;
      }

      if (user.isBanned) {
        return res.status(403).json({ error: `Your account has been suspended. Reason: ${user.banReason || "Policy violation"}` }) as any;
      }

      req.session.userId = user.id;
      req.session.userRole = user.role;
      req.session.save(() => res.json(safeUserResponse(user)));
    } catch (err: any) {
      captureError(err, { route: "POST /api/auth/login" });
      res.status(500).json({ error: "Login failed" });
    }
  });

  app.post("/api/auth/logout", (req: Request, res: Response) => {
    req.session.destroy(() => res.json({ success: true }));
  });

  app.get("/api/auth/me", async (req: Request, res: Response) => {
    if (!req.session.userId) return res.status(401).json({ error: "Not authenticated" }) as any;
    const user = await storage.getUser(req.session.userId);
    if (!user) return res.status(401).json({ error: "User not found" }) as any;
    res.json(safeUserResponse(user));
  });

  app.post("/api/auth/forgot-password", async (req: Request, res: Response) => {
    try {
      const { identifier, dateOfBirth, newPassword } = forgotPasswordSchema.parse(req.body);
      const user = await findUserByIdentifier(identifier);

      if (!user) return res.status(404).json({ error: "Account not found" }) as any;
      if (user.dateOfBirth !== dateOfBirth) return res.status(400).json({ error: "Date of birth does not match" }) as any;

      await storage.updateUserPassword(user.id, await hashPassword(newPassword));
      res.json({ success: true });
    } catch (err: any) {
      if (err?.name === "ZodError") return res.status(400).json({ error: err.errors[0]?.message || "Invalid data" }) as any;
      captureError(err, { route: "POST /api/auth/forgot-password" });
      res.status(500).json({ error: "Password reset failed" });
    }
  });

  app.patch("/api/auth/profile", async (req: Request, res: Response) => {
    if (!req.session.userId) return res.status(401).json({ error: "Not authenticated" }) as any;
    try {
      const { username, fullName, email, phoneNumber } = profileUpdateSchema.parse(req.body);
      const currentUser = await storage.getUser(req.session.userId);
      if (!currentUser) return res.status(404).json({ error: "User not found" }) as any;

      if (username && username !== currentUser.username && await storage.getUserByUsername(username)) return res.status(409).json({ error: "Username already taken" }) as any;
      if (email && email !== currentUser.email && await storage.getUserByEmail(email)) return res.status(409).json({ error: "Email already registered" }) as any;
      if (phoneNumber && phoneNumber !== currentUser.phoneNumber && await storage.getUserByPhone(phoneNumber)) return res.status(409).json({ error: "Phone number already registered" }) as any;

      const updated = await storage.updateUserProfile(req.session.userId, {
        username: username || undefined,
        fullName: fullName || undefined,
        email: email ? email.toLowerCase() : undefined,
        phoneNumber: phoneNumber || undefined,
      });
      if (!updated) return res.status(500).json({ error: "Update failed" }) as any;
      res.json(safeUserResponse(updated));
    } catch (err: any) {
      if (err?.name === "ZodError") return res.status(400).json({ error: err.errors[0]?.message || "Invalid data" }) as any;
      captureError(err, { route: "PATCH /api/auth/profile" });
      res.status(500).json({ error: "Profile update failed" });
    }
  });

  app.delete("/api/auth/profile", async (req: Request, res: Response) => {
    if (!req.session.userId) return res.status(401).json({ error: "Not authenticated" }) as any;
    try {
      await storage.deleteUser(req.session.userId);
      req.session.destroy(() => res.json({ success: true }));
    } catch (err: any) {
      captureError(err, { route: "DELETE /api/auth/profile" });
      res.status(500).json({ error: "Profile deletion failed" });
    }
  });

  app.post("/api/auth/change-password", async (req: Request, res: Response) => {
    if (!req.session.userId) return res.status(401).json({ error: "Not authenticated" }) as any;
    try {
      const { currentPassword, newPassword } = changePasswordSchema.parse(req.body);
      const user = await storage.getUser(req.session.userId);
      if (!user) return res.status(404).json({ error: "User not found" }) as any;
      if (!(await verifyPassword(currentPassword, user.password))) return res.status(400).json({ error: "Current password is incorrect" }) as any;
      await storage.updateUserPassword(user.id, await hashPassword(newPassword));
      res.json({ success: true });
    } catch (err: any) {
      if (err?.name === "ZodError") return res.status(400).json({ error: err.errors[0]?.message || "Invalid data" }) as any;
      captureError(err, { route: "POST /api/auth/change-password" });
      res.status(500).json({ error: "Password change failed" });
    }
  });
}
