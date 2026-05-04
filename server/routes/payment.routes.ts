import type { Express } from "express";
import { storage } from "../storage";
import { logger } from "../logger";
import { paymentWebhookSchema, slotHoldRequestSchema } from "./shared";

export function registerPaymentRoutes(app: Express) {
  app.post("/api/payment-holds", async (req, res) => {
    if (!req.session.userId) return res.status(401).json({ error: "Not authenticated" }) as any;

    try {
      const validatedData = slotHoldRequestSchema.parse(req.body);
      const turf = await storage.getTurf(validatedData.turfId);
      if (!turf || !turf.isAvailable) {
        return res.status(404).json({ error: "Turf is not available for booking" }) as any;
      }

      const user = await storage.getUser(req.session.userId);
      if (!user) return res.status(401).json({ error: "Not authenticated" }) as any;

      const slots = await storage.getTimeSlots(validatedData.turfId, validatedData.date);
      const durationHours = Math.ceil(validatedData.duration / 60);
      const startHour = parseInt(validatedData.startTime.split(":")[0], 10);
      const requiredSlots = [];

      for (let i = 0; i < durationHours; i++) {
        const requiredHourStr = `${(startHour + i).toString().padStart(2, "0")}:00`;
        const matchingSlot = slots.find(s => s.startTime === requiredHourStr && s.turfId === validatedData.turfId);
        if (!matchingSlot) return res.status(409).json({ error: "Time slot is outside of operational hours or missing" }) as any;
        if (matchingSlot.isBooked) return res.status(409).json({ error: "One or more selected slots are already booked" }) as any;
        if (matchingSlot.isBlocked) return res.status(409).json({ error: "One or more selected slots are currently unavailable" }) as any;
        requiredSlots.push(matchingSlot);
      }

      const hold = await storage.createSlotHold({
        ...validatedData,
        idempotencyKey: validatedData.idempotencyKey,
        userId: user.id,
        userName: user.fullName || user.username,
        userPhone: user.phoneNumber,
        slotIds: requiredSlots.map((slot) => slot.id),
        providerReference: null,
      }, requiredSlots.map((slot) => slot.id), 10);

      logger.info("payment.hold_created", {
        holdId: hold.id,
        turfId: hold.turfId,
        userId: hold.userId,
        expiresAt: hold.expiresAt,
      });

      res.status(201).json({
        holdId: hold.id,
        expiresAt: hold.expiresAt,
        amountDue: hold.paidAmount,
        status: hold.status,
      });
    } catch (err: any) {
      const status = err?.status || (err?.name === "ZodError" ? 400 : 500);
      res.status(status).json({ error: err?.errors?.[0]?.message || err?.message || "Unable to reserve slots" });
    }
  });

  app.post("/api/payments/webhook", async (req, res) => {
    const expectedSecret = process.env.PAYMENT_WEBHOOK_SECRET;
    if (expectedSecret && req.headers["x-payment-webhook-secret"] !== expectedSecret) {
      return res.status(401).json({ error: "Invalid webhook signature" }) as any;
    }

    try {
      const event = paymentWebhookSchema.parse(req.body);
      if (event.status === "payment_failed") {
        const hold = await storage.getSlotHold(event.holdId);
        logger.warn("payment.failed", { holdId: event.holdId, providerReference: event.providerReference, turfId: hold?.turfId });
        return res.json({ received: true });
      }

      const booking = await storage.confirmSlotHold(event.holdId, event.providerReference);
      logger.info("payment.webhook_confirmed", {
        holdId: event.holdId,
        bookingId: booking.id,
        providerReference: event.providerReference,
      });
      res.json({ received: true, booking });
    } catch (err: any) {
      const status = err?.status || (err?.name === "ZodError" ? 400 : 500);
      res.status(status).json({ error: err?.errors?.[0]?.message || err?.message || "Webhook processing failed" });
    }
  });

  app.post("/api/payments/mock-confirm/:holdId", async (req, res) => {
    const allowMockPayments = process.env.ALLOW_MOCK_PAYMENTS === "true";
    if (process.env.NODE_ENV === "production" && !allowMockPayments) {
      return res.status(403).json({ error: "Mock payments are disabled" }) as any;
    }
    if (!req.session.userId) return res.status(401).json({ error: "Not authenticated" }) as any;

    const hold = await storage.getSlotHold(req.params.holdId);
    if (!hold) return res.status(404).json({ error: "Payment hold not found" }) as any;
    if (hold.userId !== req.session.userId) return res.status(403).json({ error: "This is not your payment hold" }) as any;

    try {
      const booking = await storage.confirmSlotHold(req.params.holdId, `mock_${Date.now()}`);
      res.json(booking);
    } catch (err: any) {
      const status = err?.status || 500;
      res.status(status).json({ error: err?.message || "Payment confirmation failed" });
    }
  });
}
