import {
  type User, type InsertUser,
  type Turf, type InsertTurf,
  type TimeSlot, type InsertTimeSlot,
  type Booking, type InsertBooking,
  type SlotHold, type InsertSlotHold,
  type PricingRule, type InsertPricingRule,
  type PromoCode, type InsertPromoCode,
  type AppFeedback, type InsertAppFeedback,
  type AdminUpdate, type InsertAdminUpdate,
  type TurfReview,
  type TurfApplication,
  players as playersTable,
  turfOwners as turfOwnersTable,
  turfStaff as turfStaffTable,
  authLookup as authLookupTable,
  turfApplications as turfApplicationsTable,
  turfs as turfsTable,
  timeSlots as timeSlotsTable,
  bookings as bookingsTable,
  slotHolds as slotHoldsTable,
  pricingRules as pricingRulesTable,
  promoCodes as promoCodesTable,
  appFeedback as appFeedbackTable,
  adminUpdates as adminUpdatesTable,
  turfReviews as turfReviewsTable,
} from "@shared/schema";
import { randomUUID } from "crypto";
import { addDays, format, startOfToday } from "date-fns";
import bcrypt from "bcrypt";
import { db, pool } from "./db";
import { generateVerificationCode, isVerificationCodeValid, normalizeVerificationCode } from "./services/bookingVerification";

export interface IStorage {
  // Users
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByPhone(phoneNumber: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUserProfile(id: string, data: { username?: string; fullName?: string; email?: string; phoneNumber?: string; profileImageUrl?: string }): Promise<User | undefined>;
  updateUserPassword(id: string, hashedPassword: string): Promise<User | undefined>;
  updateOwnerStatus(id: string, status: "account_approved" | "account_rejected"): Promise<User | undefined>;
  updateTurfStatus(id: string, status: "turf_approved" | "turf_rejected"): Promise<User | undefined>;
  submitTurf(id: string, turfData: { turfName: string; turfLocation: string; turfAddress: string; turfPincode: string; turfImageUrls: string[]; turfLength: number; turfWidth: number }): Promise<User | undefined>;
  getPendingAccounts(): Promise<User[]>;
  getPendingTurfs(): Promise<User[]>;
  getAllOwners(): Promise<User[]>;
  getStaffByOwnerId(ownerId: string): Promise<User[]>;
  getAllPlayers(): Promise<User[]>;
  deleteUser(id: string): Promise<void>;
  banUser(id: string, reason: string): Promise<User | undefined>;
  unbanUser(id: string): Promise<User | undefined>;
  searchAll(query: string): Promise<{ users: User[]; bookings: Booking[] }>;

  // Locations
  getLocations(): Promise<string[]>;
  addLocation(name: string): Promise<string[]>;
  removeLocation(name: string): Promise<string[]>;

  getAdminStats(): Promise<{
    totalPlayers: number;
    totalOwners: number;
    pendingAccounts: number;
    pendingTurfs: number;
    approvedOwners: number;
    rejectedOwners: number;
    totalTurfs: number;
    totalBookings: number;
  }>;

  // Turfs
  getTurfs(): Promise<Turf[]>;
  getTurf(id: string): Promise<Turf | undefined>;
  getTurfsByOwnerId(ownerId: string): Promise<Turf[]>;
  createTurf(turf: InsertTurf): Promise<Turf>;
  submitAdditionalTurf(ownerId: string, turfData: { turfName: string; turfLocation: string; turfAddress: string; turfPincode: string; turfImageUrls: string[]; turfLength: number; turfWidth: number; pricePerHour?: number }): Promise<TurfApplication>;
  updateWeekendSurcharge(turfId: string, surcharge: number): Promise<Turf | undefined>;

  // Time Slots
  getTimeSlots(turfId: string, date: string): Promise<TimeSlot[]>;
  getTimeSlot(id: string): Promise<TimeSlot | undefined>;
  createTimeSlot(slot: InsertTimeSlot): Promise<TimeSlot>;
  bookTimeSlot(id: string): Promise<TimeSlot | undefined>;
  blockTimeSlot(id: string): Promise<TimeSlot | undefined>;
  unblockTimeSlot(id: string): Promise<TimeSlot | undefined>;
  updateTimeSlotPrice(id: string, price: number): Promise<TimeSlot | undefined>;
  updateTimeSlotPriceByStartTime(turfId: string, startTime: string, price: number): Promise<void>;

  // Bookings
  getBookings(): Promise<Booking[]>;
  getBooking(id: string): Promise<Booking | undefined>;
  getBookingsByTurfId(turfId: string): Promise<Booking[]>;
  getBookingsByUserId(userId: string): Promise<Booking[]>;
  createBooking(booking: InsertBooking): Promise<Booking>;
  createBookingWithSlotLock(booking: InsertBooking, slotIds: string[]): Promise<Booking>;
  verifyBookingCode(bookingId: string, code: string): Promise<Booking | undefined>;
  createSlotHold(hold: Omit<InsertSlotHold, "status" | "expiresAt">, slotIds: string[], holdMinutes?: number): Promise<SlotHold>;
  getSlotHold(id: string): Promise<SlotHold | undefined>;
  confirmSlotHold(id: string, providerReference?: string): Promise<Booking>;
  expireSlotHolds(now?: Date): Promise<number>;
  markBookingPaid(id: string): Promise<Booking | undefined>;
  updateBookingStatus(id: string, status: Booking["status"]): Promise<Booking | undefined>;
  cancelBooking(id: string): Promise<Booking | undefined>;
  markReviewPromptShown(bookingId: string): Promise<void>;

  // Turf management
  updateTurfDetails(turfId: string, data: { name?: string; address?: string; pricePerHour?: number; amenities?: string[]; imageUrl?: string }): Promise<Turf | undefined>;
  unbookTimeSlot(id: string): Promise<TimeSlot | undefined>;
  getSlotCountsByTurfAndDate(turfId: string, date: string): Promise<{ total: number; booked: number }>;
  getOwnerCalendar(turfId: string, startDate: string, endDate: string): Promise<{ date: string; slots: TimeSlot[]; bookings: Booking[]; holds: SlotHold[] }[]>;
  createPricingRule(rule: InsertPricingRule): Promise<PricingRule>;
  getPricingRule(id: string): Promise<PricingRule | undefined>;
  getPricingRulesByTurf(turfId: string): Promise<PricingRule[]>;
  setPricingRuleActive(id: string, active: boolean): Promise<PricingRule | undefined>;

  // Promo codes
  getPromoCodes(): Promise<PromoCode[]>;
  createPromoCode(promo: InsertPromoCode): Promise<PromoCode>;
  validatePromoCode(code: string, bookingAmount: number, userId?: string): Promise<{ promo: PromoCode; discountAmount: number }>;
  redeemPromoCode(code: string): Promise<void>;

  // Reviews
  createReview(data: { bookingId: string; turfId: string; userId: string; rating: number; comment?: string }): Promise<TurfReview>;
  getReviewsByTurf(turfId: string): Promise<TurfReview[]>;
  hasReview(bookingId: string): Promise<boolean>;
  getPayoutData(): Promise<{ ownerId: string; ownerName: string; turfId: string; turfName: string; grossRevenue: number; commission: number; netPayout: number; bookingCount: number }[]>;

  // App Feedback
  getAppFeedback(userId: string): Promise<AppFeedback | undefined>;
  upsertAppFeedback(userId: string, data: { rating: number; feedback?: string }): Promise<AppFeedback>;

  // Admin Updates
  getAdminUpdates(): Promise<AdminUpdate[]>;
  createAdminUpdate(update: InsertAdminUpdate): Promise<AdminUpdate>;
  updateAdminUpdateVisibility(id: string, data: { isActive?: boolean; showSponsored?: boolean }): Promise<AdminUpdate | undefined>;
  deleteAdminUpdate(id: string): Promise<boolean>;
}

const turfImages = [
  "https://images.unsplash.com/photo-1529900748604-07564a03e7a6?w=800&h=600&fit=crop",
  "https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=800&h=600&fit=crop",
  "https://images.unsplash.com/photo-1431324155629-1a6deb1dec8d?w=800&h=600&fit=crop",
  "https://images.unsplash.com/photo-1459865264687-595d652de67e?w=800&h=600&fit=crop",
  "https://images.unsplash.com/photo-1551958219-acbc608c6377?w=800&h=600&fit=crop",
  "https://images.unsplash.com/photo-1624880357913-a8539238245b?w=800&h=600&fit=crop",
];

const initialTurfs: Omit<Turf, "ownerId" | "applicationId" | "openTime" | "closeTime" | "createdAt" | "updatedAt">[] = [
  { id: "turf-1", name: "Green Valley Cricket Ground", location: "Indiranagar, Bangalore", address: "123 Sports Complex, Indiranagar, Bangalore 560038", imageUrl: turfImages[0], rating: 5, amenities: ["Parking", "WiFi", "Showers", "Changing Room", "Cafe", "Water"], sportTypes: ["Cricket"], pricePerHour: 1200, weekendSurcharge: 0, isAvailable: true, featured: true },
  { id: "turf-2", name: "Champions Cricket Ground", location: "Koramangala, Bangalore", address: "456 Stadium Road, Koramangala, Bangalore 560034", imageUrl: turfImages[1], rating: 5, amenities: ["Parking", "WiFi", "Showers", "Water"], sportTypes: ["Cricket"], pricePerHour: 1500, weekendSurcharge: 0, isAvailable: true, featured: true },
  { id: "turf-3", name: "Cricket Paradise", location: "HSR Layout, Bangalore", address: "789 Sports Avenue, HSR Layout, Bangalore 560102", imageUrl: turfImages[2], rating: 4, amenities: ["Parking", "Changing Room", "Water"], sportTypes: ["Cricket"], pricePerHour: 800, weekendSurcharge: 0, isAvailable: true, featured: false },
  { id: "turf-4", name: "Elite Cricket Hub", location: "Whitefield, Bangalore", address: "101 Tech Park, Whitefield, Bangalore 560066", imageUrl: turfImages[3], rating: 4, amenities: ["Parking", "WiFi", "Showers", "Changing Room", "Cafe"], sportTypes: ["Cricket"], pricePerHour: 1000, weekendSurcharge: 0, isAvailable: true, featured: true },
  { id: "turf-5", name: "Premier Cricket Arena", location: "Electronic City, Bangalore", address: "202 Sports Complex, Electronic City, Bangalore 560100", imageUrl: turfImages[4], rating: 5, amenities: ["Parking", "Showers", "Water"], sportTypes: ["Cricket"], pricePerHour: 2000, weekendSurcharge: 0, isAvailable: true, featured: true },
  { id: "turf-6", name: "Professional Cricket Grounds", location: "MG Road, Bangalore", address: "303 Central Complex, MG Road, Bangalore 560001", imageUrl: turfImages[5], rating: 5, amenities: ["Parking", "WiFi", "Showers", "Changing Room", "Cafe", "Water"], sportTypes: ["Cricket"], pricePerHour: 1800, weekendSurcharge: 0, isAvailable: true, featured: false },
];

function generateTimeSlots(turfId: string, date: string, basePrice: number, weekendSurcharge = 0): TimeSlot[] {
  const slots: TimeSlot[] = [];
  const dayOfWeek = new Date(date + "T12:00:00Z").getUTCDay();
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
  const surcharge = isWeekend ? weekendSurcharge : 0;

  const morningTimes = ["06:00", "07:00", "08:00", "09:00", "10:00", "11:00"];
  morningTimes.forEach((time, index) => {
    const endHour = parseInt(time.split(":")[0]) + 1;
    slots.push({ id: `${turfId}-${date}-morning-${index}`, turfId, date, startTime: time, endTime: `${endHour.toString().padStart(2, "0")}:00`, price: basePrice + surcharge, period: "morning", isBooked: false, isBlocked: false });
  });

  const afternoonTimes = ["12:00", "13:00", "14:00", "15:00", "16:00", "17:00"];
  afternoonTimes.forEach((time, index) => {
    const endHour = parseInt(time.split(":")[0]) + 1;
    slots.push({ id: `${turfId}-${date}-afternoon-${index}`, turfId, date, startTime: time, endTime: `${endHour.toString().padStart(2, "0")}:00`, price: Math.round(basePrice * 1.2) + surcharge, period: "afternoon", isBooked: false, isBlocked: false });
  });

  const eveningTimes = ["18:00", "19:00", "20:00", "21:00", "22:00"];
  eveningTimes.forEach((time, index) => {
    const endHour = parseInt(time.split(":")[0]) + 1;
    slots.push({ id: `${turfId}-${date}-evening-${index}`, turfId, date, startTime: time, endTime: `${endHour.toString().padStart(2, "0")}:00`, price: Math.round(basePrice * 1.5) + surcharge, period: "evening", isBooked: false, isBlocked: false });
  });

  return slots;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private turfs: Map<string, Turf>;
  private timeSlots: Map<string, TimeSlot>;
  private bookings: Map<string, Booking>;
  private slotHolds: Map<string, SlotHold>;
  private pricingRules: Map<string, PricingRule>;
  private promoCodes: Map<string, PromoCode>;
  private appFeedbacks: Map<string, AppFeedback>;
  private adminUpdates: Map<string, AdminUpdate>;
  private turfReviews: Map<string, TurfReview>;
  private turfApplications: Map<string, TurfApplication>;
  private locations: string[];
  public isDatabaseEnabled: boolean;
  public readonly readyPromise: Promise<void>;
  private persistQueue: Promise<void>;

  constructor() {
    this.users = new Map();
    this.turfs = new Map();
    this.timeSlots = new Map();
    this.bookings = new Map();
    this.slotHolds = new Map();
    this.pricingRules = new Map();
    this.promoCodes = new Map();
    this.appFeedbacks = new Map();
    this.adminUpdates = new Map();
    this.turfReviews = new Map();
    this.turfApplications = new Map();
    this.locations = [
      "Bangalore", "Chennai", "Mumbai", "Delhi",
      "Hyderabad", "Pune", "Kolkata", "Ahmedabad", "Nandyal",
    ];

    const firstAdminUpdate: AdminUpdate = {
      id: "seed-admin-update-verification",
      title: "Booking verification codes are live",
      body: "Players now receive a 4-digit code after payment. Turf owners can verify the code from the booking card before check-in.",
      audience: "internal",
      postType: "announcement",
      imageUrl: null,
      ctaLabel: null,
      ctaUrl: null,
      isActive: true,
      showSponsored: true,
      createdBy: "system",
      createdAt: new Date(),
    };
    this.adminUpdates.set(firstAdminUpdate.id, firstAdminUpdate);

    const welcomePromo: PromoCode = {
      id: "seed-promo-welcome10",
      code: "WELCOME10",
      description: "10% off for early users",
      discountType: "percent",
      discountValue: 10,
      maxDiscountAmount: 500,
      minBookingAmount: 500,
      usageLimit: 100,
      usedCount: 0,
      perUserLimit: 1,
      startDate: null,
      expiresAt: null,
      isActive: true,
      createdAt: new Date(),
    };
    this.promoCodes.set(welcomePromo.code, welcomePromo);

    const playerUser: User = {
      id: "seed-player-shahid", username: "shahid", fullName: "Shahid Afrid",
      email: "shahid@gmail.com", phoneNumber: "1234567890",
      password: bcrypt.hashSync("shahid123", 10), dateOfBirth: "2006-06-25",
      role: "player", managerId: null, isBanned: false, banReason: null,
      ownerStatus: null, turfStatus: null, turfName: null, turfLocation: null,
      turfAddress: null, turfPincode: null, turfImageUrls: null,
      turfLength: null, turfWidth: null, profileImageUrl: null,
    };
    this.users.set(playerUser.id, playerUser);

    const playerUser2: User = {
      id: "seed-player-shamanth", username: "shamanth", fullName: "Shamanth",
      email: "shamanth@gmail.com", phoneNumber: "0987654322",
      password: bcrypt.hashSync("shamanth123", 10), dateOfBirth: "2000-01-01",
      role: "player", managerId: null, isBanned: false, banReason: null,
      ownerStatus: null, turfStatus: null, turfName: null, turfLocation: null,
      turfAddress: null, turfPincode: null, turfImageUrls: null,
      turfLength: null, turfWidth: null, profileImageUrl: null,
    };
    this.users.set(playerUser2.id, playerUser2);

    let tharakUploadedImage = turfImages[0];
    try {
      const fs = require("fs");
      const path = require("path");
      const files = fs.readdirSync(path.join(process.cwd(), "uploads"));
      if (files.length > 0) tharakUploadedImage = "/uploads/" + files[files.length - 1];
    } catch (e) { /* Ignore */ }

    const ownerUser: User = {
      id: "seed-owner-tharak", username: "tharak", fullName: "Tharakesh",
      email: "tharak@gmail.com", phoneNumber: "0987654321",
      password: bcrypt.hashSync("tharak123", 10), dateOfBirth: "2005-02-04",
      role: "turf_owner", managerId: null, isBanned: false, banReason: null,
      ownerStatus: "account_approved", turfStatus: "turf_approved",
      turfName: "Tharak's Turf", turfLocation: "Nandyal",
      turfAddress: "balaji complex, Nandyal, 518501", turfPincode: "518501",
      turfImageUrls: [tharakUploadedImage], turfLength: 120, turfWidth: 80,
      profileImageUrl: null,
    };
    this.users.set(ownerUser.id, ownerUser);

    const tharakTurf: Turf = {
      id: "seed-turf-tharak", ownerId: ownerUser.id, applicationId: null,
      name: "Tharak's Turf", location: "Nandyal",
      address: "balaji complex, Nandyal, 518501", imageUrl: tharakUploadedImage,
      rating: 5, amenities: ["Parking"], sportTypes: ["Cricket"],
      pricePerHour: 1000, weekendSurcharge: 0, isAvailable: true, featured: true,
      openTime: null, closeTime: null, createdAt: null, updatedAt: null,
    };
    this.turfs.set(tharakTurf.id, tharakTurf);

    const aliUser: User = {
      id: "seed-staff-ali", username: "ali_staff", fullName: "Ali",
      email: "ali@gmail.com", phoneNumber: "8888888888",
      password: bcrypt.hashSync("ali@123", 10), dateOfBirth: "2000-01-01",
      role: "turf_staff", isBanned: false, banReason: null,
      ownerStatus: "account_approved", turfStatus: null, managerId: ownerUser.id,
      turfName: null, turfLocation: null, turfAddress: null, turfPincode: null, turfImageUrls: null, turfLength: null, turfWidth: null, profileImageUrl: null
    };
    this.users.set(aliUser.id, aliUser);

    initialTurfs.forEach(turf => {
      this.turfs.set(turf.id, { ...turf, ownerId: null, applicationId: null, openTime: null, closeTime: null, createdAt: null, updatedAt: null });
    });

    const today = startOfToday();
    const allTurfs = [tharakTurf, ...initialTurfs.map(t => ({ ...t, ownerId: null as string | null }))];
    allTurfs.forEach(turf => {
      for (let i = 0; i < 14; i++) {
        const date = format(addDays(today, i), "yyyy-MM-dd");
        generateTimeSlots(turf.id, date, turf.pricePerHour, turf.weekendSurcharge).forEach(slot => {
          this.timeSlots.set(slot.id, slot);
        });
      }
    });

    this.isDatabaseEnabled = Boolean(process.env.DATABASE_URL) && Boolean(db) && Boolean(pool);
    this.persistQueue = Promise.resolve();
    this.readyPromise = this.isDatabaseEnabled
      ? this.initializeFromDatabase()
      : Promise.resolve();
  }

  private async initializeFromDatabase(): Promise<void> {
    if (!db) return;

    try {
      const [dbPlayers, dbOwners, dbStaff, dbTurfApps, dbTurfs, dbSlots, dbBookings, dbHolds, dbPricingRules, dbPromoCodes, dbFeedbacks, dbAdminUpdates, dbReviews] = await Promise.all([
        db.select().from(playersTable),
        db.select().from(turfOwnersTable),
        db.select().from(turfStaffTable),
        db.select().from(turfApplicationsTable),
        db.select().from(turfsTable),
        db.select().from(timeSlotsTable),
        db.select().from(bookingsTable),
        db.select().from(slotHoldsTable),
        db.select().from(pricingRulesTable),
        db.select().from(promoCodesTable),
        db.select().from(appFeedbackTable),
        db.select().from(adminUpdatesTable),
        db.select().from(turfReviewsTable),
      ]);

      const hasExistingData =
        dbPlayers.length > 0 || dbOwners.length > 0 || dbStaff.length > 0 ||
        dbTurfs.length > 0 || dbSlots.length > 0 || dbBookings.length > 0 ||
        dbHolds.length > 0 || dbPricingRules.length > 0 || dbPromoCodes.length > 0 ||
        dbFeedbacks.length > 0 || dbAdminUpdates.length > 0 || dbReviews.length > 0;

      if (!hasExistingData) {
        await this.persistToDatabase();
        return;
      }

      // Build turfApps lookup for owner User construction
      const turfAppsByOwner = new Map<string, TurfApplication>();
      for (const app of dbTurfApps) {
        const current = turfAppsByOwner.get(app.ownerId);
        if (!current || new Date(app.submittedAt || 0).getTime() > new Date(current.submittedAt || 0).getTime()) {
          turfAppsByOwner.set(app.ownerId, app);
        }
      }

      // Convert role-specific rows into unified User objects
      this.users = new Map();
      for (const p of dbPlayers) {
        this.users.set(p.id, {
          id: p.id, username: p.username, fullName: p.fullName, email: p.email,
          phoneNumber: p.phoneNumber, password: p.password, dateOfBirth: p.dateOfBirth,
          role: "player", managerId: null, isBanned: p.isBanned, banReason: p.banReason,
          ownerStatus: null, turfStatus: null, turfName: null, turfLocation: null,
          turfAddress: null, turfPincode: null, turfImageUrls: null,
          turfLength: null, turfWidth: null, profileImageUrl: p.profileImageUrl,
        });
      }
      for (const o of dbOwners) {
        const app = turfAppsByOwner.get(o.id);
        this.users.set(o.id, {
          id: o.id, username: o.username, fullName: o.fullName, email: o.email,
          phoneNumber: o.phoneNumber, password: o.password, dateOfBirth: o.dateOfBirth,
          role: "turf_owner", managerId: null, isBanned: o.isBanned, banReason: o.banReason,
          ownerStatus: o.ownerStatus,
          turfStatus: app ? (app.status === "approved" ? "turf_approved" : app.status === "rejected" ? "turf_rejected" : "pending_turf") : null,
          turfName: app?.turfName ?? null, turfLocation: app?.turfLocation ?? null,
          turfAddress: app?.turfAddress ?? null, turfPincode: app?.turfPincode ?? null,
          turfImageUrls: app?.turfImageUrls ?? null, turfLength: app?.turfLength ?? null,
          turfWidth: app?.turfWidth ?? null, profileImageUrl: o.profileImageUrl,
        });
      }
      for (const s of dbStaff) {
        this.users.set(s.id, {
          id: s.id, username: s.username, fullName: s.fullName, email: s.email,
          phoneNumber: s.phoneNumber, password: s.password, dateOfBirth: s.dateOfBirth,
          role: "turf_staff", managerId: s.ownerId, isBanned: false, banReason: null,
          ownerStatus: "account_approved", turfStatus: null, turfName: null, turfLocation: null,
          turfAddress: null, turfPincode: null, turfImageUrls: null,
          turfLength: null, turfWidth: null, profileImageUrl: s.profileImageUrl,
        });
      }

      this.turfs = new Map(dbTurfs.map((t) => [t.id, t]));
      this.timeSlots = new Map(dbSlots.map((s) => [s.id, s]));
      this.bookings = new Map(dbBookings.map((b) => [b.id, b]));
      this.slotHolds = new Map(dbHolds.map((h) => [h.id, h]));
      this.pricingRules = new Map(dbPricingRules.map((r) => [r.id, r]));
      this.promoCodes = new Map(dbPromoCodes.map((p) => [p.code, p]));
      this.appFeedbacks = new Map(dbFeedbacks.map((f) => [f.userId, f]));
      this.adminUpdates = new Map(dbAdminUpdates.map((u) => [u.id, u]));
      this.turfReviews = new Map(dbReviews.map((r) => [r.id, r]));
      this.turfApplications = new Map(dbTurfApps.map((app) => [app.id, app]));
    } catch (error) {
      console.error("[storage] Failed loading from database; falling back to in-memory seed data", error);
      this.isDatabaseEnabled = false;
      if (process.env.NODE_ENV === "production") {
        throw error;
      }
    }
  }

  public async persistToDatabase(): Promise<void> {
    if (!this.isDatabaseEnabled || !db) return;

    const allUsers = Array.from(this.users.values());
    const playerValues = allUsers.filter(u => u.role === "player").map(u => ({
      id: u.id, username: u.username, fullName: u.fullName, email: u.email,
      phoneNumber: u.phoneNumber, password: u.password, dateOfBirth: u.dateOfBirth,
      profileImageUrl: u.profileImageUrl, isBanned: u.isBanned, banReason: u.banReason,
    }));
    const ownerValues = allUsers.filter(u => u.role === "turf_owner").map(u => ({
      id: u.id, username: u.username, fullName: u.fullName, email: u.email,
      phoneNumber: u.phoneNumber, password: u.password, dateOfBirth: u.dateOfBirth,
      profileImageUrl: u.profileImageUrl, isBanned: u.isBanned, banReason: u.banReason,
      ownerStatus: u.ownerStatus || "pending_account",
    }));
    const staffValues = allUsers.filter(u => u.role === "turf_staff").map(u => ({
      id: u.id, username: u.username, fullName: u.fullName, email: u.email,
      phoneNumber: u.phoneNumber, password: u.password, dateOfBirth: u.dateOfBirth,
      profileImageUrl: u.profileImageUrl, ownerId: u.managerId || "",
    }));
    const authValues = allUsers.map(u => ({
      email: u.email, phoneNumber: u.phoneNumber, role: u.role, roleTableId: u.id,
    }));
    for (const u of allUsers.filter(u => u.role === "turf_owner" && u.turfName)) {
      const hasApplication = Array.from(this.turfApplications.values()).some(app =>
        app.ownerId === u.id &&
        app.turfName === u.turfName &&
        app.turfAddress === (u.turfAddress || "")
      );
      if (!hasApplication) {
        const id = randomUUID();
        this.turfApplications.set(id, {
          id,
          ownerId: u.id,
          turfName: u.turfName!,
          turfLocation: u.turfLocation || "",
          turfAddress: u.turfAddress || "",
          turfPincode: u.turfPincode || "000000",
          turfImageUrls: u.turfImageUrls,
          turfLength: u.turfLength,
          turfWidth: u.turfWidth,
          status: u.turfStatus === "turf_approved" ? "approved" : u.turfStatus === "turf_rejected" ? "rejected" : "pending",
          rejectionReason: null,
          reviewedBy: null,
          submittedAt: new Date(),
          reviewedAt: null,
        });
      }
    }
    const turfAppValues = Array.from(this.turfApplications.values());
    const turfsValues = Array.from(this.turfs.values());
    const slotValues = Array.from(this.timeSlots.values());
    const bookingValues = Array.from(this.bookings.values());
    const holdValues = Array.from(this.slotHolds.values());
    const pricingRuleValues = Array.from(this.pricingRules.values());
    const promoValues = Array.from(this.promoCodes.values());
    const feedbackValues = Array.from(this.appFeedbacks.values());
    const adminUpdateValues = Array.from(this.adminUpdates.values());
    const reviewValues = Array.from(this.turfReviews.values());

    await db.delete(turfReviewsTable);
    await db.delete(adminUpdatesTable);
    await db.delete(appFeedbackTable);
    await db.delete(promoCodesTable);
    await db.delete(pricingRulesTable);
    await db.delete(slotHoldsTable);
    await db.delete(bookingsTable);
    await db.delete(timeSlotsTable);
    await db.delete(turfsTable);
    await db.delete(turfApplicationsTable);
    await db.delete(authLookupTable);
    await db.delete(turfStaffTable);
    await db.delete(turfOwnersTable);
    await db.delete(playersTable);

    if (playerValues.length) await db.insert(playersTable).values(playerValues);
    if (ownerValues.length) await db.insert(turfOwnersTable).values(ownerValues);
    if (staffValues.length) await db.insert(turfStaffTable).values(staffValues);
    if (authValues.length) await db.insert(authLookupTable).values(authValues);
    if (turfAppValues.length) await db.insert(turfApplicationsTable).values(turfAppValues);
    if (turfsValues.length) await db.insert(turfsTable).values(turfsValues);
    if (slotValues.length) await db.insert(timeSlotsTable).values(slotValues);
    if (bookingValues.length) await db.insert(bookingsTable).values(bookingValues);
    if (holdValues.length) await db.insert(slotHoldsTable).values(holdValues);
    if (pricingRuleValues.length) await db.insert(pricingRulesTable).values(pricingRuleValues);
    if (promoValues.length) await db.insert(promoCodesTable).values(promoValues);
    if (feedbackValues.length) await db.insert(appFeedbackTable).values(feedbackValues);
    if (adminUpdateValues.length) await db.insert(adminUpdatesTable).values(adminUpdateValues);
    if (reviewValues.length) await db.insert(turfReviewsTable).values(reviewValues);
  }

  public queuePersist(): Promise<void> {
    if (!this.isDatabaseEnabled) return Promise.resolve();

    this.persistQueue = this.persistQueue
      .then(() => this.persistToDatabase())
      .catch((error) => {
        console.error("[storage] Failed to persist data to database", error);
      });

    return this.persistQueue;
  }


  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(u => u.username.toLowerCase() === username.toLowerCase());
  }

  async getUserByPhone(phoneNumber: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(u => u.phoneNumber === phoneNumber);
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(u => u.email.toLowerCase() === email.toLowerCase());
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = {
      id,
      username: insertUser.username,
      email: insertUser.email,
      phoneNumber: insertUser.phoneNumber,
      password: insertUser.password,
      dateOfBirth: insertUser.dateOfBirth,
      role: insertUser.role || "player",
      fullName: insertUser.fullName ?? null,
      managerId: insertUser.managerId ?? null,
      isBanned: insertUser.isBanned ?? false,
      banReason: insertUser.banReason ?? null,
      ownerStatus: insertUser.ownerStatus ?? null,
      turfStatus: insertUser.turfStatus ?? null,
      turfName: insertUser.turfName ?? null,
      turfLocation: insertUser.turfLocation ?? null,
      turfAddress: insertUser.turfAddress ?? null,
      turfPincode: insertUser.turfPincode ?? null,
      turfImageUrls: insertUser.turfImageUrls ?? null,
      turfLength: insertUser.turfLength ?? null,
      turfWidth: insertUser.turfWidth ?? null,
      profileImageUrl: insertUser.profileImageUrl ?? null,
    };
    this.users.set(id, user);
    return user;
  }

  async updateUserPassword(id: string, hashedPassword: string): Promise<User | undefined> {
    const user = this.users.get(id);
    if (user) {
      user.password = hashedPassword;
      this.users.set(id, user);
    }
    return user;
  }

  async updateUserProfile(id: string, data: { username?: string; fullName?: string; email?: string; phoneNumber?: string; profileImageUrl?: string }): Promise<User | undefined> {
    const user = this.users.get(id);
    if (!user) return undefined;
    const updated = { ...user };
    if (data.username !== undefined) updated.username = data.username;
    if (data.fullName !== undefined) updated.fullName = data.fullName;
    if (data.email !== undefined) updated.email = data.email;
    if (data.phoneNumber !== undefined) updated.phoneNumber = data.phoneNumber;
    if (data.profileImageUrl !== undefined) updated.profileImageUrl = data.profileImageUrl;
    this.users.set(id, updated);
    return updated;
  }

  async updateOwnerStatus(id: string, status: "account_approved" | "account_rejected"): Promise<User | undefined> {
    const user = this.users.get(id);
    if (!user) return undefined;
    const updated = { ...user, ownerStatus: status };
    this.users.set(id, updated);
    return updated;
  }

  async deleteUser(id: string): Promise<void> {
    this.users.delete(id);
  }

  async updateTurfStatus(id: string, status: "turf_approved" | "turf_rejected"): Promise<User | undefined> {
    const user = this.users.get(id);
    if (!user) return undefined;
    const pendingApp = Array.from(this.turfApplications.values())
      .filter(app => app.ownerId === id && app.status === "pending")
      .sort((a, b) => new Date(b.submittedAt || 0).getTime() - new Date(a.submittedAt || 0).getTime())[0];
    const ownerHasApprovedTurf = Array.from(this.turfs.values()).some(turf => turf.ownerId === id);
    const nextTurfStatus = status === "turf_rejected" && ownerHasApprovedTurf ? "turf_approved" : status;
    const updated = {
      ...user,
      turfStatus: nextTurfStatus,
      turfName: pendingApp?.turfName ?? user.turfName,
      turfLocation: pendingApp?.turfLocation ?? user.turfLocation,
      turfAddress: pendingApp?.turfAddress ?? user.turfAddress,
      turfPincode: pendingApp?.turfPincode ?? user.turfPincode,
      turfImageUrls: pendingApp?.turfImageUrls ?? user.turfImageUrls,
      turfLength: pendingApp?.turfLength ?? user.turfLength,
      turfWidth: pendingApp?.turfWidth ?? user.turfWidth,
    };
    this.users.set(id, updated);

    if (pendingApp) {
      this.turfApplications.set(pendingApp.id, {
        ...pendingApp,
        status: status === "turf_approved" ? "approved" : "rejected",
        reviewedAt: new Date(),
      });
    }

    const turfName = pendingApp?.turfName ?? user.turfName;
    const turfLocation = pendingApp?.turfLocation ?? user.turfLocation;
    const turfAddress = pendingApp?.turfAddress ?? user.turfAddress;
    const turfImageUrls = pendingApp?.turfImageUrls ?? user.turfImageUrls;

    if (status === "turf_approved" && turfName && turfLocation && turfAddress) {
      const turfId = randomUUID();
      const imageUrl = (turfImageUrls && turfImageUrls.length > 0)
        ? turfImageUrls[0]
        : turfImages[0];
      const turf: Turf = {
        id: turfId,
        ownerId: user.id,
        applicationId: pendingApp?.id ?? null,
        name: turfName,
        location: turfLocation,
        address: turfAddress,
        imageUrl,
        rating: 5,
        amenities: ["Parking"],
        sportTypes: ["Cricket"],
        pricePerHour: 1000,
        weekendSurcharge: 0,
        isAvailable: true,
        featured: false,
        openTime: null,
        closeTime: null,
        createdAt: null,
        updatedAt: null,
      };
      this.turfs.set(turfId, turf);

      const today = startOfToday();
      for (let i = 0; i < 14; i++) {
        const date = format(addDays(today, i), "yyyy-MM-dd");
        generateTimeSlots(turfId, date, 1000).forEach(slot => {
          this.timeSlots.set(slot.id, slot);
        });
      }
    }

    return updated;
  }

  async submitTurf(id: string, turfData: { turfName: string; turfLocation: string; turfAddress: string; turfPincode: string; turfImageUrls: string[]; turfLength: number; turfWidth: number }): Promise<User | undefined> {
    const user = this.users.get(id);
    if (!user) return undefined;
    const application = this.createTurfApplication(id, turfData);
    const updated: User = {
      ...user,
      turfName: application.turfName,
      turfLocation: application.turfLocation,
      turfAddress: application.turfAddress,
      turfPincode: application.turfPincode,
      turfImageUrls: application.turfImageUrls,
      turfLength: application.turfLength,
      turfWidth: application.turfWidth,
      turfStatus: "pending_turf",
    };
    this.users.set(id, updated);
    return updated;
  }

  private createTurfApplication(ownerId: string, turfData: { turfName: string; turfLocation: string; turfAddress: string; turfPincode: string; turfImageUrls: string[]; turfLength: number; turfWidth: number }): TurfApplication {
    const application: TurfApplication = {
      id: randomUUID(),
      ownerId,
      turfName: turfData.turfName,
      turfLocation: turfData.turfLocation,
      turfAddress: turfData.turfAddress,
      turfPincode: turfData.turfPincode,
      turfImageUrls: turfData.turfImageUrls,
      turfLength: turfData.turfLength,
      turfWidth: turfData.turfWidth,
      status: "pending",
      rejectionReason: null,
      reviewedBy: null,
      submittedAt: new Date(),
      reviewedAt: null,
    };
    this.turfApplications.set(application.id, application);
    return application;
  }

  async submitAdditionalTurf(ownerId: string, turfData: { turfName: string; turfLocation: string; turfAddress: string; turfPincode: string; turfImageUrls: string[]; turfLength: number; turfWidth: number; pricePerHour?: number }): Promise<TurfApplication> {
    const owner = this.users.get(ownerId);
    if (!owner || owner.role !== "turf_owner") {
      throw Object.assign(new Error("Owner not found"), { status: 404 });
    }
    const application = this.createTurfApplication(ownerId, turfData);
    this.users.set(ownerId, {
      ...owner,
      turfStatus: owner.turfStatus === "turf_approved" ? "turf_approved" : "pending_turf",
      turfName: application.turfName,
      turfLocation: application.turfLocation,
      turfAddress: application.turfAddress,
      turfPincode: application.turfPincode,
      turfImageUrls: application.turfImageUrls,
      turfLength: application.turfLength,
      turfWidth: application.turfWidth,
    });
    return application;
  }

  async getPendingAccounts(): Promise<User[]> {
    return Array.from(this.users.values()).filter(u => 
      u.role === "turf_owner" && u.ownerStatus === "pending_account"
    );
  }

  async getPendingTurfs(): Promise<User[]> {
    const pending: User[] = [];
    for (const app of Array.from(this.turfApplications.values()).filter(app => app.status === "pending")) {
      const owner = this.users.get(app.ownerId);
      if (!owner) continue;
      pending.push({
        ...owner,
        turfStatus: "pending_turf",
        turfName: app.turfName,
        turfLocation: app.turfLocation,
        turfAddress: app.turfAddress,
        turfPincode: app.turfPincode,
        turfImageUrls: app.turfImageUrls,
        turfLength: app.turfLength,
        turfWidth: app.turfWidth,
      });
    }
    return pending;
  }

  async getAllOwners(): Promise<User[]> {
    return Array.from(this.users.values()).filter(u => u.role === "turf_owner");
  }

  async getStaffByOwnerId(ownerId: string): Promise<User[]> {
    return Array.from(this.users.values()).filter(u => u.role === "turf_staff" && u.managerId === ownerId);
  }

  async getAllPlayers(): Promise<User[]> {
    return Array.from(this.users.values()).filter(u => u.role === "player");
  }

  async getLocations(): Promise<string[]> {
    return [...this.locations].sort();
  }

  async addLocation(name: string): Promise<string[]> {
    const trimmed = name.trim();
    if (!this.locations.includes(trimmed)) this.locations.push(trimmed);
    return [...this.locations].sort();
  }

  async removeLocation(name: string): Promise<string[]> {
    this.locations = this.locations.filter(l => l !== name);
    return [...this.locations].sort();
  }

  async getAdminStats() {
    const allUsers = Array.from(this.users.values());
    const owners = allUsers.filter(u => u.role === "turf_owner");
    return {
      totalPlayers: allUsers.filter(u => u.role === "player").length,
      totalOwners: owners.length,
      pendingAccounts: owners.filter(u => u.ownerStatus === "pending_account").length,
      pendingTurfs: owners.filter(u => u.turfStatus === "pending_turf").length,
      approvedOwners: owners.filter(u => u.ownerStatus === "account_approved").length,
      rejectedOwners: owners.filter(u => u.ownerStatus === "account_rejected").length,
      totalTurfs: this.turfs.size,
      totalBookings: this.bookings.size,
    };
  }

  async getTurfs(): Promise<Turf[]> {
    return Array.from(this.turfs.values());
  }

  async getTurf(id: string): Promise<Turf | undefined> {
    return this.turfs.get(id);
  }

  async getTurfsByOwnerId(ownerId: string): Promise<Turf[]> {
    const realTurfs = Array.from(this.turfs.values()).filter(t => t.ownerId === ownerId);
    const approvedApplicationIds = new Set(realTurfs.map(t => t.applicationId).filter(Boolean));
    const applicationTurfs = Array.from(this.turfApplications.values())
      .filter(app => app.ownerId === ownerId && app.status !== "approved" && !approvedApplicationIds.has(app.id))
      .map(app => ({
        id: app.id,
        ownerId,
        applicationId: app.id,
        name: app.turfName,
        location: app.turfLocation,
        address: app.turfAddress,
        imageUrl: app.turfImageUrls?.[0] || turfImages[0],
        rating: 5,
        amenities: ["Parking"],
        sportTypes: ["Cricket"],
        pricePerHour: 1000,
        weekendSurcharge: 0,
        isAvailable: false,
        featured: false,
        openTime: null,
        closeTime: null,
        createdAt: app.submittedAt,
        updatedAt: app.reviewedAt,
        pendingStatus: app.status === "rejected" ? "rejected" : "pending_review",
      } as Turf & { pendingStatus: string }));
    return [...realTurfs, ...applicationTurfs];
  }

  async createTurf(insertTurf: InsertTurf): Promise<Turf> {
    const id = randomUUID();
    const turf: Turf = { rating: 5, isAvailable: true, featured: false, ownerId: null, applicationId: null, weekendSurcharge: 0, openTime: null, closeTime: null, createdAt: null, updatedAt: null, ...insertTurf, id };
    this.turfs.set(id, turf);
    return turf;
  }

  async getTimeSlots(turfId: string, date: string): Promise<TimeSlot[]> {
    await this.expireSlotHolds();
    const heldSlotIds = new Set(
      this.getActiveHolds()
        .filter((hold) => hold.turfId === turfId && hold.date === date)
        .flatMap((hold) => hold.slotIds),
    );
    return Array.from(this.timeSlots.values())
      .filter(s => s.turfId === turfId && s.date === date)
      .map((slot) => heldSlotIds.has(slot.id) ? { ...slot, isBlocked: true } : slot);
  }

  async getTimeSlot(id: string): Promise<TimeSlot | undefined> {
    return this.timeSlots.get(id);
  }

  async createTimeSlot(insertSlot: InsertTimeSlot): Promise<TimeSlot> {
    const id = randomUUID();
    const slot: TimeSlot = { isBooked: false, isBlocked: false, ...insertSlot, id };
    this.timeSlots.set(id, slot);
    return slot;
  }

  async bookTimeSlot(id: string): Promise<TimeSlot | undefined> {
    const slot = this.timeSlots.get(id);
    if (slot) { slot.isBooked = true; this.timeSlots.set(id, slot); }
    return slot;
  }

  async blockTimeSlot(id: string): Promise<TimeSlot | undefined> {
    const slot = this.timeSlots.get(id);
    if (slot) { slot.isBlocked = true; this.timeSlots.set(id, slot); }
    return slot;
  }

  async unblockTimeSlot(id: string): Promise<TimeSlot | undefined> {
    const slot = this.timeSlots.get(id);
    if (slot) { slot.isBlocked = false; this.timeSlots.set(id, slot); }
    return slot;
  }

  async updateTimeSlotPrice(id: string, price: number): Promise<TimeSlot | undefined> {
    const slot = this.timeSlots.get(id);
    if (slot) { slot.price = price; this.timeSlots.set(id, slot); }
    return slot;
  }

  async updateTimeSlotPriceByStartTime(turfId: string, startTime: string, price: number): Promise<void> {
    for (const [id, slot] of Array.from(this.timeSlots.entries())) {
      if (slot.turfId === turfId && slot.startTime === startTime) {
        slot.price = price;
        this.timeSlots.set(id, slot);
      }
    }
  }

  async getBookings(): Promise<Booking[]> {
    return Array.from(this.bookings.values());
  }

  async getBooking(id: string): Promise<Booking | undefined> {
    return this.bookings.get(id);
  }

  async getBookingsByTurfId(turfId: string): Promise<Booking[]> {
    return Array.from(this.bookings.values()).filter(b => b.turfId === turfId);
  }

  async getBookingsByUserId(userId: string): Promise<Booking[]> {
    return Array.from(this.bookings.values()).filter(b => b.userId === userId);
  }

  async createBooking(insertBooking: InsertBooking): Promise<Booking> {
    const id = randomUUID();
    const bookingEntity: Booking = {
      status: "confirmed",
      userId: null,
      userName: null,
      userPhone: null,
      guestName: null,
      guestPhone: null,
      bookingSource: "online",
      promoCode: null,
      discountAmount: 0,
      travelDistanceKm: null,
      travelEtaMinutes: null,
      recommendedLeaveAt: null,
      reviewPromptShown: false,
      ...insertBooking,
      verificationCode: generateVerificationCode(),
      verificationStatus: "pending",
      checkedInAt: null,
      id,
      createdAt: new Date(),
    };
    this.bookings.set(bookingEntity.id, bookingEntity);
    if (bookingEntity.promoCode) await this.redeemPromoCode(bookingEntity.promoCode);
    return bookingEntity;
  }

  async createBookingWithSlotLock(insertBooking: InsertBooking, slotIds: string[]): Promise<Booking> {
    const uniqueSlotIds = Array.from(new Set(slotIds)).sort();
    if (uniqueSlotIds.length === 0) {
      throw Object.assign(new Error("No slots selected"), { status: 400 });
    }
    if (uniqueSlotIds.length !== slotIds.length) {
      throw Object.assign(new Error("Duplicate slots selected"), { status: 400 });
    }

    const id = randomUUID();
    const bookingEntity: Booking = {
      status: "confirmed",
      userId: null,
      userName: null,
      userPhone: null,
      guestName: null,
      guestPhone: null,
      bookingSource: "online",
      promoCode: null,
      discountAmount: 0,
      travelDistanceKm: null,
      travelEtaMinutes: null,
      recommendedLeaveAt: null,
      reviewPromptShown: false,
      ...insertBooking,
      verificationCode: generateVerificationCode(),
      verificationStatus: "pending",
      checkedInAt: null,
      id,
      createdAt: new Date(),
    };

    if (!this.isDatabaseEnabled) {
      const slots = uniqueSlotIds.map(slotId => this.timeSlots.get(slotId));
      if (slots.some(slot => !slot || slot.isBooked || slot.isBlocked)) {
        throw Object.assign(new Error("One or more selected slots are no longer available"), { status: 409 });
      }
      this.assertBookingMatchesSlots(insertBooking, slots.filter((slot): slot is TimeSlot => Boolean(slot)));
      for (const slot of slots) {
        if (slot) this.timeSlots.set(slot.id, { ...slot, isBooked: true });
      }
      this.bookings.set(bookingEntity.id, bookingEntity);
      if (bookingEntity.promoCode) await this.redeemPromoCode(bookingEntity.promoCode);
      return bookingEntity;
    }

    if (!pool) {
      throw Object.assign(new Error("Database is not configured"), { status: 500 });
    }

    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      const locked = await client.query(
        `SELECT id, turf_id, date, start_time, end_time, price, is_booked, is_blocked
         FROM time_slots
         WHERE id = ANY($1::varchar[])
         ORDER BY id
         FOR UPDATE`,
        [uniqueSlotIds],
      );

      if (
        locked.rowCount !== uniqueSlotIds.length ||
        locked.rows.some((row) => row.is_booked || row.is_blocked)
      ) {
        await client.query("ROLLBACK");
        throw Object.assign(new Error("One or more selected slots are no longer available"), { status: 409 });
      }

      this.assertBookingMatchesSlots(insertBooking, locked.rows.map((row) => ({
        id: row.id,
        turfId: row.turf_id,
        date: row.date,
        startTime: row.start_time,
        endTime: row.end_time,
        price: row.price,
        period: "",
        isBooked: row.is_booked,
        isBlocked: row.is_blocked,
      })));

      const updated = await client.query(
        `UPDATE time_slots
         SET is_booked = true
         WHERE id = ANY($1::varchar[]) AND is_booked = false AND is_blocked = false`,
        [uniqueSlotIds],
      );

      if (updated.rowCount !== uniqueSlotIds.length) {
        await client.query("ROLLBACK");
        throw Object.assign(new Error("One or more selected slots are no longer available"), { status: 409 });
      }

      await client.query(
        `INSERT INTO bookings (
          id, turf_id, turf_name, turf_address, date, start_time, end_time,
          duration, total_amount, paid_amount, balance_amount, payment_method,
          status, booking_code, promo_code, discount_amount, verification_code, verification_status, checked_in_at,
          user_id, user_name, user_phone, booking_source, travel_distance_km,
          travel_eta_minutes, recommended_leave_at, review_prompt_shown, created_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7,
          $8, $9, $10, $11, $12,
          $13, $14, $15, $16, $17, $18, $19,
          $20, $21, $22, $23, $24,
          $25, $26, $27, $28
        )`,
        [
          bookingEntity.id,
          bookingEntity.turfId,
          bookingEntity.turfName,
          bookingEntity.turfAddress,
          bookingEntity.date,
          bookingEntity.startTime,
          bookingEntity.endTime,
          bookingEntity.duration,
          bookingEntity.totalAmount,
          bookingEntity.paidAmount,
          bookingEntity.balanceAmount,
          bookingEntity.paymentMethod,
          bookingEntity.status,
          bookingEntity.bookingCode,
          bookingEntity.promoCode,
          bookingEntity.discountAmount,
          bookingEntity.verificationCode,
          bookingEntity.verificationStatus,
          bookingEntity.checkedInAt,
          bookingEntity.userId,
          bookingEntity.userName,
          bookingEntity.userPhone,
          bookingEntity.bookingSource,
          bookingEntity.travelDistanceKm,
          bookingEntity.travelEtaMinutes,
          bookingEntity.recommendedLeaveAt,
          bookingEntity.reviewPromptShown,
          bookingEntity.createdAt,
        ],
      );

      await client.query("COMMIT");

      for (const slotId of uniqueSlotIds) {
        const slot = this.timeSlots.get(slotId);
        if (slot) this.timeSlots.set(slotId, { ...slot, isBooked: true });
      }
      this.bookings.set(bookingEntity.id, bookingEntity);
      if (bookingEntity.promoCode) await this.redeemPromoCode(bookingEntity.promoCode);

      return bookingEntity;
    } catch (error) {
      await client.query("ROLLBACK").catch(() => undefined);
      throw error;
    } finally {
      client.release();
    }
  }

  private getActiveHolds(now = new Date()): SlotHold[] {
    return Array.from(this.slotHolds.values()).filter((hold) =>
      hold.status === "active" && new Date(hold.expiresAt).getTime() > now.getTime()
    );
  }

  private hasActiveHoldForSlots(slotIds: string[], ignoreIdempotencyKey?: string): boolean {
    const slotIdSet = new Set(slotIds);
    return this.getActiveHolds().some((hold) =>
      hold.idempotencyKey !== ignoreIdempotencyKey && hold.slotIds.some((slotId) => slotIdSet.has(slotId))
    );
  }

  async createSlotHold(
    insertHold: Omit<InsertSlotHold, "status" | "expiresAt">,
    slotIds: string[],
    holdMinutes = 10,
  ): Promise<SlotHold> {
    await this.expireSlotHolds();
    const existing = Array.from(this.slotHolds.values()).find((hold) => hold.idempotencyKey === insertHold.idempotencyKey);
    if (existing && existing.status === "active" && new Date(existing.expiresAt).getTime() > Date.now()) {
      return existing;
    }

    const uniqueSlotIds = Array.from(new Set(slotIds)).sort();
    if (uniqueSlotIds.length === 0 || uniqueSlotIds.length !== slotIds.length) {
      throw Object.assign(new Error("Invalid selected slots"), { status: 400 });
    }

    const hold: SlotHold = {
      ...insertHold,
      id: randomUUID(),
      slotIds: uniqueSlotIds,
      status: "active",
      expiresAt: new Date(Date.now() + holdMinutes * 60 * 1000),
      createdAt: new Date(),
      providerReference: insertHold.providerReference ?? null,
      promoCode: insertHold.promoCode ?? null,
      discountAmount: insertHold.discountAmount ?? 0,
      travelDistanceKm: insertHold.travelDistanceKm ?? null,
      travelEtaMinutes: insertHold.travelEtaMinutes ?? null,
      recommendedLeaveAt: insertHold.recommendedLeaveAt ?? null,
      userId: insertHold.userId ?? null,
      userName: insertHold.userName ?? null,
      userPhone: insertHold.userPhone ?? null,
    };

    if (!this.isDatabaseEnabled) {
      const slots = uniqueSlotIds.map(slotId => this.timeSlots.get(slotId));
      if (slots.some(slot => !slot || slot.isBooked || slot.isBlocked)) {
        throw Object.assign(new Error("One or more selected slots are no longer available"), { status: 409 });
      }
      if (this.hasActiveHoldForSlots(uniqueSlotIds, hold.idempotencyKey)) {
        throw Object.assign(new Error("One or more selected slots are currently held for payment"), { status: 409 });
      }
      this.assertBookingMatchesSlots(hold, slots.filter((slot): slot is TimeSlot => Boolean(slot)));
      this.slotHolds.set(hold.id, hold);
      return hold;
    }

    if (!pool) throw Object.assign(new Error("Database is not configured"), { status: 500 });
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await client.query(
        `UPDATE slot_holds SET status = 'expired'
         WHERE status = 'active' AND expires_at <= NOW()`,
      );

      const existingHold = await client.query(
        `SELECT * FROM slot_holds
         WHERE idempotency_key = $1 AND status = 'active' AND expires_at > NOW()
         LIMIT 1`,
        [hold.idempotencyKey],
      );
      if (existingHold.rows[0]) {
        await client.query("COMMIT");
        const dbHold = this.mapSlotHoldRow(existingHold.rows[0]);
        this.slotHolds.set(dbHold.id, dbHold);
        return dbHold;
      }

      const locked = await client.query(
        `SELECT id, turf_id, date, start_time, end_time, price, is_booked, is_blocked
         FROM time_slots
         WHERE id = ANY($1::varchar[])
         ORDER BY id
         FOR UPDATE`,
        [uniqueSlotIds],
      );
      if (
        locked.rowCount !== uniqueSlotIds.length ||
        locked.rows.some((row) => row.is_booked || row.is_blocked)
      ) {
        await client.query("ROLLBACK");
        throw Object.assign(new Error("One or more selected slots are no longer available"), { status: 409 });
      }

      const conflictingHold = await client.query(
        `SELECT id FROM slot_holds
         WHERE status = 'active'
           AND expires_at > NOW()
           AND slot_ids && $1::text[]
         LIMIT 1
         FOR UPDATE`,
        [uniqueSlotIds],
      );
      if ((conflictingHold.rowCount ?? 0) > 0) {
        await client.query("ROLLBACK");
        throw Object.assign(new Error("One or more selected slots are currently held for payment"), { status: 409 });
      }

      this.assertBookingMatchesSlots(hold, locked.rows.map((row) => ({
        id: row.id,
        turfId: row.turf_id,
        date: row.date,
        startTime: row.start_time,
        endTime: row.end_time,
        price: row.price,
        period: "",
        isBooked: row.is_booked,
        isBlocked: row.is_blocked,
      })));

      await client.query(
        `INSERT INTO slot_holds (
          id, turf_id, turf_name, turf_address, date, start_time, end_time, duration,
          total_amount, paid_amount, balance_amount, payment_method, booking_code,
          promo_code, discount_amount, slot_ids, idempotency_key, status, user_id, user_name, user_phone,
          travel_distance_km, travel_eta_minutes, recommended_leave_at, provider_reference, expires_at, created_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8,
          $9, $10, $11, $12, $13,
          $14, $15, $16, $17, $18, $19, $20, $21,
          $22, $23, $24, $25, $26, $27
        )`,
        [
          hold.id, hold.turfId, hold.turfName, hold.turfAddress, hold.date, hold.startTime, hold.endTime, hold.duration,
          hold.totalAmount, hold.paidAmount, hold.balanceAmount, hold.paymentMethod, hold.bookingCode,
          hold.promoCode, hold.discountAmount, hold.slotIds, hold.idempotencyKey, hold.status, hold.userId, hold.userName, hold.userPhone,
          hold.travelDistanceKm, hold.travelEtaMinutes, hold.recommendedLeaveAt, hold.providerReference, hold.expiresAt, hold.createdAt,
        ],
      );

      await client.query("COMMIT");
      this.slotHolds.set(hold.id, hold);
      return hold;
    } catch (error) {
      await client.query("ROLLBACK").catch(() => undefined);
      throw error;
    } finally {
      client.release();
    }
  }

  async getSlotHold(id: string): Promise<SlotHold | undefined> {
    await this.expireSlotHolds();
    return this.slotHolds.get(id);
  }

  async confirmSlotHold(id: string, providerReference?: string): Promise<Booking> {
    await this.expireSlotHolds();
    const hold = this.slotHolds.get(id);
    if (!hold) throw Object.assign(new Error("Payment hold not found"), { status: 404 });
    if (hold.status !== "active" || new Date(hold.expiresAt).getTime() <= Date.now()) {
      throw Object.assign(new Error("Payment hold has expired"), { status: 409 });
    }

    const booking = await this.createBookingWithSlotLock({
      turfId: hold.turfId,
      turfName: hold.turfName,
      turfAddress: hold.turfAddress,
      date: hold.date,
      startTime: hold.startTime,
      endTime: hold.endTime,
      duration: hold.duration,
      totalAmount: hold.totalAmount,
      paidAmount: hold.paidAmount,
      balanceAmount: hold.balanceAmount,
      paymentMethod: hold.paymentMethod,
      status: "confirmed",
      bookingCode: hold.bookingCode,
      promoCode: hold.promoCode,
      discountAmount: hold.discountAmount,
      travelDistanceKm: hold.travelDistanceKm,
      travelEtaMinutes: hold.travelEtaMinutes,
      recommendedLeaveAt: hold.recommendedLeaveAt,
      userId: hold.userId,
      userName: hold.userName,
      userPhone: hold.userPhone,
      reviewPromptShown: false,
    }, hold.slotIds);

    const updatedHold: SlotHold = {
      ...hold,
      status: "confirmed",
      providerReference: providerReference || hold.providerReference,
    };
    this.slotHolds.set(id, updatedHold);

    if (this.isDatabaseEnabled && pool) {
      await pool.query(
        `UPDATE slot_holds SET status = 'confirmed', provider_reference = COALESCE($2, provider_reference) WHERE id = $1`,
        [id, providerReference || null],
      );
    }

    return booking;
  }

  async expireSlotHolds(now = new Date()): Promise<number> {
    let expiredCount = 0;
    for (const [id, hold] of Array.from(this.slotHolds.entries())) {
      if (hold.status === "active" && new Date(hold.expiresAt).getTime() <= now.getTime()) {
        this.slotHolds.set(id, { ...hold, status: "expired" });
        expiredCount++;
      }
    }

    if (expiredCount > 0 && this.isDatabaseEnabled && pool) {
      await pool.query(
        `UPDATE slot_holds SET status = 'expired' WHERE status = 'active' AND expires_at <= $1`,
        [now],
      );
    }

    return expiredCount;
  }

  private mapSlotHoldRow(row: any): SlotHold {
    return {
      id: row.id,
      turfId: row.turf_id,
      turfName: row.turf_name,
      turfAddress: row.turf_address,
      date: row.date,
      startTime: row.start_time,
      endTime: row.end_time,
      duration: row.duration,
      totalAmount: row.total_amount,
      paidAmount: row.paid_amount,
      balanceAmount: row.balance_amount,
      paymentMethod: row.payment_method,
      bookingCode: row.booking_code,
      promoCode: row.promo_code,
      discountAmount: row.discount_amount ?? 0,
      slotIds: row.slot_ids,
      idempotencyKey: row.idempotency_key,
      status: row.status,
      userId: row.user_id,
      userName: row.user_name,
      userPhone: row.user_phone,
      travelDistanceKm: row.travel_distance_km,
      travelEtaMinutes: row.travel_eta_minutes,
      recommendedLeaveAt: row.recommended_leave_at,
      providerReference: row.provider_reference,
      expiresAt: row.expires_at,
      createdAt: row.created_at,
    };
  }

  private assertBookingMatchesSlots(insertBooking: Pick<InsertBooking, "duration" | "startTime" | "endTime" | "turfId" | "date" | "totalAmount" | "discountAmount">, slots: TimeSlot[]): void {
    const durationHours = Math.ceil(insertBooking.duration / 60);
    if (durationHours !== slots.length) {
      throw Object.assign(new Error("Selected slots do not match booking duration"), { status: 400 });
    }

    const sortedSlots = [...slots].sort((a, b) => a.startTime.localeCompare(b.startTime));
    const startHour = parseInt(insertBooking.startTime.split(":")[0], 10);
    const expectedStartTimes = Array.from({ length: durationHours }, (_value, index) =>
      `${(startHour + index).toString().padStart(2, "0")}:00`
    );
    const slotStartTimes = sortedSlots.map((slot) => slot.startTime);

    const hasExpectedSlots = expectedStartTimes.every((startTime, index) => slotStartTimes[index] === startTime);
    if (!hasExpectedSlots) {
      throw Object.assign(new Error("Selected slots must be contiguous"), { status: 400 });
    }

    if (sortedSlots.some((slot) => slot.turfId !== insertBooking.turfId || slot.date !== insertBooking.date)) {
      throw Object.assign(new Error("Selected slots do not belong to this turf and date"), { status: 400 });
    }

    const expectedEndTime = sortedSlots[sortedSlots.length - 1]?.endTime;
    if (expectedEndTime !== insertBooking.endTime) {
      throw Object.assign(new Error("Booking end time does not match selected slots"), { status: 400 });
    }

    const slotTotalAmount = sortedSlots.reduce((sum, slot) => sum + slot.price, 0);
    const discountAmount = insertBooking.discountAmount || 0;
    const expectedTotalAmount = Math.max(0, slotTotalAmount - discountAmount);
    if (insertBooking.totalAmount !== expectedTotalAmount) {
      throw Object.assign(new Error("Booking total does not match current slot pricing"), { status: 400 });
    }
  }

  async markBookingPaid(id: string): Promise<Booking | undefined> {
    const booking = this.bookings.get(id);
    if (booking) {
      booking.paidAmount = booking.totalAmount;
      booking.balanceAmount = 0;
      booking.status = "paid";
      this.bookings.set(id, booking);
    }
    return booking;
  }

  async updateBookingStatus(id: string, status: Booking["status"]): Promise<Booking | undefined> {
    const booking = this.bookings.get(id);
    if (!booking) return undefined;
    const updated = { ...booking, status };
    this.bookings.set(id, updated);
    return updated;
  }

  async verifyBookingCode(id: string, code: string): Promise<Booking | undefined> {
    const booking = this.bookings.get(id);
    if (!booking) return undefined;

    if (!isVerificationCodeValid(booking, normalizeVerificationCode(code))) {
      throw Object.assign(new Error("Verification code does not match this booking"), { status: 400 });
    }

    const updated: Booking = {
      ...booking,
      verificationStatus: "verified",
      checkedInAt: new Date(),
    };
    this.bookings.set(id, updated);

    if (this.isDatabaseEnabled && pool) {
      await pool.query(
        `UPDATE bookings SET verification_status = 'verified', checked_in_at = $2 WHERE id = $1`,
        [id, updated.checkedInAt],
      );
    }

    return updated;
  }

  async cancelBooking(id: string): Promise<Booking | undefined> {
    const booking = this.bookings.get(id);
    if (!booking || booking.status === "cancelled") return booking;

    // Free up booked time slots
    const durationHours = Math.ceil((booking.duration || 60) / 60);
    const startHour = parseInt(booking.startTime.split(':')[0]);
    const slots = await this.getTimeSlots(booking.turfId, booking.date);
    for (let i = 0; i < durationHours; i++) {
      const hourStr = `${(startHour + i).toString().padStart(2, '0')}:00`;
      const slot = slots.find(s => s.startTime === hourStr);
      if (slot && slot.isBooked) {
        await this.unbookTimeSlot(slot.id);
      }
    }

    booking.status = "cancelled";
    this.bookings.set(id, booking);
    return booking;
  }

  async getOwnerCalendar(turfId: string, startDate: string, endDate: string): Promise<{ date: string; slots: TimeSlot[]; bookings: Booking[]; holds: SlotHold[] }[]> {
    await this.expireSlotHolds();
    const days: { date: string; slots: TimeSlot[]; bookings: Booking[]; holds: SlotHold[] }[] = [];
    const start = new Date(`${startDate}T00:00:00`);
    const end = new Date(`${endDate}T00:00:00`);
    for (const cursor = new Date(start); cursor <= end; cursor.setDate(cursor.getDate() + 1)) {
      const date = format(cursor, "yyyy-MM-dd");
      days.push({
        date,
        slots: await this.getTimeSlots(turfId, date),
        bookings: Array.from(this.bookings.values()).filter((booking) => booking.turfId === turfId && booking.date === date),
        holds: this.getActiveHolds().filter((hold) => hold.turfId === turfId && hold.date === date),
      });
    }
    return days;
  }

  async createPricingRule(insertRule: InsertPricingRule): Promise<PricingRule> {
    const rule: PricingRule = {
      isActive: true,
      adjustmentType: "fixed",
      startDate: null,
      endDate: null,
      startTime: null,
      endTime: null,
      daysOfWeek: null,
      ...insertRule,
      id: randomUUID(),
      createdAt: new Date(),
    };
    this.pricingRules.set(rule.id, rule);
    this.applyPricingRuleToFutureSlots(rule);
    return rule;
  }

  async getPricingRulesByTurf(turfId: string): Promise<PricingRule[]> {
    return Array.from(this.pricingRules.values()).filter((rule) => rule.turfId === turfId);
  }

  async getPricingRule(id: string): Promise<PricingRule | undefined> {
    return this.pricingRules.get(id);
  }

  async setPricingRuleActive(id: string, active: boolean): Promise<PricingRule | undefined> {
    const rule = this.pricingRules.get(id);
    if (!rule) return undefined;
    const updated = { ...rule, isActive: active };
    this.pricingRules.set(id, updated);
    return updated;
  }

  async getPromoCodes(): Promise<PromoCode[]> {
    return Array.from(this.promoCodes.values())
      .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
  }

  async createPromoCode(insertPromo: InsertPromoCode): Promise<PromoCode> {
    const code = insertPromo.code.trim().toUpperCase();
    if (this.promoCodes.has(code)) {
      throw Object.assign(new Error("Promo code already exists"), { status: 409 });
    }

    const promo: PromoCode = {
      description: null,
      discountType: "fixed",
      maxDiscountAmount: null,
      minBookingAmount: 0,
      usageLimit: null,
      perUserLimit: 1,
      startDate: null,
      expiresAt: null,
      isActive: true,
      ...insertPromo,
      code,
      id: randomUUID(),
      usedCount: 0,
      createdAt: new Date(),
    };
    this.promoCodes.set(code, promo);
    return promo;
  }

  async validatePromoCode(code: string, bookingAmount: number): Promise<{ promo: PromoCode; discountAmount: number }> {
    const normalizedCode = code.trim().toUpperCase();
    const promo = this.promoCodes.get(normalizedCode);
    if (!promo || !promo.isActive) throw Object.assign(new Error("Promo code is not active"), { status: 404 });

    const today = format(new Date(), "yyyy-MM-dd");
    if (promo.startDate && today < promo.startDate) throw Object.assign(new Error("Promo code has not started yet"), { status: 400 });
    if (promo.expiresAt && today > promo.expiresAt) throw Object.assign(new Error("Promo code has expired"), { status: 400 });
    if (promo.usageLimit !== null && promo.usedCount >= promo.usageLimit) throw Object.assign(new Error("Promo code usage limit reached"), { status: 400 });
    if (bookingAmount < promo.minBookingAmount) throw Object.assign(new Error(`Minimum booking amount is ₹${promo.minBookingAmount}`), { status: 400 });

    const rawDiscount = promo.discountType === "percent"
      ? Math.floor((bookingAmount * promo.discountValue) / 100)
      : promo.discountValue;
    const cappedDiscount = promo.maxDiscountAmount ? Math.min(rawDiscount, promo.maxDiscountAmount) : rawDiscount;
    const discountAmount = Math.max(0, Math.min(cappedDiscount, bookingAmount));
    if (discountAmount <= 0) throw Object.assign(new Error("Promo code does not apply to this booking"), { status: 400 });
    return { promo, discountAmount };
  }

  async redeemPromoCode(code: string): Promise<void> {
    const normalizedCode = code.trim().toUpperCase();
    const promo = this.promoCodes.get(normalizedCode);
    if (!promo) return;
    this.promoCodes.set(normalizedCode, { ...promo, usedCount: promo.usedCount + 1 });
  }

  private applyPricingRuleToFutureSlots(rule: PricingRule): void {
    if (!rule.isActive) return;
    for (const [slotId, slot] of Array.from(this.timeSlots.entries())) {
      if (slot.turfId !== rule.turfId || slot.isBooked) continue;
      if (!this.pricingRuleMatchesSlot(rule, slot)) continue;
      const nextPrice = rule.adjustmentType === "percent"
        ? Math.max(100, Math.round(slot.price + (slot.price * rule.adjustmentValue) / 100))
        : Math.max(100, slot.price + rule.adjustmentValue);
      this.timeSlots.set(slotId, { ...slot, price: nextPrice });
    }
  }

  private pricingRuleMatchesSlot(rule: PricingRule, slot: TimeSlot): boolean {
    if (rule.startDate && slot.date < rule.startDate) return false;
    if (rule.endDate && slot.date > rule.endDate) return false;
    if (rule.startTime && slot.startTime < rule.startTime) return false;
    if (rule.endTime && slot.startTime >= rule.endTime) return false;
    if (rule.daysOfWeek && rule.daysOfWeek.length > 0) {
      const day = new Date(`${slot.date}T12:00:00Z`).getUTCDay();
      if (!rule.daysOfWeek.includes(day)) return false;
    }
    return true;
  }

  async updateTurfDetails(turfId: string, data: { name?: string; address?: string; pricePerHour?: number; amenities?: string[]; imageUrl?: string }): Promise<Turf | undefined> {
    const turf = this.turfs.get(turfId);
    if (!turf) return undefined;
    if (data.name !== undefined) turf.name = data.name;
    if (data.address !== undefined) turf.address = data.address;
    if (data.pricePerHour !== undefined) turf.pricePerHour = data.pricePerHour;
    if (data.amenities !== undefined) turf.amenities = data.amenities;
    if (data.imageUrl !== undefined) turf.imageUrl = data.imageUrl;
    this.turfs.set(turfId, turf);
    return turf;
  }

  async unbookTimeSlot(id: string): Promise<TimeSlot | undefined> {
    const slot = this.timeSlots.get(id);
    if (slot) { slot.isBooked = false; this.timeSlots.set(id, slot); }
    return slot;
  }

  async getSlotCountsByTurfAndDate(turfId: string, date: string): Promise<{ total: number; booked: number }> {
    const slots = await this.getTimeSlots(turfId, date);
    return {
      total: slots.length,
      booked: slots.filter(s => s.isBooked).length,
    };
  }

  async getAppFeedback(userId: string): Promise<AppFeedback | undefined> {
    return this.appFeedbacks.get(userId);
  }

  async upsertAppFeedback(userId: string, data: { rating: number; feedback?: string }): Promise<AppFeedback> {
    const existing = this.appFeedbacks.get(userId);
    const feedback: AppFeedback = {
      id: existing?.id || Math.random().toString(36).slice(2),
      userId,
      rating: data.rating,
      feedback: data.feedback || null,
      createdAt: existing?.createdAt || new Date(),
      updatedAt: new Date(),
    };
    this.appFeedbacks.set(userId, feedback);
    return feedback;
  }

  async getAdminUpdates(): Promise<AdminUpdate[]> {
    return Array.from(this.adminUpdates.values())
      .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
  }

  async createAdminUpdate(insertUpdate: InsertAdminUpdate): Promise<AdminUpdate> {
    const update: AdminUpdate = {
      audience: "internal",
      postType: "announcement",
      imageUrl: null,
      ctaLabel: null,
      ctaUrl: null,
      isActive: true,
      showSponsored: true,
      createdBy: null,
      ...insertUpdate,
      id: randomUUID(),
      createdAt: new Date(),
    };
    this.adminUpdates.set(update.id, update);
    return update;
  }

  async updateAdminUpdateVisibility(id: string, data: { isActive?: boolean; showSponsored?: boolean }): Promise<AdminUpdate | undefined> {
    const update = this.adminUpdates.get(id);
    if (!update) return undefined;
    const next = {
      ...update,
      isActive: data.isActive ?? update.isActive,
      showSponsored: data.showSponsored ?? update.showSponsored,
    };
    this.adminUpdates.set(id, next);
    return next;
  }

  async deleteAdminUpdate(id: string): Promise<boolean> {
    return this.adminUpdates.delete(id);
  }

  // ── Ban / Unban ─────────────────────────────────────────────────────────────
  async banUser(id: string, reason: string): Promise<User | undefined> {
    const user = this.users.get(id);
    if (!user) return undefined;
    user.isBanned = true;
    user.banReason = reason;
    this.users.set(id, user);
    return user;
  }

  async unbanUser(id: string): Promise<User | undefined> {
    const user = this.users.get(id);
    if (!user) return undefined;
    user.isBanned = false;
    user.banReason = null;
    this.users.set(id, user);
    return user;
  }

  // ── Global Search ───────────────────────────────────────────────────────────
  async searchAll(query: string): Promise<{ users: User[]; bookings: Booking[] }> {
    const q = query.toLowerCase().trim();
    const users = Array.from(this.users.values()).filter(u =>
      u.username.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      u.phoneNumber.includes(q) ||
      (u.fullName || "").toLowerCase().includes(q)
    );
    const bookings = Array.from(this.bookings.values()).filter(b =>
      b.bookingCode.toLowerCase().includes(q) ||
      (b.userName || "").toLowerCase().includes(q) ||
      (b.userPhone || "").includes(q)
    );
    return { users, bookings };
  }

  // ── Weekend Surcharge ───────────────────────────────────────────────────────
  async updateWeekendSurcharge(turfId: string, surcharge: number): Promise<Turf | undefined> {
    const turf = this.turfs.get(turfId);
    if (!turf) return undefined;
    turf.weekendSurcharge = surcharge;
    this.turfs.set(turfId, turf);
    return turf;
  }

  // ── Reviews ─────────────────────────────────────────────────────────────────
  async markReviewPromptShown(bookingId: string): Promise<void> {
    const booking = this.bookings.get(bookingId);
    if (booking) {
      booking.reviewPromptShown = true;
      this.bookings.set(bookingId, booking);
    }
  }

  async createReview(data: { bookingId: string; turfId: string; userId: string; rating: number; comment?: string }): Promise<TurfReview> {
    const review: TurfReview = {
      id: randomUUID(),
      bookingId: data.bookingId,
      turfId: data.turfId,
      userId: data.userId,
      rating: data.rating,
      comment: data.comment || null,
      createdAt: new Date(),
    };
    this.turfReviews.set(review.id, review);

    // Recalculate and update turf's average rating
    const turfReviewsList = await this.getReviewsByTurf(data.turfId);
    const avgRating = Math.round(turfReviewsList.reduce((sum, r) => sum + r.rating, 0) / turfReviewsList.length);
    const turf = this.turfs.get(data.turfId);
    if (turf) { turf.rating = avgRating; this.turfs.set(data.turfId, turf); }

    return review;
  }

  async getReviewsByTurf(turfId: string): Promise<TurfReview[]> {
    return Array.from(this.turfReviews.values())
      .filter(r => r.turfId === turfId)
      .sort((a, b) => new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime());
  }

  async hasReview(bookingId: string): Promise<boolean> {
    return Array.from(this.turfReviews.values()).some(r => r.bookingId === bookingId);
  }

  // ── Payout Ledger ───────────────────────────────────────────────────────────
  async getPayoutData(): Promise<{ ownerId: string; ownerName: string; turfId: string; turfName: string; grossRevenue: number; commission: number; netPayout: number; bookingCount: number }[]> {
    const COMMISSION_RATE = 0.05;
    const allBookings = Array.from(this.bookings.values()).filter(b => b.status !== "cancelled");
    const ownerTurfs = Array.from(this.turfs.values()).filter(t => t.ownerId);

    return ownerTurfs.map(turf => {
      const turfBookings = allBookings.filter(b => b.turfId === turf.id);
      const grossRevenue = turfBookings.reduce((sum, b) => sum + b.totalAmount, 0);
      const commission = Math.round(grossRevenue * COMMISSION_RATE);
      const owner = this.users.get(turf.ownerId!);
      return {
        ownerId: turf.ownerId!,
        ownerName: owner?.fullName || owner?.username || "Unknown",
        turfId: turf.id,
        turfName: turf.name,
        grossRevenue,
        commission,
        netPayout: grossRevenue - commission,
        bookingCount: turfBookings.length,
      };
    });
  }
}

const mutatingMethods = new Set<keyof IStorage>([
  "createUser",
  "updateUserProfile",
  "updateUserPassword",
  "updateOwnerStatus",
  "updateTurfStatus",
  "submitTurf",
  "submitAdditionalTurf",
  "deleteUser",
  "banUser",
  "unbanUser",
  "addLocation",
  "removeLocation",
  "createTurf",
  "updateWeekendSurcharge",
  "createTimeSlot",
  "bookTimeSlot",
  "blockTimeSlot",
  "unblockTimeSlot",
  "updateTimeSlotPrice",
  "updateTimeSlotPriceByStartTime",
  "createBooking",
  "createSlotHold",
  "confirmSlotHold",
  "verifyBookingCode",
  "expireSlotHolds",
  "markBookingPaid",
  "updateBookingStatus",
  "cancelBooking",
  "markReviewPromptShown",
  "updateTurfDetails",
  "unbookTimeSlot",
  "createPricingRule",
  "setPricingRuleActive",
  "createPromoCode",
  "redeemPromoCode",
  "createReview",
  "upsertAppFeedback",
  "createAdminUpdate",
  "updateAdminUpdateVisibility",
  "deleteAdminUpdate",
]);

const baseStorage = new MemStorage();

type StorageWithRuntime = IStorage & {
  readyPromise: Promise<void>;
  isDatabaseEnabled: boolean;
  queuePersist: () => Promise<void>;
};

export const storage: IStorage = new Proxy(baseStorage as StorageWithRuntime, {
  get(target, prop, receiver) {
    const original = Reflect.get(target, prop, receiver);
    if (typeof original !== "function") return original;

    return async (...args: unknown[]) => {
      await target.readyPromise;
      const result = await original.apply(target, args);

      if (
        target.isDatabaseEnabled &&
        typeof prop === "string" &&
        mutatingMethods.has(prop as keyof IStorage)
      ) {
        await target.queuePersist();
      }

      return result;
    };
  },
});
