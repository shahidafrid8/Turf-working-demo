import webpush, { type PushSubscription } from "web-push";
import { randomUUID } from "crypto";
import { pool } from "../db";
import { logger } from "../logger";
import { storage } from "../storage";
import type { Booking } from "@shared/schema";

type StoredSubscription = {
  id: string;
  userId: string;
  endpoint: string;
  subscription: PushSubscription;
};

type NotificationPayload = {
  title: string;
  body: string;
  url?: string;
  tag?: string;
};

const memorySubscriptions = new Map<string, StoredSubscription>();
const fallbackKeys = webpush.generateVAPIDKeys();

function vapidPublicKey() {
  return process.env.VAPID_PUBLIC_KEY || fallbackKeys.publicKey;
}

function vapidPrivateKey() {
  return process.env.VAPID_PRIVATE_KEY || fallbackKeys.privateKey;
}

function vapidSubject() {
  return process.env.VAPID_SUBJECT || "mailto:support@quickturf.local";
}

function configureVapid() {
  webpush.setVapidDetails(vapidSubject(), vapidPublicKey(), vapidPrivateKey());
}

export function getPushPublicKey() {
  configureVapid();
  return {
    publicKey: vapidPublicKey(),
    enabled: true,
    persistent: Boolean(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY),
  };
}

export async function savePushSubscription(userId: string, subscription: PushSubscription) {
  const endpoint = subscription.endpoint;
  if (!endpoint) throw Object.assign(new Error("Invalid push subscription"), { status: 400 });

  if (pool) {
    await pool.query(
      `INSERT INTO push_subscriptions (id, user_id, endpoint, subscription, created_at, updated_at)
       VALUES ($1, $2, $3, $4, now(), now())
       ON CONFLICT (endpoint)
       DO UPDATE SET user_id = EXCLUDED.user_id, subscription = EXCLUDED.subscription, updated_at = now()`,
      [randomUUID(), userId, endpoint, JSON.stringify(subscription)],
    );
    return;
  }

  memorySubscriptions.set(endpoint, { id: randomUUID(), userId, endpoint, subscription });
}

export async function deletePushSubscription(endpoint: string) {
  if (pool) {
    await pool.query(`DELETE FROM push_subscriptions WHERE endpoint = $1`, [endpoint]);
    return;
  }
  memorySubscriptions.delete(endpoint);
}

async function subscriptionsForUser(userId: string): Promise<StoredSubscription[]> {
  if (pool) {
    const result = await pool.query(
      `SELECT id, user_id, endpoint, subscription FROM push_subscriptions WHERE user_id = $1`,
      [userId],
    );
    return result.rows.map((row) => ({
      id: row.id,
      userId: row.user_id,
      endpoint: row.endpoint,
      subscription: row.subscription,
    }));
  }

  return Array.from(memorySubscriptions.values()).filter((subscription) => subscription.userId === userId);
}

export async function sendPushToUser(userId: string | null | undefined, payload: NotificationPayload) {
  if (!userId) return;
  configureVapid();

  const subscriptions = await subscriptionsForUser(userId);
  await Promise.all(subscriptions.map(async (entry) => {
    try {
      await webpush.sendNotification(entry.subscription, JSON.stringify(payload));
    } catch (err: any) {
      if (err?.statusCode === 404 || err?.statusCode === 410) {
        await deletePushSubscription(entry.endpoint);
        return;
      }
      logger.warn("push.send_failed", { userId, endpoint: entry.endpoint, error: err?.message || "unknown" });
    }
  }));
}

export async function notifyBookingCreated(booking: Booking) {
  await sendPushToUser(booking.userId, {
    title: "Booking confirmed",
    body: `${booking.turfName} is booked for ${booking.date}, ${booking.startTime}. Code: ${booking.verificationCode}`,
    url: "/bookings",
    tag: `booking-${booking.id}`,
  });

  const turf = await storage.getTurf(booking.turfId);
  if (turf?.ownerId) {
    await sendPushToUser(turf.ownerId, {
      title: "New turf booking",
      body: `${booking.userName || "A player"} booked ${booking.turfName} on ${booking.date}, ${booking.startTime}.`,
      url: "/owner/home",
      tag: `owner-booking-${booking.id}`,
    });

    const staff = await storage.getStaffByOwnerId(turf.ownerId);
    await Promise.all(staff.map((member) => sendPushToUser(member.id, {
      title: "New turf booking",
      body: `${booking.userName || "A player"} booked ${booking.turfName} on ${booking.date}, ${booking.startTime}.`,
      url: "/staff/home",
      tag: `staff-booking-${booking.id}`,
    })));
  }
}
