import { useState, useEffect } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface DobPickerProps {
  value: string; // YYYY-MM-DD or ""
  onChange: (value: string) => void;
}

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function daysInMonth(month: number, year: number) {
  return new Date(year, month, 0).getDate();
}

const currentYear = new Date().getFullYear();
const years = Array.from({ length: currentYear - 1919 }, (_, i) => currentYear - 5 - i).filter(y => y >= 1920);

export function DobPicker({ value, onChange }: DobPickerProps) {
  const [day, setDay] = useState<string>("");
  const [month, setMonth] = useState<string>("");
  const [year, setYear] = useState<string>("");

  // Sync from external value
  useEffect(() => {
    if (value && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
      const [y, m, d] = value.split("-");
      setYear(y);
      setMonth(String(parseInt(m)));
      setDay(String(parseInt(d)));
    } else if (!value) {
      setDay("");
      setMonth("");
      setYear("");
    }
  }, [value]);

  const maxDay = month && year
    ? daysInMonth(parseInt(month), parseInt(year))
    : month
    ? daysInMonth(parseInt(month), 2000)
    : 31;

  const days = Array.from({ length: maxDay }, (_, i) => i + 1);

  const handleChange = (newDay: string, newMonth: string, newYear: string) => {
    if (newDay && newMonth && newYear) {
      const d = parseInt(newDay);
      const m = parseInt(newMonth);
      const y = parseInt(newYear);
      const maxD = daysInMonth(m, y);
      const safeDay = Math.min(d, maxD);
      onChange(
        `${y}-${String(m).padStart(2, "0")}-${String(safeDay).padStart(2, "0")}`
      );
    } else {
      onChange("");
    }
  };

  const onDayChange = (v: string) => {
    setDay(v);
    handleChange(v, month, year);
  };

  const onMonthChange = (v: string) => {
    setMonth(v);
    // Clamp day if needed
    if (day && year) {
      const maxD = daysInMonth(parseInt(v), parseInt(year));
      const safeDay = Math.min(parseInt(day), maxD).toString();
      setDay(safeDay);
      handleChange(safeDay, v, year);
    } else {
      handleChange(day, v, year);
    }
  };

  const onYearChange = (v: string) => {
    setYear(v);
    // Clamp day for Feb in leap year
    if (day && month) {
      const maxD = daysInMonth(parseInt(month), parseInt(v));
      const safeDay = Math.min(parseInt(day), maxD).toString();
      setDay(safeDay);
      handleChange(safeDay, month, v);
    } else {
      handleChange(day, month, v);
    }
  };

  return (
    <div className="flex gap-2">
      {/* Day */}
      <Select value={day} onValueChange={onDayChange}>
        <SelectTrigger
          data-testid="select-dob-day"
          className="flex-1 bg-card border-border"
        >
          <SelectValue placeholder="Day" />
        </SelectTrigger>
        <SelectContent>
          {days.map(d => (
            <SelectItem key={d} value={String(d)}>
              {d}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Month */}
      <Select value={month} onValueChange={onMonthChange}>
        <SelectTrigger
          data-testid="select-dob-month"
          className="flex-[2] bg-card border-border"
        >
          <SelectValue placeholder="Month" />
        </SelectTrigger>
        <SelectContent>
          {MONTHS.map((name, idx) => (
            <SelectItem key={name} value={String(idx + 1)}>
              {name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Year */}
      <Select value={year} onValueChange={onYearChange}>
        <SelectTrigger
          data-testid="select-dob-year"
          className="flex-1 bg-card border-border"
        >
          <SelectValue placeholder="Year" />
        </SelectTrigger>
        <SelectContent className="max-h-56">
          {years.map(y => (
            <SelectItem key={y} value={String(y)}>
              {y}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
