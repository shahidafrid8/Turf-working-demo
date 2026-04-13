import { useQuery } from "@tanstack/react-query";
import { Calendar, Clock, MapPin, ChevronRight, Check } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import type { Booking } from "@shared/schema";

export default function Bookings() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const { data: bookings, isLoading } = useQuery<Booking[]>({
    queryKey: ["/api/auth/my-bookings"],
    enabled: !!user,
  });

  const upcomingBookings = bookings?.filter((b) => b.status === "confirmed") || [];
  const pastBookings = bookings?.filter((b) => b.status === "completed") || [];

  const handleViewDetails = (booking: Booking) => {
    sessionStorage.setItem("confirmedBooking", JSON.stringify(booking));
    navigate("/confirmation");
  };

  const BookingCard = ({ booking }: { booking: Booking }) => (
    <Card
      className="p-4 hover-elevate cursor-pointer"
      data-testid={`card-booking-${booking.id}`}
      onClick={() => handleViewDetails(booking)}
    >
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="font-semibold text-foreground">{booking.turfName}</h3>
          <div className="flex items-center gap-1.5 text-muted-foreground text-sm mt-1">
            <MapPin className="w-3.5 h-3.5" />
            <span className="truncate">{booking.turfAddress}</span>
          </div>
        </div>
        <Badge 
          variant={booking.status === "confirmed" ? "default" : "secondary"}
          className="capitalize"
        >
          {booking.status}
        </Badge>
      </div>

      <div className="flex items-center gap-4 text-sm">
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <Calendar className="w-4 h-4" />
          <span>{booking.date}</span>
        </div>
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <Clock className="w-4 h-4" />
          <span>{booking.startTime}</span>
        </div>
      </div>

      <div className="flex items-center justify-between mt-4 pt-3 border-t border-border">
        <div className="flex flex-col">
          <div>
            <span className="text-sm text-muted-foreground">Total: </span>
            <span className="font-semibold text-foreground">₹{booking.totalAmount}</span>
          </div>
          {booking.balanceAmount > 0 ? (
            <span className="text-xs text-muted-foreground mt-0.5">Due: ₹{booking.balanceAmount}</span>
          ) : (
            <span className="text-xs text-green-500 font-medium mt-0.5 flex items-center gap-1">
              <Check className="w-3 h-3"/> Fully Paid
            </span>
          )}
        </div>
        <div className="flex items-center gap-1 text-primary text-sm font-medium">
          View Details
          <ChevronRight className="w-4 h-4" />
        </div>
      </div>
    </Card>
  );

  const EmptyState = ({ type }: { type: "upcoming" | "past" }) => (
    <div className="text-center py-12">
      <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-card flex items-center justify-center">
        <Calendar className="w-8 h-8 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-semibold text-foreground mb-2">
        No {type} bookings
      </h3>
      <p className="text-muted-foreground text-sm mb-4">
        {type === "upcoming" 
          ? "You don't have any upcoming bookings yet" 
          : "Your completed bookings will appear here"
        }
      </p>
      {type === "upcoming" && (
        <Link href="/">
          <a className="text-primary font-medium">Browse Turfs</a>
        </Link>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-lg border-b border-border px-4 py-4">
        <h1 className="text-xl font-bold text-foreground">My Bookings</h1>
      </header>

      <main className="px-4 py-6">
        <Tabs defaultValue="upcoming" className="w-full">
          <TabsList className="w-full grid grid-cols-2" data-testid="tabs-bookings">
            <TabsTrigger value="upcoming" data-testid="tab-upcoming">
              Upcoming
              {upcomingBookings.length > 0 && (
                <span className="ml-2 px-1.5 py-0.5 text-xs bg-primary text-primary-foreground rounded-full">
                  {upcomingBookings.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="past" data-testid="tab-past">Past</TabsTrigger>
          </TabsList>

          <TabsContent value="upcoming" className="mt-4 space-y-3">
            {isLoading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-36 rounded-xl" />
              ))
            ) : upcomingBookings.length === 0 ? (
              <EmptyState type="upcoming" />
            ) : (
              upcomingBookings.map((booking) => (
                <BookingCard key={booking.id} booking={booking} />
              ))
            )}
          </TabsContent>

          <TabsContent value="past" className="mt-4 space-y-3">
            {isLoading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-36 rounded-xl" />
              ))
            ) : pastBookings.length === 0 ? (
              <EmptyState type="past" />
            ) : (
              pastBookings.map((booking) => (
                <BookingCard key={booking.id} booking={booking} />
              ))
            )}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
