import type { Express, Request, Response } from "express";
import { storage } from "../storage";
import { logger } from "../logger";
import {
  hashPassword,
  ownerTurfProfileSchema,
  pricingRuleSchema,
  resolveOwnerIdForContext,
  safeUserResponse,
  sanitizeText,
  bookingVerificationSchema,
  slotPriceSchema,
  staffRegisterSchema,
  turfSubmitSchema,
  weekendSurchargeSchema,
} from "./shared";

async function requireOwnerOnly(req: Request, res: Response): Promise<boolean> {
  if (!req.session.userId) {
    res.status(401).json({ error: "Not authenticated" });
    return false;
  }
  const user = await storage.getUser(req.session.userId);
  if (!user || user.role !== "turf_owner") {
    res.status(403).json({ error: "Only turf owners can perform this action" });
    return false;
  }
  return true;
}

export function registerOwnerRoutes(app: Express) {
  app.post("/api/owner/turf/submit", async (req: Request, res: Response) => {
    if (!req.session.userId) return res.status(401).json({ error: "Not authenticated" }) as any;
    const owner = await storage.getUser(req.session.userId);
    if (!owner || owner.role !== "turf_owner") return res.status(403).json({ error: "Not a turf owner" }) as any;
    if (owner.ownerStatus !== "account_approved") return res.status(403).json({ error: "Account must be approved before submitting a turf" }) as any;
    try {
      const data = turfSubmitSchema.parse(req.body);
      const updated = await storage.submitTurf(owner.id, data);
      if (!updated) return res.status(500).json({ error: "Failed to submit turf" }) as any;
      res.json(safeUserResponse(updated));
    } catch (err: any) {
      if (err?.name === "ZodError") return res.status(400).json({ error: err.errors[0]?.message || "Invalid data" }) as any;
      res.status(500).json({ error: "Turf submission failed" });
    }
  });

  app.post("/api/owner/staff", async (req: Request, res: Response) => {
    if (!req.session.userId) return res.status(401).json({ error: "Not authenticated" }) as any;
    const owner = await storage.getUser(req.session.userId);
    if (!owner || owner.role !== "turf_owner") return res.status(403).json({ error: "Only owners can add staff" }) as any;
    if (owner.ownerStatus !== "account_approved") return res.status(403).json({ error: "Account must be approved first" }) as any;

    try {
      const data = staffRegisterSchema.parse(req.body);
      let username = sanitizeText(data.username);
      if (!username.endsWith("_staff")) username = `${username}_staff`;

      if (await storage.getUserByUsername(username)) return res.status(409).json({ error: "Username already taken" }) as any;
      if (await storage.getUserByEmail(data.email)) return res.status(409).json({ error: "Email address already registered" }) as any;
      if (await storage.getUserByPhone(data.phoneNumber)) return res.status(409).json({ error: "Phone number already registered" }) as any;

      const user = await storage.createUser({
        username,
        fullName: sanitizeText(data.fullName),
        email: data.email.toLowerCase(),
        phoneNumber: data.phoneNumber,
        password: await hashPassword(data.password),
        dateOfBirth: data.dateOfBirth,
        role: "turf_staff",
        ownerStatus: "account_approved",
        managerId: owner.id,
      });

      res.status(201).json(safeUserResponse(user));
    } catch (err: any) {
      if (err?.name === "ZodError") return res.status(400).json({ error: err.errors[0]?.message || "Invalid data" }) as any;
      res.status(500).json({ error: "Staff registration failed" });
    }
  });

  app.get("/api/owner/staff", async (req: Request, res: Response) => {
    if (!req.session.userId) return res.status(401).json({ error: "Not authenticated" }) as any;
    const owner = await storage.getUser(req.session.userId);
    if (!owner || owner.role !== "turf_owner") return res.status(403).json({ error: "Only owners can view staff" }) as any;
    const staffMembers = await storage.getStaffByOwnerId(owner.id);
    res.json(staffMembers.map(s => safeUserResponse(s)));
  });

  app.get("/api/owner/turfs", async (req: Request, res: Response) => {
    if (!req.session.userId) return res.status(401).json({ error: "Not authenticated" }) as any;
    const ownerId = await resolveOwnerIdForContext(req.session.userId);
    if (!ownerId) return res.status(403).json({ error: "Not authorized" }) as any;
    const turfs = await storage.getTurfsByOwnerId(ownerId);
    logger.info("owner.turfs.listed", { userId: req.session.userId, ownerId, count: turfs.length });
    res.json(turfs);
  });

  app.post("/api/owner/turfs", async (req: Request, res: Response) => {
    if (!(await requireOwnerOnly(req, res))) return;
    const owner = await storage.getUser(req.session.userId!);
    if (!owner || owner.ownerStatus !== "account_approved") {
      return res.status(403).json({ error: "Account must be approved before submitting a turf" }) as any;
    }

    const parsed = turfSubmitSchema.safeParse({
      turfName: req.body?.turfName ?? req.body?.name,
      turfLocation: req.body?.turfLocation ?? req.body?.location,
      turfAddress: req.body?.turfAddress ?? req.body?.address,
      turfPincode: req.body?.turfPincode ?? req.body?.pincode,
      turfImageUrls: req.body?.turfImageUrls ?? req.body?.imageUrls,
      turfLength: req.body?.turfLength ?? req.body?.length,
      turfWidth: req.body?.turfWidth ?? req.body?.width,
    });
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.errors[0]?.message || "Invalid turf data" }) as any;
    }

    try {
      const application = await storage.submitAdditionalTurf(owner.id, parsed.data);
      logger.info("owner.turf.additional_submitted", { ownerId: owner.id, applicationId: application.id });
      res.status(201).json({
        id: application.id,
        ownerId: owner.id,
        applicationId: application.id,
        name: application.turfName,
        location: application.turfLocation,
        address: application.turfAddress,
        imageUrl: application.turfImageUrls?.[0] || null,
        isAvailable: false,
        pendingStatus: "pending_review",
      });
    } catch (err: any) {
      res.status(err?.status || 500).json({ error: err?.message || "Turf submission failed" });
    }
  });

  app.get("/api/owner/turfs/:turfId/slots/:date", async (req: Request, res: Response) => {
    if (!req.session.userId) return res.status(401).json({ error: "Not authenticated" }) as any;
    const ownerId = await resolveOwnerIdForContext(req.session.userId);
    if (!ownerId) return res.status(403).json({ error: "Not authorized" }) as any;
    const turfs = await storage.getTurfsByOwnerId(ownerId);
    if (!turfs.find(t => t.id === req.params.turfId)) return res.status(403).json({ error: "Not your turf" }) as any;
    res.json(await storage.getTimeSlots(req.params.turfId, req.params.date));
  });

  app.get("/api/owner/turfs/:turfId/calendar", async (req: Request, res: Response) => {
    if (!req.session.userId) return res.status(401).json({ error: "Not authenticated" }) as any;
    const ownerId = await resolveOwnerIdForContext(req.session.userId);
    if (!ownerId) return res.status(403).json({ error: "Not authorized" }) as any;
    const turfs = await storage.getTurfsByOwnerId(ownerId);
    if (!turfs.find(t => t.id === req.params.turfId)) return res.status(403).json({ error: "Not your turf" }) as any;
    const start = typeof req.query.start === "string" ? req.query.start : new Date().toISOString().split("T")[0];
    const end = typeof req.query.end === "string" ? req.query.end : start;
    res.json(await storage.getOwnerCalendar(req.params.turfId, start, end));
  });

  app.get("/api/owner/turfs/:turfId/pricing-rules", async (req: Request, res: Response) => {
    if (!req.session.userId) return res.status(401).json({ error: "Not authenticated" }) as any;
    const ownerId = await resolveOwnerIdForContext(req.session.userId);
    if (!ownerId) return res.status(403).json({ error: "Not authorized" }) as any;
    const turfs = await storage.getTurfsByOwnerId(ownerId);
    if (!turfs.find(t => t.id === req.params.turfId)) return res.status(403).json({ error: "Not your turf" }) as any;
    res.json(await storage.getPricingRulesByTurf(req.params.turfId));
  });

  app.post("/api/owner/turfs/:turfId/pricing-rules", async (req: Request, res: Response) => {
    if (!(await requireOwnerOnly(req, res))) return;
    const ownerId = await resolveOwnerIdForContext(req.session.userId!);
    if (!ownerId) return res.status(403).json({ error: "Not authorized" }) as any;
    const turfs = await storage.getTurfsByOwnerId(ownerId);
    if (!turfs.find(t => t.id === req.params.turfId)) return res.status(403).json({ error: "Not your turf" }) as any;
    const parsed = pricingRuleSchema.safeParse({ ...req.body, turfId: req.params.turfId });
    if (!parsed.success) return res.status(400).json({ error: parsed.error.errors[0]?.message || "Invalid pricing rule" }) as any;
    res.status(201).json(await storage.createPricingRule(parsed.data));
  });

  app.patch("/api/owner/pricing-rules/:id", async (req: Request, res: Response) => {
    if (!(await requireOwnerOnly(req, res))) return;
    const rule = await storage.getPricingRule(req.params.id);
    if (!rule) return res.status(404).json({ error: "Pricing rule not found" }) as any;
    const ownerId = await resolveOwnerIdForContext(req.session.userId!);
    const turfs = ownerId ? await storage.getTurfsByOwnerId(ownerId) : [];
    if (!turfs.some(t => t.id === rule.turfId)) return res.status(403).json({ error: "Not your pricing rule" }) as any;
    const active = Boolean(req.body?.isActive);
    const updated = await storage.setPricingRuleActive(req.params.id, active);
    res.json(updated);
  });

  app.post("/api/owner/slots/:slotId/block", async (req: Request, res: Response) => {
    if (!(await requireOwnerOnly(req, res))) return;
    if (!req.session.userId) return res.status(401).json({ error: "Not authenticated" }) as any;
    const ownerId = await resolveOwnerIdForContext(req.session.userId);
    if (!ownerId) return res.status(403).json({ error: "Not authorized" }) as any;
    const slot = await storage.getTimeSlot(req.params.slotId);
    if (!slot) return res.status(404).json({ error: "Slot not found" }) as any;
    const turfs = await storage.getTurfsByOwnerId(ownerId);
    if (!turfs.find(t => t.id === slot.turfId)) return res.status(403).json({ error: "Not your turf" }) as any;
    if (slot.isBooked) return res.status(400).json({ error: "Slot is already booked by a player" }) as any;
    res.json(await storage.blockTimeSlot(req.params.slotId));
  });

  app.post("/api/owner/slots/:slotId/unblock", async (req: Request, res: Response) => {
    if (!(await requireOwnerOnly(req, res))) return;
    if (!req.session.userId) return res.status(401).json({ error: "Not authenticated" }) as any;
    const ownerId = await resolveOwnerIdForContext(req.session.userId);
    if (!ownerId) return res.status(403).json({ error: "Not authorized" }) as any;
    const slot = await storage.getTimeSlot(req.params.slotId);
    if (!slot) return res.status(404).json({ error: "Slot not found" }) as any;
    const turfs = await storage.getTurfsByOwnerId(ownerId);
    if (!turfs.find(t => t.id === slot.turfId)) return res.status(403).json({ error: "Not your turf" }) as any;
    res.json(await storage.unblockTimeSlot(req.params.slotId));
  });

  app.post("/api/owner/slots/:slotId/price", async (req: Request, res: Response) => {
    if (!(await requireOwnerOnly(req, res))) return;
    if (!req.session.userId) return res.status(401).json({ error: "Not authenticated" }) as any;
    const parsedPrice = slotPriceSchema.safeParse(req.body);
    if (!parsedPrice.success) return res.status(400).json({ error: parsedPrice.error.errors[0]?.message || "Invalid data" }) as any;
    const { price, applyToAllDays } = parsedPrice.data;
    const slot = await storage.getTimeSlot(req.params.slotId);
    if (!slot) return res.status(404).json({ error: "Slot not found" }) as any;
    const ownerId = await resolveOwnerIdForContext(req.session.userId);
    if (!ownerId) return res.status(403).json({ error: "Not authorized" }) as any;
    const turfs = await storage.getTurfsByOwnerId(ownerId);
    if (!turfs.find(t => t.id === slot.turfId)) return res.status(403).json({ error: "Not your turf" }) as any;

    if (applyToAllDays) {
      await storage.updateTimeSlotPriceByStartTime(slot.turfId, slot.startTime, price);
      res.json(await storage.getTimeSlot(req.params.slotId));
    } else {
      if (slot.isBooked) return res.status(400).json({ error: "Cannot change price of a booked slot" }) as any;
      res.json(await storage.updateTimeSlotPrice(req.params.slotId, price));
    }
  });

  app.get("/api/owner/turfs/:turfId/bookings", async (req: Request, res: Response) => {
    if (!req.session.userId) return res.status(401).json({ error: "Not authenticated" }) as any;
    const ownerId = await resolveOwnerIdForContext(req.session.userId);
    if (!ownerId) return res.status(403).json({ error: "Not authorized" }) as any;
    const turfs = await storage.getTurfsByOwnerId(ownerId);
    if (!turfs.find(t => t.id === req.params.turfId)) return res.status(403).json({ error: "Not your turf" }) as any;
    const bookings = await storage.getBookingsByTurfId(req.params.turfId);
    res.json(bookings.sort((a, b) => new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime()));
  });

  app.post("/api/owner/bookings/:id/pay", async (req: Request, res: Response) => {
    if (!(await requireOwnerOnly(req, res))) return;
    if (!req.session.userId) return res.status(401).json({ error: "Not authenticated" }) as any;
    const ownerId = await resolveOwnerIdForContext(req.session.userId);
    if (!ownerId) return res.status(403).json({ error: "Not authorized" }) as any;
    const booking = await storage.getBooking(req.params.id);
    if (!booking) return res.status(404).json({ error: "Booking not found" }) as any;
    const turfs = await storage.getTurfsByOwnerId(ownerId);
    if (!turfs.some(t => t.id === booking.turfId)) return res.status(403).json({ error: "Not your turf" }) as any;
    const updated = await storage.markBookingPaid(req.params.id);
    logger.info("booking.payment_marked_paid", { bookingId: req.params.id, ownerId, turfId: booking.turfId });
    res.json(updated);
  });

  app.post("/api/owner/bookings/:id/verify", async (req: Request, res: Response) => {
    if (!req.session.userId) return res.status(401).json({ error: "Not authenticated" }) as any;
    const ownerId = await resolveOwnerIdForContext(req.session.userId);
    if (!ownerId) return res.status(403).json({ error: "Not authorized" }) as any;
    const parsed = bookingVerificationSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.errors[0]?.message || "Invalid verification code" }) as any;

    const booking = await storage.getBooking(req.params.id);
    if (!booking) return res.status(404).json({ error: "Booking not found" }) as any;
    const turfs = await storage.getTurfsByOwnerId(ownerId);
    if (!turfs.some(t => t.id === booking.turfId)) return res.status(403).json({ error: "Not your turf" }) as any;

    try {
      const updated = await storage.verifyBookingCode(req.params.id, parsed.data.code);
      logger.info("booking.verification_code_verified", { bookingId: req.params.id, ownerId, turfId: booking.turfId });
      res.json(updated);
    } catch (err: any) {
      res.status(err?.status || 500).json({ error: err?.message || "Verification failed" });
    }
  });

  app.post("/api/owner/bookings/:id/cancel", async (req: Request, res: Response) => {
    if (!(await requireOwnerOnly(req, res))) return;
    if (!req.session.userId) return res.status(401).json({ error: "Not authenticated" }) as any;
    const ownerId = await resolveOwnerIdForContext(req.session.userId);
    if (!ownerId) return res.status(403).json({ error: "Not authorized" }) as any;
    const booking = await storage.getBooking(req.params.id);
    if (!booking) return res.status(404).json({ error: "Booking not found" }) as any;
    const turfs = await storage.getTurfsByOwnerId(ownerId);
    if (!turfs.some(t => t.id === booking.turfId)) return res.status(403).json({ error: "Not your turf" }) as any;
    if (booking.status === "cancelled") return res.status(400).json({ error: "Booking is already cancelled" }) as any;
    const updated = await storage.cancelBooking(req.params.id);
    logger.info("booking.cancelled_by_owner", { bookingId: req.params.id, ownerId, turfId: booking.turfId });
    res.json(updated);
  });

  app.get("/api/owner/turfs/:turfId/reviews", async (req: Request, res: Response) => {
    if (!req.session.userId) return res.status(401).json({ error: "Not authenticated" }) as any;
    const ownerId = await resolveOwnerIdForContext(req.session.userId);
    if (!ownerId) return res.status(403).json({ error: "Not authorized" }) as any;
    const turfs = await storage.getTurfsByOwnerId(ownerId);
    if (!turfs.find(t => t.id === req.params.turfId)) return res.status(403).json({ error: "Not your turf" }) as any;
    res.json([]);
  });

  app.patch("/api/owner/turf/profile", async (req: Request, res: Response) => {
    if (!(await requireOwnerOnly(req, res))) return;
    if (!req.session.userId) return res.status(401).json({ error: "Not authenticated" }) as any;
    const owner = await storage.getUser(req.session.userId);
    if (!owner || owner.role !== "turf_owner") return res.status(403).json({ error: "Not a turf owner" }) as any;
    const turfs = await storage.getTurfsByOwnerId(req.session.userId);
    if (turfs.length === 0) return res.status(404).json({ error: "No turf found" }) as any;
    const parsedProfile = ownerTurfProfileSchema.safeParse(req.body);
    if (!parsedProfile.success) return res.status(400).json({ error: parsedProfile.error.errors[0]?.message || "Invalid data" }) as any;
    const { name, address, pricePerHour, amenities, imageUrls } = parsedProfile.data;
    const updated = await storage.updateTurfDetails(turfs[0].id, {
      name: name ? sanitizeText(name) : undefined,
      address: address ? sanitizeText(address) : undefined,
      pricePerHour,
      amenities: amenities ? amenities.map(a => sanitizeText(a)) : undefined,
      imageUrl: imageUrls && imageUrls.length > 0 ? imageUrls[0] : undefined,
    });
    if (!updated) return res.status(500).json({ error: "Update failed" }) as any;
    res.json(updated);
  });

  app.get("/api/owner/analytics", async (req: Request, res: Response) => {
    if (!req.session.userId) return res.status(401).json({ error: "Not authenticated" }) as any;
    const ownerId = await resolveOwnerIdForContext(req.session.userId);
    if (!ownerId) return res.status(403).json({ error: "Not authorized" }) as any;
    const turfId = req.query.turf_id as string;
    if (!turfId) return res.status(400).json({ error: "Turf ID required" }) as any;
    const turfs = await storage.getTurfsByOwnerId(ownerId);
    if (!turfs.find(t => t.id === turfId)) return res.status(403).json({ error: "Not your turf" }) as any;

    const bookings = await storage.getBookingsByTurfId(turfId);
    let totalRevenue = 0;
    let totalBookings = 0;
    let cancelledBookings = 0;
    const revenueByMonth: Record<string, number> = {};
    const bookingsByHour: Record<string, number> = {};
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const now = new Date();
    for (let i = 2; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      revenueByMonth[monthNames[d.getMonth()]] = 0;
    }

    bookings.forEach(b => {
      if (b.status === "cancelled") {
        cancelledBookings++;
        return;
      }
      totalBookings++;
      totalRevenue += b.totalAmount;
      const monthStr = b.date.split("-")[1];
      if (monthStr) {
        const month = monthNames[parseInt(monthStr, 10) - 1];
        revenueByMonth[month] = (revenueByMonth[month] || 0) + b.totalAmount;
      }
      bookingsByHour[b.startTime] = (bookingsByHour[b.startTime] || 0) + 1;
    });

    const todayStr = new Date().toISOString().split("T")[0];
    const slotCounts = await storage.getSlotCountsByTurfAndDate(turfId, todayStr);
    res.json({
      totalRevenue,
      totalBookings,
      cancelledBookings,
      occupancyRate: slotCounts.total > 0 ? Math.round((slotCounts.booked / slotCounts.total) * 100) : 0,
      monthlyRevenue: Object.keys(revenueByMonth).map(month => ({ month, revenue: revenueByMonth[month] })),
      peakHours: Object.entries(bookingsByHour).map(([hour, count]) => ({ hour, count })).sort((a, b) => b.count - a.count),
      recentBookings: bookings
        .filter(b => b.status !== "cancelled")
        .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
        .slice(0, 5)
        .map(b => ({ id: b.id, userName: b.userName, date: b.date, startTime: b.startTime, totalAmount: b.totalAmount })),
    });
  });

  app.patch("/api/owner/settings/weekend-surcharge", async (req: Request, res: Response) => {
    if (!(await requireOwnerOnly(req, res))) return;
    if (!req.session.userId) return res.status(401).json({ error: "Not authenticated" }) as any;
    const turfs = await storage.getTurfsByOwnerId(req.session.userId);
    if (turfs.length === 0) return res.status(404).json({ error: "No turf found" }) as any;
    const parsedSurcharge = weekendSurchargeSchema.safeParse(req.body);
    if (!parsedSurcharge.success) return res.status(400).json({ error: parsedSurcharge.error.errors[0]?.message || "Invalid data" }) as any;
    res.json(await storage.updateWeekendSurcharge(turfs[0].id, parsedSurcharge.data.surcharge));
  });
}
