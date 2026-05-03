import type { Express, Request, Response } from "express";
import { storage } from "../storage";
import { logger } from "../logger";
import { feedbackSchema, reviewSchema, sanitizeText } from "./shared";

export function registerPlayerRoutes(app: Express) {
  app.get("/api/auth/my-bookings", async (req: Request, res: Response) => {
    if (!req.session.userId) return res.status(401).json({ error: "Not authenticated" }) as any;
    res.json(await storage.getBookingsByUserId(req.session.userId));
  });

  app.post("/api/auth/bookings/:id/cancel", async (req: Request, res: Response) => {
    if (!req.session.userId) return res.status(401).json({ error: "Not authenticated" }) as any;
    const booking = await storage.getBooking(req.params.id);
    if (!booking) return res.status(404).json({ error: "Booking not found" }) as any;
    if (booking.userId !== req.session.userId) return res.status(403).json({ error: "This is not your booking" }) as any;
    if (booking.status === "cancelled") return res.status(400).json({ error: "Booking is already cancelled" }) as any;
    const updated = await storage.cancelBooking(req.params.id);
    logger.info("booking.cancelled_by_player", { bookingId: req.params.id, userId: req.session.userId, turfId: booking.turfId });
    res.json(updated);
  });

  app.get("/api/auth/feedback", async (req: Request, res: Response) => {
    if (!req.session.userId) return res.status(401).json({ error: "Not authenticated" }) as any;
    const feedback = await storage.getAppFeedback(req.session.userId);
    res.json(feedback || null);
  });

  app.post("/api/auth/feedback", async (req: Request, res: Response) => {
    if (!req.session.userId) return res.status(401).json({ error: "Not authenticated" }) as any;
    const parsedFeedback = feedbackSchema.safeParse(req.body);
    if (!parsedFeedback.success) return res.status(400).json({ error: parsedFeedback.error.errors[0]?.message || "Invalid data" }) as any;
    const { rating, feedback } = parsedFeedback.data;
    const result = await storage.upsertAppFeedback(req.session.userId, {
      rating,
      feedback: feedback ? sanitizeText(feedback) : undefined,
    });
    res.json(result);
  });

  app.post("/api/auth/bookings/:id/review", async (req: Request, res: Response) => {
    if (!req.session.userId) return res.status(401).json({ error: "Not authenticated" }) as any;
    const booking = await storage.getBooking(req.params.id);
    if (!booking) return res.status(404).json({ error: "Booking not found" }) as any;
    if (booking.userId !== req.session.userId) return res.status(403).json({ error: "Not your booking" }) as any;
    if (booking.status === "cancelled") return res.status(400).json({ error: "Cannot review a cancelled booking" }) as any;
    if (booking.paidAmount < booking.totalAmount) return res.status(400).json({ error: "Booking must be fully paid before reviewing" }) as any;

    const [endHour] = booking.endTime.split(":").map(Number);
    const bookingEndDt = new Date(`${booking.date}T${booking.endTime}:00`);
    bookingEndDt.setHours(endHour + 2);
    if (new Date() < bookingEndDt) return res.status(400).json({ error: "You can review 2 hours after your booking ends" }) as any;
    if (await storage.hasReview(booking.id)) return res.status(409).json({ error: "You have already reviewed this booking" }) as any;

    const parsedReview = reviewSchema.safeParse(req.body);
    if (!parsedReview.success) return res.status(400).json({ error: parsedReview.error.errors[0]?.message || "Invalid data" }) as any;
    const { rating, comment } = parsedReview.data;
    await storage.markReviewPromptShown(booking.id);
    const review = await storage.createReview({
      bookingId: booking.id,
      turfId: booking.turfId,
      userId: req.session.userId,
      rating,
      comment: comment ? sanitizeText(comment) : undefined,
    });
    res.status(201).json(review);
  });
}
