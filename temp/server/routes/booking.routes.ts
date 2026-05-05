// TEMP COPY: do not edit or commit from here.
import type { Express } from "express";
import { storage } from "../storage";
import { captureError, logger } from "../logger";
import { bookingRequestSchema } from "./shared";
import { getRequiredHalfHourSlots } from "./slot-selection";

export function registerBookingRoutes(app: Express) {
  app.get("/api/bookings", async (req, res) => {
    if (!req.session.userId) return res.status(401).json({ error: "Not authenticated" }) as any;
    try {
      res.json(await storage.getBookings());
    } catch {
      res.status(500).json({ error: "Failed to fetch bookings" });
    }
  });

  app.get("/api/bookings/:id", async (req, res) => {
    if (!req.session.userId) return res.status(401).json({ error: "Not authenticated" }) as any;
    try {
      const booking = await storage.getBooking(req.params.id);
      if (!booking) return res.status(404).json({ error: "Booking not found" }) as any;
      res.json(booking);
    } catch {
      res.status(500).json({ error: "Failed to fetch booking" });
    }
  });

  app.post("/api/bookings", async (req, res) => {
    try {
      const validatedData = bookingRequestSchema.parse(req.body);
      const turf = await storage.getTurf(validatedData.turfId);
      if (!turf || !turf.isAvailable) {
        return res.status(404).json({ error: "Turf is not available for booking" }) as any;
      }

      if (req.session.userId) {
        const user = await storage.getUser(req.session.userId);
        if (user) {
          validatedData.userId = user.id;
          validatedData.userName = user.fullName || user.username;
          validatedData.userPhone = user.phoneNumber;
        }
      }

      const slots = await storage.getTimeSlots(validatedData.turfId, validatedData.date);
      const requiredSlots = getRequiredHalfHourSlots(slots, validatedData.turfId, validatedData.startTime, validatedData.duration || 60);

      const booking = await storage.createBookingWithSlotLock(validatedData, requiredSlots.map(slot => slot.id));
      logger.info("booking.created", {
        bookingId: booking.id,
        turfId: booking.turfId,
        userId: booking.userId,
        slotCount: requiredSlots.length,
        paidAmount: booking.paidAmount,
        balanceAmount: booking.balanceAmount,
      });
      res.status(201).json(booking);
    } catch (err: any) {
      const status = err?.status || (err?.name === "ZodError" ? 400 : 500);
      if (status >= 500) captureError(err, { route: "POST /api/bookings" });
      else logger.warn("booking.failed", { status, reason: err?.message || "Invalid booking data" });
      res.status(status).json({ error: err?.errors?.[0]?.message || err?.message || "Invalid booking data" });
    }
  });
}
