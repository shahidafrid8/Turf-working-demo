import { useState } from "react";
import { useLocation } from "wouter";
import {
  ChevronLeft, ShieldCheck, CheckCircle, XCircle, Eye, EyeOff,
  Loader2, ImageIcon, Users, Building2, Clock, MapPin,
  BookOpen, UserCheck, UserX, RefreshCw, Plus, Trash2, ChevronRight,
  Phone, Mail, Calendar, CreditCard, User, Hash, FileImage
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useSEO } from "@/lib/seo";

interface Player {
  id: string;
  username: string;
  fullName: string | null;
  email: string;
  phoneNumber: string;
  dateOfBirth: string | null;
  isBanned?: boolean;
  banReason?: string | null;
}

interface PendingAccount {
  id: string;
  username: string;
  fullName: string | null;
  email: string;
  phoneNumber: string;
  dateOfBirth: string | null;
  ownerStatus: string | null;
}

interface PendingTurf {
  id: string;
  username: string;
  fullName: string | null;
  email: string;
  phoneNumber: string;
  dateOfBirth: string | null;
  turfName: string | null;
  turfLocation: string | null;
  turfAddress: string | null;
  turfPincode: string | null;
  turfImageUrls: string[] | null;
  turfStatus: string | null;
}

interface AdminStats {
  totalPlayers: number;
  totalOwners: number;
  pendingAccounts: number;
  pendingTurfs: number;
  approvedOwners: number;
  rejectedOwners: number;
  totalTurfs: number;
  totalBookings: number;
}

interface AllOwner {
  id: string;
  username: string;
  fullName: string | null;
  email: string;
  phoneNumber: string;
  dateOfBirth: string | null;
  turfName: string | null;
  turfLocation: string | null;
  turfAddress: string | null;
  turfPincode: string | null;
  turfImageUrls: string[] | null;
  ownerStatus: string | null;
  turfStatus: string | null;
}

interface Booking {
  id: string;
  turfId: string;
  turfName: string;
  turfAddress: string;
  date: string;
  startTime: string;
  endTime: string;
  duration: number;
  totalAmount: number;
  paidAmount: number;
  balanceAmount: number;
  paymentMethod: string;
  status: string;
  bookingCode: string;
  createdAt: string;
}

type Tab = "overview" | "requests" | "locations" | "owners" | "players" | "bookings" | "payouts" | "search";

function DetailRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string | null | undefined }) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-3 py-2.5 border-b border-border last:border-0">
      <div className="text-muted-foreground mt-0.5 shrink-0">{icon}</div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-muted-foreground mb-0.5">{label}</p>
        <p className="text-foreground text-sm font-medium break-words">{value}</p>
      </div>
    </div>
  );
}

function StatusBadge({ label, color }: { label: string; color: "green" | "red" | "yellow" | "blue" }) {
  const cls = {
    green: "text-green-400 bg-green-400/10",
    red: "text-red-400 bg-red-400/10",
    yellow: "text-yellow-400 bg-yellow-400/10",
    blue: "text-blue-400 bg-blue-400/10",
  }[color];
  return <span className={`inline-flex items-center text-xs font-semibold px-2.5 py-1 rounded-full ${cls}`}>{label}</span>;
}

function ownerStatusDisplay(status: string | null): { label: string; color: "green" | "red" | "yellow" } {
  if (status === "account_approved") return { label: "Account Approved", color: "green" };
  if (status === "account_rejected") return { label: "Account Rejected", color: "red" };
  return { label: "Pending Review", color: "yellow" };
}

function turfStatusDisplay(status: string | null): { label: string; color: "green" | "red" | "yellow" | "blue" } | null {
  if (status === "turf_approved") return { label: "Turf Live", color: "green" };
  if (status === "turf_rejected") return { label: "Turf Rejected", color: "red" };
  if (status === "pending_turf") return { label: "Turf Pending Review", color: "yellow" };
  return null;
}

function formatDob(dob: string | null) {
  if (!dob) return null;
  try {
    const d = new Date(dob);
    return d.toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });
  } catch { return dob; }
}

export default function Admin() {
  useSEO({ title: "Admin Portal | Quick Turf", description: "Admin Dashboard" });
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [adminKey, setAdminKey] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [tab, setTab] = useState<Tab>("overview");

  const [stats, setStats] = useState<AdminStats | null>(null);
  const [pendingAccounts, setPendingAccounts] = useState<PendingAccount[]>([]);
  const [pendingTurfs, setPendingTurfs] = useState<PendingTurf[]>([]);
  const [pendingTurfListings, setPendingTurfListings] = useState<any[]>([]);
  const [allOwners, setAllOwners] = useState<AllOwner[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [locations, setLocations] = useState<string[]>([]);
  const [newLocation, setNewLocation] = useState("");
  const [isAddingLocation, setIsAddingLocation] = useState(false);
  const [removingLocation, setRemovingLocation] = useState<string | null>(null);
  const [actionPending, setActionPending] = useState<string | null>(null);

  // New states for Payouts and Search
  const [payouts, setPayouts] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<{ users: any[], bookings: any[] }>({ users: [], bookings: [] });
  const [isSearching, setIsSearching] = useState(false);

  // Detail view state
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [selectedOwner, setSelectedOwner] = useState<AllOwner | null>(null);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);

  // Helper: all admin API calls send key via header, not query param
  const adminFetch = (url: string, key: string, options?: RequestInit) =>
    fetch(url, {
      ...options,
      headers: {
        ...(options?.headers || {}),
        "x-admin-key": key,
      },
    });

  const fetchAll = async (key: string, quiet = false) => {
    if (!quiet) setIsLoading(true);
    else setIsRefreshing(true);
    try {
      const [statsRes, pendingAccRes, pendingTurfRes, allRes, locRes, playersRes, bookingsRes, pendingListingsRes, payoutsRes] = await Promise.all([
        adminFetch(`/api/admin/stats`, key),
        adminFetch(`/api/admin/owners`, key),
        adminFetch(`/api/admin/pending-turfs`, key),
        adminFetch(`/api/admin/all-owners`, key),
        fetch(`/api/locations`),
        adminFetch(`/api/admin/players`, key),
        adminFetch(`/api/admin/bookings`, key),
        adminFetch(`/api/admin/pending-turf-listings`, key),
        adminFetch(`/api/admin/payouts`, key),
      ]);
      if (statsRes.status === 403) throw new Error("Invalid admin key");
      if (!statsRes.ok) throw new Error("Failed to load data");
      const [s, pa, pt, a, l, pl, bk, ptl, pay] = await Promise.all([
        statsRes.json(), pendingAccRes.json(), pendingTurfRes.json(), allRes.json(),
        locRes.json(), playersRes.json(), bookingsRes.json(), pendingListingsRes.json(), payoutsRes.json()
      ]);
      setStats(s);
      setPendingAccounts(pa);
      setPendingTurfs(pt);
      setPendingTurfListings(ptl);
      setAllOwners(a);
      setLocations(l);
      setPlayers(pl);
      setBookings(bk);
      setPayouts(pay);
      setIsUnlocked(true);
    } catch (err: any) {
      toast({ title: "Access denied", description: err.message, variant: "destructive" });
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const handleAddLocation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLocation.trim()) return;
    setIsAddingLocation(true);
    try {
      const res = await adminFetch(`/api/admin/locations`, adminKey, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newLocation.trim() }),
      });
      if (!res.ok) throw new Error("Failed to add location");
      setLocations(await res.json());
      setNewLocation("");
      toast({ title: "Location added", description: newLocation.trim() });
    } catch {
      toast({ title: "Error", description: "Could not add location.", variant: "destructive" });
    } finally {
      setIsAddingLocation(false);
    }
  };

  const handleRemoveLocation = async (name: string) => {
    setRemovingLocation(name);
    try {
      const res = await adminFetch(`/api/admin/locations/${encodeURIComponent(name)}`, adminKey, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to remove");
      setLocations(await res.json());
      toast({ title: "Location removed" });
    } catch {
      toast({ title: "Error", description: "Could not remove location.", variant: "destructive" });
    } finally {
      setRemovingLocation(null);
    }
  };

  const handleUnlock = (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminKey.trim()) return;
    fetchAll(adminKey.trim());
  };

  const handleAccountAction = async (id: string, action: "approve" | "reject") => {
    setActionPending(id + action);
    try {
      const res = await adminFetch(`/api/admin/owners/${id}/${action}`, adminKey, { method: "POST" });
      if (!res.ok) throw new Error("Action failed");
      await fetchAll(adminKey, true);
      toast({
        title: action === "approve" ? "Account approved" : "Account rejected",
        description: action === "approve" ? "The owner can now submit their turf." : "The account has been rejected.",
      });
    } catch {
      toast({ title: "Error", description: "Something went wrong.", variant: "destructive" });
    } finally {
      setActionPending(null);
    }
  };

  const handleTurfAction = async (id: string, action: "approve-turf" | "reject-turf") => {
    setActionPending(id + action);
    try {
      const res = await adminFetch(`/api/admin/owners/${id}/${action}`, adminKey, { method: "POST" });
      if (!res.ok) throw new Error("Action failed");
      await fetchAll(adminKey, true);
      toast({
        title: action === "approve-turf" ? "Turf approved" : "Turf rejected",
        description: action === "approve-turf" ? "The turf is now live on the platform." : "The turf listing has been rejected.",
      });
    } catch {
      toast({ title: "Error", description: "Something went wrong.", variant: "destructive" });
    } finally {
      setActionPending(null);
    }
  };

  const handleTurfListingAction = async (turfId: string, action: "approve" | "reject") => {
    setActionPending(turfId + action);
    try {
      const res = await adminFetch(`/api/admin/turfs/${turfId}/${action}`, adminKey, { method: "POST" });
      if (!res.ok) throw new Error("Action failed");
      await fetchAll(adminKey, true);
      toast({
        title: action === "approve" ? "Turf approved" : "Turf rejected",
        description: action === "approve" ? "The additional turf is now live." : "The turf listing has been rejected.",
      });
    } catch {
      toast({ title: "Error", description: "Something went wrong.", variant: "destructive" });
    } finally {
      setActionPending(null);
    }
  };

  const handleGlobalSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim().length < 2) {
      toast({ title: "Query too short", description: "Search query must be at least 2 characters.", variant: "destructive" });
      return;
    }
    setIsSearching(true);
    try {
      const res = await adminFetch(`/api/admin/search?q=${encodeURIComponent(searchQuery)}`, adminKey);
      if (!res.ok) throw new Error("Search failed");
      setSearchResults(await res.json());
    } catch {
      toast({ title: "Error", description: "Failed to perform global search.", variant: "destructive" });
    } finally {
      setIsSearching(false);
    }
  };

  const handleBanToggle = async (userId: string, isBanned: boolean) => {
    try {
      if (!isBanned) {
        const reason = window.prompt("Enter reason for suspension:");
        if (!reason) return;
        const res = await adminFetch(`/api/admin/users/${userId}/ban`, adminKey, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reason })
        });
        if (!res.ok) throw new Error("Failed to ban user");
        toast({ title: "User banned", description: "The account has been suspended." });
      } else {
        const res = await adminFetch(`/api/admin/users/${userId}/unban`, adminKey, { method: "POST" });
        if (!res.ok) throw new Error("Failed to unban user");
        toast({ title: "User unbanned", description: "The account has been restored." });
      }
      fetchAll(adminKey, true); // Refresh list
    } catch {
      toast({ title: "Error", description: "Something went wrong.", variant: "destructive" });
    }
  };

  const totalPending = (stats?.pendingAccounts ?? 0) + (stats?.pendingTurfs ?? 0) + pendingTurfListings.length;

  // ── Player Detail View ─────────────────────────────────────────────────────
  if (selectedPlayer) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <div className="flex items-center px-4 pt-6 pb-4 border-b border-border">
          <button type="button" onClick={() => setSelectedPlayer(null)} data-testid="button-back-player" className="text-muted-foreground mr-3">
            <ChevronLeft className="w-6 h-6" />
          </button>
          <span className="font-semibold text-foreground text-sm">Player Details</span>
        </div>
        <div className="flex-1 px-4 py-5 overflow-y-auto">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-16 h-16 rounded-full bg-blue-500/15 flex items-center justify-center shrink-0">
              <span className="text-blue-400 font-bold text-2xl">
                {(selectedPlayer.fullName ?? selectedPlayer.username)[0].toUpperCase()}
              </span>
            </div>
            <div>
              {selectedPlayer.fullName && (
                <p className="text-foreground font-bold text-xl">{selectedPlayer.fullName}</p>
              )}
              <p className="text-muted-foreground text-sm">@{selectedPlayer.username}</p>
              <StatusBadge label="Player" color="blue" />
            </div>
          </div>

          <div className="bg-card border border-border rounded-xl px-4">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider pt-4 pb-2">Account Details</p>
            <DetailRow icon={<User className="w-4 h-4" />} label="Full Name" value={selectedPlayer.fullName} />
            <DetailRow icon={<Hash className="w-4 h-4" />} label="Username" value={`@${selectedPlayer.username}`} />
            <DetailRow icon={<Mail className="w-4 h-4" />} label="Email" value={selectedPlayer.email} />
            <DetailRow icon={<Phone className="w-4 h-4" />} label="Phone Number" value={selectedPlayer.phoneNumber} />
            <DetailRow icon={<Calendar className="w-4 h-4" />} label="Date of Birth" value={formatDob(selectedPlayer.dateOfBirth)} />
            <div className="py-2.5">
              <p className="text-xs text-muted-foreground mb-1">Account ID</p>
              <p className="text-foreground text-xs font-mono break-all">{selectedPlayer.id}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Owner Detail View ──────────────────────────────────────────────────────
  if (selectedOwner) {
    const accStatus = ownerStatusDisplay(selectedOwner.ownerStatus);
    const tStatus = turfStatusDisplay(selectedOwner.turfStatus);
    const images = selectedOwner.turfImageUrls ?? [];

    return (
      <div className="min-h-screen bg-background flex flex-col">
        <div className="flex items-center px-4 pt-6 pb-4 border-b border-border">
          <button type="button" onClick={() => { setSelectedOwner(null); setSelectedImageIndex(0); }} data-testid="button-back-owner" className="text-muted-foreground mr-3">
            <ChevronLeft className="w-6 h-6" />
          </button>
          <span className="font-semibold text-foreground text-sm">Owner Details</span>
        </div>
        <div className="flex-1 px-4 py-5 overflow-y-auto space-y-4">

          {/* Identity */}
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-primary/15 flex items-center justify-center shrink-0">
              <span className="text-primary font-bold text-2xl">
                {(selectedOwner.fullName ?? selectedOwner.turfName ?? selectedOwner.username)[0].toUpperCase()}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              {selectedOwner.fullName && <p className="text-foreground font-bold text-xl">{selectedOwner.fullName}</p>}
              <p className="text-muted-foreground text-sm">@{selectedOwner.username}</p>
              <div className="flex flex-wrap gap-1.5 mt-1.5">
                <StatusBadge label={accStatus.label} color={accStatus.color} />
                {tStatus && <StatusBadge label={tStatus.label} color={tStatus.color} />}
              </div>
            </div>
          </div>

          {/* Account info */}
          <div className="bg-card border border-border rounded-xl px-4">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider pt-4 pb-2">Account Details</p>
            <DetailRow icon={<User className="w-4 h-4" />} label="Full Name" value={selectedOwner.fullName} />
            <DetailRow icon={<Hash className="w-4 h-4" />} label="Username" value={`@${selectedOwner.username}`} />
            <DetailRow icon={<Mail className="w-4 h-4" />} label="Email" value={selectedOwner.email} />
            <DetailRow icon={<Phone className="w-4 h-4" />} label="Phone Number" value={selectedOwner.phoneNumber} />
            <DetailRow icon={<Calendar className="w-4 h-4" />} label="Date of Birth" value={formatDob(selectedOwner.dateOfBirth)} />
            <div className="py-2.5">
              <p className="text-xs text-muted-foreground mb-1">Account ID</p>
              <p className="text-foreground text-xs font-mono break-all">{selectedOwner.id}</p>
            </div>
          </div>

          {/* Turf info (if submitted) */}
          {selectedOwner.turfName && (
            <div className="bg-card border border-border rounded-xl overflow-hidden">
              {/* Turf images */}
              {images.length > 0 && (
                <div>
                  <img
                    src={images[selectedImageIndex]}
                    alt={selectedOwner.turfName}
                    className="w-full h-48 object-cover"
                    data-testid="img-owner-turf-main"
                  />
                  {images.length > 1 && (
                    <div className="flex gap-1.5 p-2 bg-muted/10">
                      {images.map((url, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => setSelectedImageIndex(i)}
                          data-testid={`thumb-${i}`}
                          className={`h-12 flex-1 rounded overflow-hidden border-2 transition-colors ${i === selectedImageIndex ? "border-primary" : "border-transparent opacity-60"}`}
                        >
                          <img src={url} alt="" className="w-full h-full object-cover" />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
              <div className="px-4">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider pt-4 pb-2">Turf Details</p>
                <DetailRow icon={<Building2 className="w-4 h-4" />} label="Turf Name" value={selectedOwner.turfName} />
                <DetailRow icon={<MapPin className="w-4 h-4" />} label="City / Location" value={selectedOwner.turfLocation} />
                <DetailRow icon={<MapPin className="w-4 h-4" />} label="Full Address" value={selectedOwner.turfAddress} />
                <DetailRow icon={<Hash className="w-4 h-4" />} label="Pincode" value={selectedOwner.turfPincode} />
                <DetailRow icon={<FileImage className="w-4 h-4" />} label="Images Uploaded" value={images.length > 0 ? `${images.length} image${images.length > 1 ? "s" : ""}` : null} />
              </div>
            </div>
          )}

          {!selectedOwner.turfName && (
            <div className="bg-card border border-border rounded-xl px-4 py-5 text-center">
              <Building2 className="w-8 h-8 text-muted-foreground opacity-40 mx-auto mb-2" />
              <p className="text-muted-foreground text-sm">No turf submitted yet</p>
              {selectedOwner.ownerStatus === "account_approved" && (
                <p className="text-xs text-muted-foreground mt-1">Owner's account is approved — awaiting turf submission.</p>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── Main admin panel ───────────────────────────────────────────────────────
  const subPageTitle: Partial<Record<Tab, string>> = {
    requests: "Pending Reviews",
    players: "Players",
    bookings: "Bookings",
    owners: "Turf Owners",
    locations: "Locations",
    payouts: "Payout Ledger",
    search: "Global Search",
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-6 pb-4 border-b border-border">
        <button type="button" data-testid="button-back" onClick={() => navigate("/owner/login")} className="text-muted-foreground">
          <ChevronLeft className="w-6 h-6" />
        </button>
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-primary" />
          <span className="font-semibold text-foreground text-sm">Admin Panel</span>
        </div>
        {isUnlocked ? (
          <button type="button" onClick={() => fetchAll(adminKey, true)} disabled={isRefreshing} data-testid="button-refresh" className="text-muted-foreground hover:text-foreground transition-colors">
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? "animate-spin" : ""}`} />
          </button>
        ) : <div className="w-6" />}
      </div>

      {!isUnlocked ? (
        <div className="flex-1 flex flex-col items-center justify-center px-6">
          <div className="w-14 h-14 rounded-full bg-card border border-border flex items-center justify-center mb-5">
            <ShieldCheck className="w-6 h-6 text-primary" />
          </div>
          <h2 className="text-lg font-semibold text-foreground mb-1">Admin Access</h2>
          <p className="text-muted-foreground text-sm text-center mb-8">Enter the admin key to access the dashboard.</p>
          <form onSubmit={handleUnlock} className="w-full space-y-4">
            <div className="relative">
              <Input type={showKey ? "text" : "password"} value={adminKey} onChange={e => setAdminKey(e.target.value)} placeholder="Enter admin key" data-testid="input-admin-key" className="bg-card border-border pr-10" autoComplete="off" />
              <button type="button" onClick={() => setShowKey(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <Button type="submit" className="w-full" disabled={isLoading || !adminKey.trim()} data-testid="button-unlock">
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              {isLoading ? "Verifying..." : "Unlock"}
            </Button>
          </form>
        </div>
      ) : (
        <div className="flex-1 flex flex-col">
          {/* Sub-page back header */}
          {tab !== "overview" && (
            <div className="flex items-center gap-3 px-4 py-3 border-b border-border shrink-0">
              <button type="button" onClick={() => setTab("overview")} data-testid="button-back-overview" className="text-muted-foreground hover:text-foreground transition-colors">
                <ChevronLeft className="w-5 h-5" />
              </button>
              <span className="text-sm font-semibold text-foreground">{subPageTitle[tab]}</span>
            </div>
          )}

          {/* ── Overview ── */}
          {tab === "overview" && stats && (
            <div className="flex-1 px-4 py-5 overflow-y-auto">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">Platform stats</p>
              <div className="grid grid-cols-2 gap-3">
                <button type="button" onClick={() => setTab("players")} data-testid="stat-players"
                  className="bg-card border border-border rounded-xl p-4 text-left hover:border-blue-400/40 hover:bg-blue-500/5 transition-colors group">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-blue-500/10 flex items-center justify-center">
                        <Users className="w-3.5 h-3.5 text-blue-400" />
                      </div>
                      <span className="text-xs text-muted-foreground">Players</span>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                  <p className="text-2xl font-bold text-foreground">{stats.totalPlayers}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Registered users</p>
                </button>

                <button type="button" onClick={() => setTab("owners")} data-testid="stat-turfs"
                  className="bg-card border border-border rounded-xl p-4 text-left hover:border-primary/40 hover:bg-primary/5 transition-colors group">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
                        <MapPin className="w-3.5 h-3.5 text-primary" />
                      </div>
                      <span className="text-xs text-muted-foreground">Live Turfs</span>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                  <p className="text-2xl font-bold text-foreground">{stats.totalTurfs}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">On the platform</p>
                </button>

                <button type="button" onClick={() => setTab("bookings")} data-testid="stat-bookings"
                  className="bg-card border border-border rounded-xl p-4 text-left hover:border-purple-400/40 hover:bg-purple-500/5 transition-colors group">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-purple-500/10 flex items-center justify-center">
                        <BookOpen className="w-3.5 h-3.5 text-purple-400" />
                      </div>
                      <span className="text-xs text-muted-foreground">Bookings</span>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                  <p className="text-2xl font-bold text-foreground">{stats.totalBookings}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Total confirmed</p>
                </button>

                <button type="button" onClick={() => setTab("requests")} data-testid="stat-pending"
                  className="bg-card border border-border rounded-xl p-4 text-left hover:border-yellow-400/40 hover:bg-yellow-500/5 transition-colors group">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-yellow-500/10 flex items-center justify-center">
                        <Clock className="w-3.5 h-3.5 text-yellow-400" />
                      </div>
                      <span className="text-xs text-muted-foreground">Requests</span>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                  <p className="text-2xl font-bold text-foreground">{totalPending}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {totalPending > 0 ? "Awaiting review" : "All caught up"}
                  </p>
                </button>

                <button type="button" onClick={() => setTab("payouts")}
                  className="bg-card border border-border rounded-xl p-4 text-left hover:border-orange-400/40 hover:bg-orange-500/5 transition-colors group">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-orange-500/10 flex items-center justify-center">
                        <CreditCard className="w-3.5 h-3.5 text-orange-400" />
                      </div>
                      <span className="text-xs text-muted-foreground">Payouts</span>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                  <p className="text-2xl font-bold text-foreground overflow-hidden text-ellipsis whitespace-nowrap">₹{payouts?.totalCommission.toLocaleString() || 0}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Revenue cut</p>
                </button>

                <button type="button" onClick={() => setTab("search")}
                  className="col-span-2 bg-card border border-border rounded-xl p-4 text-left hover:border-cyan-400/40 hover:bg-cyan-500/5 transition-colors flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-cyan-500/10 flex items-center justify-center">
                      <BookOpen className="w-5 h-5 text-cyan-400" />
                    </div>
                    <div>
                      <p className="font-semibold text-foreground">Global Search</p>
                      <p className="text-xs text-muted-foreground">Find users or bookings easily</p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground opacity-50" />
                </button>

                <button type="button" onClick={() => setTab("locations")} data-testid="stat-locations"
                  className="col-span-2 bg-card border border-border rounded-xl p-4 text-left hover:border-green-400/40 hover:bg-green-500/5 transition-colors group">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-green-500/10 flex items-center justify-center">
                        <MapPin className="w-3.5 h-3.5 text-green-400" />
                      </div>
                      <span className="text-xs text-muted-foreground">Locations</span>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                  <p className="text-2xl font-bold text-foreground">{locations.length}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Cities on the platform</p>
                </button>
              </div>
            </div>
          )}

          {tab === "payouts" && payouts && (
            <div className="flex-1 px-4 py-5 overflow-y-auto">
              <div className="grid grid-cols-3 gap-3 mb-6">
                 <div className="p-4 bg-card rounded-xl border border-border text-center">
                    <p className="text-xs text-muted-foreground mb-1">Gross Rev</p>
                    <p className="text-lg font-semibold">₹{payouts.totalGrossRevenue.toLocaleString()}</p>
                 </div>
                 <div className="p-4 bg-card rounded-xl border border-border text-center">
                    <p className="text-xs text-muted-foreground mb-1">Platform Cut</p>
                    <p className="text-lg font-semibold text-green-500">₹{payouts.totalCommission.toLocaleString()}</p>
                 </div>
                 <div className="p-4 bg-card rounded-xl border border-border text-center">
                    <p className="text-xs text-muted-foreground mb-1">Due to Owners</p>
                    <p className="text-lg font-semibold text-orange-500">₹{payouts.totalNetPayout.toLocaleString()}</p>
                 </div>
              </div>
              
              <h3 className="font-medium text-foreground mb-3">Owner Settlements</h3>
              <div className="space-y-3">
                {payouts.ownerPayouts.map((o: any) => (
                  <div key={o.turfId} className="p-4 bg-card border border-border rounded-xl">
                    <p className="font-semibold text-sm mb-1">{o.turfName}</p>
                    <p className="text-xs text-muted-foreground mb-3">{o.ownerName}</p>
                    <div className="flex items-end justify-between bg-muted/30 p-2 rounded-lg">
                      <div>
                        <p className="text-xs text-muted-foreground">Bookings: {o.bookingCount}</p>
                        <p className="text-xs text-muted-foreground">Fee: -₹{o.commission}</p>
                      </div>
                      <div className="text-right">
                         <p className="text-[10px] text-muted-foreground uppercase">Net Payout</p>
                         <p className="font-semibold">₹{o.netPayout.toLocaleString()}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Pending Requests ── */}
          {tab === "requests" && (
            <div className="flex-1 px-4 py-5 overflow-y-auto space-y-6">

              {/* Pending Accounts */}
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
                  <User className="w-3.5 h-3.5" />
                  Pending Accounts
                  {pendingAccounts.length > 0 && (
                    <span className="bg-yellow-500 text-black text-[10px] font-bold rounded-full px-1.5 py-0.5 leading-none">{pendingAccounts.length}</span>
                  )}
                </p>
                {pendingAccounts.length === 0 ? (
                  <div className="flex items-center gap-2 py-4 text-muted-foreground text-sm">
                    <CheckCircle className="w-4 h-4 text-primary opacity-60" />
                    <span>No pending account registrations</span>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {pendingAccounts.map(owner => (
                      <div key={owner.id} className="bg-card border border-border rounded-xl p-4" data-testid={`card-account-${owner.id}`}>
                        <div className="flex items-start justify-between gap-2 mb-3">
                          <div>
                            <p className="font-semibold text-foreground text-sm">{owner.fullName ?? owner.username}</p>
                            <p className="text-xs text-muted-foreground">@{owner.username}</p>
                          </div>
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-yellow-400 bg-yellow-400/10 px-2 py-0.5 rounded-full">
                            <Clock className="w-3 h-3" /> Pending
                          </span>
                        </div>
                        <div className="space-y-1 mb-4">
                          <p className="text-xs text-muted-foreground flex items-center gap-1.5"><Mail className="w-3 h-3" />{owner.email}</p>
                          <p className="text-xs text-muted-foreground flex items-center gap-1.5"><Phone className="w-3 h-3" />{owner.phoneNumber}</p>
                          {owner.dateOfBirth && <p className="text-xs text-muted-foreground flex items-center gap-1.5"><Calendar className="w-3 h-3" />{formatDob(owner.dateOfBirth)}</p>}
                        </div>
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" className="flex-1 border-red-500/30 text-red-400 hover:bg-red-500/10 hover:text-red-400"
                            onClick={() => handleAccountAction(owner.id, "reject")} disabled={actionPending !== null}
                            data-testid={`button-reject-account-${owner.id}`}>
                            {actionPending === owner.id + "reject" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <XCircle className="w-3.5 h-3.5 mr-1" />}
                            Reject
                          </Button>
                          <Button size="sm" className="flex-1" onClick={() => handleAccountAction(owner.id, "approve")} disabled={actionPending !== null}
                            data-testid={`button-approve-account-${owner.id}`}>
                            {actionPending === owner.id + "approve" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5 mr-1" />}
                            Approve
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Pending Turfs */}
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
                  <Building2 className="w-3.5 h-3.5" />
                  Pending Turfs
                  {pendingTurfs.length > 0 && (
                    <span className="bg-yellow-500 text-black text-[10px] font-bold rounded-full px-1.5 py-0.5 leading-none">{pendingTurfs.length}</span>
                  )}
                </p>
                {pendingTurfs.length === 0 ? (
                  <div className="flex items-center gap-2 py-4 text-muted-foreground text-sm">
                    <CheckCircle className="w-4 h-4 text-primary opacity-60" />
                    <span>No pending turf submissions</span>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {pendingTurfs.map(owner => {
                      const imgs = owner.turfImageUrls ?? [];
                      return (
                        <div key={owner.id} className="bg-card border border-border rounded-xl overflow-hidden" data-testid={`card-turf-${owner.id}`}>
                          {imgs.length > 0 && (
                            <img src={imgs[0]} alt={owner.turfName ?? "Turf"} className="w-full h-40 object-cover" data-testid={`img-turf-${owner.id}`} />
                          )}
                          {imgs.length > 1 && (
                            <div className="flex gap-1 px-2 pt-1.5 pb-0 bg-muted/10">
                              {imgs.slice(1).map((url, i) => (
                                <img key={i} src={url} alt="" className="h-12 flex-1 rounded object-cover" />
                              ))}
                            </div>
                          )}
                          <div className="p-4">
                            <div className="flex items-start justify-between gap-2 mb-1">
                              <p className="font-semibold text-foreground leading-tight" data-testid={`text-turf-name-${owner.id}`}>{owner.turfName}</p>
                              <span className="inline-flex items-center gap-1 text-xs font-medium text-yellow-400 bg-yellow-400/10 px-2 py-0.5 rounded-full shrink-0">
                                <Clock className="w-3 h-3" /> Pending
                              </span>
                            </div>
                            <p className="text-xs text-muted-foreground mb-0.5">by {owner.fullName ?? owner.username} (@{owner.username})</p>
                            <p className="text-muted-foreground text-xs flex items-center gap-1">
                              <MapPin className="w-3 h-3" />{owner.turfLocation}
                              {owner.turfPincode && <> · <span className="font-medium text-foreground">{owner.turfPincode}</span></>}
                            </p>
                            {owner.turfAddress && <p className="text-muted-foreground text-xs mt-0.5 ml-4">{owner.turfAddress}</p>}
                            <div className="flex gap-2 mt-4">
                              <Button size="sm" variant="outline" className="flex-1 border-red-500/30 text-red-400 hover:bg-red-500/10 hover:text-red-400"
                                onClick={() => handleTurfAction(owner.id, "reject-turf")} disabled={actionPending !== null}
                                data-testid={`button-reject-turf-${owner.id}`}>
                                {actionPending === owner.id + "reject-turf" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <XCircle className="w-3.5 h-3.5 mr-1" />}
                                Reject
                              </Button>
                              <Button size="sm" className="flex-1" onClick={() => handleTurfAction(owner.id, "approve-turf")} disabled={actionPending !== null}
                                data-testid={`button-approve-turf-${owner.id}`}>
                                {actionPending === owner.id + "approve-turf" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5 mr-1" />}
                                Approve
                              </Button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Additional Turf Listings (Multi-Turf) */}
              {pendingTurfListings.length > 0 && (
                <div className="mt-6">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                    Additional Turf Listings · {pendingTurfListings.length}
                  </p>
                  <div className="space-y-3">
                    {pendingTurfListings.map((turf: any) => (
                      <div key={turf.id} data-testid={`card-pending-listing-${turf.id}`} className="bg-card border border-border rounded-xl overflow-hidden">
                        {turf.imageUrl && <img src={turf.imageUrl} alt={turf.name} className="w-full h-24 object-cover" />}
                        <div className="p-4 space-y-2">
                          <div className="flex items-center justify-between">
                            <p className="text-foreground font-semibold text-sm">{turf.name}</p>
                            <span className="text-xs bg-blue-500/15 text-blue-400 px-2 py-0.5 rounded-full">Additional</span>
                          </div>
                          <p className="text-xs text-muted-foreground">by {turf.ownerName}</p>
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <MapPin className="w-3 h-3" />{turf.location} · ₹{turf.pricePerHour}/hr
                          </p>
                          {turf.address && <p className="text-xs text-muted-foreground">{turf.address}</p>}
                          <div className="flex gap-2 pt-1">
                            <Button size="sm" variant="outline"
                              className="flex-1 border-red-500/30 text-red-400 hover:bg-red-500/10 hover:text-red-400"
                              onClick={() => handleTurfListingAction(turf.id, "reject")}
                              disabled={actionPending !== null}
                              data-testid={`button-reject-listing-${turf.id}`}>
                              {actionPending === turf.id + "reject" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <XCircle className="w-3.5 h-3.5 mr-1" />}
                              Reject
                            </Button>
                            <Button size="sm" className="flex-1"
                              onClick={() => handleTurfListingAction(turf.id, "approve")}
                              disabled={actionPending !== null}
                              data-testid={`button-approve-listing-${turf.id}`}>
                              {actionPending === turf.id + "approve" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5 mr-1" />}
                              Approve
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── Players tab ── */}
          {tab === "players" && (
            <div className="flex-1 px-4 py-5 overflow-y-auto">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">
                Registered players{players.length > 0 && ` · ${players.length}`}
              </p>
              {players.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                  <Users className="w-10 h-10 text-muted-foreground mb-3 opacity-40" />
                  <p className="text-foreground font-medium">No players yet</p>
                  <p className="text-muted-foreground text-sm mt-1">Players will appear here after signing up.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {players.map((player, i) => (
                    <button
                      type="button"
                      key={player.id}
                      onClick={() => setSelectedPlayer(player)}
                      data-testid={`card-player-${player.id}`}
                      className="w-full bg-card border border-border rounded-xl px-4 py-3 flex items-center gap-3 hover:border-primary/40 hover:bg-primary/5 transition-colors text-left"
                    >
                      <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center shrink-0">
                        <span className="text-blue-400 font-bold">{(player.fullName ?? player.username)[0].toUpperCase()}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        {player.fullName && <p className="font-medium text-foreground text-sm leading-tight">{player.fullName}</p>}
                        <p className="text-muted-foreground text-xs">@{player.username}</p>
                        <p className="text-xs text-muted-foreground truncate">{player.email}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-xs text-muted-foreground">#{i + 1}</span>
                        <ChevronRight className="w-4 h-4 text-muted-foreground" />
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── Bookings tab ── */}
          {tab === "bookings" && (
            <div className="flex-1 px-4 py-5 overflow-y-auto">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">
                All bookings{bookings.length > 0 && ` · ${bookings.length}`}
              </p>
              {bookings.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                  <BookOpen className="w-10 h-10 text-muted-foreground mb-3 opacity-40" />
                  <p className="text-foreground font-medium">No bookings yet</p>
                  <p className="text-muted-foreground text-sm mt-1">Confirmed bookings will appear here.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {[...bookings].reverse().map(booking => (
                    <div key={booking.id} data-testid={`card-booking-${booking.id}`} className="bg-card border border-border rounded-xl p-4 space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-semibold text-foreground text-sm leading-tight">{booking.turfName}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">{booking.turfAddress}</p>
                        </div>
                        <span className="text-[10px] font-bold text-primary bg-primary/10 px-2 py-1 rounded-md shrink-0 tracking-wider">{booking.bookingCode}</span>
                      </div>
                      <div className="flex items-center gap-4 text-xs">
                        <div className="flex items-center gap-1.5 text-muted-foreground">
                          <Calendar className="w-3.5 h-3.5" /><span>{booking.date}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-muted-foreground">
                          <Clock className="w-3.5 h-3.5" /><span>{booking.startTime} – {booking.endTime}</span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between pt-2 border-t border-border">
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <CreditCard className="w-3.5 h-3.5" /><span className="capitalize">{booking.paymentMethod}</span>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-bold text-foreground">₹{booking.totalAmount}</p>
                          {booking.balanceAmount > 0 && <p className="text-[10px] text-yellow-400">₹{booking.balanceAmount} due</p>}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── All owners tab ── */}
          {tab === "owners" && (
            <div className="flex-1 px-4 py-5 overflow-y-auto">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">
                All turf owners{allOwners.length > 0 && ` · ${allOwners.length}`}
              </p>
              {allOwners.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                  <Building2 className="w-10 h-10 text-muted-foreground mb-3 opacity-40" />
                  <p className="text-foreground font-medium">No owners yet</p>
                  <p className="text-muted-foreground text-sm mt-1">Turf owners will appear here after registering.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {allOwners.map(owner => {
                    const accS = ownerStatusDisplay(owner.ownerStatus);
                    const tS = turfStatusDisplay(owner.turfStatus);
                    return (
                      <button
                        type="button"
                        key={owner.id}
                        onClick={() => { setSelectedOwner(owner); setSelectedImageIndex(0); }}
                        data-testid={`card-all-owner-${owner.id}`}
                        className="w-full bg-card border border-border rounded-xl px-4 py-3 flex items-center gap-3 hover:border-primary/40 hover:bg-primary/5 transition-colors text-left"
                      >
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                          <span className="text-primary font-bold">{(owner.fullName ?? owner.turfName ?? owner.username)[0].toUpperCase()}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          {owner.fullName && <p className="font-medium text-foreground text-sm leading-tight">{owner.fullName}</p>}
                          <p className="text-muted-foreground text-xs">@{owner.username}</p>
                          {owner.turfName && (
                            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                              <MapPin className="w-2.5 h-2.5 shrink-0" />{owner.turfName} · {owner.turfLocation ?? "No location"}
                            </p>
                          )}
                          <div className="flex flex-wrap gap-1 mt-1.5">
                            <StatusBadge label={accS.label} color={accS.color} />
                            {tS && <StatusBadge label={tS.label} color={tS.color} />}
                          </div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ── Locations tab ── */}
          {tab === "locations" && (
            <div className="flex-1 px-4 py-5 space-y-5 overflow-y-auto">
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Add location</p>
                <p className="text-xs text-muted-foreground mb-3">Enter city names — turf owners pick from this list when registering.</p>
                <form onSubmit={handleAddLocation} className="flex gap-2">
                  <Input value={newLocation} onChange={e => setNewLocation(e.target.value)} placeholder="e.g. Bangalore" className="bg-card border-border flex-1" data-testid="input-new-location" />
                  <Button type="submit" size="sm" disabled={isAddingLocation || !newLocation.trim()} data-testid="button-add-location" className="shrink-0">
                    {isAddingLocation ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  </Button>
                </form>
              </div>
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Current locations · {locations.length}</p>
                {locations.length === 0 ? (
                  <div className="text-center py-10">
                    <MapPin className="w-8 h-8 text-muted-foreground opacity-40 mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">No locations added yet.</p>
                  </div>
                ) : (
                  <div className="bg-card border border-border rounded-xl divide-y divide-border">
                    {locations.map(loc => (
                      <div key={loc} className="flex items-center justify-between px-4 py-3" data-testid={`location-row-${loc}`}>
                        <div className="flex items-center gap-2">
                          <MapPin className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                          <span className="text-sm text-foreground">{loc}</span>
                        </div>
                        <button type="button" onClick={() => handleRemoveLocation(loc)} disabled={removingLocation !== null}
                          data-testid={`button-remove-location-${loc}`} className="text-muted-foreground hover:text-destructive transition-colors disabled:opacity-40">
                          {removingLocation === loc ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
