import type { Express, Request, Response } from "express";
import { storage } from "../storage";
import { promoValidationSchema, travelEstimateSchema } from "./shared";
import { estimateTravel, getRecommendedLeaveAt } from "../services/travelEstimate";

export function registerPromoRoutes(app: Express) {
  app.post("/api/promos/validate", async (req: Request, res: Response) => {
    const parsed = promoValidationSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.errors[0]?.message || "Invalid promo code" }) as any;

    try {
      const result = await storage.validatePromoCode(parsed.data.code, parsed.data.bookingAmount, req.session.userId);
      res.json({
        code: result.promo.code,
        discountAmount: result.discountAmount,
        description: result.promo.description,
      });
    } catch (err: any) {
      res.status(err?.status || 500).json({ error: err?.message || "Promo code failed" });
    }
  });

  app.post("/api/travel/estimate", async (req: Request, res: Response) => {
    const parsed = travelEstimateSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.errors[0]?.message || "Invalid travel estimate request" }) as any;
    const estimate = await estimateTravel(parsed.data);
    res.json(estimate);
  });

  app.post("/api/travel/leave-at", async (req: Request, res: Response) => {
    const body = req.body as { date?: string; startTime?: string; etaMinutes?: number };
    if (!body.date || !body.startTime || !body.etaMinutes) return res.status(400).json({ error: "date, startTime and etaMinutes are required" }) as any;
    res.json({ recommendedLeaveAt: getRecommendedLeaveAt(body.date, body.startTime, body.etaMinutes) });
  });
}
