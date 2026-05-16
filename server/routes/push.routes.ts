import type { Express, Request, Response } from "express";
import { z } from "zod";
import {
  deletePushSubscription,
  getPushPublicKey,
  savePushSubscription,
} from "../services/pushNotifications";

const subscriptionSchema = z.object({
  endpoint: z.string().url(),
  expirationTime: z.number().nullable().optional(),
  keys: z.object({
    p256dh: z.string().min(1),
    auth: z.string().min(1),
  }),
}).passthrough();

export function registerPushRoutes(app: Express) {
  app.get("/api/push/public-key", (_req: Request, res: Response) => {
    res.json(getPushPublicKey());
  });

  app.post("/api/push/subscribe", async (req: Request, res: Response) => {
    if (!req.session.userId) return res.status(401).json({ error: "Not authenticated" }) as any;
    const parsed = subscriptionSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "Invalid push subscription" }) as any;
    await savePushSubscription(req.session.userId, parsed.data as any);
    res.json({ success: true });
  });

  app.post("/api/push/unsubscribe", async (req: Request, res: Response) => {
    if (!req.session.userId) return res.status(401).json({ error: "Not authenticated" }) as any;
    const parsed = z.object({ endpoint: z.string().url() }).safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "Invalid endpoint" }) as any;
    await deletePushSubscription(parsed.data.endpoint);
    res.json({ success: true });
  });
}
