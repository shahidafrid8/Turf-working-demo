import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Check, Calendar, Clock, MapPin, Download, Home, Copy, QrCode } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { TurfTimeLogo } from "@/components/TurfTimeLogo";
import { useToast } from "@/hooks/use-toast";
import type { Booking } from "@shared/schema";

export default function Confirmation() {
  const [, setLocation] = useLocation();
  const [booking, setBooking] = useState<Booking | null>(null);
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
      toast({
        title: "Copied!",
        description: "Booking code copied to clipboard",
      });
    }
  };

  if (!booking) {
    return null;
  }

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
          {/* Outer glow ring */}
          <div className="absolute inset-0 w-28 h-28 rounded-full bg-primary/20 animate-success-pulse" />
          
          {/* Success circle */}
          <div className="relative w-28 h-28 rounded-full bg-primary flex items-center justify-center animate-circle-expand green-glow">
            <svg
              className="w-14 h-14 text-primary-foreground"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                className="animate-draw-check"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={3}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
        </div>

        <h1 className="text-2xl font-bold text-foreground text-center animate-fade-in">
          Booking Confirmed!
        </h1>
        <p className="text-muted-foreground text-center mt-2 animate-fade-in">
          Your turf has been successfully booked
        </p>
      </div>

      <main className="px-4 space-y-6" data-testid="section-confirmation">
        {/* Booking Details Card */}
        <Card className="p-5 animate-slide-up" data-testid="card-booking-details">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm text-muted-foreground">Booking ID</p>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-lg font-bold text-primary">{booking.bookingCode}</span>
                <button
                  onClick={copyBookingCode}
                  className="p-1 hover-elevate rounded"
                  data-testid="button-copy-code"
                >
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

          {/* QR Code Placeholder */}
          <div className="flex flex-col items-center py-4">
            <div className="w-32 h-32 bg-white rounded-xl flex items-center justify-center mb-3">
              <div className="w-28 h-28 bg-[repeating-conic-gradient(#000_0deg_90deg,#fff_90deg_180deg)] bg-[length:7px_7px] rounded-lg opacity-80" />
            </div>
            <p className="text-sm text-muted-foreground">Scan at venue for check-in</p>
          </div>
        </Card>

        {/* Payment Summary */}
        <Card className="p-5 animate-slide-up" style={{ animationDelay: "100ms" }} data-testid="card-payment-summary">
          <h3 className="font-semibold text-foreground mb-4">Payment Summary</h3>
          
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total Amount</span>
              <span className="font-medium text-foreground">₹{booking.totalAmount}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Paid Online</span>
              <span className="font-medium text-primary">₹{booking.paidAmount}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Balance Due at Venue</span>
              <span className="font-medium text-foreground">₹{booking.balanceAmount}</span>
            </div>
          </div>
        </Card>

        {/* Actions */}
        <div className="space-y-3 animate-slide-up" style={{ animationDelay: "200ms" }}>
          <Button 
            className="w-full green-glow" 
            size="lg"
            onClick={() => setLocation("/bookings")}
            data-testid="button-view-details"
          >
            <Calendar className="w-5 h-5 mr-2" />
            View Booking Details
          </Button>
          
          <Button 
            variant="outline" 
            className="w-full" 
            size="lg"
            onClick={() => setLocation("/")}
            data-testid="button-book-another"
          >
            <Home className="w-5 h-5 mr-2" />
            Book Another Turf
          </Button>
        </div>

        {/* Download Receipt */}
        <div className="flex justify-center pt-2 animate-fade-in" style={{ animationDelay: "300ms" }}>
          <Button 
            variant="ghost" 
            className="text-primary"
            data-testid="button-download-receipt"
          >
            <Download className="w-4 h-4 mr-2" />
            Download Receipt
          </Button>
        </div>
      </main>
    </div>
  );
}
