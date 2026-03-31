import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format, addDays, startOfToday } from "date-fns";
import {
  Clock, CheckCircle, XCircle, MapPin, Building2, Image as ImageIcon,
  LogOut, ChevronDown, ChevronUp, CalendarDays, ImagePlus, Loader2, Trash2, ShieldCheck,
  Phone, User, BookOpen, Receipt
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { Turf, TimeSlot } from "@shared/schema";

const DATE_COUNT = 14;
const today = startOfToday();
const dates = Array.from({ length: DATE_COUNT }, (_, i) => addDays(today, i));

const turfSchema = z.object({
  turfName: z.string().min(3, "Turf name must be at least 3 characters"),
  turfLocation: z.string().min(1, "Select your city"),
  turfAddress: z.string().min(5, "Full address is required"),
  turfPincode: z.string().regex(/^\d{6}$/, "Pincode must be exactly 6 digits"),
  turfLength: z.string().regex(/^\d+$/, "Enter a valid number").refine(v => parseInt(v) >= 1, "Must be at least 1 meter"),
  turfWidth: z.string().regex(/^\d+$/, "Enter a valid number").refine(v => parseInt(v) >= 1, "Must be at least 1 meter"),
});
type TurfFormValues = z.infer<typeof turfSchema>;

interface UploadedImage {
  url: string;
  previewUrl: string;
  name: string;
}

function SlotManagementPanel({ turf }: { turf: Turf }) {
  const [selectedDate, setSelectedDate] = useState(format(today, "yyyy-MM-dd"));
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: slots = [], isLoading } = useQuery<TimeSlot[]>({
    queryKey: ["/api/owner/turfs", turf.id, "slots", selectedDate],
    queryFn: async () => {
      const res = await fetch(`/api/owner/turfs/${turf.id}/slots/${selectedDate}`);
      if (!res.ok) throw new Error("Failed to fetch slots");
      return res.json();
    },
  });

  const blockMutation = useMutation({
    mutationFn: (slotId: string) => apiRequest("POST", `/api/owner/slots/${slotId}/block`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/owner/turfs", turf.id, "slots", selectedDate] });
    },
    onError: (err: any) => {
      toast({ title: "Cannot block slot", description: err.message || "This slot could not be blocked.", variant: "destructive" });
    },
  });

  const unblockMutation = useMutation({
    mutationFn: (slotId: string) => apiRequest("POST", `/api/owner/slots/${slotId}/unblock`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/owner/turfs", turf.id, "slots", selectedDate] });
    },
    onError: (err: any) => {
      toast({ title: "Cannot unblock slot", description: err.message || "Something went wrong.", variant: "destructive" });
    },
  });

  const handleSlotToggle = (slot: TimeSlot) => {
    if (slot.isBooked) return;
    if (slot.isBlocked) unblockMutation.mutate(slot.id);
    else blockMutation.mutate(slot.id);
  };

  const isPending = blockMutation.isPending || unblockMutation.isPending;
  const morningSlots = slots.filter(s => s.period === "morning");
  const afternoonSlots = slots.filter(s => s.period === "afternoon");
  const eveningSlots = slots.filter(s => s.period === "evening");
  const blockedCount = slots.filter(s => s.isBlocked).length;
  const bookedCount = slots.filter(s => s.isBooked).length;
  const availableCount = slots.filter(s => !s.isBooked && !s.isBlocked).length;

  const renderPeriod = (label: string, time: string, periodSlots: TimeSlot[]) => (
    <div className="space-y-2">
      <div>
        <p className="text-foreground font-medium text-sm">{label}</p>
        <p className="text-muted-foreground text-xs">{time}</p>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {periodSlots.map(slot => {
          const isBooked = slot.isBooked;
          const isBlocked = slot.isBlocked;
          const isAvailable = !isBooked && !isBlocked;
          return (
            <button
              key={slot.id}
              data-testid={`owner-slot-${slot.id}`}
              disabled={isBooked || isPending}
              onClick={() => handleSlotToggle(slot)}
              className={cn(
                "relative rounded-lg p-3 text-center transition-all duration-150",
                isBooked && "bg-secondary opacity-50 cursor-not-allowed",
                isBlocked && "bg-destructive/15 border border-destructive/40 cursor-pointer hover:bg-destructive/25",
                isAvailable && "bg-primary/10 border border-primary/30 cursor-pointer hover:bg-primary/20",
              )}
            >
              <p className={cn("text-xs font-semibold", isBooked && "text-muted-foreground", isBlocked && "text-destructive", isAvailable && "text-primary")}>
                {slot.startTime}
              </p>
              <p className={cn("text-xs mt-0.5", isBooked && "text-muted-foreground", isBlocked && "text-destructive/80", isAvailable && "text-foreground")}>
                ₹{slot.price}
              </p>
              <p className={cn("text-[10px] mt-1 font-medium", isBooked && "text-muted-foreground", isBlocked && "text-destructive", isAvailable && "text-primary/70")}>
                {isBooked ? "Booked" : isBlocked ? "Blocked" : "Open"}
              </p>
            </button>
          );
        })}
      </div>
    </div>
  );

  return (
    <div className="mt-4 space-y-4">
      <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
        {dates.map(d => {
          const str = format(d, "yyyy-MM-dd");
          const isSelected = str === selectedDate;
          return (
            <button
              key={str}
              data-testid={`date-${str}`}
              onClick={() => setSelectedDate(str)}
              className={cn(
                "flex flex-col items-center px-3 py-2 rounded-lg shrink-0 min-w-[52px] transition-all",
                isSelected ? "bg-primary text-primary-foreground" : "bg-secondary text-foreground hover:bg-secondary/80",
              )}
            >
              <span className="text-[10px] font-medium opacity-80">{format(d, "EEE")}</span>
              <span className="text-base font-bold leading-tight">{format(d, "d")}</span>
              <span className="text-[10px] opacity-70">{format(d, "MMM")}</span>
            </button>
          );
        })}
      </div>
      <div className="flex items-center gap-4 text-xs">
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-sm bg-primary/30 border border-primary/50" />
          <span className="text-muted-foreground">{availableCount} Open</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-sm bg-destructive/20 border border-destructive/40" />
          <span className="text-muted-foreground">{blockedCount} Blocked</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-sm bg-secondary" />
          <span className="text-muted-foreground">{bookedCount} Booked</span>
        </div>
      </div>
      <p className="text-xs text-muted-foreground">Tap an open slot to block it. Tap a blocked slot to unblock it.</p>
      {isLoading ? (
        <div className="grid grid-cols-3 gap-2">
          {Array.from({ length: 9 }).map((_, i) => <div key={i} className="h-16 rounded-lg bg-secondary animate-pulse" />)}
        </div>
      ) : slots.length === 0 ? (
        <p className="text-muted-foreground text-sm text-center py-4">No slots available for this date.</p>
      ) : (
        <div className="space-y-5">
          {morningSlots.length > 0 && renderPeriod("Morning", "6:00 AM – 12:00 PM", morningSlots)}
          {afternoonSlots.length > 0 && renderPeriod("Afternoon", "12:00 PM – 6:00 PM", afternoonSlots)}
          {eveningSlots.length > 0 && renderPeriod("Evening", "6:00 PM – 11:00 PM", eveningSlots)}
        </div>
      )}
    </div>
  );
}

function BookingsPanel({ turf }: { turf: Turf }) {
  const { data: bookings = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/owner/turfs", turf.id, "bookings"],
    queryFn: async () => {
      const res = await fetch(`/api/owner/turfs/${turf.id}/bookings`);
      if (!res.ok) throw new Error("Failed to fetch bookings");
      return res.json();
    },
  });

  const upcoming = bookings.filter(b => b.date >= format(today, "yyyy-MM-dd"));
  const past = bookings.filter(b => b.date < format(today, "yyyy-MM-dd"));

  const BookingCard = ({ b }: { b: any }) => (
    <div data-testid={`booking-card-${b.id}`} className="bg-secondary rounded-xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CalendarDays className="w-4 h-4 text-primary shrink-0" />
          <p className="text-foreground font-semibold text-sm">{b.date}</p>
        </div>
        <span className="text-xs bg-primary/15 text-primary font-medium px-2 py-0.5 rounded-full">{b.bookingCode}</span>
      </div>
      <div className="flex items-center gap-2">
        <Clock className="w-4 h-4 text-muted-foreground shrink-0" />
        <p className="text-foreground text-sm">{b.startTime} – {b.endTime} <span className="text-muted-foreground text-xs">({b.duration}h)</span></p>
      </div>
      <div className="border-t border-border pt-3 space-y-2">
        <div className="flex items-center gap-2">
          <User className="w-4 h-4 text-muted-foreground shrink-0" />
          <p className="text-foreground text-sm font-medium">{b.userName || "Unknown player"}</p>
        </div>
        {b.userPhone && (
          <div className="flex items-center gap-2">
            <Phone className="w-4 h-4 text-muted-foreground shrink-0" />
            <a href={`tel:${b.userPhone}`} data-testid={`link-call-${b.id}`} className="text-primary text-sm font-medium">
              {b.userPhone}
            </a>
          </div>
        )}
      </div>
      <div className="flex items-center justify-between text-xs text-muted-foreground border-t border-border pt-2">
        <span>Total: <span className="text-foreground font-semibold">₹{b.totalAmount}</span></span>
        <span>Paid: ₹{b.paidAmount} · Due: ₹{b.balanceAmount}</span>
      </div>
    </div>
  );

  if (isLoading) {
    return (
      <div className="mt-4 space-y-3">
        {[1, 2].map(i => <div key={i} className="h-32 rounded-xl bg-secondary animate-pulse" />)}
      </div>
    );
  }

  if (bookings.length === 0) {
    return (
      <div className="mt-6 text-center py-8">
        <Receipt className="w-10 h-10 text-muted-foreground mx-auto mb-3 opacity-40" />
        <p className="text-muted-foreground text-sm">No bookings yet for this turf.</p>
        <p className="text-muted-foreground text-xs mt-1">Bookings made by players will appear here.</p>
      </div>
    );
  }

  return (
    <div className="mt-4 space-y-5">
      {upcoming.length > 0 && (
        <div className="space-y-3">
          <p className="text-sm font-semibold text-foreground">Upcoming ({upcoming.length})</p>
          {upcoming.map(b => <BookingCard key={b.id} b={b} />)}
        </div>
      )}
      {past.length > 0 && (
        <div className="space-y-3">
          <p className="text-sm font-semibold text-muted-foreground">Past ({past.length})</p>
          {past.map(b => <BookingCard key={b.id} b={b} />)}
        </div>
      )}
    </div>
  );
}

function TurfSubmitForm() {
  const { submitTurf, refreshUser } = useAuth();
  const { toast } = useToast();
  const [images, setImages] = useState<UploadedImage[]>([]);
  const [uploadingIndex, setUploadingIndex] = useState<number | null>(null);
  const [imageError, setImageError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [locations, setLocations] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch("/api/locations").then(r => r.json()).then(setLocations).catch(() => {});
  }, []);

  const form = useForm<TurfFormValues>({
    resolver: zodResolver(turfSchema),
    defaultValues: { turfName: "", turfLocation: "", turfAddress: "", turfPincode: "", turfLength: "", turfWidth: "" },
  });

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (images.length >= 5) { setImageError("You can upload up to 5 images"); return; }
    const allowed = ["image/jpeg", "image/jpg", "image/png"];
    if (!allowed.includes(file.type)) { setImageError("Only PNG and JPEG images are allowed"); return; }
    if (file.size > 5 * 1024 * 1024) { setImageError("Image must be smaller than 5 MB"); return; }
    setImageError("");
    setUploadingIndex(images.length);
    const previewUrl = URL.createObjectURL(file);
    try {
      const formData = new FormData();
      formData.append("image", file);
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      if (!res.ok) throw new Error((await res.json()).error || "Upload failed");
      const { url } = await res.json();
      setImages(prev => [...prev, { url, previewUrl, name: file.name }]);
    } catch (err: any) {
      URL.revokeObjectURL(previewUrl);
      setImageError(err.message || "Failed to upload image");
    } finally {
      setUploadingIndex(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const removeImage = (index: number) => {
    setImages(prev => { URL.revokeObjectURL(prev[index].previewUrl); return prev.filter((_, i) => i !== index); });
  };

  const onSubmit = async (values: TurfFormValues) => {
    if (images.length === 0) { setImageError("At least one turf image is required"); return; }
    setIsSubmitting(true);
    try {
      await submitTurf({
        turfName: values.turfName,
        turfLocation: values.turfLocation,
        turfAddress: values.turfAddress,
        turfPincode: values.turfPincode,
        turfImageUrls: images.map(i => i.url),
        turfLength: parseInt(values.turfLength),
        turfWidth: parseInt(values.turfWidth),
      });
      await refreshUser();
      toast({ title: "Turf submitted!", description: "Your turf is now pending review." });
    } catch (err: any) {
      toast({ title: "Submission failed", description: err.message || "Something went wrong.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="bg-primary/10 border border-primary/20 rounded-xl px-4 py-3 flex items-start gap-3">
        <ShieldCheck className="w-5 h-5 text-primary shrink-0 mt-0.5" />
        <div>
          <p className="text-primary font-semibold text-sm">Account approved</p>
          <p className="text-muted-foreground text-xs mt-0.5">Step 2 — Now list your turf. It will go live after a separate review.</p>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
          <div>
            <p className="text-primary font-semibold text-sm uppercase tracking-wide mb-3">Turf details</p>
            <div className="space-y-4">
              <FormField control={form.control} name="turfName" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-muted-foreground text-sm">Turf name</FormLabel>
                  <FormControl>
                    <Input {...field} data-testid="input-turf-name" placeholder="e.g. Green Valley Cricket Ground" className="bg-card border-border" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="turfLocation" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-muted-foreground text-sm">Location / City</FormLabel>
                  <FormControl>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <SelectTrigger data-testid="select-turf-location" className="bg-card border-border">
                        <SelectValue placeholder="Select your location" />
                      </SelectTrigger>
                      <SelectContent>
                        {locations.length === 0 ? (
                          <SelectItem value="__loading" disabled>Loading locations…</SelectItem>
                        ) : (
                          locations.map(loc => <SelectItem key={loc} value={loc}>{loc}</SelectItem>)
                        )}
                      </SelectContent>
                    </Select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="turfAddress" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-muted-foreground text-sm">Full address</FormLabel>
                  <FormControl>
                    <Input {...field} data-testid="input-turf-address" placeholder="Street, area, landmark" className="bg-card border-border" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="turfPincode" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-muted-foreground text-sm">Pincode</FormLabel>
                  <FormControl>
                    <Input {...field} data-testid="input-turf-pincode" placeholder="6-digit pincode" inputMode="numeric" maxLength={6} className="bg-card border-border" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <div className="grid grid-cols-2 gap-3">
                <FormField control={form.control} name="turfLength" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-muted-foreground text-sm">Length <span className="text-xs text-muted-foreground/70">(meters)</span></FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        data-testid="input-turf-length"
                        placeholder="e.g. 120"
                        inputMode="numeric"
                        onChange={e => field.onChange(e.target.value.replace(/\D/g, ""))}
                        className="bg-card border-border"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="turfWidth" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-muted-foreground text-sm">Width <span className="text-xs text-muted-foreground/70">(meters)</span></FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        data-testid="input-turf-width"
                        placeholder="e.g. 75"
                        inputMode="numeric"
                        onChange={e => field.onChange(e.target.value.replace(/\D/g, ""))}
                        className="bg-card border-border"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>

              <div>
                <p className="text-muted-foreground text-sm mb-2">Turf images (PNG or JPEG, up to 5)</p>
                {images.length > 0 && (
                  <div className="grid grid-cols-3 gap-2 mb-3">
                    {images.map((img, index) => (
                      <div key={index} className="relative group rounded-md overflow-hidden aspect-square bg-muted" data-testid={`image-preview-${index}`}>
                        <img src={img.previewUrl} alt={img.name} className="w-full h-full object-cover" />
                        <button
                          type="button"
                          data-testid={`button-remove-image-${index}`}
                          onClick={() => removeImage(index)}
                          className="absolute top-1 right-1 bg-black/60 rounded-full p-0.5 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                    {uploadingIndex !== null && (
                      <div className="flex items-center justify-center rounded-md aspect-square bg-muted">
                        <Loader2 className="w-5 h-5 text-muted-foreground animate-spin" />
                      </div>
                    )}
                  </div>
                )}
                {images.length < 5 && uploadingIndex === null && (
                  <>
                    <input ref={fileInputRef} type="file" accept="image/png,image/jpeg,image/jpg" className="hidden" data-testid="input-image-file" onChange={handleFileChange} />
                    <button
                      type="button"
                      data-testid="button-add-image"
                      onClick={() => fileInputRef.current?.click()}
                      className="flex items-center gap-2 w-full border border-dashed border-border rounded-md px-4 py-3 text-sm text-muted-foreground hover:border-primary hover:text-primary transition-colors"
                    >
                      <ImagePlus className="w-4 h-4" />
                      {images.length === 0 ? "Upload a turf image" : "Add another image"}
                      <span className="ml-auto text-xs opacity-60">PNG / JPEG · max 5 MB</span>
                    </button>
                  </>
                )}
                {imageError && <p className="text-destructive text-sm mt-1">{imageError}</p>}
              </div>
            </div>
          </div>

          <Button type="submit" data-testid="button-submit-turf" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Submitting…</> : "Submit turf for review"}
          </Button>
        </form>
      </Form>
    </div>
  );
}

export default function TurfOwnerHome() {
  const { user, logout } = useAuth();
  const [, navigate] = useLocation();
  const [expandedTurfId, setExpandedTurfId] = useState<string | null>(null);
  const [activeTabs, setActiveTabs] = useState<Record<string, "slots" | "bookings">>({});

  const { data: turfs = [] } = useQuery<Turf[]>({
    queryKey: ["/api/owner/turfs"],
    enabled: user?.turfStatus === "turf_approved",
  });

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="flex items-center justify-between px-5 pt-8 pb-4">
        <div>
          <p className="text-muted-foreground text-xs uppercase tracking-wider font-medium">QuickTurf Owner</p>
          <h1 className="text-foreground font-bold text-xl mt-0.5">
            {user.fullName ?? `@${user.username}`}
          </h1>
          {user.fullName && <p className="text-muted-foreground text-xs">@{user.username}</p>}
        </div>
        <Button size="icon" variant="ghost" data-testid="button-logout" onClick={handleLogout}>
          <LogOut className="w-5 h-5 text-muted-foreground" />
        </Button>
      </div>

      <div className="flex-1 px-5 pb-10">

        {/* ── Pending Account ──────────────────────── */}
        {user.ownerStatus === "pending_account" && (
          <div className="flex flex-col items-center text-center pt-12 pb-8">
            <div className="w-20 h-20 rounded-full bg-yellow-500/15 flex items-center justify-center mb-5">
              <Clock className="w-10 h-10 text-yellow-500" />
            </div>
            <h2 className="text-foreground text-xl font-bold mb-2">Account under review</h2>
            <p className="text-muted-foreground text-sm leading-relaxed max-w-sm">
              Your account registration is being reviewed by our team. Once approved, you'll be able to log in and list your turf.
            </p>
            <p className="text-muted-foreground text-xs mt-6">No further action needed right now.</p>
          </div>
        )}

        {/* ── Account Rejected ─────────────────────── */}
        {user.ownerStatus === "account_rejected" && (
          <div className="flex flex-col items-center text-center pt-12">
            <div className="w-20 h-20 rounded-full bg-destructive/15 flex items-center justify-center mb-5">
              <XCircle className="w-10 h-10 text-destructive" />
            </div>
            <h2 className="text-foreground text-xl font-bold mb-2">Account not approved</h2>
            <p className="text-muted-foreground text-sm leading-relaxed max-w-sm">
              Your account application was not approved at this time. Please contact us for more information.
            </p>
          </div>
        )}

        {/* ── Account Approved — Submit Turf ──────── */}
        {user.ownerStatus === "account_approved" && !user.turfStatus && (
          <TurfSubmitForm />
        )}

        {/* ── Turf Pending Review ──────────────────── */}
        {user.ownerStatus === "account_approved" && user.turfStatus === "pending_turf" && (
          <div className="flex flex-col items-center text-center pt-12 pb-8">
            <div className="w-20 h-20 rounded-full bg-yellow-500/15 flex items-center justify-center mb-5">
              <Clock className="w-10 h-10 text-yellow-500" />
            </div>
            <h2 className="text-foreground text-xl font-bold mb-2">Turf under review</h2>
            <p className="text-muted-foreground text-sm leading-relaxed max-w-sm">
              Your turf details have been submitted and are being reviewed by our team. Once approved, your turf will go live and you can manage bookings here.
            </p>
            {user.turfName && (
              <div className="w-full mt-8 bg-card border border-border rounded-xl p-4 text-left space-y-3">
                <p className="text-foreground font-semibold text-sm">Submitted turf details</p>
                <div className="flex items-start gap-3">
                  <Building2 className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs text-muted-foreground">Turf name</p>
                    <p className="text-foreground text-sm font-medium">{user.turfName}</p>
                  </div>
                </div>
                {user.turfLocation && (
                  <div className="flex items-start gap-3">
                    <MapPin className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                    <div>
                      <p className="text-xs text-muted-foreground">Location</p>
                      <p className="text-foreground text-sm font-medium">{user.turfLocation}</p>
                    </div>
                  </div>
                )}
                {user.turfAddress && (
                  <div className="flex items-start gap-3">
                    <MapPin className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                    <div>
                      <p className="text-xs text-muted-foreground">Address</p>
                      <p className="text-foreground text-sm font-medium">{user.turfAddress}</p>
                    </div>
                  </div>
                )}
                {(user.turfLength || user.turfWidth) && (
                  <div className="flex items-start gap-3">
                    <Building2 className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                    <div>
                      <p className="text-xs text-muted-foreground">Dimensions</p>
                      <p className="text-foreground text-sm font-medium">
                        {user.turfLength ? `${user.turfLength}m` : "—"} × {user.turfWidth ? `${user.turfWidth}m` : "—"}
                      </p>
                    </div>
                  </div>
                )}
                {user.turfImageUrls && user.turfImageUrls.length > 0 && (
                  <div className="flex items-start gap-3">
                    <ImageIcon className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                    <div>
                      <p className="text-xs text-muted-foreground">Images submitted</p>
                      <p className="text-foreground text-sm font-medium">{user.turfImageUrls.length} image{user.turfImageUrls.length > 1 ? "s" : ""}</p>
                    </div>
                  </div>
                )}
              </div>
            )}
            <p className="text-muted-foreground text-xs mt-6">No further action needed.</p>
          </div>
        )}

        {/* ── Turf Rejected — Resubmit ─────────────── */}
        {user.ownerStatus === "account_approved" && user.turfStatus === "turf_rejected" && (
          <div>
            <div className="flex flex-col items-center text-center pt-8 pb-6">
              <div className="w-20 h-20 rounded-full bg-destructive/15 flex items-center justify-center mb-5">
                <XCircle className="w-10 h-10 text-destructive" />
              </div>
              <h2 className="text-foreground text-xl font-bold mb-2">Turf not approved</h2>
              <p className="text-muted-foreground text-sm leading-relaxed max-w-sm">
                Your turf listing was not approved. You can resubmit with updated details below.
              </p>
            </div>
            <TurfSubmitForm />
          </div>
        )}

        {/* ── Turf Approved — Dashboard ────────────── */}
        {user.ownerStatus === "account_approved" && user.turfStatus === "turf_approved" && (
          <div>
            <div className="flex items-center gap-3 bg-primary/10 border border-primary/20 rounded-xl px-4 py-3 mb-6">
              <CheckCircle className="w-5 h-5 text-primary shrink-0" />
              <div>
                <p className="text-primary font-semibold text-sm">Turf live</p>
                <p className="text-muted-foreground text-xs">Your turf is active and accepting bookings</p>
              </div>
            </div>

            {turfs.length === 0 ? (
              <div className="text-center pt-10">
                <p className="text-muted-foreground text-sm">Your turf is being set up. Check back shortly.</p>
              </div>
            ) : (
              <div className="space-y-4">
                <h2 className="text-foreground font-semibold text-base">Your turfs</h2>
                {turfs.map(turf => {
                  const isExpanded = expandedTurfId === turf.id;
                  return (
                    <div key={turf.id} data-testid={`card-turf-${turf.id}`} className="bg-card border border-border rounded-xl overflow-hidden">
                      {turf.imageUrl && <img src={turf.imageUrl} alt={turf.name} className="w-full h-36 object-cover" />}
                      <div className="p-4">
                        <h3 className="text-foreground font-semibold">{turf.name}</h3>
                        <div className="flex items-center gap-1 mt-1">
                          <MapPin className="w-3 h-3 text-muted-foreground" />
                          <p className="text-muted-foreground text-xs">{turf.location}</p>
                        </div>
                        <div className="flex items-center justify-between mt-3">
                          <p className="text-primary font-semibold text-sm">₹{turf.pricePerHour}/hr</p>
                          <span className="text-xs text-muted-foreground">{turf.isAvailable ? "Available" : "Unavailable"}</span>
                        </div>

                        {/* Expand / Collapse toggle */}
                        <button
                          data-testid={`button-manage-${turf.id}`}
                          onClick={() => setExpandedTurfId(isExpanded ? null : turf.id)}
                          className="mt-4 w-full flex items-center justify-between px-4 py-2.5 bg-secondary rounded-md text-sm font-medium text-foreground hover:bg-secondary/70 transition-colors"
                        >
                          <div className="flex items-center gap-2">
                            <CalendarDays className="w-4 h-4 text-primary" />
                            <span>Manage</span>
                          </div>
                          {isExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                        </button>

                        {isExpanded && (
                          <div className="mt-4">
                            {/* Tabs */}
                            <div className="flex rounded-lg bg-secondary p-1 gap-1">
                              <button
                                data-testid={`tab-slots-${turf.id}`}
                                onClick={() => setActiveTabs(prev => ({ ...prev, [turf.id]: "slots" }))}
                                className={cn(
                                  "flex-1 flex items-center justify-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium transition-all",
                                  (activeTabs[turf.id] ?? "slots") === "slots"
                                    ? "bg-background text-foreground shadow-sm"
                                    : "text-muted-foreground hover:text-foreground"
                                )}
                              >
                                <CalendarDays className="w-3.5 h-3.5" />
                                Slot Blocking
                              </button>
                              <button
                                data-testid={`tab-bookings-${turf.id}`}
                                onClick={() => setActiveTabs(prev => ({ ...prev, [turf.id]: "bookings" }))}
                                className={cn(
                                  "flex-1 flex items-center justify-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium transition-all",
                                  activeTabs[turf.id] === "bookings"
                                    ? "bg-background text-foreground shadow-sm"
                                    : "text-muted-foreground hover:text-foreground"
                                )}
                              >
                                <BookOpen className="w-3.5 h-3.5" />
                                Bookings
                              </button>
                            </div>

                            {/* Tab Content */}
                            {(activeTabs[turf.id] ?? "slots") === "slots"
                              ? <SlotManagementPanel turf={turf} />
                              : <BookingsPanel turf={turf} />
                            }
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
