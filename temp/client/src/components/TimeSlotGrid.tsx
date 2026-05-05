// TEMP COPY: do not edit or commit from here.
import { cn } from "@/lib/utils";
import type { TimeSlot } from "@shared/schema";
import { format } from "date-fns";

interface TimeSlotGridProps {
  slots: TimeSlot[];
  selectedSlotId: string | null;
  onSelectSlot: (slot: TimeSlot) => void;
  duration: number;
}

const toMinutes = (time: string) => {
  const [hour, minute] = time.split(":").map(Number);
  return hour * 60 + minute;
};

const formatHour = (minutes: number) => {
  const hour = Math.floor(minutes / 60);
  return `${hour.toString().padStart(2, "0")}:00`;
};

export function TimeSlotGrid({ slots, selectedSlotId, onSelectSlot, duration }: TimeSlotGridProps) {
  const morningSlots = slots.filter((s) => s.period === "morning");
  const afternoonSlots = slots.filter((s) => s.period === "afternoon");
  const eveningSlots = slots.filter((s) => s.period === "evening");

  const selectedSlot = slots.find((s) => s.id === selectedSlotId);
  const selectedStartMinute = selectedSlot ? toMinutes(selectedSlot.startTime) : null;
  const selectedEndMinute = selectedStartMinute !== null ? selectedStartMinute + duration : null;

  const currentDateStr = format(new Date(), "yyyy-MM-dd");
  const now = new Date();
  const currentMinute = now.getHours() * 60 + now.getMinutes();

  const renderSlots = (periodSlots: TimeSlot[], period: string) => {
    const slotsByHour = new Map<number, TimeSlot[]>();
    for (const slot of periodSlots) {
      const slotMinute = toMinutes(slot.startTime);
      const hourMinute = Math.floor(slotMinute / 60) * 60;
      if (!slotsByHour.has(hourMinute)) slotsByHour.set(hourMinute, []);
      slotsByHour.get(hourMinute)!.push(slot);
    }

    const visibleHours = Array.from(slotsByHour.entries())
      .sort(([a], [b]) => a - b)
      .filter(([, hourSlots]) =>
        hourSlots.some((slot) => !(slot.date === currentDateStr && toMinutes(slot.startTime) < currentMinute))
      );

    if (visibleHours.length === 0) return null;

    const periodConfig = {
      morning: {
        label: "Morning",
        sublabel: "6:00 AM - 12:00 PM",
        bgClass: "bg-card",
      },
      afternoon: {
        label: "Afternoon",
        sublabel: "12:00 PM - 6:00 PM",
        bgClass: "bg-primary/5",
      },
      evening: {
        label: "Evening",
        sublabel: "6:00 PM - 11:00 PM",
        bgClass: "bg-secondary",
      },
    };

    const config = periodConfig[period as keyof typeof periodConfig];

    return (
      <div className="space-y-3" data-testid={`slots-${period}`}>
        <div className="flex items-center justify-between">
          <div>
            <h4 className="font-semibold text-foreground">{config.label}</h4>
            <p className="text-xs text-muted-foreground">{config.sublabel}</p>
          </div>
          {period === "evening" && (
            <span className="text-xs text-primary font-medium">Premium</span>
          )}
        </div>

        <div className="grid grid-cols-3 gap-2">
          {visibleHours.map(([hourMinute, hourSlots]) => {
            const firstHalf = hourSlots.find((slot) => toMinutes(slot.startTime) === hourMinute);
            const secondHalf = hourSlots.find((slot) => toMinutes(slot.startTime) === hourMinute + 30);
            const halves = [firstHalf, secondHalf];
            const fullHourPrice = halves.reduce((sum, slot) => sum + (slot?.price || 0), 0);
            const cardSelected = selectedStartMinute !== null && selectedEndMinute !== null
              && halves.some((slot) => {
                if (!slot) return false;
                const slotMinute = toMinutes(slot.startTime);
                return slotMinute >= selectedStartMinute && slotMinute < selectedEndMinute;
              });

            return (
              <div
                key={`${period}-${hourMinute}`}
                className={cn(
                  "relative p-3 rounded-lg text-center transition-all duration-200",
                  config.bgClass,
                  !cardSelected && "hover-elevate",
                  cardSelected && "ring-2 ring-primary bg-primary/20"
                )}
                data-testid={`slot-hour-${formatHour(hourMinute)}`}
              >
                <div className={cn("text-sm font-medium", cardSelected ? "text-primary" : "text-foreground")}>
                  {formatHour(hourMinute)}
                </div>
                <div className={cn("text-base font-bold mt-1", cardSelected ? "text-primary" : "text-foreground")}>
                  {"\u20b9"}{fullHourPrice}
                </div>

                <div className="mt-3 grid grid-cols-2 overflow-hidden rounded-md border border-border/60 bg-background/40">
                  {halves.map((slot, index) => {
                    const slotMinute = slot ? toMinutes(slot.startTime) : hourMinute + index * 30;
                    const isPast = slot?.date === currentDateStr && slotMinute < currentMinute;
                    const isUnavailable = !slot || slot.isBooked || slot.isBlocked || isPast;
                    const isSelected = selectedStartMinute !== null && selectedEndMinute !== null
                      && slotMinute >= selectedStartMinute && slotMinute < selectedEndMinute;

                    return (
                      <button
                        key={`${hourMinute}-${index}`}
                        type="button"
                        disabled={isUnavailable}
                        onClick={() => slot && onSelectSlot(slot)}
                        className={cn(
                          "min-h-10 px-1 py-1.5 text-[11px] font-semibold leading-tight transition-colors",
                          index === 1 && "border-l border-border/60",
                          isUnavailable && "cursor-not-allowed text-muted-foreground/50 bg-background/30",
                          !isUnavailable && !isSelected && "text-foreground hover:bg-primary/15",
                          isSelected && "bg-primary text-primary-foreground"
                        )}
                        data-testid={slot ? `slot-${slot.id}` : undefined}
                      >
                        <span className="block">{index === 0 ? "1st" : "2nd"}</span>
                        <span className="block">30</span>
                        {slot?.isBooked && <span className="block text-[10px]">Booked</span>}
                        {slot?.isBlocked && <span className="block text-[10px]">Blocked</span>}
                      </button>
                    );
                  })}
                </div>

                {cardSelected && (
                  <div className="absolute -top-1 -right-1 w-4 h-4 bg-primary rounded-full flex items-center justify-center">
                    <svg className="w-2.5 h-2.5 text-primary-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {renderSlots(morningSlots, "morning")}
      {renderSlots(afternoonSlots, "afternoon")}
      {renderSlots(eveningSlots, "evening")}
    </div>
  );
}
