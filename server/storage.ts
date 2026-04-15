import {
  type User, type InsertUser,
  type Turf, type InsertTurf,
  type TimeSlot, type InsertTimeSlot,
  type Booking, type InsertBooking,
  type AppFeedback, type InsertAppFeedback,
  type TurfReview
} from "@shared/schema";
import { randomUUID } from "crypto";
import { addDays, format, startOfToday } from "date-fns";
import bcrypt from "bcrypt";

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
  markBookingPaid(id: string): Promise<Booking | undefined>;
  cancelBooking(id: string): Promise<Booking | undefined>;
  markReviewPromptShown(bookingId: string): Promise<void>;

  // Turf management
  updateTurfDetails(turfId: string, data: { name?: string; address?: string; pricePerHour?: number; amenities?: string[]; imageUrl?: string }): Promise<Turf | undefined>;
  unbookTimeSlot(id: string): Promise<TimeSlot | undefined>;
  getSlotCountsByTurfAndDate(turfId: string, date: string): Promise<{ total: number; booked: number }>;

  // Reviews
  createReview(data: { bookingId: string; turfId: string; userId: string; rating: number; comment?: string }): Promise<TurfReview>;
  getReviewsByTurf(turfId: string): Promise<TurfReview[]>;
  hasReview(bookingId: string): Promise<boolean>;
  getPayoutData(): Promise<{ ownerId: string; ownerName: string; turfId: string; turfName: string; grossRevenue: number; commission: number; netPayout: number; bookingCount: number }[]>;

  // App Feedback
  getAppFeedback(userId: string): Promise<AppFeedback | undefined>;
  upsertAppFeedback(userId: string, data: { rating: number; feedback?: string }): Promise<AppFeedback>;
}

const turfImages = [
  "https://images.unsplash.com/photo-1529900748604-07564a03e7a6?w=800&h=600&fit=crop",
  "https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=800&h=600&fit=crop",
  "https://images.unsplash.com/photo-1431324155629-1a6deb1dec8d?w=800&h=600&fit=crop",
  "https://images.unsplash.com/photo-1459865264687-595d652de67e?w=800&h=600&fit=crop",
  "https://images.unsplash.com/photo-1551958219-acbc608c6377?w=800&h=600&fit=crop",
  "https://images.unsplash.com/photo-1624880357913-a8539238245b?w=800&h=600&fit=crop",
];

const initialTurfs: Omit<Turf, "ownerId">[] = [
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
  private appFeedbacks: Map<string, AppFeedback>;
  private turfReviews: Map<string, TurfReview>;
  private locations: string[];

  constructor() {
    this.users = new Map();
    this.turfs = new Map();
    this.timeSlots = new Map();
    this.bookings = new Map();
    this.appFeedbacks = new Map();
    this.turfReviews = new Map();
    this.locations = [
      "Bangalore", "Chennai", "Mumbai", "Delhi",
      "Hyderabad", "Pune", "Kolkata", "Ahmedabad", "Nandyal",
    ];

    const playerUser: User = {
      id: "seed-player-shahid", username: "shahid", fullName: "Shahid Afrid",
      email: "shahid@gmail.com", phoneNumber: "1234567890",
      password: bcrypt.hashSync("shahid123", 10), dateOfBirth: "2006-06-25",
      role: "player", isBanned: false, banReason: null,
      ownerStatus: null, turfStatus: null, turfName: null, turfLocation: null,
      turfAddress: null, turfPincode: null, turfImageUrls: null,
      turfLength: null, turfWidth: null, profileImageUrl: null,
    };
    this.users.set(playerUser.id, playerUser);

    const playerUser2: User = {
      id: "seed-player-shamanth", username: "shamanth", fullName: "Shamanth",
      email: "shamanth@gmail.com", phoneNumber: "0987654322",
      password: bcrypt.hashSync("shamanth123", 10), dateOfBirth: "2000-01-01",
      role: "player", isBanned: false, banReason: null,
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
      role: "turf_owner", isBanned: false, banReason: null,
      ownerStatus: "account_approved", turfStatus: "turf_approved",
      turfName: "Tharak's Turf", turfLocation: "Nandyal",
      turfAddress: "balaji complex, Nandyal, 518501", turfPincode: "518501",
      turfImageUrls: [tharakUploadedImage], turfLength: 120, turfWidth: 80,
      profileImageUrl: null,
    };
    this.users.set(ownerUser.id, ownerUser);

    const tharakTurf: Turf = {
      id: "seed-turf-tharak", ownerId: ownerUser.id,
      name: "Tharak's Turf", location: "Nandyal",
      address: "balaji complex, Nandyal, 518501", imageUrl: tharakUploadedImage,
      rating: 5, amenities: ["Parking"], sportTypes: ["Cricket"],
      pricePerHour: 1000, weekendSurcharge: 0, isAvailable: true, featured: true,
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
      this.turfs.set(turf.id, { ...turf, ownerId: null });
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
      role: "player",
      ownerStatus: null,
      turfName: null,
      turfLocation: null,
      turfAddress: null,
      turfImageUrls: null,
      turfPincode: null,
      turfLength: null,
      turfWidth: null,
      turfStatus: null,
      profileImageUrl: null,
      fullName: null,
      managerId: null,
      ...insertUser,
      id,
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
    const updated = { ...user, turfStatus: status };
    this.users.set(id, updated);

    if (status === "turf_approved" && user.turfName && user.turfLocation && user.turfAddress) {
      const turfId = randomUUID();
      const imageUrl = (user.turfImageUrls && user.turfImageUrls.length > 0)
        ? user.turfImageUrls[0]
        : turfImages[0];
      const turf: Turf = {
        id: turfId,
        ownerId: user.id,
        name: user.turfName,
        location: user.turfLocation,
        address: user.turfAddress,
        imageUrl,
        rating: 5,
        amenities: ["Parking"],
        sportTypes: ["Cricket"],
        pricePerHour: 1000,
        weekendSurcharge: 0,
        isAvailable: true,
        featured: false,
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
    const updated: User = {
      ...user,
      turfName: turfData.turfName,
      turfLocation: turfData.turfLocation,
      turfAddress: turfData.turfAddress,
      turfPincode: turfData.turfPincode,
      turfImageUrls: turfData.turfImageUrls,
      turfLength: turfData.turfLength,
      turfWidth: turfData.turfWidth,
      turfStatus: "pending_turf",
    };
    this.users.set(id, updated);
    return updated;
  }

  async getPendingAccounts(): Promise<User[]> {
    return Array.from(this.users.values()).filter(u => 
      u.role === "turf_owner" && u.ownerStatus === "pending_account"
    );
  }

  async getPendingTurfs(): Promise<User[]> {
    return Array.from(this.users.values()).filter(u => u.role === "turf_owner" && u.ownerStatus === "account_approved" && u.turfStatus === "pending_turf");
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
    return Array.from(this.turfs.values()).filter(t => t.ownerId === ownerId);
  }

  async createTurf(insertTurf: InsertTurf): Promise<Turf> {
    const id = randomUUID();
    const turf: Turf = { rating: 5, isAvailable: true, featured: false, ownerId: null, weekendSurcharge: 0, ...insertTurf, id };
    this.turfs.set(id, turf);
    return turf;
  }

  async getTimeSlots(turfId: string, date: string): Promise<TimeSlot[]> {
    return Array.from(this.timeSlots.values()).filter(s => s.turfId === turfId && s.date === date);
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
    const bookingEntity: Booking = { status: "confirmed", userId: null, userName: null, userPhone: null, reviewPromptShown: false, ...insertBooking, id, createdAt: new Date() };
    this.bookings.set(bookingEntity.id, bookingEntity);
    return bookingEntity;
  }

  async markBookingPaid(id: string): Promise<Booking | undefined> {
    const booking = this.bookings.get(id);
    if (booking) {
      booking.paidAmount = booking.totalAmount;
      booking.balanceAmount = 0;
      this.bookings.set(id, booking);
    }
    return booking;
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

export const storage = new MemStorage();
