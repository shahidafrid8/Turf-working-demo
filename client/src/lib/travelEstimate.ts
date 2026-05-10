import type { Booking } from "@shared/schema";

const CITY_SPEED_KMPH = 24;
const BUFFER_MINUTES = 15;

export function estimateTravelMinutes(distanceKm: number): number {
  if (!Number.isFinite(distanceKm) || distanceKm <= 0) return 0;
  return Math.max(5, Math.ceil((distanceKm / CITY_SPEED_KMPH) * 60));
}

export function getRecommendedLeaveAt(date: string, startTime: string, etaMinutes: number): string | null {
  if (!date || !startTime || etaMinutes <= 0) return null;
  const startDate = new Date(`${date}T${startTime}:00`);
  if (Number.isNaN(startDate.getTime())) return null;
  const leaveAt = new Date(startDate.getTime() - (etaMinutes + BUFFER_MINUTES) * 60_000);
  return leaveAt.toISOString();
}

export function formatLeaveAt(value: string | null | undefined): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function getDirectionsUrl(booking: Pick<Booking, "turfAddress" | "turfName">): string {
  const destination = encodeURIComponent(`${booking.turfName}, ${booking.turfAddress}`);
  return `https://www.google.com/maps/dir/?api=1&destination=${destination}`;
}

export async function requestBrowserLocation(): Promise<{ latitude: number; longitude: number }> {
  if (!navigator.geolocation) {
    throw new Error("Location is not available in this browser.");
  }

  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(
      position => resolve({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      }),
      () => reject(new Error("Location permission was not granted.")),
      { enableHighAccuracy: true, timeout: 10_000, maximumAge: 60_000 }
    );
  });
}
