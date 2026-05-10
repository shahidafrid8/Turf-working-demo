import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Check, Calendar, Clock, MapPin, Download, Home, Copy, Loader2, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { TurfTimeLogo } from "@/components/TurfTimeLogo";
import logoImg from "@assets/image_1774343851801.png";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import { formatLeaveAt, getDirectionsUrl } from "@/lib/travelEstimate";
import type { Booking } from "@shared/schema";

// ── Inline Review Form ──────────────────────────────────────────────────────
function ReviewSection({ turfId }: { turfId: string }) {
  const [rating, setRating] = useState(0);
  const [hovered, setHovered] = useState(0);
  const [comment, setComment] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async () => {
    if (!rating) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/turfs/${turfId}/reviews`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ rating, comment: comment.trim() || undefined }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || "Failed to submit review");
      }
      setSubmitted(true);
      toast({ title: "Review submitted!", description: "Thanks for sharing your experience." });
    } catch (err: any) {
      toast({ title: "Couldn't submit", description: err.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <Card className="p-5 animate-slide-up" data-testid="card-review-success">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary/15 flex items-center justify-center shrink-0">
            <Check className="w-5 h-5 text-primary" />
          </div>
          <div>
            <p className="font-semibold text-foreground">Review submitted!</p>
            <p className="text-sm text-muted-foreground">Thanks for your feedback.</p>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-5 animate-slide-up space-y-4" data-testid="card-review-form">
      <div>
        <h3 className="font-semibold text-foreground">Rate Your Experience</h3>
        <p className="text-sm text-muted-foreground mt-0.5">Help other players make better choices</p>
      </div>

      {/* Stars */}
      <div className="flex gap-2" data-testid="star-rating-row">
        {[1, 2, 3, 4, 5].map(s => (
          <button
            key={s}
            data-testid={`star-${s}`}
            onClick={() => setRating(s)}
            onMouseEnter={() => setHovered(s)}
            onMouseLeave={() => setHovered(0)}
            className="transition-transform hover:scale-110"
          >
            <Star className={cn(
              "w-9 h-9 transition-colors",
              s <= (hovered || rating) ? "text-yellow-400 fill-yellow-400" : "text-muted-foreground"
            )} />
          </button>
        ))}
      </div>
      {rating > 0 && (
        <p className="text-sm text-muted-foreground -mt-1">
          {["", "Poor", "Fair", "Good", "Very Good", "Excellent"][rating]}
        </p>
      )}

      {/* Comment */}
      <textarea
        data-testid="review-comment"
        value={comment}
        onChange={e => setComment(e.target.value)}
        placeholder="Share your experience... (optional)"
        rows={3}
        className="w-full bg-secondary border border-border rounded-lg p-3 text-sm text-foreground resize-none focus:outline-none focus:border-primary transition-colors"
      />

      <Button
        data-testid="button-submit-review"
        onClick={handleSubmit}
        disabled={!rating || submitting}
        className="w-full"
      >
        {submitting ? (
          <><Loader2 className="w-4 h-4 animate-spin mr-2" />Submitting…</>
        ) : "Submit Review"}
      </Button>
    </Card>
  );
}

export default function Confirmation() {
  const [, setLocation] = useLocation();
  const [booking, setBooking] = useState<Booking | null>(null);
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    const stored = sessionStorage.getItem("confirmedBooking");
    if (stored) {
      setBooking(JSON.parse(stored));
    } else {
      setLocation("/");
    }
  }, [setLocation]);

  const copyBookingCode = () => {
    if (booking) {
      navigator.clipboard.writeText(booking.bookingCode);
      toast({ title: "Copied!", description: "Booking code copied to clipboard" });
    }
  };

  const copyVerificationCode = () => {
    if (booking?.verificationCode) {
      navigator.clipboard.writeText(booking.verificationCode);
      toast({ title: "Copied!", description: "Verification code copied" });
    }
  };

  const downloadReceipt = () => {
    if (!booking) return;
    const w = window.open("", "_blank");
    if (!w) return;
    const isFullyPaid = booking.balanceAmount === 0;
    
    w.document.write(`<!DOCTYPE html><html><head>
      <title>Payment Receipt - ${booking.bookingCode}</title>
      <style>
        body { font-family: sans-serif; padding: 40px; color: #e2e8f0; border-radius: 8px; background-color: #0f172a; max-width: 600px; margin: 20px auto; }
        .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #334155; padding-bottom: 20px; }
        .header img { height: 48px; margin-bottom: 10px; }
        .header p { margin: 0; color: #94a3b8; font-size: 14px; margin-bottom: 4px; }
        .row { display: flex; justify-content: space-between; margin-bottom: 15px; border-bottom: 1px solid #1e293b; padding-bottom: 10px; }
        .total-row { display: flex; justify-content: space-between; font-weight: bold; font-size: 18px; margin-top: 20px; padding-top: 15px; border-top: 2px solid #475569; }
        .paid-row { display: flex; justify-content: space-between; color: ${isFullyPaid ? '#22c55e' : '#e2e8f0'}; margin-top: 10px; }
        .balance-row { display: flex; justify-content: space-between; font-weight: bold; color: ${isFullyPaid ? '#22c55e' : '#ef4444'}; margin-top: 10px; }
        .footer { text-align: center; margin-top: 40px; padding-top: 20px; border-top: 1px solid #1e293b; color: #64748b; font-size: 12px; }
        .btn { margin-top: 30px; padding: 12px 20px; background: #22c55e; color: #fff; border: none; border-radius: 6px; cursor: pointer; font-size: 15px; display: block; width: 100%; text-align: center; font-weight: bold; text-decoration: none; transition: background 0.2s; }
        .btn:hover { background: #16a34a; }
        @media print { 
          .btn { display: none; } 
          body { padding: 0; background-color: #ffffff; color: #111111; margin: 0; max-width: 100%; } 
          .header { border-bottom: 2px solid #eeeeee; }
          .header p { color: #555555; }
          .row { border-bottom: 1px solid #eeeeee; color: #333333; }
          .total-row { border-top: 2px solid #333333; color: #111111; }
          .paid-row { color: ${isFullyPaid ? '#16a34a' : '#333333'}; }
          .footer { border-top: 1px solid #eeeeee; color: #888888; }
          strong { color: #111111 !important; }
        }
      </style>
    </head><body>
      <div class="header">
        <img src="${window.location.origin}${logoImg}" alt="QuickTurf" />
        <p>Receipt for Booking ID: <strong style="color: #f8fafc">${booking.bookingCode}</strong></p>
        <p>Issued on: ${new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" })}</p>
      </div>
      
      <div class="row"><span>Turf Name</span><span style="font-weight:600">${booking.turfName}</span></div>
      <div class="row"><span>Address</span><span style="text-align:right; max-width: 60%">${booking.turfAddress}</span></div>
      <div class="row"><span>Date & Time</span><span style="font-weight:600">${booking.date} &middot; ${booking.startTime}</span></div>
      
      <div class="total-row"><span>Total Amount</span><span>₹${booking.totalAmount}</span></div>
      <div class="paid-row"><span>${isFullyPaid ? 'Amount Paid' : 'Paid Online'}</span><span>₹${booking.paidAmount}</span></div>
      <div class="balance-row">
        <span>${isFullyPaid ? 'Balance Due' : 'Balance Due at Venue'}</span>
        <span>${isFullyPaid ? '₹0 (Fully Paid)' : `₹${booking.balanceAmount}`}</span>
      </div>
      
      <button class="btn" onclick="window.print()">Print / Save as PDF</button>

      <div class="footer">
        <p>Powered by <strong>Solvify Technologies Pvt. Ltd.</strong></p>
      </div>
    </body></html>`);
    w.document.close();
  };

  if (!booking) return null;

  return (
    <div className="min-h-screen bg-background pb-8 relative">
      <header className="absolute top-0 left-0 p-4 z-10">
        <Button
          variant="ghost"
          onClick={() => setLocation("/")}
          title="Go to Home"
          className="p-2 h-auto hover:bg-secondary/50 rounded-full"
        >
          <Home className="w-8 h-8 text-foreground" />
        </Button>
      </header>

      {/* Success Animation */}
      <div className="flex flex-col items-center justify-center pt-16 pb-8 px-4">
        <div className="relative mb-6">
          <div className="absolute inset-0 w-28 h-28 rounded-full bg-primary/20 animate-success-pulse" />
          <div className="relative w-28 h-28 rounded-full bg-primary flex items-center justify-center animate-circle-expand green-glow">
            <svg className="w-14 h-14 text-primary-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path className="animate-draw-check" strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
          </div>
        </div>
        <h1 className="text-2xl font-bold text-foreground text-center animate-fade-in">Booking Confirmed!</h1>
        <p className="text-muted-foreground text-center mt-2 animate-fade-in">Your turf has been successfully booked</p>
      </div>

      <main className="px-4 space-y-6" data-testid="section-confirmation">
        {/* Booking Details Card */}
        <Card className="p-5 animate-slide-up" data-testid="card-booking-details">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm text-muted-foreground">Booking ID</p>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-lg font-bold text-primary">{booking.bookingCode}</span>
                <button onClick={copyBookingCode} className="p-1 hover-elevate rounded" data-testid="button-copy-code">
                  <Copy className="w-4 h-4 text-muted-foreground" />
                </button>
              </div>
            </div>
            <TurfTimeLogo size="sm" showText={false} />
          </div>

          <Separator className="my-4" />

          <div className="space-y-4">
            <div>
              <h3 className="font-semibold text-foreground text-lg">{booking.turfName}</h3>
              <div className="flex items-center gap-2 text-muted-foreground text-sm mt-1">
                <MapPin className="w-4 h-4" />
                <span>{booking.turfAddress}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center">
                  <Calendar className="w-5 h-5 text-foreground" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Date</p>
                  <p className="font-medium text-foreground">{booking.date}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center">
                  <Clock className="w-5 h-5 text-foreground" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Time</p>
                  <p className="font-medium text-foreground">{booking.startTime}</p>
                </div>
              </div>
            </div>
          </div>

          <Separator className="my-4" />

          <div className="flex flex-col items-center py-4">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Venue Verification Code</p>
            <button
              type="button"
              onClick={copyVerificationCode}
              className="mt-2 flex items-center gap-2 rounded-xl bg-primary/10 px-5 py-3 text-primary hover:bg-primary/15 transition-colors"
              data-testid="button-copy-verification-code"
            >
              <span className="text-4xl font-black tracking-[0.35em] leading-none">
                {booking.verificationCode}
              </span>
              <Copy className="w-4 h-4" />
            </button>
            <p className="text-sm text-muted-foreground mt-3 text-center">
              Tell this 4-digit number at the turf. The turf team will verify it.
            </p>
          </div>
        </Card>

        {(booking.travelEtaMinutes || booking.recommendedLeaveAt) && (
          <Card className="p-5 animate-slide-up" style={{ animationDelay: "75ms" }} data-testid="card-trip-reminder">
            <h3 className="font-semibold text-foreground mb-3">Trip Reminder</h3>
            <div className="space-y-2 text-sm">
              {booking.travelDistanceKm ? (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Distance</span>
                  <span className="font-medium text-foreground">{booking.travelDistanceKm} km</span>
                </div>
              ) : null}
              {booking.travelEtaMinutes ? (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Estimated travel</span>
                  <span className="font-medium text-foreground">{booking.travelEtaMinutes} min</span>
                </div>
              ) : null}
              {booking.recommendedLeaveAt ? (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Start moving by</span>
                  <span className="font-medium text-foreground">{formatLeaveAt(booking.recommendedLeaveAt)}</span>
                </div>
              ) : null}
            </div>
            <Button
              variant="outline"
              className="w-full mt-4"
              onClick={() => window.open(getDirectionsUrl(booking), "_blank", "noopener,noreferrer")}
              data-testid="button-open-directions"
            >
              <MapPin className="w-4 h-4 mr-2" />
              Open Directions
            </Button>
          </Card>
        )}

        {/* Payment Summary */}
        <Card className="p-5 animate-slide-up" style={{ animationDelay: "100ms" }} data-testid="card-payment-summary">
          <h3 className="font-semibold text-foreground mb-4">Payment Summary</h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total Amount</span>
              <span className="font-medium text-foreground">₹{booking.totalAmount}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">{booking.balanceAmount === 0 ? "Amount Paid" : "Paid Online"}</span>
              <span className="font-medium text-primary">₹{booking.paidAmount}</span>
            </div>
            {booking.balanceAmount > 0 ? (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Balance Due at Venue</span>
                <span className="font-medium text-foreground">₹{booking.balanceAmount}</span>
              </div>
            ) : (
              <div className="flex justify-between mt-2 pt-2 border-t border-border">
                <span className="text-green-500 font-semibold flex items-center gap-1.5">
                  <Check className="w-4 h-4" /> Fully Paid
                </span>
                <span className="font-medium text-green-500">₹0</span>
              </div>
            )}
          </div>
        </Card>

        {/* Review Section — only show if user is logged in */}
        {user && (booking as any).turfId && (
          <div style={{ animationDelay: "150ms" }}>
            <ReviewSection turfId={(booking as any).turfId} />
          </div>
        )}

        {/* Actions */}
        <div className="space-y-3 animate-slide-up" style={{ animationDelay: "200ms" }}>
          <Button className="w-full green-glow" size="lg" onClick={() => setLocation("/bookings")} data-testid="button-view-details">
            <Calendar className="w-5 h-5 mr-2" />
            View Booking Details
          </Button>
          <Button variant="outline" className="w-full" size="lg" onClick={() => setLocation("/")} data-testid="button-book-another">
            <Home className="w-5 h-5 mr-2" />
            Book Another Turf
          </Button>
        </div>

        <div className="flex justify-center pt-2 animate-fade-in" style={{ animationDelay: "300ms" }}>
          <Button variant="ghost" className="text-primary" onClick={downloadReceipt} data-testid="button-download-receipt">
            <Download className="w-4 h-4 mr-2" />
            Download Receipt
          </Button>
        </div>
      </main>
    </div>
  );
}
