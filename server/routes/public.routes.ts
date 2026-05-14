import type { Express } from "express";
import { storage } from "../storage";
import type { AdminUpdate } from "@shared/schema";

function locationKey(value: string) {
  const cleaned = value.toLowerCase().replace(/[^a-z0-9]/g, "");
  return cleaned.endsWith("a") ? cleaned.slice(0, -1) : cleaned;
}

function isUpdateDisplayable(update: AdminUpdate, location?: string) {
  if (!update.isActive) return false;
  if (update.expiresAt && new Date(update.expiresAt).getTime() <= Date.now()) return false;
  const targets = update.targetLocations || [];
  if (!targets.length) return true;
  if (!location || location === "All locations") return false;
  const requested = locationKey(location);
  return targets.some(target => locationKey(target) === requested);
}

export function registerPublicRoutes(app: Express) {
  app.get("/api/locations", async (_req, res) => {
    res.json(await storage.getLocations());
  });

  app.get("/api/updates", async (req, res) => {
    const updates = await storage.getAdminUpdates();
    const location = typeof req.query.location === "string" ? req.query.location : undefined;
    res.json(updates.filter(update =>
      isUpdateDisplayable(update, location) &&
      update.postType === "announcement" &&
      (update.audience === "players" || update.audience === "all")
    ));
  });

  app.get("/api/ads", async (req, res) => {
    const updates = await storage.getAdminUpdates();
    const location = typeof req.query.location === "string" ? req.query.location : undefined;
    res.json(updates.filter(update =>
      isUpdateDisplayable(update, location) &&
      update.postType === "advertisement" &&
      (update.audience === "players" || update.audience === "all")
    ));
  });

  app.get("/api/turfs", async (_req, res) => {
    try {
      res.json(await storage.getTurfs());
    } catch {
      res.status(500).json({ error: "Failed to fetch turfs" });
    }
  });

  app.get("/api/turfs/:id", async (req, res) => {
    try {
      const turf = await storage.getTurf(req.params.id);
      if (!turf) return res.status(404).json({ error: "Turf not found" }) as any;
      res.json(turf);
    } catch {
      res.status(500).json({ error: "Failed to fetch turf" });
    }
  });

  app.get("/api/turfs/:id/slots/:date", async (req, res) => {
    try {
      res.json(await storage.getTimeSlots(req.params.id, req.params.date));
    } catch {
      res.status(500).json({ error: "Failed to fetch time slots" });
    }
  });

  app.get("/api/turfs/:id/reviews", async (req, res) => {
    res.json(await storage.getReviewsByTurf(req.params.id));
  });
}
