import type { Express } from "express";
import { storage } from "../storage";

export function registerPublicRoutes(app: Express) {
  app.get("/api/locations", async (_req, res) => {
    res.json(await storage.getLocations());
  });

  app.get("/api/updates", async (_req, res) => {
    const updates = await storage.getAdminUpdates();
    res.json(updates.filter(update => update.audience === "players" || update.audience === "all"));
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
