import type { Express, Request, Response } from "express";
import { storage } from "../storage";
import {
  ADMIN_KEY,
  adminLocationSchema,
  adminUpdateSchema,
  adminUpdateVisibilitySchema,
  banUserSchema,
  promoCodeAdminSchema,
  getAdminKey,
  safeUserResponse,
  sanitizeText,
} from "./shared";

function requireAdmin(req: Request, res: Response): boolean {
  if (getAdminKey(req) !== ADMIN_KEY) {
    res.status(403).json({ error: "Forbidden" });
    return false;
  }
  return true;
}

export function registerAdminRoutes(app: Express) {
  app.get("/api/admin/updates", async (req: Request, res: Response) => {
    if (!requireAdmin(req, res)) return;
    res.json(await storage.getAdminUpdates());
  });

  app.post("/api/admin/updates", async (req: Request, res: Response) => {
    if (!requireAdmin(req, res)) return;
    const parsed = adminUpdateSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.errors[0]?.message || "Invalid update" }) as any;
    const update = await storage.createAdminUpdate({
      ...parsed.data,
      createdBy: "admin",
    });
    res.status(201).json(update);
  });

  app.patch("/api/admin/updates/:id", async (req: Request, res: Response) => {
    if (!requireAdmin(req, res)) return;
    const parsed = adminUpdateVisibilitySchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.errors[0]?.message || "Invalid update" }) as any;
    const update = await storage.updateAdminUpdateVisibility(req.params.id, parsed.data);
    if (!update) return res.status(404).json({ error: "Update not found" }) as any;
    res.json(update);
  });

  app.delete("/api/admin/updates/:id", async (req: Request, res: Response) => {
    if (!requireAdmin(req, res)) return;
    const deleted = await storage.deleteAdminUpdate(req.params.id);
    if (!deleted) return res.status(404).json({ error: "Update not found" }) as any;
    res.json({ success: true });
  });

  app.get("/api/admin/promos", async (req: Request, res: Response) => {
    if (!requireAdmin(req, res)) return;
    res.json(await storage.getPromoCodes());
  });

  app.post("/api/admin/promos", async (req: Request, res: Response) => {
    if (!requireAdmin(req, res)) return;
    const parsed = promoCodeAdminSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.errors[0]?.message || "Invalid promo code" }) as any;
    try {
      res.status(201).json(await storage.createPromoCode(parsed.data));
    } catch (err: any) {
      res.status(err?.status || 500).json({ error: err?.message || "Could not create promo code" });
    }
  });

  app.post("/api/admin/locations", async (req: Request, res: Response) => {
    if (!requireAdmin(req, res)) return;
    const parsed = adminLocationSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.errors[0]?.message || "Invalid data" }) as any;
    res.json(await storage.addLocation(parsed.data.name.trim()));
  });

  app.delete("/api/admin/locations/:name", async (req: Request, res: Response) => {
    if (!requireAdmin(req, res)) return;
    res.json(await storage.removeLocation(decodeURIComponent(req.params.name)));
  });

  app.get("/api/admin/stats", async (req: Request, res: Response) => {
    if (!requireAdmin(req, res)) return;
    res.json(await storage.getAdminStats());
  });

  app.get("/api/admin/all-owners", async (req: Request, res: Response) => {
    if (!requireAdmin(req, res)) return;
    const owners = await storage.getAllOwners();
    res.json(owners.map(o => safeUserResponse(o)));
  });

  app.get("/api/admin/players", async (req: Request, res: Response) => {
    if (!requireAdmin(req, res)) return;
    const players = await storage.getAllPlayers();
    res.json(players.map(p => safeUserResponse(p)));
  });

  app.get("/api/admin/bookings", async (req: Request, res: Response) => {
    if (!requireAdmin(req, res)) return;
    res.json(await storage.getBookings());
  });

  app.get("/api/admin/owners", async (req: Request, res: Response) => {
    if (!requireAdmin(req, res)) return;
    const owners = await storage.getPendingAccounts();
    res.json(owners.map(o => safeUserResponse(o)));
  });

  app.get("/api/admin/pending-turfs", async (req: Request, res: Response) => {
    if (!requireAdmin(req, res)) return;
    const owners = await storage.getPendingTurfs();
    res.json(owners.map(o => safeUserResponse(o)));
  });

  app.get("/api/admin/pending-turf-listings", async (req: Request, res: Response) => {
    if (!requireAdmin(req, res)) return;
    const owners = await storage.getPendingTurfs();
    res.json(owners.map(owner => ({
      owner: safeUserResponse(owner),
      workflow: {
        addressVerification: owner.turfAddress && owner.turfPincode ? "ready_for_review" : "missing",
        imageModeration: owner.turfImageUrls && owner.turfImageUrls.length > 0 ? "ready_for_review" : "missing",
        documents: owner.turfImageUrls && owner.turfImageUrls.length > 0 ? "uploaded_images_available" : "missing",
      },
    })));
  });

  app.post("/api/admin/turfs/:turfId/approve", async (req: Request, res: Response) => {
    if (!requireAdmin(req, res)) return;
    res.json({ success: true });
  });

  app.post("/api/admin/turfs/:turfId/reject", async (req: Request, res: Response) => {
    if (!requireAdmin(req, res)) return;
    res.json({ success: true });
  });

  app.post("/api/admin/owners/:id/approve", async (req: Request, res: Response) => {
    if (!requireAdmin(req, res)) return;
    const user = await storage.updateOwnerStatus(req.params.id, "account_approved");
    if (!user) return res.status(404).json({ error: "Owner not found" }) as any;
    res.json(safeUserResponse(user));
  });

  app.post("/api/admin/owners/:id/reject", async (req: Request, res: Response) => {
    if (!requireAdmin(req, res)) return;
    const user = await storage.updateOwnerStatus(req.params.id, "account_rejected");
    if (!user) return res.status(404).json({ error: "Owner not found" }) as any;
    res.json(safeUserResponse(user));
  });

  app.post("/api/admin/owners/:id/approve-turf", async (req: Request, res: Response) => {
    if (!requireAdmin(req, res)) return;
    const user = await storage.updateTurfStatus(req.params.id, "turf_approved");
    if (!user) return res.status(404).json({ error: "Owner not found" }) as any;
    res.json(safeUserResponse(user));
  });

  app.post("/api/admin/owners/:id/reject-turf", async (req: Request, res: Response) => {
    if (!requireAdmin(req, res)) return;
    const user = await storage.updateTurfStatus(req.params.id, "turf_rejected");
    if (!user) return res.status(404).json({ error: "Owner not found" }) as any;
    res.json(safeUserResponse(user));
  });

  app.get("/api/admin/payouts", async (req: Request, res: Response) => {
    if (!requireAdmin(req, res)) return;
    const payoutData = await storage.getPayoutData();
    const totalGrossRevenue = payoutData.reduce((s, p) => s + p.grossRevenue, 0);
    const totalCommission = payoutData.reduce((s, p) => s + p.commission, 0);
    const totalNetPayout = payoutData.reduce((s, p) => s + p.netPayout, 0);
    res.json({ totalGrossRevenue, totalCommission, totalNetPayout, ownerPayouts: payoutData });
  });

  app.get("/api/admin/payouts.csv", async (req: Request, res: Response) => {
    if (!requireAdmin(req, res)) return;
    const payoutData = await storage.getPayoutData();
    const rows = [
      ["ownerId", "ownerName", "turfId", "turfName", "grossRevenue", "commission", "netPayout", "bookingCount"],
      ...payoutData.map((p) => [
        p.ownerId,
        p.ownerName,
        p.turfId,
        p.turfName,
        String(p.grossRevenue),
        String(p.commission),
        String(p.netPayout),
        String(p.bookingCount),
      ]),
    ];
    const csv = rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")).join("\n");
    res.setHeader("content-type", "text/csv; charset=utf-8");
    res.setHeader("content-disposition", "attachment; filename=quickturf-payouts.csv");
    res.send(csv);
  });

  app.get("/api/admin/search", async (req: Request, res: Response) => {
    if (!requireAdmin(req, res)) return;
    const q = (req.query.q as string || "").trim();
    if (q.length < 2) return res.status(400).json({ error: "Query must be at least 2 characters" }) as any;
    const results = await storage.searchAll(q);
    res.json({
      users: results.users.map(u => safeUserResponse(u)),
      bookings: results.bookings,
    });
  });

  app.post("/api/admin/users/:id/ban", async (req: Request, res: Response) => {
    if (!requireAdmin(req, res)) return;
    const parsed = banUserSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.errors[0]?.message || "Invalid data" }) as any;
    const user = await storage.banUser(req.params.id, sanitizeText(parsed.data.reason.trim()));
    if (!user) return res.status(404).json({ error: "User not found" }) as any;
    res.json(safeUserResponse(user));
  });

  app.post("/api/admin/users/:id/unban", async (req: Request, res: Response) => {
    if (!requireAdmin(req, res)) return;
    const user = await storage.unbanUser(req.params.id);
    if (!user) return res.status(404).json({ error: "User not found" }) as any;
    res.json(safeUserResponse(user));
  });
}
