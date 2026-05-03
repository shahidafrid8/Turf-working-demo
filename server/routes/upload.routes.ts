import type { Express, Request, Response } from "express";
import { storage } from "../storage";
import { persistUploadedImage } from "../imageStorage";
import { captureError } from "../logger";
import { validateUploadedImage } from "../uploadSecurity";
import { safeUserResponse, upload } from "./shared";

export function registerUploadRoutes(app: Express) {
  app.post("/api/upload", upload.single("image"), async (req: Request, res: Response) => {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" }) as any;
    try {
      await validateUploadedImage(req.file);
      const url = await persistUploadedImage(req.file);
      res.json({ url });
    } catch (err: any) {
      res.status(400).json({ error: err.message || "Invalid image upload" });
    }
  });

  app.post("/api/auth/profile-image", upload.single("image"), async (req: Request, res: Response) => {
    if (!req.session.userId) return res.status(401).json({ error: "Not authenticated" }) as any;
    if (!req.file) return res.status(400).json({ error: "No file uploaded" }) as any;
    try {
      await validateUploadedImage(req.file);
      const imageUrl = await persistUploadedImage(req.file);
      const updated = await storage.updateUserProfile(req.session.userId, { profileImageUrl: imageUrl });
      if (!updated) return res.status(500).json({ error: "Update failed" }) as any;
      res.json(safeUserResponse(updated));
    } catch (err: any) {
      const status = err?.message?.includes("valid PNG or JPEG") ? 400 : 500;
      if (status === 500) captureError(err, { route: "POST /api/auth/profile-image" });
      res.status(status).json({ error: status === 400 ? err.message : "Profile image upload failed" });
    }
  });
}
