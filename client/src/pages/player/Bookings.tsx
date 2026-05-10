import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Calendar, Clock, MapPin, ChevronRight, Check, Star, MessageSquare, Navigation } from "lucide-react";
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import type { Booking } from "@shared/schema";
import { useSEO } from "@/lib/seo";
import { formatLeaveAt } from "@/lib/travelEstimate";

export default function Bookings() {
  useSEO({
    title: "My Bookings",
    description: "View and manage your Quick Turf bookings.",
  });

  const { user } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [selectedBookingForReview, setSelectedBookingForReview] = useState<Booking | null>(null);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");

  const { data: bookings, isLoading } = useQuery<Booking[]>({
    queryKey: ["/api/auth/my-bookings"],
    enabled: !!user,
  });

  const getBookingEndDateTime = (booking: Booking) => new Date(`${booking.date}T${booking.endTime}:00`);

  const isPastBooking = (booking: Booking) => new Date() >= getBookingEndDateTime(booking);

  const getDisplayStatus = (booking: Booking) => {
    if (booking.status === "cancelled") return "cancelled";
    if (isPastBooking(booking)) {
      if (booking.paidAmount < booking.totalAmount) return "not played";
      return "completed";
    }
    if (booking.paidAmount >= booking.totalAmount) return "paid";
    return "confirmed";
  };

  const upcomingBookings = bookings?.filter((b) => b.status !== "cancelled" && !isPastBooking(b)) || [];
  const pastBookings = bookings?.filter((b) => b.status !== "cancelled" && isPastBooking(b)) || [];

  const handleViewDetails = (booking: Booking) => {
    sessionStorage.setItem("confirmedBooking", JSON.stringify(booking));
    navigate("/confirmation");
  };

  const reviewMutation = useMutation({
    mutationFn: async (data: { bookingId: string; rating: number; comment: string }) => {
      const res = await fetch(`/api/auth/bookings/${data.bookingId}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating: data.rating, comment: data.comment }),
      });
      if (!res.ok) throw new Error((await res.json()).error || "Failed to submit review");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/my-bookings"] });
      setReviewModalOpen(false);
      toast({ title: "Review submitted!", description: "Thanks for your feedback." });
    },
    onError: (error: Error) => {
      toast({ title: "Submission failed", description: error.message, variant: "destructive" });
    }
  });

  const checkNeedsReview = (booking: Booking) => {
    if (booking.status === "cancelled" || booking.reviewPromptShown) return false;
    if (booking.paidAmount < booking.totalAmount) return false;
    const [endHour] = booking.endTime.split(":").map(Number);
    const bookingEndDt = new Date(`${booking.date}T${booking.endTime}:00`);
    bookingEndDt.setHours(endHour + 2);
    return new Date() >= bookingEndDt;
  };

  const BookingCard = ({ booking }: { booking: Booking }) => {
    const needsReview = checkNeedsReview(booking);
    const displayStatus = getDisplayStatus(booking);
    
    return (
    <div className="space-y-3">
    {needsReview && (
      <Card className="p-3 bg-gradient-to-r from-yellow-500/10 to-transparent border-yellow-500/20 cursor-pointer" 
        onClick={() => {
          setSelectedBookingForReview(booking);
          setRating(5);
          setComment("");
          setReviewModalOpen(true);
        }}>
        <div className="flex items-center gap-2">
          <Star className="w-5 h-5 text-yellow-500 fill-yellow-500" />
          <div className="flex-1">
            <h4 className="text-sm font-semibold text-yellow-600 dark:text-yellow-400">How was your game?</h4>
            <p className="text-xs text-muted-foreground">Leave a review for {booking.turfName}</p>
          </div>
          <ChevronRight className="w-4 h-4 text-muted-foreground" />
        </div>
      </Card>
    )}
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
          variant={displayStatus === "confirmed" ? "default" : "secondary"}
          className="capitalize"
        >
          {displayStatus}
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

      {(booking.travelEtaMinutes || booking.recommendedLeaveAt) && (
        <div className="mt-3 rounded-lg bg-secondary/70 px-3 py-2 text-xs text-muted-foreground">
          <div className="flex items-center justify-between gap-2">
            <span className="flex items-center gap-1.5">
              <Navigation className="w-3.5 h-3.5 text-primary" />
              {booking.travelEtaMinutes ? `${booking.travelEtaMinutes} min travel` : "Trip reminder"}
            </span>
            {booking.recommendedLeaveAt && (
              <span className="font-medium text-foreground">{formatLeaveAt(booking.recommendedLeaveAt)}</span>
            )}
          </div>
        </div>
      )}

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
    </div>
  );
  };

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

      {/* Review Modal */}
      <Dialog open={reviewModalOpen} onOpenChange={setReviewModalOpen}>
        <DialogContent className="sm:max-w-md w-[calc(100%-2rem)] rounded-xl p-0 overflow-hidden bg-card border-border">
          <div className="p-6">
            <DialogHeader className="mb-4">
              <DialogTitle className="text-xl">Rate your game 🏏</DialogTitle>
              <DialogDescription>
                How was your experience at {selectedBookingForReview?.turfName}?
              </DialogDescription>
            </DialogHeader>
            
            <div className="flex justify-center gap-2 mb-6">
              {[1, 2, 3, 4, 5].map((star) => (
                <button 
                  key={star} 
                  onClick={() => setRating(star)}
                  className="p-1 hover:scale-110 transition-transform focus:outline-none"
                >
                  <Star className={`w-10 h-10 ${rating >= star ? "text-yellow-400 fill-yellow-400" : "text-muted"}`} />
                </button>
              ))}
            </div>

            <div className="space-y-2 mb-6">
              <label className="text-sm font-medium flex items-center gap-2">
                <MessageSquare className="w-4 h-4" /> Add a comment (optional)
              </label>
              <Textarea 
                placeholder="The pitch was great, lighting was perfect..."
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                className="bg-background resize-none border-border"
                rows={3}
              />
            </div>

            <Button 
              className="w-full h-12 text-lg font-semibold"
              disabled={reviewMutation.isPending}
              onClick={() => {
                if (selectedBookingForReview) {
                  reviewMutation.mutate({ bookingId: selectedBookingForReview.id, rating, comment });
                }
              }}
            >
              {reviewMutation.isPending ? "Submitting..." : "Submit Review"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
