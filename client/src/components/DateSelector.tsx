import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { addDays, format, isSameDay, startOfToday } from "date-fns";

interface DateSelectorProps {
  selectedDate: Date;
  onSelectDate: (date: Date) => void;
}

export function DateSelector({ selectedDate, onSelectDate }: DateSelectorProps) {
  const today = startOfToday();
  const dates = Array.from({ length: 14 }, (_, i) => addDays(today, i));

  return (
    <div className="space-y-3" data-testid="date-selector">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-foreground">Select Date</h3>
        <span className="text-sm text-primary font-medium">
          {format(selectedDate, "MMMM yyyy")}
        </span>
      </div>
      
      <div className="relative">
        <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-2 -mx-4 px-4">
          {dates.map((date) => {
            const isSelected = isSameDay(date, selectedDate);
            const isToday = isSameDay(date, today);
            
            return (
              <button
                key={date.toISOString()}
                onClick={() => onSelectDate(date)}
                className={cn(
                  "flex flex-col items-center justify-center min-w-[60px] py-3 px-2 rounded-xl transition-all",
                  isSelected 
                    ? "bg-primary text-primary-foreground" 
                    : "bg-card hover-elevate",
                )}
                data-testid={`date-${format(date, "yyyy-MM-dd")}`}
              >
                <span className={cn(
                  "text-xs font-medium uppercase",
                  isSelected ? "text-primary-foreground" : "text-muted-foreground"
                )}>
                  {format(date, "EEE")}
                </span>
                <span className={cn(
                  "text-lg font-bold mt-1",
                  isSelected ? "text-primary-foreground" : "text-foreground"
                )}>
                  {format(date, "d")}
                </span>
                {isToday && (
                  <div className={cn(
                    "w-1.5 h-1.5 rounded-full mt-1",
                    isSelected ? "bg-primary-foreground" : "bg-primary"
                  )} />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
