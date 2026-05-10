import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { ArrowLeft, CreditCard, Smartphone, Wallet, Shield, ChevronDown, ChevronUp, Info, MapPin, Navigation } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { estimateTravelMinutes, getRecommendedLeaveAt, requestBrowserLocation } from "@/lib/travelEstimate";
import type { Booking } from "@shared/schema";

interface PendingBooking {
  turfId: string;
  turfName: string;
  turfAddress: string;
  date: string;
  startTime: string;
  endTime: string;
  duration: number;
  totalAmount: number;
  slotId: string;
}

const paymentMethods = [
  { id: "upi", label: "UPI", icon: Smartphone, description: "Pay using any UPI app" },
  { id: "card", label: "Card", icon: CreditCard, description: "Credit or Debit card" },
  { id: "wallet", label: "Wallet", icon: Wallet, description: "Paytm, PhonePe, etc." },
];

export default function Payment() {
  const [, setLocation] = useLocation();
  const [pendingBooking, setPendingBooking] = useState<PendingBooking | null>(null);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState("upi");
  const [promoCode, setPromoCode] = useState("");
  const [promoExpanded, setPromoExpanded] = useState(false);
  const [appliedPromo, setAppliedPromo] = useState<{ code: string; discountAmount: number } | null>(null);
  const [isApplyingPromo, setIsApplyingPromo] = useState(false);
  const [distanceKm, setDistanceKm] = useState("");
  const [mapEstimateSource, setMapEstimateSource] = useState<"manual" | "openrouteservice" | "osrm" | null>(null);
  const [isEstimatingTravel, setIsEstimatingTravel] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const stored = sessionStorage.getItem("pendingBooking");
    if (stored) {
      setPendingBooking(JSON.parse(stored));
    } else {
      setLocation("/");
    }
  }, [setLocation]);

  const createBookingMutation = useMutation({
    mutationFn: async (bookingData: any) => {
      const idempotencyKey = typeof crypto !== 'undefined' && crypto.randomUUID 
        ? crypto.randomUUID() 
        : Date.now().toString(36) + Math.random().toString(36).substring(2);
      const holdResponse = await apiRequest("POST", "/api/payment-holds", {
        ...bookingData,
        idempotencyKey,
      });
      const hold = await holdResponse.json() as { holdId: string; expiresAt: string };
      const confirmationResponse = await apiRequest("POST", `/api/payments/mock-confirm/${hold.holdId}`);
      return await confirmationResponse.json() as Booking;
    },
    onSuccess: (booking) => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/my-bookings"] });
      sessionStorage.removeItem("pendingBooking");
      sessionStorage.setItem("confirmedBooking", JSON.stringify(booking));
      setLocation("/confirmation");
    },
    onError: (error: Error) => {
      toast({
        title: "Booking Failed",
        description: error.name === "409"
          ? "This time slot is booked or temporarily held. Please choose another slot."
          : error.message,
        variant: "destructive",
      });
    },
  });

  if (!pendingBooking) {
    return null;
  }

  const discountAmount = appliedPromo?.discountAmount || 0;
  const finalTotalAmount = Math.max(0, pendingBooking.totalAmount - discountAmount);
  const payNowAmount = Math.round(finalTotalAmount * 0.3);
  const payAtVenueAmount = finalTotalAmount - payNowAmount;
  const parsedDistanceKm = Number(distanceKm);
  const travelEtaMinutes = estimateTravelMinutes(parsedDistanceKm);
  const recommendedLeaveAt = getRecommendedLeaveAt(
    pendingBooking.date,
    pendingBooking.startTime,
    travelEtaMinutes
  );

  const handlePayment = () => {
    const bookingCode = `TT${Date.now().toString(36).toUpperCase()}`;
    
    const bookingData = {
      turfId: pendingBooking.turfId,
      turfName: pendingBooking.turfName,
      turfAddress: pendingBooking.turfAddress,
      date: pendingBooking.date,
      startTime: pendingBooking.startTime,
      endTime: pendingBooking.endTime,
      duration: pendingBooking.duration,
      totalAmount: finalTotalAmount,
      paidAmount: payNowAmount,
      balanceAmount: payAtVenueAmount,
      paymentMethod: selectedPaymentMethod,
      status: "pending_payment",
      bookingCode,
      promoCode: appliedPromo?.code || null,
      discountAmount,
      travelDistanceKm: parsedDistanceKm > 0 ? Math.round(parsedDistanceKm) : null,
      travelEtaMinutes: travelEtaMinutes > 0 ? travelEtaMinutes : null,
      recommendedLeaveAt,
    };

    createBookingMutation.mutate(bookingData);
  };

  const handleEstimateFromLocation = async () => {
    setIsEstimatingTravel(true);
    try {
      const origin = await requestBrowserLocation();
      const res = await apiRequest("POST", "/api/travel/estimate", {
        destination: pendingBooking.turfAddress,
        origin,
      });
      const estimate = await res.json() as { distanceKm: number | null; etaMinutes: number | null; source: "openrouteservice" | "osrm" | "manual" | "unavailable" };
      if (!estimate.distanceKm || !estimate.etaMinutes) {
        toast({
          title: "Map estimate unavailable",
          description: "Add OPENROUTESERVICE_API_KEY for best results, or enter distance manually for now.",
          variant: "destructive",
        });
        return;
      }
      setDistanceKm(String(estimate.distanceKm));
      setMapEstimateSource(estimate.source === "openrouteservice" || estimate.source === "osrm" ? estimate.source : "manual");
    } catch (error: any) {
      toast({ title: "Location not available", description: error.message, variant: "destructive" });
    } finally {
      setIsEstimatingTravel(false);
    }
  };

  const handleApplyPromo = async () => {
    if (!promoCode.trim()) return;
    setIsApplyingPromo(true);
    try {
      const res = await apiRequest("POST", "/api/promos/validate", {
        code: promoCode,
        bookingAmount: pendingBooking.totalAmount,
      });
      const promo = await res.json() as { code: string; discountAmount: number };
      setAppliedPromo(promo);
      toast({ title: "Promo applied", description: `${promo.code} saved ₹${promo.discountAmount}` });
    } catch (error: any) {
      setAppliedPromo(null);
      toast({ title: "Promo failed", description: error.message, variant: "destructive" });
    } finally {
      setIsApplyingPromo(false);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-28">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-lg border-b border-border">
        <div className="flex items-center gap-4 px-4 py-3">
          <Button 
            size="icon" 
            variant="ghost"
            onClick={() => setLocation(`/booking/${pendingBooking.turfId}`)}
            data-testid="button-back"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-lg font-semibold">Payment</h1>
        </div>
      </header>

      <main className="px-4 py-6 space-y-6">
        {/* Booking Summary */}
        <Card className="p-4" data-testid="card-booking-summary">
          <h2 className="font-semibold text-foreground mb-4">Booking Summary</h2>
          
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Turf</span>
              <span className="font-medium text-foreground">{pendingBooking.turfName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Date</span>
              <span className="font-medium text-foreground">{pendingBooking.date}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Time</span>
              <span className="font-medium text-foreground">
                {pendingBooking.startTime} - {pendingBooking.endTime}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Duration</span>
              <span className="font-medium text-foreground">{pendingBooking.duration} mins</span>
            </div>
            
            <Separator className="my-3" />
            
            {discountAmount > 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Promo Discount</span>
                <span className="font-medium text-primary">-₹{discountAmount}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="font-semibold text-foreground">Total Amount</span>
              <span className="font-bold text-xl text-foreground">₹{finalTotalAmount}</span>
            </div>
          </div>
        </Card>

        {/* Payment Split */}
        <Card className="p-4" data-testid="card-payment-split">
          <div className="flex items-center gap-2 mb-4">
            <h2 className="font-semibold text-foreground">Payment Split</h2>
            <div className="relative group">
              <Info className="w-4 h-4 text-muted-foreground cursor-help" />
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-primary/10 border border-primary/30 rounded-xl p-4 text-center">
              <span className="text-sm text-muted-foreground">Pay Now</span>
              <p className="text-2xl font-bold text-primary mt-1">₹{payNowAmount}</p>
              <span className="text-xs text-muted-foreground">30% of total</span>
            </div>
            
            <div className="bg-card rounded-xl p-4 text-center">
              <span className="text-sm text-muted-foreground">Pay at Venue</span>
              <p className="text-2xl font-bold text-foreground mt-1">₹{payAtVenueAmount}</p>
              <span className="text-xs text-muted-foreground">70% balance</span>
            </div>
          </div>
          
          <div className="mt-4 p-3 bg-secondary/50 rounded-lg">
            <p className="text-xs text-muted-foreground text-center">
              Pay a small amount now to confirm your booking. The remaining balance can be paid at the venue.
            </p>
          </div>
        </Card>

        <Card className="p-4" data-testid="card-trip-planner">
          <div className="flex items-center gap-2 mb-3">
            <MapPin className="w-4 h-4 text-primary" />
            <h2 className="font-semibold text-foreground">Trip Reminder</h2>
          </div>
          <div className="space-y-3">
            <Input
              value={distanceKm}
              onChange={(event) => {
                setDistanceKm(event.target.value.replace(/[^\d.]/g, ""));
                setMapEstimateSource("manual");
              }}
              placeholder="Distance from you to turf (km)"
              inputMode="decimal"
              data-testid="input-distance-km"
            />
            <Button
              type="button"
              variant="outline"
              onClick={handleEstimateFromLocation}
              disabled={isEstimatingTravel}
              data-testid="button-estimate-location"
            >
              <Navigation className="w-4 h-4 mr-2" />
              {isEstimatingTravel ? "Estimating..." : "Use my location"}
            </Button>
            {travelEtaMinutes > 0 && recommendedLeaveAt && (
              <div className="rounded-lg bg-secondary/60 px-3 py-2 text-sm">
                <p className="text-foreground font-medium">Estimated travel: {travelEtaMinutes} min</p>
                <p className="text-muted-foreground text-xs mt-0.5">
                  {mapEstimateSource === "openrouteservice"
                    ? "Calculated with OpenRouteService."
                    : mapEstimateSource === "osrm"
                      ? "Calculated with free OSRM routing."
                      : "Manual distance estimate."}
                </p>
              </div>
            )}
          </div>
        </Card>

        {/* Payment Methods */}
        <Card className="p-4" data-testid="card-payment-methods">
          <h2 className="font-semibold text-foreground mb-4">Payment Method</h2>
          
          <div className="space-y-3">
            {paymentMethods.map((method) => (
              <button
                key={method.id}
                onClick={() => setSelectedPaymentMethod(method.id)}
                className={cn(
                  "w-full flex items-center gap-4 p-4 rounded-xl transition-all",
                  selectedPaymentMethod === method.id
                    ? "bg-primary/10 ring-2 ring-primary"
                    : "bg-card hover-elevate"
                )}
                data-testid={`payment-method-${method.id}`}
              >
                <div className={cn(
                  "w-12 h-12 rounded-xl flex items-center justify-center",
                  selectedPaymentMethod === method.id ? "bg-primary" : "bg-secondary"
                )}>
                  <method.icon className={cn(
                    "w-6 h-6",
                    selectedPaymentMethod === method.id ? "text-primary-foreground" : "text-foreground"
                  )} />
                </div>
                
                <div className="flex-1 text-left">
                  <p className={cn(
                    "font-semibold",
                    selectedPaymentMethod === method.id ? "text-primary" : "text-foreground"
                  )}>
                    {method.label}
                  </p>
                  <p className="text-sm text-muted-foreground">{method.description}</p>
                </div>
                
                <div className={cn(
                  "w-5 h-5 rounded-full border-2 flex items-center justify-center",
                  selectedPaymentMethod === method.id ? "border-primary" : "border-muted"
                )}>
                  {selectedPaymentMethod === method.id && (
                    <div className="w-2.5 h-2.5 rounded-full bg-primary" />
                  )}
                </div>
              </button>
            ))}
          </div>
        </Card>

        {/* Promo Code */}
        <Card className="overflow-hidden" data-testid="card-promo">
          <button
            onClick={() => setPromoExpanded(!promoExpanded)}
            className="w-full flex items-center justify-between p-4"
          >
            <span className="font-semibold text-foreground">Have a promo code?</span>
            {promoExpanded ? (
              <ChevronUp className="w-5 h-5 text-muted-foreground" />
            ) : (
              <ChevronDown className="w-5 h-5 text-muted-foreground" />
            )}
          </button>
          
          {promoExpanded && (
            <div className="px-4 pb-4 animate-fade-in">
              <div className="flex gap-2">
                <Input
                  placeholder="Enter promo code"
                  value={promoCode}
                  onChange={(e) => setPromoCode(e.target.value)}
                  className="flex-1"
                  data-testid="input-promo"
                />
                <Button
                  variant="secondary"
                  data-testid="button-apply-promo"
                  onClick={handleApplyPromo}
                  disabled={isApplyingPromo || !promoCode.trim()}
                >
                  {isApplyingPromo ? "Checking..." : "Apply"}
                </Button>
              </div>
              {appliedPromo && (
                <p className="text-xs text-primary mt-2">
                  {appliedPromo.code} applied. You saved ₹{appliedPromo.discountAmount}.
                </p>
              )}
            </div>
          )}
        </Card>
      </main>

      {/* Fixed Bottom CTA */}
      <div className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur-lg border-t border-border p-4 z-50">
        <div className="max-w-lg mx-auto space-y-3">
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Shield className="w-4 h-4" />
            <span>Secure Payment via QuickTurf</span>
          </div>
          
          <Button 
            size="lg"
            className="w-full green-glow"
            onClick={handlePayment}
            disabled={createBookingMutation.isPending}
            data-testid="button-pay-now"
          >
            {createBookingMutation.isPending ? (
              <span className="flex items-center gap-2">
                <div className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                Processing...
              </span>
            ) : (
              `Pay ₹${payNowAmount} Now`
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
