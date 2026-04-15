import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format, addDays, startOfToday } from "date-fns";
import {
  Clock, CheckCircle, XCircle, MapPin, Building2,
  LogOut, ChevronDown, ChevronUp, CalendarDays, ImagePlus, Loader2, Trash2, ShieldCheck,
  Phone, User, Users, BookOpen, Receipt, TrendingUp, Settings, Star, Plus,
  IndianRupee, BarChart2, MessageSquare, Pencil, FileText, Printer, PlusCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { Turf, TimeSlot } from "@shared/schema";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { useSEO } from "@/lib/seo";

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

interface UploadedImage { url: string; previewUrl: string; name: string; }

// ── Analytics Panel ────────────────────────────────────────────────────────────
function AnalyticsPanel({ turf }: { turf: Turf }) {
  const { data: analytics, isLoading } = useQuery<any>({
    queryKey: ["/api/owner/analytics", turf.id],
    queryFn: async () => {
      const res = await fetch(`/api/owner/analytics?turf_id=${turf.id}`);
      if (!res.ok) throw new Error("Failed to fetch analytics");
      return res.json();
    },
  });

  if (isLoading) {
    return (
      <div className="mt-4 space-y-4">
        {[1, 2, 3].map(i => <div key={i} className="h-20 rounded-xl bg-secondary animate-pulse" />)}
      </div>
    );
  }

  if (!analytics) return <p className="text-muted-foreground text-sm text-center py-6">No analytics data yet.</p>;

  const kpis = [
    { label: "Total Revenue", value: `₹${(analytics.totalRevenue || 0).toLocaleString()}`, icon: IndianRupee, color: "text-green-500", bg: "bg-green-500/10" },
    { label: "Total Bookings", value: analytics.totalBookings || 0, icon: BookOpen, color: "text-blue-500", bg: "bg-blue-500/10" },
    { label: "Cancelled", value: analytics.cancelledBookings || 0, icon: XCircle, color: "text-red-400", bg: "bg-red-400/10" },
    { label: "Occupancy Rate", value: `${analytics.occupancyRate || 0}%`, icon: BarChart2, color: "text-purple-500", bg: "bg-purple-500/10" },
  ];

  return (
    <div className="mt-4 space-y-5">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-3">
        {kpis.map(k => (
          <div key={k.label} className="bg-card border border-border rounded-xl p-3">
            <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center mb-2", k.bg)}>
              <k.icon className={cn("w-4 h-4", k.color)} />
            </div>
            <p className="text-foreground font-bold text-lg leading-tight">{k.value}</p>
            <p className="text-muted-foreground text-xs mt-0.5">{k.label}</p>
          </div>
        ))}
      </div>

      {/* Monthly Revenue Chart */}
      {analytics.monthlyRevenue && analytics.monthlyRevenue.length > 0 && (
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-foreground font-semibold text-sm mb-3">Monthly Revenue</p>
          <ResponsiveContainer width="100%" height={140}>
            <BarChart data={analytics.monthlyRevenue} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#888" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: "#888" }} axisLine={false} tickLine={false} tickFormatter={v => `₹${v >= 1000 ? `${(v/1000).toFixed(0)}k` : v}`} />
              <Tooltip formatter={(v: any) => [`₹${Number(v).toLocaleString()}`, "Revenue"]} contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }} />
              <Bar dataKey="revenue" radius={[4, 4, 0, 0]}>
                {analytics.monthlyRevenue.map((_: any, i: number) => (
                  <Cell key={i} fill={`hsl(${142 + i * 8}, 60%, ${50 + i * 3}%)`} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Peak Hours */}
      {analytics.peakHours && analytics.peakHours.length > 0 && (
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-foreground font-semibold text-sm mb-3">Peak Booking Hours</p>
          <div className="space-y-2">
            {analytics.peakHours.slice(0, 5).map((h: any) => {
              const maxCount = Math.max(...analytics.peakHours.map((x: any) => x.count));
              const pct = maxCount > 0 ? (h.count / maxCount) * 100 : 0;
              return (
                <div key={h.hour} className="flex items-center gap-3">
                  <span className="text-muted-foreground text-xs w-12 shrink-0">{h.hour}</span>
                  <div className="flex-1 bg-secondary rounded-full h-2 overflow-hidden">
                    <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="text-foreground text-xs font-medium w-6 text-right">{h.count}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Recent Bookings */}
      {analytics.recentBookings && analytics.recentBookings.length > 0 && (
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-foreground font-semibold text-sm mb-3">Recent Bookings</p>
          <div className="space-y-2">
            {analytics.recentBookings.map((b: any) => (
              <div key={b.id} className="flex items-center justify-between py-1.5 border-b border-border last:border-0">
                <div>
                  <p className="text-foreground text-sm font-medium">{b.userName || "Guest"}</p>
                  <p className="text-muted-foreground text-xs">{b.date} · {b.startTime}</p>
                </div>
                <p className="text-green-500 font-semibold text-sm">₹{b.totalAmount}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Edit Turf Panel ─────────────────────────────────────────────────────────────
function EditTurfPanel({ turf, onSuccess }: { turf: Turf; onSuccess: () => void }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [images, setImages] = useState<UploadedImage[]>(
    (turf as any).imageUrls
      ? (turf as any).imageUrls.map((url: string) => ({ url, previewUrl: url, name: url.split("/").pop() || "image" }))
      : turf.imageUrl
      ? [{ url: turf.imageUrl, previewUrl: turf.imageUrl, name: "current-image" }]
      : []
  );
  const [uploadingIndex, setUploadingIndex] = useState<number | null>(null);
  const [imageError, setImageError] = useState("");
  const [saving, setSaving] = useState(false);
  const [openHour, setOpenHour] = useState((turf as any).openHour ?? 6);
  const [closeHour, setCloseHour] = useState((turf as any).closeHour ?? 23);
  const [weekendSurcharge, setWeekendSurcharge] = useState((turf as any).weekendSurcharge ?? 0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const AMENITY_OPTIONS = ["Parking", "WiFi", "Showers", "Changing Room", "Cafe", "Water", "Lights", "First Aid"];
  const [amenities, setAmenities] = useState<string[]>(turf.amenities || []);

  const form = useForm({
    defaultValues: {
      name: turf.name || "",
      address: turf.address || "",
      pricePerHour: String(turf.pricePerHour || 1000),
    },
  });

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (images.length >= 5) { setImageError("You can upload up to 5 images"); return; }
    const allowed = ["image/jpeg", "image/jpg", "image/png"];
    if (!allowed.includes(file.type)) { setImageError("Only PNG and JPEG images are allowed"); return; }
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
    setImages(prev => {
      if (!prev[index].previewUrl.startsWith("http")) URL.revokeObjectURL(prev[index].previewUrl);
      return prev.filter((_, i) => i !== index);
    });
  };

  const onSubmit = async (values: any) => {
    if (images.length === 0) { setImageError("At least one image is required"); return; }
    if (openHour >= closeHour) {
      toast({ title: "Invalid hours", description: "Close hour must be after open hour.", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const res = await apiRequest("PATCH", "/api/owner/turf/profile", {
        name: values.name,
        address: values.address,
        pricePerHour: parseInt(values.pricePerHour),
        openHour,
        closeHour,
        imageUrls: images.map(i => i.url),
        amenities,
      });

      if (weekendSurcharge !== (turf as any).weekendSurcharge) {
        await apiRequest("PATCH", `/api/owner/settings/weekend-surcharge`, {
          turfId: turf.id,
          weekendSurcharge
        });
      }

      queryClient.invalidateQueries({ queryKey: ["/api/owner/turfs"] });
      toast({ title: "Turf updated!", description: "Your turf details have been saved." });
      onSuccess();
    } catch (err: any) {
      toast({ title: "Update failed", description: err.message || "Something went wrong.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mt-4 space-y-5">
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
        <div className="space-y-4">
          <div>
            <label className="text-muted-foreground text-sm block mb-1.5">Turf Name</label>
            <Input {...form.register("name")} data-testid="input-edit-name" placeholder="Turf name" className="bg-card border-border" />
          </div>
          <div>
            <label className="text-muted-foreground text-sm block mb-1.5">Address</label>
            <Input {...form.register("address")} data-testid="input-edit-address" placeholder="Full address" className="bg-card border-border" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-muted-foreground text-sm block mb-1.5">Price / Hour (₹)</label>
              <Input {...form.register("pricePerHour")} data-testid="input-edit-price" placeholder="e.g. 1200" inputMode="numeric" className="bg-card border-border" />
            </div>
            <div>
              <label className="text-muted-foreground text-sm block mb-1.5 whitespace-nowrap overflow-hidden text-ellipsis">Weekend Surcharge (₹)</label>
              <Input value={weekendSurcharge} onChange={e => setWeekendSurcharge(Number(e.target.value) || 0)} data-testid="input-edit-surcharge" placeholder="e.g. 200" inputMode="numeric" className="bg-card border-border" />
            </div>
          </div>

          {/* Operating Hours */}
          <div className="bg-secondary rounded-xl p-4 space-y-3">
            <p className="text-foreground font-semibold text-sm flex items-center gap-2"><Clock className="w-4 h-4 text-primary" />Operating Hours</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-muted-foreground text-xs block mb-1.5">Open (hour)</label>
                <select
                  data-testid="select-open-hour"
                  value={openHour}
                  onChange={e => setOpenHour(parseInt(e.target.value))}
                  className="w-full bg-card border border-border rounded-md px-3 py-2 text-foreground text-sm"
                >
                  {Array.from({ length: 18 }, (_, i) => i + 4).map(h => (
                    <option key={h} value={h}>{`${h.toString().padStart(2, "0")}:00`}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-muted-foreground text-xs block mb-1.5">Close (hour)</label>
                <select
                  data-testid="select-close-hour"
                  value={closeHour}
                  onChange={e => setCloseHour(parseInt(e.target.value))}
                  className="w-full bg-card border border-border rounded-md px-3 py-2 text-foreground text-sm"
                >
                  {Array.from({ length: 18 }, (_, i) => i + 6).map(h => (
                    <option key={h} value={h}>{`${h.toString().padStart(2, "0")}:00`}</option>
                  ))}
                </select>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">Slots generated: {Array.from({ length: closeHour - openHour }, (_, i) => `${(openHour + i).toString().padStart(2, "0")}:00`).join(", ")}</p>
          </div>

          {/* Amenities */}
          <div>
            <label className="text-muted-foreground text-sm block mb-2">Amenities</label>
            <div className="flex flex-wrap gap-2">
              {AMENITY_OPTIONS.map(a => (
                <button
                  key={a}
                  type="button"
                  data-testid={`amenity-${a.toLowerCase().replace(/\s/g, "-")}`}
                  onClick={() => setAmenities(prev => prev.includes(a) ? prev.filter(x => x !== a) : [...prev, a])}
                  className={cn("px-3 py-1.5 rounded-full text-xs font-medium transition-all border",
                    amenities.includes(a)
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-secondary text-muted-foreground border-border hover:border-primary/50"
                  )}
                >
                  {a}
                </button>
              ))}
            </div>
          </div>

          {/* Images */}
          <div>
            <p className="text-muted-foreground text-sm mb-2">Turf Images (up to 5)</p>
            {images.length > 0 && (
              <div className="grid grid-cols-3 gap-2 mb-3">
                {images.map((img, index) => (
                  <div key={index} className="relative group rounded-md overflow-hidden aspect-square bg-muted" data-testid={`edit-image-${index}`}>
                    <img src={img.previewUrl} alt={img.name} className="w-full h-full object-cover" />
                    <button type="button" onClick={() => removeImage(index)}
                      className="absolute top-1 right-1 bg-black/60 rounded-full p-0.5 text-white opacity-0 group-hover:opacity-100 transition-opacity">
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
                <input ref={fileInputRef} type="file" accept="image/png,image/jpeg,image/jpg" className="hidden" onChange={handleFileChange} />
                <button type="button" onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-2 w-full border border-dashed border-border rounded-md px-4 py-3 text-sm text-muted-foreground hover:border-primary hover:text-primary transition-colors">
                  <ImagePlus className="w-4 h-4" />
                  Add image
                </button>
              </>
            )}
            {imageError && <p className="text-destructive text-sm mt-1">{imageError}</p>}
          </div>
        </div>

        <Button type="submit" data-testid="button-save-turf" className="w-full" disabled={saving}>
          {saving ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Saving…</> : "Save Changes"}
        </Button>
      </form>
    </div>
  );
}

// ── Reviews Panel ──────────────────────────────────────────────────────────────
function ReviewsPanel({ turf }: { turf: Turf }) {
  const { data: reviews = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/owner/turfs", turf.id, "reviews"],
    queryFn: async () => {
      const res = await fetch(`/api/owner/turfs/${turf.id}/reviews`);
      if (!res.ok) throw new Error("Failed to fetch reviews");
      return res.json();
    },
  });

  const avgRating = reviews.length > 0
    ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
    : "—";

  function StarRow({ rating }: { rating: number }) {
    return (
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map(i => (
          <Star key={i} className={cn("w-3.5 h-3.5", i <= rating ? "text-yellow-400 fill-yellow-400" : "text-muted-foreground")} />
        ))}
      </div>
    );
  }

  if (isLoading) return <div className="mt-4 space-y-3">{[1, 2].map(i => <div key={i} className="h-20 rounded-xl bg-secondary animate-pulse" />)}</div>;

  return (
    <div className="mt-4 space-y-4">
      {/* Summary */}
      <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-4">
        <div className="text-center">
          <p className="text-foreground font-bold text-3xl">{avgRating}</p>
          <StarRow rating={Math.round(parseFloat(avgRating as string) || 0)} />
        </div>
        <div className="flex-1 space-y-1">
          {[5, 4, 3, 2, 1].map(star => {
            const count = reviews.filter(r => r.rating === star).length;
            const pct = reviews.length > 0 ? (count / reviews.length) * 100 : 0;
            return (
              <div key={star} className="flex items-center gap-2">
                <span className="text-muted-foreground text-xs w-3">{star}</span>
                <div className="flex-1 bg-secondary rounded-full h-1.5 overflow-hidden">
                  <div className="h-full bg-yellow-400 rounded-full" style={{ width: `${pct}%` }} />
                </div>
                <span className="text-muted-foreground text-xs w-4 text-right">{count}</span>
              </div>
            );
          })}
        </div>
        <p className="text-muted-foreground text-xs self-start">{reviews.length} review{reviews.length !== 1 ? "s" : ""}</p>
      </div>

      {reviews.length === 0 ? (
        <div className="text-center py-8">
          <MessageSquare className="w-10 h-10 text-muted-foreground mx-auto mb-3 opacity-40" />
          <p className="text-muted-foreground text-sm">No reviews yet.</p>
          <p className="text-muted-foreground text-xs mt-1">Player reviews will appear here after bookings.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {reviews.map((r: any) => (
            <div key={r.id} data-testid={`review-${r.id}`} className="bg-secondary rounded-xl p-4 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center">
                    <User className="w-3.5 h-3.5 text-primary" />
                  </div>
                  <p className="text-foreground text-sm font-medium">{r.userName}</p>
                </div>
                <StarRow rating={r.rating} />
              </div>
              {r.comment && <p className="text-muted-foreground text-sm leading-relaxed">{r.comment}</p>}
              <p className="text-muted-foreground text-xs">{r.createdAt ? format(new Date(r.createdAt), "dd MMM yyyy") : ""}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Slot Management Panel ──────────────────────────────────────────────────────
function SlotManagementPanel({ turf }: { turf: Turf }) {
  const { user } = useAuth();
  const [selectedDate, setSelectedDate] = useState(format(today, "yyyy-MM-dd"));
  const [editingSlot, setEditingSlot] = useState<TimeSlot | null>(null);
  const [editPriceValue, setEditPriceValue] = useState("");
  const [applyToAllDays, setApplyToAllDays] = useState(false);

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
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/owner/turfs", turf.id, "slots", selectedDate] }),
    onError: (err: any) => toast({ title: "Cannot block slot", description: err.message || "This slot could not be blocked.", variant: "destructive" }),
  });

  const unblockMutation = useMutation({
    mutationFn: (slotId: string) => apiRequest("POST", `/api/owner/slots/${slotId}/unblock`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/owner/turfs", turf.id, "slots", selectedDate] }),
    onError: (err: any) => toast({ title: "Cannot unblock slot", description: err.message || "Something went wrong.", variant: "destructive" }),
  });

  const priceMutation = useMutation({
    mutationFn: (data: { id: string, price: number, applyToAll: boolean }) => apiRequest("POST", `/api/owner/slots/${data.id}/price`, { price: data.price, applyToAllDays: data.applyToAll }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/owner/turfs", turf.id, "slots", selectedDate] });
      setEditingSlot(null);
      toast({ title: "Price updated", description: "The slot price has been updated." });
    },
    onError: (err: any) => toast({ title: "Cannot update price", description: err.message || "Something went wrong.", variant: "destructive" }),
  });

  const handleEditClick = (e: React.MouseEvent, slot: TimeSlot) => {
    e.stopPropagation();
    setEditingSlot(slot);
    setEditPriceValue(String(slot.price));
    setApplyToAllDays(false);
  };

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
            <div key={slot.id} data-testid={`owner-slot-${slot.id}`}
              onClick={() => { if (!isBooked && !isPending) handleSlotToggle(slot); }}
              className={cn("group relative rounded-lg p-3 text-center transition-all duration-150",
                isBooked ? "bg-secondary opacity-50 cursor-not-allowed" : "cursor-pointer",
                isBlocked && "bg-destructive/15 border border-destructive/40 hover:bg-destructive/25",
                isAvailable && "bg-primary/10 border border-primary/30 hover:bg-primary/20",
              )}>
              <p className={cn("text-xs font-semibold", isBooked && "text-muted-foreground", isBlocked && "text-destructive", isAvailable && "text-primary")}>
                {slot.startTime}
              </p>
              <p className={cn("text-xs mt-0.5", isBooked && "text-muted-foreground", isBlocked && "text-destructive/80", isAvailable && "text-foreground")}>
                ₹{slot.price}
              </p>
              <p className={cn("text-[10px] mt-1 font-medium", isBooked && "text-muted-foreground", isBlocked && "text-destructive", isAvailable && "text-primary/70")}>
                {isBooked ? "Booked" : isBlocked ? "Blocked" : "Open"}
              </p>
              
            </div>
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
            <button key={str} data-testid={`date-${str}`} onClick={() => setSelectedDate(str)}
              className={cn("flex flex-col items-center px-3 py-2 rounded-lg shrink-0 min-w-[52px] transition-all",
                isSelected ? "bg-primary text-primary-foreground" : "bg-secondary text-foreground hover:bg-secondary/80",
              )}>
              <span className="text-[10px] font-medium opacity-80">{format(d, "EEE")}</span>
              <span className="text-base font-bold leading-tight">{format(d, "d")}</span>
              <span className="text-[10px] opacity-70">{format(d, "MMM")}</span>
            </button>
          );
        })}
      </div>
      <div className="flex items-center gap-4 text-xs">
        <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-sm bg-primary/30 border border-primary/50" /><span className="text-muted-foreground">{availableCount} Open</span></div>
        <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-sm bg-destructive/20 border border-destructive/40" /><span className="text-muted-foreground">{blockedCount} Blocked</span></div>
        <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-sm bg-secondary" /><span className="text-muted-foreground">{bookedCount} Booked</span></div>
      </div>
      <p className="text-xs text-muted-foreground">Tap an open slot to block it. Tap a blocked slot to unblock.</p>
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

      {/* Price Edit Dialog */}
      <Dialog open={!!editingSlot} onOpenChange={(open) => !open && setEditingSlot(null)}>
        <DialogContent className="sm:max-w-xs">
          <DialogHeader>
            <DialogTitle>Edit Slot Price</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <p className="text-sm text-muted-foreground">
              {applyToAllDays 
                ? <>Set the price for <strong>every {editingSlot?.startTime}</strong> slot going forward.</> 
                : <>Set the price for the <strong className="text-foreground">{editingSlot?.startTime}</strong> slot on {format(new Date(selectedDate), "dd MMM")}.</>}
            </p>
            <div className="relative">
              <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type="number"
                value={editPriceValue}
                onChange={(e) => setEditPriceValue(e.target.value)}
                placeholder="Enter new price"
                className="pl-9"
              />
            </div>
            
            <label className="flex items-start gap-2.5 mt-2 cursor-pointer group">
              <div className="mt-0.5">
                <input 
                  type="checkbox" 
                  checked={applyToAllDays}
                  onChange={(e) => setApplyToAllDays(e.target.checked)}
                  className="w-4 h-4 rounded border-border text-primary cursor-pointer focus:ring-primary accent-primary" 
                />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">Apply to all days</p>
                <p className="text-xs text-muted-foreground">Change the price of the {editingSlot?.startTime} slot for every date.</p>
              </div>
            </label>
            
          </div>
          <Button 
            className="w-full" 
            disabled={priceMutation.isPending || !editPriceValue}
            onClick={() => editingSlot && priceMutation.mutate({ id: editingSlot.id, price: parseInt(editPriceValue), applyToAll: applyToAllDays })}
          >
            {priceMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            Save Price
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Export Utilities ───────────────────────────────────────────────────────────
function downloadCSV(bookings: any[], turfName: string) {
  const headers = ["Booking Code", "Date", "Start Time", "End Time", "Duration (min)", "Player Name", "Phone", "Total (₹)", "Paid (₹)", "Balance (₹)", "Status"];
  const rows = bookings.map(b => [
    b.bookingCode, b.date, b.startTime, b.endTime, b.duration,
    b.userName || "Guest", b.userPhone || "N/A",
    b.totalAmount, b.paidAmount, b.balanceAmount, b.status,
  ]);
  const csv = [headers, ...rows]
    .map(row => row.map(v => `"${String(v ?? "").replace(/"/g, '""')}"`).join(","))
    .join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${turfName.replace(/\s+/g, "_")}_bookings_${format(today, "yyyy-MM-dd")}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function printBookingsPDF(bookings: any[], turfName: string) {
  const w = window.open("", "_blank");
  if (!w) return;
  const rows = bookings
    .map(b => `<tr>
      <td>${b.bookingCode}</td><td>${b.date}</td>
      <td>${b.startTime}–${b.endTime}</td>
      <td>${b.userName || "Guest"}</td><td>${b.userPhone || "N/A"}</td>
      <td>₹${b.totalAmount}</td><td>₹${b.paidAmount}</td><td>₹${b.balanceAmount}</td>
      <td>${b.status}</td>
    </tr>`)
    .join("");
  w.document.write(`<!DOCTYPE html><html><head>
    <title>${turfName} – Bookings</title>
    <style>
      body{font-family:sans-serif;padding:24px;color:#111}
      h1{font-size:20px;margin:0 0 4px}p.sub{color:#666;font-size:12px;margin:0 0 16px}
      table{border-collapse:collapse;width:100%}
      th,td{border:1px solid #ddd;padding:7px 10px;font-size:12px;text-align:left}
      th{background:#f5f5f5;font-weight:600}tr:nth-child(even){background:#fafafa}
      .btn{margin-bottom:16px;padding:8px 18px;background:#16a34a;color:#fff;border:none;border-radius:6px;cursor:pointer;font-size:14px}
      @media print{.btn{display:none}}
    </style>
  </head><body>
    <h1>${turfName} — Bookings Report</h1>
    <p class="sub">Generated on ${new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })} · ${bookings.length} bookings</p>
    <button class="btn" onclick="window.print()">Print / Save as PDF</button>
    <table>
      <thead><tr><th>Code</th><th>Date</th><th>Time</th><th>Player</th><th>Phone</th><th>Total</th><th>Paid</th><th>Balance</th><th>Status</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
  </body></html>`);
  w.document.close();
}

// ── Bookings Panel ─────────────────────────────────────────────────────────────
function BookingsPanel({ turf }: { turf: Turf }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: bookings = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/owner/turfs", turf.id, "bookings"],
    queryFn: async () => {
      const res = await fetch(`/api/owner/turfs/${turf.id}/bookings`);
      if (!res.ok) throw new Error("Failed to fetch bookings");
      return res.json();
    },
  });

  const payMutation = useMutation({
    mutationFn: (bookingId: string) => apiRequest("POST", `/api/owner/bookings/${bookingId}/pay`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/owner/turfs", turf.id, "bookings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/owner/analytics", turf.id] });
      toast({ title: "Payment Recorded", description: "The booking balance has been settled." });
    },
    onError: (err: any) => toast({ title: "Cannot mark paid", description: err.message || "Something went wrong.", variant: "destructive" }),
  });

  const cancelMutation = useMutation({
    mutationFn: (bookingId: string) => apiRequest("POST", `/api/owner/bookings/${bookingId}/cancel`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/owner/turfs", turf.id, "bookings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/owner/analytics", turf.id] });
      toast({ title: "Booking cancelled", description: "The booking has been cancelled and slots freed." });
    },
    onError: (err: any) => toast({ title: "Cannot cancel", description: err.message || "Something went wrong.", variant: "destructive" }),
  });

  const upcoming = bookings.filter(b => b.date >= format(today, "yyyy-MM-dd") && b.status !== "cancelled");
  const cancelled = bookings.filter(b => b.status === "cancelled");
  const past = bookings.filter(b => b.date < format(today, "yyyy-MM-dd") && b.status !== "cancelled");
  const activeBookings = bookings.filter(b => b.status !== "cancelled");

  const BookingCard = ({ b }: { b: any }) => (
    <div data-testid={`booking-card-${b.id}`} className={cn("bg-secondary rounded-xl p-4 space-y-3", b.status === "cancelled" && "opacity-60")}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CalendarDays className="w-4 h-4 text-primary shrink-0" />
          <p className="text-foreground font-semibold text-sm">{b.date}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs bg-primary/15 text-primary font-medium px-2 py-0.5 rounded-full">{b.bookingCode}</span>
          {b.status === "cancelled" && <span className="text-xs bg-destructive/20 text-destructive font-medium px-2 py-0.5 rounded-full">Cancelled</span>}
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Clock className="w-4 h-4 text-muted-foreground shrink-0" />
        <p className="text-foreground text-sm">{b.startTime} – {b.endTime}<span className="text-muted-foreground text-xs"> ({b.duration}min)</span></p>
      </div>
      <div className="border-t border-border pt-3 space-y-2">
        <div className="flex items-center gap-2">
          <User className="w-4 h-4 text-muted-foreground shrink-0" />
          <p className="text-foreground text-sm font-medium">{b.userName || "Unknown player"}</p>
        </div>
        {b.userPhone && (
          <div className="flex items-center gap-2">
            <Phone className="w-4 h-4 text-muted-foreground shrink-0" />
            <a href={`tel:${b.userPhone}`} data-testid={`link-call-${b.id}`} className="text-primary text-sm font-medium">{b.userPhone}</a>
          </div>
        )}
      </div>
      <div className="flex items-center justify-between text-xs text-muted-foreground border-t border-border pt-2 pb-2">
        <span>Total: <span className="text-foreground font-semibold">₹{b.totalAmount}</span></span>
        <span>Paid: ₹{b.paidAmount} · Due: ₹{b.balanceAmount}</span>
      </div>
      {b.status !== "cancelled" && (b.balanceAmount > 0 || b.date >= format(today, "yyyy-MM-dd")) && (
        <div className="flex gap-2">
          {b.balanceAmount > 0 && (
            <Button variant="outline" size="sm" data-testid={`button-pay-${b.id}`}
              className="flex-1 text-green-600 border-green-600/40 hover:bg-green-600/10 hover:text-green-600"
              disabled={payMutation.isPending}
              onClick={() => payMutation.mutate(b.id)}>
              {payMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> : <CheckCircle className="w-3.5 h-3.5 mr-1.5" />}
              Mark Paid
            </Button>
          )}
          {b.date >= format(today, "yyyy-MM-dd") && (
            <Button variant="outline" size="sm" data-testid={`button-cancel-${b.id}`}
              className="flex-1 text-destructive border-destructive/40 hover:bg-destructive/10 hover:text-destructive"
              disabled={cancelMutation.isPending}
              onClick={() => cancelMutation.mutate(b.id)}>
              {cancelMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> : <XCircle className="w-3.5 h-3.5 mr-1.5" />}
              Cancel Booking
            </Button>
          )}
        </div>
      )}
    </div>
  );

  if (isLoading) return <div className="mt-4 space-y-3">{[1, 2].map(i => <div key={i} className="h-32 rounded-xl bg-secondary animate-pulse" />)}</div>;

  if (bookings.length === 0) return (
    <div className="mt-6 text-center py-8">
      <Receipt className="w-10 h-10 text-muted-foreground mx-auto mb-3 opacity-40" />
      <p className="text-muted-foreground text-sm">No bookings yet for this turf.</p>
    </div>
  );

  return (
    <div className="mt-4 space-y-5">
      {/* Export Buttons */}
      {activeBookings.length > 0 && (
        <div className="flex gap-2">
          <Button variant="outline" size="sm" data-testid="button-export-csv"
            className="flex-1 text-xs"
            onClick={() => { downloadCSV(activeBookings, turf.name); toast({ title: "CSV downloaded!", description: `${activeBookings.length} bookings exported.` }); }}>
            <FileText className="w-3.5 h-3.5 mr-1.5" />Export CSV
          </Button>
          <Button variant="outline" size="sm" data-testid="button-export-pdf"
            className="flex-1 text-xs"
            onClick={() => printBookingsPDF(activeBookings, turf.name)}>
            <Printer className="w-3.5 h-3.5 mr-1.5" />Print / PDF
          </Button>
        </div>
      )}

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
      {cancelled.length > 0 && (
        <div className="space-y-3">
          <p className="text-sm font-semibold text-muted-foreground">Cancelled ({cancelled.length})</p>
          {cancelled.map(b => <BookingCard key={b.id} b={b} />)}
        </div>
      )}
    </div>
  );
}

// ── Turf Submit Form ───────────────────────────────────────────────────────────
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

  const onSubmit = async (values: TurfFormValues) => {
    if (images.length === 0) { setImageError("At least one turf image is required"); return; }
    setIsSubmitting(true);
    try {
      await submitTurf({
        turfName: values.turfName, turfLocation: values.turfLocation,
        turfAddress: values.turfAddress, turfPincode: values.turfPincode,
        turfImageUrls: images.map(i => i.url),
        turfLength: parseInt(values.turfLength), turfWidth: parseInt(values.turfWidth),
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
                  <FormControl><Input {...field} data-testid="input-turf-name" placeholder="e.g. Green Valley Cricket Ground" className="bg-card border-border" /></FormControl>
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
                        {locations.length === 0 ? <SelectItem value="__loading" disabled>Loading…</SelectItem>
                          : locations.map(loc => <SelectItem key={loc} value={loc}>{loc}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="turfAddress" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-muted-foreground text-sm">Full address</FormLabel>
                  <FormControl><Input {...field} data-testid="input-turf-address" placeholder="Street, area, landmark" className="bg-card border-border" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="turfPincode" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-muted-foreground text-sm">Pincode</FormLabel>
                  <FormControl><Input {...field} data-testid="input-turf-pincode" placeholder="6-digit pincode" inputMode="numeric" maxLength={6} className="bg-card border-border" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <div className="grid grid-cols-2 gap-3">
                <FormField control={form.control} name="turfLength" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-muted-foreground text-sm">Length <span className="text-xs text-muted-foreground/70">(m)</span></FormLabel>
                    <FormControl><Input {...field} data-testid="input-turf-length" placeholder="e.g. 120" inputMode="numeric"
                      onChange={e => field.onChange(e.target.value.replace(/\D/g, ""))} className="bg-card border-border" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="turfWidth" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-muted-foreground text-sm">Width <span className="text-xs text-muted-foreground/70">(m)</span></FormLabel>
                    <FormControl><Input {...field} data-testid="input-turf-width" placeholder="e.g. 75" inputMode="numeric"
                      onChange={e => field.onChange(e.target.value.replace(/\D/g, ""))} className="bg-card border-border" /></FormControl>
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
                        <button type="button" data-testid={`button-remove-image-${index}`} onClick={() => { URL.revokeObjectURL(img.previewUrl); setImages(prev => prev.filter((_, i) => i !== index)); }}
                          className="absolute top-1 right-1 bg-black/60 rounded-full p-0.5 text-white opacity-0 group-hover:opacity-100 transition-opacity">
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                    {uploadingIndex !== null && <div className="flex items-center justify-center rounded-md aspect-square bg-muted"><Loader2 className="w-5 h-5 text-muted-foreground animate-spin" /></div>}
                  </div>
                )}
                {images.length < 5 && uploadingIndex === null && (
                  <>
                    <input ref={fileInputRef} type="file" accept="image/png,image/jpeg,image/jpg" className="hidden" data-testid="input-image-file" onChange={handleFileChange} />
                    <button type="button" data-testid="button-add-image" onClick={() => fileInputRef.current?.click()}
                      className="flex items-center gap-2 w-full border border-dashed border-border rounded-md px-4 py-3 text-sm text-muted-foreground hover:border-primary hover:text-primary transition-colors">
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

// ── Add New Turf Form ──────────────────────────────────────────────────────────
const newTurfSchema = z.object({
  name: z.string().min(3, "Name must be at least 3 characters"),
  location: z.string().min(1, "Select a city"),
  address: z.string().min(5, "Full address required"),
  pincode: z.string().regex(/^\d{6}$/, "6-digit pincode required"),
  length: z.string().regex(/^\d+$/).refine(v => parseInt(v) >= 1),
  width: z.string().regex(/^\d+$/).refine(v => parseInt(v) >= 1),
  pricePerHour: z.string().regex(/^\d+$/).refine(v => parseInt(v) >= 100, "Min ₹100"),
});

function NewTurfForm({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [images, setImages] = useState<UploadedImage[]>([]);
  const [uploadingIndex, setUploadingIndex] = useState<number | null>(null);
  const [imageError, setImageError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [locations, setLocations] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch("/api/locations").then(r => r.json()).then(setLocations).catch(() => {});
  }, []);

  const form = useForm({ resolver: zodResolver(newTurfSchema),
    defaultValues: { name: "", location: "", address: "", pincode: "", length: "", width: "", pricePerHour: "1000" },
  });

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (images.length >= 5) { setImageError("Max 5 images"); return; }
    const allowed = ["image/jpeg", "image/jpg", "image/png"];
    if (!allowed.includes(file.type)) { setImageError("Only PNG/JPEG allowed"); return; }
    setImageError("");
    setUploadingIndex(images.length);
    const previewUrl = URL.createObjectURL(file);
    try {
      const fd = new FormData(); fd.append("image", file);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      if (!res.ok) throw new Error((await res.json()).error || "Upload failed");
      const { url } = await res.json();
      setImages(prev => [...prev, { url, previewUrl, name: file.name }]);
    } catch (err: any) {
      URL.revokeObjectURL(previewUrl);
      setImageError(err.message);
    } finally {
      setUploadingIndex(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const onSubmit = async (values: any) => {
    if (images.length === 0) { setImageError("At least one image required"); return; }
    setSubmitting(true);
    try {
      await apiRequest("POST", "/api/owner/turfs", {
        name: values.name, location: values.location, address: values.address,
        pincode: values.pincode, imageUrls: images.map(i => i.url),
        length: parseInt(values.length), width: parseInt(values.width),
        pricePerHour: parseInt(values.pricePerHour),
      });
      queryClient.invalidateQueries({ queryKey: ["/api/owner/turfs"] });
      toast({ title: "Turf submitted!", description: "Your new turf is pending admin review." });
      onSuccess();
    } catch (err: any) {
      toast({ title: "Submission failed", description: err.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-card border border-border rounded-xl p-5 mt-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-foreground font-semibold">Add New Turf</h3>
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
          <XCircle className="w-5 h-5" />
        </button>
      </div>
      <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg px-3 py-2 text-xs text-blue-400">
        This turf will be reviewed by admin before going live.
      </div>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 gap-4">
            <FormField control={form.control} name="name" render={({ field }) => (
              <FormItem><FormLabel className="text-xs text-muted-foreground">Turf Name</FormLabel>
                <FormControl><Input {...field} data-testid="input-new-turf-name" placeholder="e.g. Premier Arena" className="bg-secondary border-border" /></FormControl>
                <FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="location" render={({ field }) => (
              <FormItem><FormLabel className="text-xs text-muted-foreground">City</FormLabel>
                <FormControl>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <SelectTrigger data-testid="select-new-turf-location" className="bg-secondary border-border">
                      <SelectValue placeholder="Select city" />
                    </SelectTrigger>
                    <SelectContent>
                      {locations.map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="address" render={({ field }) => (
              <FormItem><FormLabel className="text-xs text-muted-foreground">Address</FormLabel>
                <FormControl><Input {...field} data-testid="input-new-turf-address" placeholder="Full address" className="bg-secondary border-border" /></FormControl>
                <FormMessage /></FormItem>
            )} />
            <div className="grid grid-cols-2 gap-3">
              <FormField control={form.control} name="pincode" render={({ field }) => (
                <FormItem><FormLabel className="text-xs text-muted-foreground">Pincode</FormLabel>
                  <FormControl><Input {...field} data-testid="input-new-turf-pincode" placeholder="6-digit" inputMode="numeric" maxLength={6} className="bg-secondary border-border" /></FormControl>
                  <FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="pricePerHour" render={({ field }) => (
                <FormItem><FormLabel className="text-xs text-muted-foreground">Price/hr (₹)</FormLabel>
                  <FormControl><Input {...field} data-testid="input-new-turf-price" placeholder="1000" inputMode="numeric" className="bg-secondary border-border" /></FormControl>
                  <FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="length" render={({ field }) => (
                <FormItem><FormLabel className="text-xs text-muted-foreground">Length (m)</FormLabel>
                  <FormControl><Input {...field} data-testid="input-new-turf-length" placeholder="120" inputMode="numeric" onChange={e => field.onChange(e.target.value.replace(/\D/g,""))} className="bg-secondary border-border" /></FormControl>
                  <FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="width" render={({ field }) => (
                <FormItem><FormLabel className="text-xs text-muted-foreground">Width (m)</FormLabel>
                  <FormControl><Input {...field} data-testid="input-new-turf-width" placeholder="75" inputMode="numeric" onChange={e => field.onChange(e.target.value.replace(/\D/g,""))} className="bg-secondary border-border" /></FormControl>
                  <FormMessage /></FormItem>
              )} />
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-2">Images (up to 5)</p>
              {images.length > 0 && (
                <div className="grid grid-cols-3 gap-2 mb-2">
                  {images.map((img, i) => (
                    <div key={i} className="relative group rounded-md overflow-hidden aspect-square bg-muted">
                      <img src={img.previewUrl} alt="" className="w-full h-full object-cover" />
                      <button type="button" onClick={() => setImages(p => p.filter((_,j)=>j!==i))}
                        className="absolute top-1 right-1 bg-black/60 rounded-full p-0.5 text-white opacity-0 group-hover:opacity-100">
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                  {uploadingIndex !== null && <div className="flex items-center justify-center rounded-md aspect-square bg-muted"><Loader2 className="w-4 h-4 animate-spin text-muted-foreground" /></div>}
                </div>
              )}
              {images.length < 5 && uploadingIndex === null && (
                <>
                  <input ref={fileInputRef} type="file" accept="image/png,image/jpeg,image/jpg" className="hidden" onChange={handleFileChange} />
                  <button type="button" onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-2 w-full border border-dashed border-border rounded-md px-3 py-2 text-xs text-muted-foreground hover:border-primary hover:text-primary transition-colors">
                    <ImagePlus className="w-3.5 h-3.5" /> Add image
                  </button>
                </>
              )}
              {imageError && <p className="text-destructive text-xs mt-1">{imageError}</p>}
            </div>
          </div>
          <div className="flex gap-2 pt-1">
            <Button type="button" variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
            <Button type="submit" data-testid="button-submit-new-turf" className="flex-1" disabled={submitting}>
              {submitting ? <><Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />Submitting…</> : "Submit for Review"}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}

// ── Staff Members Panel ───────────────────────────────────────────────────────
function StaffMembersPanel() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showAddForm, setShowAddForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: staff = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/owner/staff"],
  });

  const staffSchema = z.object({
    username: z.string().min(3, "Username must be at least 3 characters"),
    fullName: z.string().min(2, "Full name must be at least 2 characters"),
    email: z.string().email("Invalid email address"),
    phoneNumber: z.string().regex(/^\d{10}$/, "Phone number must be 10 digits"),
    password: z.string().min(6, "Password must be at least 6 characters"),
    dateOfBirth: z.string().min(1, "Date of birth is required"),
  });

  const form = useForm({
    resolver: zodResolver(staffSchema),
    defaultValues: { username: "", fullName: "", email: "", phoneNumber: "", password: "", dateOfBirth: "" },
  });

  const onSubmit = async (values: any) => {
    setIsSubmitting(true);
    try {
      await apiRequest("POST", "/api/owner/staff", values);
      queryClient.invalidateQueries({ queryKey: ["/api/owner/staff"] });
      toast({ title: "Staff member added!", description: "They will be able to login once approved by admin." });
      setShowAddForm(false);
      form.reset();
    } catch (err: any) {
      toast({ title: "Failed to add staff", description: err.message, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mt-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-foreground font-semibold text-sm">Active Staff</h3>
        <Button size="sm" onClick={() => setShowAddForm(true)} className="h-8 text-xs">
          <Plus className="w-3.5 h-3.5 mr-1" /> Add Staff
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[1, 2].map(i => <div key={i} className="h-16 rounded-xl bg-secondary animate-pulse" />)}
        </div>
      ) : staff.length === 0 ? (
        <div className="text-center py-8 border border-dashed border-border rounded-xl">
          <Users className="w-8 h-8 text-muted-foreground mx-auto mb-2 opacity-30" />
          <p className="text-muted-foreground text-xs">No staff members added yet.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {staff.map((s: any) => (
            <div key={s.id} className="bg-card border border-border rounded-xl p-3 flex items-center justify-between">
              <div>
                <p className="text-foreground font-medium text-sm">{s.fullName}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <p className="text-muted-foreground text-xs">@{s.username}</p>
                  <span className={cn(
                    "text-[10px] px-1.5 py-0.5 rounded-full font-medium uppercase tracking-tighter",
                    s.ownerStatus === "account_approved" ? "bg-green-500/10 text-green-500" : "bg-yellow-500/10 text-yellow-500"
                  )}>
                    {s.ownerStatus === "account_approved" ? "Approved" : "Pending Approval"}
                  </span>
                </div>
              </div>
              <p className="text-muted-foreground text-xs tracking-tight">{s.phoneNumber}</p>
            </div>
          ))}
        </div>
      )}

      <Dialog open={showAddForm} onOpenChange={setShowAddForm}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Add New Staff Member</DialogTitle>
          </DialogHeader>
          <div className="bg-primary/10 border border-primary/20 rounded-lg p-3 text-xs text-primary mb-2">
            Username will automatically end with <span className="font-bold">_staff</span>
          </div>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField control={form.control} name="fullName" render={({ field }) => (
                <FormItem><FormLabel className="text-xs">Full Name</FormLabel>
                <FormControl><Input {...field} placeholder="John Doe" className="bg-secondary h-9" /></FormControl>
                <FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="username" render={({ field }) => (
                <FormItem><FormLabel className="text-xs">Username (staff ID)</FormLabel>
                <FormControl><Input {...field} placeholder="johndoe" className="bg-secondary h-9" /></FormControl>
                <FormMessage /></FormItem>
              )} />
              <div className="grid grid-cols-2 gap-3">
                <FormField control={form.control} name="email" render={({ field }) => (
                  <FormItem><FormLabel className="text-xs">Email</FormLabel>
                  <FormControl><Input {...field} type="email" placeholder="john@example.com" className="bg-secondary h-9" /></FormControl>
                  <FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="phoneNumber" render={({ field }) => (
                  <FormItem><FormLabel className="text-xs">Phone (10 digits)</FormLabel>
                  <FormControl><Input {...field} placeholder="9876543210" className="bg-secondary h-9" /></FormControl>
                  <FormMessage /></FormItem>
                )} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <FormField control={form.control} name="password" render={({ field }) => (
                  <FormItem><FormLabel className="text-xs">Initial Password</FormLabel>
                  <FormControl><Input {...field} type="password" placeholder="••••••••" className="bg-secondary h-9" /></FormControl>
                  <FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="dateOfBirth" render={({ field }) => (
                  <FormItem><FormLabel className="text-xs">Date of Birth</FormLabel>
                  <FormControl><Input {...field} type="date" className="bg-secondary h-9" /></FormControl>
                  <FormMessage /></FormItem>
                )} />
              </div>
              <Button type="submit" className="w-full mt-2" disabled={isSubmitting}>
                {isSubmitting ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Adding…</> : "Add Staff Member"}
              </Button>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Main TurfOwnerHome ─────────────────────────────────────────────────────────
type TabType = "slots" | "bookings" | "analytics" | "edit" | "reviews" | "staff";

export default function TurfStaffHome() {
  useSEO({ title: "Owner Dashboard | Quick Turf", description: "Manage your turf bookings, pricing, and analytics." });
  const { user, logout } = useAuth();
  const [, navigate] = useLocation();
  const [expandedTurfId, setExpandedTurfId] = useState<string | null>(null);
  const [activeTabs, setActiveTabs] = useState<Record<string, TabType>>({});
  
  const queryClient = useQueryClient();

  const { data: turfs = [] } = useQuery<Turf[]>({
    queryKey: ["/api/owner/turfs"],
    enabled: user?.role === "turf_staff" || user?.turfStatus === "turf_approved",
    select: (data) => data as any[],
  });

  const approvedTurfs = (turfs as any[]).filter(t => !t.pendingStatus);
  const pendingTurfs = (turfs as any[]).filter(t => t.pendingStatus === "pending_review");
  const rejectedTurfs = (turfs as any[]).filter(t => t.pendingStatus === "rejected");

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  const baseTabs: { key: TabType; label: string; icon: any }[] = [
    { key: "slots", label: "Slots", icon: CalendarDays },
    { key: "bookings", label: "Bookings", icon: BookOpen },
    { key: "analytics", label: "Analytics", icon: TrendingUp },
    { key: "edit", label: "Edit Turf", icon: Pencil },
    { key: "reviews", label: "Reviews", icon: Star },
  ];

  const staffTabs: { key: TabType; label: string; icon: any }[] = [
    { key: "slots", label: "Slots", icon: CalendarDays },
    { key: "bookings", label: "Bookings", icon: BookOpen },
  ];

  const tabs = user.role === "turf_staff" ? staffTabs : baseTabs;

  const ownerSpecificPanels = user.role === "turf_owner" && (
    <div className="mt-10 pt-6 border-t border-border">
      <div className="flex items-center gap-2 mb-4">
        <Users className="w-5 h-5 text-primary" />
        <h2 className="text-foreground font-semibold text-base">Management</h2>
      </div>
      <StaffMembersPanel />
    </div>
  );

  if (!user) return null;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="flex items-center justify-between px-5 pt-8 pb-4">
        <div>
          <p className="text-muted-foreground text-xs uppercase tracking-wider font-medium">QuickTurf Staff</p>
          <h1 className="text-foreground font-bold text-xl mt-0.5">{user.fullName ?? `@${user.username}`}</h1>
          {user.fullName && <p className="text-muted-foreground text-xs">@{user.username}</p>}
        </div>
        <Button size="icon" variant="ghost" data-testid="button-logout" onClick={handleLogout}>
          <LogOut className="w-5 h-5 text-muted-foreground" />
        </Button>
      </div>

      <div className="flex-1 px-5 pb-10">
        {/* ── Pending Account ──────────────── */}
        {user.ownerStatus === "pending_account" && (
          <div className="flex flex-col items-center text-center pt-12 pb-8">
            <div className="w-20 h-20 rounded-full bg-yellow-500/15 flex items-center justify-center mb-5">
              <Clock className="w-10 h-10 text-yellow-500" />
            </div>
            <h2 className="text-foreground text-xl font-bold mb-2">Account under review</h2>
            <p className="text-muted-foreground text-sm leading-relaxed max-w-sm">
              Your account registration is being reviewed by our team. Once approved, you'll be able to list your turf.
            </p>
            <p className="text-muted-foreground text-xs mt-6">No further action needed right now.</p>
          </div>
        )}

        {/* ── Account Rejected ─────────────── */}
        {user.ownerStatus === "account_rejected" && (
          <div className="flex flex-col items-center text-center pt-12">
            <div className="w-20 h-20 rounded-full bg-destructive/15 flex items-center justify-center mb-5">
              <XCircle className="w-10 h-10 text-destructive" />
            </div>
            <h2 className="text-foreground text-xl font-bold mb-2">Account not approved</h2>
            <p className="text-muted-foreground text-sm leading-relaxed max-w-sm">
              Your account application was not approved. Please contact us for more information.
            </p>
          </div>
        )}

        {/* ── Account Approved — Submit Turf ── */}
        {user.ownerStatus === "account_approved" && !user.turfStatus && user.role !== "turf_staff" && <TurfSubmitForm />}

        {/* ── Turf Pending Review ── */}
        {user.ownerStatus === "account_approved" && user.turfStatus === "pending_turf" && user.role !== "turf_staff" && (
          <div className="flex flex-col items-center text-center pt-12 pb-8">
            <div className="w-20 h-20 rounded-full bg-yellow-500/15 flex items-center justify-center mb-5">
              <Clock className="w-10 h-10 text-yellow-500" />
            </div>
            <h2 className="text-foreground text-xl font-bold mb-2">Turf under review</h2>
            <p className="text-muted-foreground text-sm leading-relaxed max-w-sm">
              Your turf details have been submitted and are being reviewed. Once approved, your turf will go live.
            </p>
            {user.turfName && (
              <div className="w-full mt-8 bg-card border border-border rounded-xl p-4 text-left space-y-3">
                <p className="text-foreground font-semibold text-sm">Submitted turf details</p>
                {[
                  { icon: Building2, label: "Turf name", value: user.turfName },
                  { icon: MapPin, label: "Location", value: user.turfLocation },
                  { icon: MapPin, label: "Address", value: user.turfAddress },
                ].filter(r => r.value).map(r => (
                  <div key={r.label} className="flex items-start gap-3">
                    <r.icon className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                    <div><p className="text-xs text-muted-foreground">{r.label}</p><p className="text-foreground text-sm font-medium">{r.value}</p></div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Turf Rejected — Resubmit ──────── */}
        {user.ownerStatus === "account_approved" && user.turfStatus === "turf_rejected" && user.role !== "turf_staff" && (
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

        {/* ── Turf Approved — Dashboard ──────── */}
        {(user.role === "turf_staff" || (user.ownerStatus === "account_approved" && user.turfStatus === "turf_approved")) && (
          <div>
            <div className="flex items-center gap-3 bg-primary/10 border border-primary/20 rounded-xl px-4 py-3 mb-6">
              <CheckCircle className="w-5 h-5 text-primary shrink-0" />
              <div className="flex-1">
                <p className="text-primary font-semibold text-sm">Turf live</p>
                <p className="text-muted-foreground text-xs">Your turfs are active and accepting bookings</p>
              </div>
              <span className="text-xs text-muted-foreground">{approvedTurfs.length} active</span>
            </div>

            {turfs.length === 0 ? (
              <div className="text-center pt-10">
                <p className="text-muted-foreground text-sm">{user.role === 'turf_staff' ? 'Your manager has no active turfs. Wait for them to get set up!' : 'Your turf is being set up. Check back shortly.'}</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-foreground font-semibold text-base">Your turfs ({turfs.length})</h2>
                </div>

                {/* Approved Turfs */}
                {approvedTurfs.map((turf: any) => {
                  const isExpanded = expandedTurfId === turf.id;
                  const activeTab = activeTabs[turf.id] ?? "slots";
                  return (
                    <div key={turf.id} data-testid={`card-turf-${turf.id}`} className="bg-card border border-border rounded-xl overflow-hidden">
                      {turf.imageUrl && <img src={turf.imageUrl} alt={turf.name} className="w-full h-36 object-cover" />}
                      <div className="p-4">
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="text-foreground font-semibold">{turf.name}</h3>
                          <span className="shrink-0 text-xs bg-primary/15 text-primary px-2 py-0.5 rounded-full">Live</span>
                        </div>
                        <div className="flex items-center gap-1 mt-1">
                          <MapPin className="w-3 h-3 text-muted-foreground" />
                          <p className="text-muted-foreground text-xs">{turf.location}</p>
                        </div>
                        <div className="flex items-center justify-between mt-3">
                          <p className="text-primary font-semibold text-sm">₹{turf.pricePerHour}/hr</p>
                          <span className="text-xs text-muted-foreground">{turf.isAvailable ? "Available" : "Unavailable"}</span>
                        </div>
                        <button data-testid={`button-manage-${turf.id}`}
                          onClick={() => setExpandedTurfId(isExpanded ? null : turf.id)}
                          className="mt-4 w-full flex items-center justify-between px-4 py-2.5 bg-secondary rounded-md text-sm font-medium text-foreground hover:bg-secondary/70 transition-colors">
                          <div className="flex items-center gap-2">
                            <Settings className="w-4 h-4 text-primary" />
                            <span>Manage</span>
                          </div>
                          {isExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                        </button>

                        {isExpanded && (
                          <div className="mt-4">
                            <div className="flex overflow-x-auto gap-1 bg-secondary rounded-lg p-1 no-scrollbar">
                              {tabs.map(tab => (
                                <button key={tab.key} data-testid={`tab-${tab.key}-${turf.id}`}
                                  onClick={() => setActiveTabs(prev => ({ ...prev, [turf.id]: tab.key }))}
                                  className={cn(
                                    "flex items-center gap-1.5 rounded-md px-2.5 py-2 text-xs font-medium transition-all shrink-0",
                                    activeTab === tab.key
                                      ? "bg-background text-foreground shadow-sm"
                                      : "text-muted-foreground hover:text-foreground"
                                  )}>
                                  <tab.icon className="w-3.5 h-3.5" />
                                  {tab.label}
                                </button>
                              ))}
                            </div>
                            {activeTab === "slots" && <SlotManagementPanel turf={turf} />}
                            {activeTab === "bookings" && <BookingsPanel turf={turf} />}
                            {activeTab === "analytics" && <AnalyticsPanel turf={turf} />}
                            {activeTab === "edit" && (
                              <EditTurfPanel turf={turf} onSuccess={() => {
                                queryClient.invalidateQueries({ queryKey: ["/api/owner/turfs"] });
                              }} />
                            )}
                            {activeTab === "reviews" && <ReviewsPanel turf={turf} />}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}

                {/* Pending Turfs */}
                {pendingTurfs.map((turf: any) => (
                  <div key={turf.id} data-testid={`card-pending-turf-${turf.id}`} className="bg-card border border-yellow-500/30 rounded-xl overflow-hidden opacity-80">
                    {turf.imageUrl && <img src={turf.imageUrl} alt={turf.name} className="w-full h-28 object-cover" />}
                    <div className="p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <h3 className="text-foreground font-semibold">{turf.name}</h3>
                        <span className="text-xs bg-yellow-500/20 text-yellow-500 px-2 py-0.5 rounded-full font-medium">Pending Review</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-muted-foreground" />
                        <p className="text-muted-foreground text-xs">{turf.location}</p>
                      </div>
                      <p className="text-xs text-muted-foreground">This turf is awaiting admin approval before going live.</p>
                    </div>
                  </div>
                ))}

                {/* Rejected Turfs */}
                {rejectedTurfs.map((turf: any) => (
                  <div key={turf.id} data-testid={`card-rejected-turf-${turf.id}`} className="bg-card border border-destructive/30 rounded-xl overflow-hidden opacity-70">
                    <div className="p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <h3 className="text-foreground font-semibold">{turf.name}</h3>
                        <span className="text-xs bg-destructive/20 text-destructive px-2 py-0.5 rounded-full font-medium">Rejected</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-muted-foreground" />
                        <p className="text-muted-foreground text-xs">{turf.location}</p>
                      </div>
                      <p className="text-xs text-muted-foreground">This turf listing was rejected. Contact admin for more information.</p>
                    </div>
                  </div>
                ))}

                
              </div>
            )}

            {ownerSpecificPanels}
          </div>
        )}
      </div>
    </div>
  );
}

