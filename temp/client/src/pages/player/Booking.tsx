// TEMP COPY: do not edit or commit from here.
import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { ArrowLeft, Share2, Star, MapPin, Car, Wifi, Droplets, Clock, Users, Coffee, Droplet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DateSelector } from "@/components/DateSelector";
import { TimeSlotGrid } from "@/components/TimeSlotGrid";
import { startOfToday, format } from "date-fns";
import type { Turf, TimeSlot } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { useSEO } from "@/lib/seo";

const amenityIcons: Record<string, typeof Wifi> = {
  "Parking": Car,
  "WiFi": Wifi,
  "Showers": Droplets,
  "Changing Room": Users,
  "Cafe": Coffee,
  "Water": Droplet,
};

const toMinutes = (time: string) => {
  const [hour, minute] = time.split(":").map(Number);
  return hour * 60 + minute;
};

const formatMinutes = (minutes: number) => {
  const normalized = minutes % (24 * 60);
  const hour = Math.floor(normalized / 60);
  const minute = normalized % 60;
  return `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`;
};

const getSlotsForRange = (slots: TimeSlot[], startTime: string, duration: number) => {
  const startMinute = toMinutes(startTime);
  const requiredSlots: TimeSlot[] = [];

  for (let minute = startMinute; minute < startMinute + duration; minute += 30) {
    const slot = slots.find((s) => s.startTime === formatMinutes(minute));
    if (!slot || slot.isBooked || slot.isBlocked) return null;
    requiredSlots.push(slot);
  }

  return requiredSlots;
};

export default function Booking() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [selectedDate, setSelectedDate] = useState(startOfToday());
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  const [duration, setDuration] = useState("60");

  const { data: turf, isLoading: turfLoading } = useQuery<Turf>({
    queryKey: [`/api/turfs/${id}`],
  });

  useSEO({
    title: turf ? `Book ${turf.name}` : "Book a Turf",
    description: turf ? `Book sports slots at ${turf.name} located in ${turf.location}. Check real-time availability.` : "Book your slots on Quick Turf.",
    image: turf?.imageUrl || undefined
  });

  const dateStr = format(selectedDate, "yyyy-MM-dd");
  const { data: slots, isLoading: slotsLoading } = useQuery<TimeSlot[]>({
    queryKey: [`/api/turfs/${id}/slots/${dateStr}`],
    enabled: !!id,
    staleTime: 0,
    refetchOnMount: "always",
  });

  const totalPrice = useMemo(() => {
    if (!selectedSlot || !slots) return 0;
    const selectedSlots = getSlotsForRange(slots, selectedSlot.startTime, parseInt(duration));
    return selectedSlots?.reduce((sum, slot) => sum + slot.price, 0) || 0;
  }, [selectedSlot, duration, slots]);

  const handleProceedToPayment = () => {
    if (!turf || !selectedSlot) return;

    const finalEndTime = formatMinutes(toMinutes(selectedSlot.startTime) + parseInt(duration));

    const bookingData = {
      turfId: turf.id,
      turfName: turf.name,
      turfAddress: turf.address,
      date: format(selectedDate, "yyyy-MM-dd"),
      startTime: selectedSlot.startTime,
      endTime: finalEndTime,
      duration: parseInt(duration),
      totalAmount: totalPrice,
      slotId: selectedSlot.id,
    };
    
    sessionStorage.setItem("pendingBooking", JSON.stringify(bookingData));
    setLocation("/payment");
  };

  const handleDurationChange = (newDuration: string) => {
    setDuration(newDuration);
    if (selectedSlot && slots) {
      if (!getSlotsForRange(slots, selectedSlot.startTime, parseInt(newDuration))) {
        toast({
          title: "Booking Conflict",
          description: "The new duration overlaps with already booked or blocked time. Please select another time or duration.",
          variant: "destructive",
        });
        setSelectedSlot(null);
      }
    }
  };

  const handleShare = async () => {
    if (!turf) return;
    const url = window.location.href;
    const shareData = {
      title: turf.name,
      text: `Check out ${turf.name} on QuickTurf!`,
      url: url,
    };

    try {
      if (navigator.share && navigator.canShare && navigator.canShare(shareData)) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(url);
        toast({ title: "Link Copied!", description: "Turf link copied to clipboard." });
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
         await navigator.clipboard.writeText(url);
         toast({ title: "Link Copied!", description: "Turf link copied to clipboard." });
      }
    }
  };

  const handleSelectSlot = (slot: TimeSlot) => {
    if (slots) {
      if (!getSlotsForRange(slots, slot.startTime, parseInt(duration))) {
        toast({
          title: "Booking Conflict",
          description: "The selected duration overlaps with already booked or blocked time. Please select another time or a shorter duration.",
          variant: "destructive",
        });
        return;
      }
    }
    setSelectedSlot(slot);
  };

  if (turfLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Skeleton className="h-64 w-full" />
        <div className="px-4 py-6 space-y-4">
          <Skeleton className="h-8 w-2/3" />
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-32 w-full" />
        </div>
      </div>
    );
  }

  if (!turf) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-foreground mb-2">Turf not found</h2>
          <Button onClick={() => setLocation("/")}>Go Home</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-28">
      {/* Hero Image */}
      <div className="relative h-64">
        <img
          src={turf.imageUrl}
          alt={turf.name}
          className="w-full h-full object-cover"
          data-testid="img-turf-hero"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />
        
        {/* Header */}
        <header className="absolute top-0 left-0 right-0 flex items-center justify-between p-4">
          <Button 
            size="icon" 
            variant="secondary"
            className="bg-black/40 backdrop-blur-sm border-none"
            onClick={() => setLocation("/")}
            data-testid="button-back"
          >
            <ArrowLeft className="w-5 h-5 text-white" />
          </Button>
          
          <Button 
            size="icon" 
            variant="secondary"
            className="bg-black/40 backdrop-blur-sm border-none"
            data-testid="button-share"
            onClick={handleShare}
          >
            <Share2 className="w-5 h-5 text-white" />
          </Button>
        </header>
      </div>

      <main className="px-4 -mt-12 relative z-10 space-y-6">
        {/* Turf Details */}
        <section className="space-y-3" data-testid="section-turf-details">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-bold text-foreground">{turf.name}</h1>
              <div className="flex items-center gap-2 text-muted-foreground mt-1">
                <MapPin className="w-4 h-4" />
                <span className="text-sm">{turf.location}</span>
              </div>
            </div>
            
            <div className="flex items-center gap-1 bg-card px-3 py-1.5 rounded-full">
              <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
              <span className="font-semibold">{turf.rating}</span>
            </div>
          </div>
          
          <div className="flex gap-2 flex-wrap">
            {turf.sportTypes.map((sport) => (
              <Badge key={sport} variant="secondary">{sport}</Badge>
            ))}
          </div>
        </section>

        {/* Amenities */}
        <Card className="p-4" data-testid="card-amenities">
          <h3 className="font-semibold text-foreground mb-3">Amenities</h3>
          <div className="flex gap-4 overflow-x-auto scrollbar-hide">
            {turf.amenities.map((amenity) => {
              const Icon = amenityIcons[amenity] || Clock;
              return (
                <div 
                  key={amenity} 
                  className="flex flex-col items-center gap-2 min-w-[72px]"
                >
                  <div className="w-12 h-12 rounded-xl bg-secondary flex items-center justify-center">
                    <Icon className="w-5 h-5 text-foreground" />
                  </div>
                  <span className="text-xs text-muted-foreground text-center">{amenity}</span>
                </div>
              );
            })}
          </div>
        </Card>

        {/* Date Selector */}
        <Card className="p-4" data-testid="card-date">
          <DateSelector 
            selectedDate={selectedDate} 
            onSelectDate={(date) => {
              setSelectedDate(date);
              setSelectedSlot(null);
            }} 
          />
        </Card>

        {/* Duration Selector */}
        <Card className="p-4" data-testid="card-duration">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-foreground">Duration</h3>
              <p className="text-sm text-muted-foreground">Select playing time</p>
            </div>
            <Select value={duration} onValueChange={handleDurationChange}>
              <SelectTrigger className="w-32" data-testid="select-duration">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="60">1 hour</SelectItem>
                <SelectItem value="90">1.5 hours</SelectItem>
                <SelectItem value="120">2 hours</SelectItem>
                <SelectItem value="150">2.5 hours</SelectItem>
                <SelectItem value="180">3 hours</SelectItem>
                <SelectItem value="210">3.5 hours</SelectItem>
                <SelectItem value="240">4 hours</SelectItem>
                <SelectItem value="270">4.5 hours</SelectItem>
                <SelectItem value="300">5 hours</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </Card>

        {/* Time Slots */}
        <Card className="p-4" data-testid="card-timeslots">
          <h3 className="font-semibold text-foreground mb-4">Select Time Slot</h3>
          {slotsLoading ? (
            <div className="space-y-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="space-y-2">
                  <Skeleton className="h-5 w-24" />
                  <div className="grid grid-cols-3 gap-2">
                    {Array.from({ length: 3 }).map((_, j) => (
                      <Skeleton key={j} className="h-16" />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : slots && slots.length > 0 ? (
            <TimeSlotGrid
              slots={slots}
              selectedSlotId={selectedSlot?.id || null}
              onSelectSlot={handleSelectSlot}
              duration={parseInt(duration)}
            />
          ) : (
            <div className="text-center py-8">
              <Clock className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
              <p className="text-muted-foreground">No slots available for this date</p>
            </div>
          )}
        </Card>
      </main>

      {/* Fixed Bottom CTA */}
      <div className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur-lg border-t border-border p-4 z-50">
        <div className="flex items-center justify-between max-w-lg mx-auto">
          <div>
            <p className="text-sm text-muted-foreground">Total Amount</p>
            <p className="text-2xl font-bold text-foreground">
              {selectedSlot ? <><span>{"\u20b9"}</span>{totalPrice}</> : "Select a slot"}
            </p>
          </div>
          <Button 
            size="lg"
            disabled={!selectedSlot}
            onClick={handleProceedToPayment}
            className="px-8 green-glow"
            data-testid="button-proceed-payment"
          >
            Proceed to Payment
          </Button>
        </div>
      </div>
    </div>
  );
}
