import type { TimeSlot } from "@shared/schema";

export function timeToMinutes(time: string): number {
  const [hour, minute] = time.split(":").map(Number);
  return hour * 60 + minute;
}

export function minutesToTime(minutes: number): string {
  const normalized = minutes % (24 * 60);
  const hour = Math.floor(normalized / 60);
  const minute = normalized % 60;
  return `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`;
}

export function getRequiredHalfHourSlots(slots: TimeSlot[], turfId: string, startTime: string, duration: number): TimeSlot[] {
  const startMinute = timeToMinutes(startTime);
  const requiredSlots: TimeSlot[] = [];

  for (let minute = startMinute; minute < startMinute + duration; minute += 30) {
    const requiredStartTime = minutesToTime(minute);
    const matchingSlot = slots.find((slot) => slot.startTime === requiredStartTime && slot.turfId === turfId);
    if (!matchingSlot) {
      throw Object.assign(new Error("Time slot is outside of operational hours or missing"), { status: 409 });
    }
    if (matchingSlot.isBooked) {
      throw Object.assign(new Error("One or more selected time slots are already booked"), { status: 409 });
    }
    if (matchingSlot.isBlocked) {
      throw Object.assign(new Error("One or more selected time slots are currently unavailable"), { status: 409 });
    }
    requiredSlots.push(matchingSlot);
  }

  return requiredSlots;
}
