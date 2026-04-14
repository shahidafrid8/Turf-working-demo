import { cn } from "@/lib/utils";
import type { TimeSlot } from "@shared/schema";
import { format } from "date-fns";

interface TimeSlotGridProps {
  slots: TimeSlot[];
  selectedSlotId: string | null;
  onSelectSlot: (slot: TimeSlot) => void;
  duration: number;
}

export function TimeSlotGrid({ slots, selectedSlotId, onSelectSlot, duration }: TimeSlotGridProps) {
  const morningSlots = slots.filter((s) => s.period === "morning");
  const afternoonSlots = slots.filter((s) => s.period === "afternoon");
  const eveningSlots = slots.filter((s) => s.period === "evening");

  const selectedSlot = slots.find(s => s.id === selectedSlotId);
  const selectedStartHour = selectedSlot ? parseInt(selectedSlot.startTime.split(':')[0]) : null;
  const durationHours = duration / 60;

  const currentDateStr = format(new Date(), "yyyy-MM-dd");
  const currentHour = new Date().getHours();

  const renderSlots = (periodSlots: TimeSlot[], period: string) => {
    // Filter out past slots completely
    const visibleSlots = periodSlots.filter(slot => {
      const slotHour = parseInt(slot.startTime.split(':')[0]);
      return !(slot.date === currentDateStr && slotHour <= currentHour);
    });

    if (visibleSlots.length === 0) return null;

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
          {visibleSlots.map((slot) => {
            const slotHour = parseInt(slot.startTime.split(':')[0]);
            let isSelected = false;
            if (selectedStartHour !== null) {
              isSelected = slotHour >= selectedStartHour && slotHour < selectedStartHour + durationHours;
            }
            
            const isUnavailable = slot.isBooked || slot.isBlocked;
            
            return (
              <button
                key={slot.id}
                onClick={() => !isUnavailable && onSelectSlot(slot)}
                disabled={isUnavailable}
                className={cn(
                  "relative p-3 rounded-lg text-center transition-all duration-200",
                  config.bgClass,
                  isUnavailable && "opacity-40 cursor-not-allowed",
                  !isUnavailable && !isSelected && "hover-elevate cursor-pointer",
                  isSelected && "ring-2 ring-primary bg-primary/20"
                )}
                data-testid={`slot-${slot.id}`}
              >
                <div className={cn(
                  "text-sm font-medium",
                  isSelected ? "text-primary" : "text-foreground"
                )}>
                  {slot.startTime}
                </div>
                <div className={cn(
                  "text-base font-bold mt-1",
                  isSelected ? "text-primary" : "text-foreground"
                )}>
                  ₹{slot.price}
                </div>
                {isUnavailable && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-xs text-muted-foreground font-medium px-2 text-center leading-tight">
                      {slot.isBlocked ? "Booked by owner" : "Booked"}
                    </span>
                  </div>
                )}
                {isSelected && (
                  <div className="absolute -top-1 -right-1 w-4 h-4 bg-primary rounded-full flex items-center justify-center">
                    <svg className="w-2.5 h-2.5 text-primary-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                )}
              </button>
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
