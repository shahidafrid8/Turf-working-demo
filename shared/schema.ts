import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  fullName: text("full_name"),
  email: text("email").notNull().unique(),
  phoneNumber: text("phone_number").notNull().unique(),
  password: text("password").notNull(),
  dateOfBirth: text("date_of_birth").notNull(),
  role: text("role").notNull().default("player"), // 'player' | 'turf_owner'
  // Turf owner account status
  ownerStatus: text("owner_status"), // null | 'pending_account' | 'account_approved' | 'account_rejected'
  // Turf listing status (set after account is approved and owner submits turf)
  turfStatus: text("turf_status"), // null | 'pending_turf' | 'turf_approved' | 'turf_rejected'
  turfName: text("turf_name"),
  turfLocation: text("turf_location"),
  turfAddress: text("turf_address"),
  turfPincode: text("turf_pincode"),
  turfImageUrls: text("turf_image_urls").array(),
  turfLength: integer("turf_length"),
  turfWidth: integer("turf_width"),
  profileImageUrl: text("profile_image_url"),
});

export const insertUserSchema = createInsertSchema(users).omit({ id: true });
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// Turf model
export const turfs = pgTable("turfs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  ownerId: text("owner_id"), // null = system turf, set = owner-managed
  name: text("name").notNull(),
  location: text("location").notNull(),
  address: text("address").notNull(),
  imageUrl: text("image_url").notNull(),
  rating: integer("rating").notNull().default(5),
  amenities: text("amenities").array().notNull(),
  sportTypes: text("sport_types").array().notNull(),
  pricePerHour: integer("price_per_hour").notNull(),
  isAvailable: boolean("is_available").notNull().default(true),
  featured: boolean("featured").notNull().default(false),
});

export const insertTurfSchema = createInsertSchema(turfs).omit({ id: true });
export type InsertTurf = z.infer<typeof insertTurfSchema>;
export type Turf = typeof turfs.$inferSelect;

// Time slot model
export const timeSlots = pgTable("time_slots", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  turfId: varchar("turf_id").notNull(),
  date: text("date").notNull(),
  startTime: text("start_time").notNull(),
  endTime: text("end_time").notNull(),
  price: integer("price").notNull(),
  period: text("period").notNull(), // morning, afternoon, evening
  isBooked: boolean("is_booked").notNull().default(false),
  isBlocked: boolean("is_blocked").notNull().default(false),
});

export const insertTimeSlotSchema = createInsertSchema(timeSlots).omit({ id: true });
export type InsertTimeSlot = z.infer<typeof insertTimeSlotSchema>;
export type TimeSlot = typeof timeSlots.$inferSelect;

// Booking model
export const bookings = pgTable("bookings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  turfId: varchar("turf_id").notNull(),
  turfName: text("turf_name").notNull(),
  turfAddress: text("turf_address").notNull(),
  date: text("date").notNull(),
  startTime: text("start_time").notNull(),
  endTime: text("end_time").notNull(),
  duration: integer("duration").notNull(),
  totalAmount: integer("total_amount").notNull(),
  paidAmount: integer("paid_amount").notNull(),
  balanceAmount: integer("balance_amount").notNull(),
  paymentMethod: text("payment_method").notNull(),
  status: text("status").notNull().default("confirmed"),
  bookingCode: text("booking_code").notNull(),
  userId: text("user_id"),
  userName: text("user_name"),
  userPhone: text("user_phone"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertBookingSchema = createInsertSchema(bookings).omit({ id: true, createdAt: true });
export type InsertBooking = z.infer<typeof insertBookingSchema>;
export type Booking = typeof bookings.$inferSelect;

// App Feedback model
export const appFeedback = pgTable("app_feedback", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: text("user_id").notNull().unique(), // One feedback per user
  rating: integer("rating").notNull(),
  feedback: text("feedback"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertAppFeedbackSchema = createInsertSchema(appFeedback).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertAppFeedback = z.infer<typeof insertAppFeedbackSchema>;
export type AppFeedback = typeof appFeedback.$inferSelect;
