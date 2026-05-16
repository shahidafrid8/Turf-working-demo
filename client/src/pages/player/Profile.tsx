import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import {
  User, HelpCircle, LogOut, ChevronRight, Bell,
  Shield, Star, Mail, Phone, Lock, Eye, EyeOff,
  Check, ChevronLeft, Calendar
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { TurfTimeLogo } from "@/components/TurfTimeLogo";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle
} from "@/components/ui/alert-dialog";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useSEO } from "@/lib/seo";
import { enablePushNotifications, isPushSupported } from "@/lib/pushNotifications";
import type { Booking } from "@shared/schema";

type ProfileView = "main" | "edit" | "password" | "notifications" | "privacy" | "help" | "rate";

export default function Profile() {
  useSEO({ title: "My Profile", description: "Manage your Quick Turf account." });
  const { user, logout, refreshUser } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [view, setView] = useState<ProfileView>("main");
  const [logoutOpen, setLogoutOpen] = useState(false);

  const { data: myBookings } = useQuery<Booking[]>({
    queryKey: ["/api/auth/my-bookings"],
    enabled: !!user,
  });

  const bookingCount = myBookings?.length ?? 0;

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };


  if (!user) return null;

  const initials = (user.fullName || user.username).trim().charAt(0).toUpperCase();

  if (view === "edit") return <EditProfileView user={user} onBack={() => setView("main")} onSaved={refreshUser} />;
  if (view === "password") return <ChangePasswordView onBack={() => setView("main")} />;
  if (view === "notifications") return <NotificationsView onBack={() => setView("main")} />;
  if (view === "privacy") return <PrivacyView onBack={() => setView("main")} />;
  if (view === "rate") return <RateUsView onBack={() => setView("main")} />;
  if (view === "help") return <HelpView onBack={() => setView("main")} />;

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-lg border-b border-border">
        <div className="px-4 py-3">
          <h1 className="text-xl font-bold text-foreground">Profile</h1>
        </div>
      </header>

      <main className="px-4 py-6 space-y-5">
        {/* ── Profile hero card ─────────────────────────────────────── */}
        <Card className="overflow-hidden" data-testid="card-profile">
          <div className="h-1 bg-gradient-to-r from-primary via-emerald-400 to-primary" />

          <div className="p-5">
            {/* Avatar row */}
            <div className="flex items-center gap-4">
              <div className="relative flex-shrink-0">
                <Avatar className="w-16 h-16" data-testid="avatar-profile">
                  <AvatarFallback className="text-xl font-bold bg-gradient-to-br from-primary to-emerald-600 text-white">
                    {initials}
                  </AvatarFallback>
                </Avatar>
              </div>

              <div className="flex-1 min-w-0">
                <h2 className="text-lg font-semibold text-foreground truncate">
                  {user.fullName || user.username}
                </h2>
                <p className="text-sm text-muted-foreground">@{user.username}</p>
              </div>
            </div>

            {/* Contact info */}
            <div className="mt-4 space-y-2">
              <div className="flex items-center gap-2.5 text-sm text-muted-foreground">
                <Mail className="w-4 h-4 flex-shrink-0" />
                <span className="truncate">{user.email}</span>
              </div>
              <div className="flex items-center gap-2.5 text-sm text-muted-foreground">
                <Phone className="w-4 h-4 flex-shrink-0" />
                <span>+91 {user.phoneNumber}</span>
              </div>
            </div>

            {/* Stats */}
            <div className="flex items-center mt-5 pt-4 border-t border-border">
              <div className="flex-1 text-center">
                <p className="text-2xl font-bold text-primary">{bookingCount}</p>
                <p className="text-xs text-muted-foreground mt-0.5">Bookings</p>
              </div>
              <div className="w-px h-8 bg-border" />
              <div className="flex-1 text-center">
                <p className="text-2xl font-bold text-foreground">
                  {user.role === "player" ? "⚡" : "🏟️"}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5 capitalize">{user.role.replace("_", " ")}</p>
              </div>
            </div>
          </div>
        </Card>

        {/* ── Account ──────────────────────────────────────────────── */}
        <div>
          <SectionLabel>Account</SectionLabel>
          <Card className="divide-y divide-border" data-testid="card-menu-account">
            <MenuButton icon={User} label="Edit Profile" desc="Update your personal information" onClick={() => setView("edit")} />
            <MenuButton icon={Lock} label="Change Password" desc="Update your password" onClick={() => setView("password")} />
          </Card>
        </div>

        {/* ── Preferences ──────────────────────────────────────────── */}
        <div>
          <SectionLabel>Preferences</SectionLabel>
          <Card className="divide-y divide-border" data-testid="card-menu-prefs">
            <MenuButton icon={Bell} label="Notifications" desc="Manage notification preferences" onClick={() => setView("notifications")} />
            <MenuButton icon={Shield} label="Privacy & Security" desc="Control your data and security" onClick={() => setView("privacy")} />
          </Card>
        </div>

        {/* ── Support ──────────────────────────────────────────────── */}
        <div>
          <SectionLabel>Support</SectionLabel>
          <Card className="divide-y divide-border" data-testid="card-menu-support">
            <MenuButton
              icon={Star}
              label="Rate Us"
              desc="Share your feedback"
              onClick={() => setView("rate")}
            />
            <MenuButton icon={HelpCircle} label="Help & Support" desc="Get help with your bookings" onClick={() => setView("help")} />
          </Card>
        </div>

        {/* ── Logout ───────────────────────────────────────────────── */}
        <Button
          variant="outline"
          className="w-full text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/30"
          onClick={() => setLogoutOpen(true)}
          data-testid="button-logout"
        >
          <LogOut className="w-5 h-5 mr-2" />
          Log Out
        </Button>

        <div className="flex flex-col items-center pt-2 pb-4">
          <TurfTimeLogo size="sm" />
          <p className="text-xs text-muted-foreground mt-2">Version 1.0.0</p>
        </div>
      </main>

      {/* Logout confirmation */}
      <AlertDialog open={logoutOpen} onOpenChange={setLogoutOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Log out?</AlertDialogTitle>
            <AlertDialogDescription>
              You'll need to sign in again to book turfs and manage your account.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleLogout} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Log Out
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════ */

function SectionLabel({ children }: { children: string }) {
  return <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-1">{children}</p>;
}

function MenuButton({ icon: Icon, label, desc, onClick }: { icon: any; label: string; desc: string; onClick: () => void }) {
  return (
    <button
      className="w-full flex items-center gap-4 p-4 hover:bg-secondary/50 transition-colors active:bg-secondary/80"
      onClick={onClick}
      data-testid={`menu-${label.toLowerCase().replace(/\s+/g, "-")}`}
    >
      <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center flex-shrink-0">
        <Icon className="w-5 h-5 text-foreground" />
      </div>
      <div className="flex-1 text-left min-w-0">
        <p className="font-medium text-foreground">{label}</p>
        <p className="text-sm text-muted-foreground truncate">{desc}</p>
      </div>
      <ChevronRight className="w-5 h-5 text-muted-foreground flex-shrink-0" />
    </button>
  );
}

function SubHeader({ title, onBack }: { title: string; onBack: () => void }) {
  return (
    <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-lg border-b border-border">
      <div className="flex items-center gap-3 px-4 py-3">
        <Button size="icon" variant="ghost" onClick={onBack}>
          <ChevronLeft className="w-5 h-5" />
        </Button>
        <h1 className="text-xl font-bold text-foreground">{title}</h1>
      </div>
    </header>
  );
}

/* ═════════════════════════════════════════════════════════════════════════
   Edit Profile — with profile pic change
   ═════════════════════════════════════════════════════════════════════════ */

function EditProfileView({ user, onBack, onSaved }: { user: any; onBack: () => void; onSaved: () => Promise<void> }) {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    fullName: user.fullName || "",
    username: user.username || "",
    email: user.email || "",
    phoneNumber: user.phoneNumber || "",
  });

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/auth/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(form),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Update failed");
      await onSaved();
      toast({ title: "Profile updated", description: "Your changes have been saved." });
      onBack();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const hasChanges =
    form.fullName !== (user.fullName || "") ||
    form.username !== user.username ||
    form.email !== user.email ||
    form.phoneNumber !== user.phoneNumber;

  const initials = (form.fullName || form.username).trim().charAt(0).toUpperCase();

  return (
    <div className="min-h-screen bg-background pb-20">
      <SubHeader title="Edit Profile" onBack={onBack} />
      <main className="px-4 py-6 space-y-6">
        <div className="flex flex-col items-center gap-3">
          <Avatar className="w-24 h-24">
            <AvatarFallback className="text-3xl font-bold bg-gradient-to-br from-primary to-emerald-600 text-white">
              {initials}
            </AvatarFallback>
          </Avatar>
        </div>

        <Card className="p-5 space-y-5">
          <div className="space-y-2">
            <Label htmlFor="fullName">Full Name</Label>
            <Input id="fullName" value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} placeholder="Your full name" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="username">Username</Label>
            <Input id="username" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} placeholder="Username" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="Email address" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">Phone Number</Label>
            <Input id="phone" value={form.phoneNumber} onChange={(e) => setForm({ ...form, phoneNumber: e.target.value })} placeholder="10-digit phone number" maxLength={10} />
          </div>

          {/* DOB — read-only */}
          <div className="space-y-2">
            <Label>Date of Birth</Label>
            <div className="flex items-center gap-2 px-3 py-2 rounded-md border border-border bg-secondary/30 text-sm text-muted-foreground">
              <Calendar className="w-4 h-4" />
              {user.dateOfBirth ? formatDOB(user.dateOfBirth) : "Not set"}
              <span className="ml-auto text-xs">(cannot be changed)</span>
            </div>
          </div>
        </Card>

        <Button className="w-full" disabled={!hasChanges || saving} onClick={handleSave}>
          {saving ? (
            <span className="flex items-center gap-2">
              <span className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
              Saving...
            </span>
          ) : (
            <span className="flex items-center gap-2">
              <Check className="w-4 h-4" />
              Save Changes
            </span>
          )}
        </Button>
      </main>
    </div>
  );
}

/* ═════════════════════════════════════════════════════════════════════════
   Change Password
   ═════════════════════════════════════════════════════════════════════════ */

function ChangePasswordView({ onBack }: { onBack: () => void }) {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [form, setForm] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });

  const passwordsMatch = form.newPassword === form.confirmPassword;
  const canSubmit = form.currentPassword.length > 0 && form.newPassword.length >= 6 && passwordsMatch;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSaving(true);
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ currentPassword: form.currentPassword, newPassword: form.newPassword }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Password change failed");
      toast({ title: "Password changed", description: "Your new password is now active." });
      onBack();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <SubHeader title="Change Password" onBack={onBack} />
      <main className="px-4 py-6 space-y-6">
        <Card className="p-5 space-y-5">
          <PwdField id="currentPassword" label="Current Password" placeholder="Enter current password" value={form.currentPassword} show={showCurrent} onToggle={() => setShowCurrent(!showCurrent)} onChange={(v) => setForm({ ...form, currentPassword: v })} />
          <Separator />
          <PwdField id="newPassword" label="New Password" placeholder="At least 6 characters" value={form.newPassword} show={showNew} onToggle={() => setShowNew(!showNew)} onChange={(v) => setForm({ ...form, newPassword: v })} error={form.newPassword.length > 0 && form.newPassword.length < 6 ? "Password must be at least 6 characters" : undefined} />
          <PwdField id="confirmPassword" label="Confirm New Password" placeholder="Re-enter new password" value={form.confirmPassword} show={showConfirm} onToggle={() => setShowConfirm(!showConfirm)} onChange={(v) => setForm({ ...form, confirmPassword: v })} error={form.confirmPassword.length > 0 && !passwordsMatch ? "Passwords do not match" : undefined} />
        </Card>
        <Button className="w-full" disabled={!canSubmit || saving} onClick={handleSubmit}>
          {saving ? (
            <span className="flex items-center gap-2">
              <span className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
              Updating...
            </span>
          ) : (
            <span className="flex items-center gap-2">
              <Lock className="w-4 h-4" />
              Update Password
            </span>
          )}
        </Button>
      </main>
    </div>
  );
}

function PwdField({ id, label, placeholder, value, show, onToggle, onChange, error }: {
  id: string; label: string; placeholder: string; value: string;
  show: boolean; onToggle: () => void; onChange: (v: string) => void; error?: string;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <div className="relative">
        <Input id={id} type={show ? "text" : "password"} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="pr-10" />
        <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors" onClick={onToggle}>
          {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

/* ═════════════════════════════════════════════════════════════════════════
   Notifications
   ═════════════════════════════════════════════════════════════════════════ */

function NotificationsView({ onBack }: { onBack: () => void }) {
  const { toast } = useToast();
  const [prefs, setPrefs] = useState({ bookingUpdates: true, promotions: false, reminders: true, newTurfs: false });
  const [isEnabling, setIsEnabling] = useState(false);
  const notificationPermission = typeof Notification === "undefined" ? "unsupported" : Notification.permission;

  const handleEnableOutsideNotifications = async () => {
    setIsEnabling(true);
    try {
      const enabled = await enablePushNotifications();
      toast({
        title: enabled ? "Outside notifications enabled" : "Notifications not enabled",
        description: enabled ? "Booking updates can now appear even when QuickTurf is not open." : "Allow notifications when your browser asks.",
      });
    } catch (err: any) {
      toast({
        title: "Notifications failed",
        description: err.message || "Could not enable outside-app notifications.",
        variant: "destructive",
      });
    } finally {
      setIsEnabling(false);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <SubHeader title="Notifications" onBack={onBack} />
      <main className="px-4 py-6 space-y-6">
        <Card className="divide-y divide-border">
          <Toggle label="Booking Updates" desc="Get notified about booking confirmations and changes" checked={prefs.bookingUpdates} onChange={(v) => setPrefs({ ...prefs, bookingUpdates: v })} />
          <Toggle label="Promotions & Offers" desc="Receive deals and discounts on turf bookings" checked={prefs.promotions} onChange={(v) => setPrefs({ ...prefs, promotions: v })} />
          <Toggle label="Booking Reminders" desc="Remind me before my upcoming bookings" checked={prefs.reminders} onChange={(v) => setPrefs({ ...prefs, reminders: v })} />
          <Toggle label="New Turfs Nearby" desc="Get notified when new turfs open near you" checked={prefs.newTurfs} onChange={(v) => setPrefs({ ...prefs, newTurfs: v })} />
        </Card>
        <Card className="p-4 space-y-3">
          <div>
            <p className="text-sm font-semibold text-foreground">Outside app notifications</p>
            <p className="text-xs text-muted-foreground mt-1">
              Enable browser push alerts for booking confirmations and owner/staff booking updates.
            </p>
          </div>
          <Button
            className="w-full"
            disabled={!isPushSupported() || isEnabling || notificationPermission === "granted"}
            onClick={handleEnableOutsideNotifications}
            data-testid="button-enable-push-notifications"
          >
            {notificationPermission === "granted" ? "Enabled" : isEnabling ? "Enabling..." : "Enable outside notifications"}
          </Button>
          {notificationPermission === "denied" && (
            <p className="text-xs text-destructive">Notifications are blocked in browser settings. Allow them for this site and try again.</p>
          )}
          {!isPushSupported() && (
            <p className="text-xs text-muted-foreground">This browser does not support outside-app push notifications.</p>
          )}
        </Card>
        <p className="text-xs text-muted-foreground text-center px-4">
          Notification preferences are saved locally. Outside-app alerts require browser permission.
        </p>
      </main>
    </div>
  );
}

/* ═════════════════════════════════════════════════════════════════════════
   Privacy & Security
   ═════════════════════════════════════════════════════════════════════════ */

function PrivacyView({ onBack }: { onBack: () => void }) {
  const { logout } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDeleteAccount = async () => {
    setIsDeleting(true);
    try {
      const res = await fetch("/api/auth/profile", { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete account");
      toast({ title: "Account deleted", description: "Your account has been successfully removed." });
      await logout();
      navigate("/");
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
      setIsDeleting(false);
      setDeleteOpen(false);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <SubHeader title="Privacy & Security" onBack={onBack} />
      <main className="px-4 py-6 space-y-6">
        <div>
          <SectionLabel>Security</SectionLabel>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center">
                <Shield className="w-5 h-5 text-green-500" />
              </div>
              <div className="flex-1">
                <p className="font-medium text-foreground text-sm">Account Protected</p>
                <p className="text-xs text-muted-foreground">Your account is secured with a password</p>
              </div>
              <Check className="w-5 h-5 text-green-500" />
            </div>
          </Card>
        </div>
        <div>
          <SectionLabel>Data</SectionLabel>
          <Card className="divide-y divide-border">
            <button 
              className="w-full flex items-center gap-4 p-4 hover:bg-destructive/5 transition-colors"
              onClick={() => setDeleteOpen(true)}
            >
              <div className="flex-1 text-left">
                <p className="font-medium text-destructive text-sm">Delete Account</p>
                <p className="text-xs text-muted-foreground">Permanently delete your account and data</p>
              </div>
              <ChevronRight className="w-5 h-5 text-muted-foreground" />
            </button>
          </Card>
        </div>
      </main>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Account?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to permanently delete your account? All your bookings, turfs, and data will be removed. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteAccount} 
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? "Deleting..." : "Delete Account"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

/* ═════════════════════════════════════════════════════════════════════════
   Help & Support
   ═════════════════════════════════════════════════════════════════════════ */

function HelpView({ onBack }: { onBack: () => void }) {
  const faqs = [
    { q: "How do I book a turf?", a: "Browse turfs from the Home page, select your preferred date and time slot, then complete the payment to confirm your booking." },
    { q: "Can I cancel a booking?", a: "Currently, bookings cannot be cancelled directly through the app. Please contact the turf owner for cancellation requests." },
    { q: "How do I contact a turf owner?", a: "Turf owner contact details are available on the turf detail page after selecting a turf." },
    { q: "Is my payment secure?", a: "Yes, all payments are processed securely. We don't store your payment card details." },
    { q: "What if the turf is not as described?", a: "Please report any discrepancies through the app or contact our support team." },
  ];
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  return (
    <div className="min-h-screen bg-background pb-20">
      <SubHeader title="Help & Support" onBack={onBack} />
      <main className="px-4 py-6 space-y-6">
        <Card className="p-5">
          <h3 className="font-semibold text-foreground mb-3">Contact Us</h3>
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center"><Mail className="w-4 h-4 text-primary" /></div>
              <div>
                <p className="text-sm font-medium text-foreground">Email Support</p>
                <p className="text-xs text-muted-foreground">support@quickturf.com</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center"><Phone className="w-4 h-4 text-primary" /></div>
              <div>
                <p className="text-sm font-medium text-foreground">Phone Support</p>
                <p className="text-xs text-muted-foreground">+91 1800-000-TURF</p>
              </div>
            </div>
          </div>
        </Card>
        <div>
          <SectionLabel>Frequently Asked Questions</SectionLabel>
          <Card className="divide-y divide-border">
            {faqs.map((faq, i) => (
              <button key={i} className="w-full text-left p-4 hover:bg-secondary/50 transition-colors" onClick={() => setOpenFaq(openFaq === i ? null : i)}>
                <div className="flex items-start justify-between gap-2">
                  <p className="font-medium text-foreground text-sm">{faq.q}</p>
                  <ChevronRight className={`w-4 h-4 text-muted-foreground flex-shrink-0 transition-transform duration-200 ${openFaq === i ? "rotate-90" : ""}`} />
                </div>
                {openFaq === i && <p className="text-sm text-muted-foreground mt-2">{faq.a}</p>}
              </button>
            ))}
          </Card>
        </div>
      </main>
    </div>
  );
}

/* ═════════════════════════════════════════════════════════════════════════
   Shared toggle
   ═════════════════════════════════════════════════════════════════════════ */

function Toggle({ label, desc, checked, onChange }: { label: string; desc: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between gap-4 p-4">
      <div className="flex-1 min-w-0">
        <p className="font-medium text-foreground text-sm">{label}</p>
        <p className="text-xs text-muted-foreground">{desc}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}

function formatDOB(dateStr: string): string {
  try {
    const [y, m, d] = dateStr.split("-");
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    return `${parseInt(d)} ${months[parseInt(m) - 1]} ${y}`;
} catch {
    return dateStr;
  }
}

/* ═════════════════════════════════════════════════════════════════════════
   Rate Us
   ═════════════════════════════════════════════════════════════════════════ */

function RateUsView({ onBack }: { onBack: () => void }) {
  const { toast } = useToast();
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [feedback, setFeedback] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (rating === 0) {
      toast({ title: "Please select a rating", variant: "destructive" });
      return;
    }
    
    setSubmitting(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 800));
    setSubmitting(false);
    
    toast({ title: "Thanks! 🎉", description: "We appreciate your feedback." });
    onBack();
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <SubHeader title="Rate Us" onBack={onBack} />
      <main className="px-4 py-6 space-y-6">
        <Card className="p-6 flex flex-col items-center text-center space-y-6">
          <div>
            <h2 className="text-xl font-bold text-foreground mb-2">How was your experience?</h2>
            <p className="text-sm text-muted-foreground">We are always trying to improve TurfTime.</p>
          </div>
          
          <div className="flex gap-2 justify-center my-4">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                className="focus:outline-none transition-transform hover:scale-110"
                onClick={() => setRating(star)}
                onMouseEnter={() => setHover(star)}
                onMouseLeave={() => setHover(0)}
              >
                <Star 
                  className={`w-10 h-10 ${
                    star <= (hover || rating) 
                      ? "fill-primary text-primary" 
                      : "text-muted-foreground/30"
                  } transition-colors`} 
                />
              </button>
            ))}
          </div>

          <div className="w-full space-y-2 text-left">
            <Label htmlFor="feedback">Tell us more (optional)</Label>
            <textarea
              id="feedback"
              className="flex min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none"
              placeholder="What did you like? What can we improve?"
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
            />
          </div>

          <Button 
            className="w-full mt-2" 
            onClick={handleSubmit} 
            disabled={rating === 0 || submitting}
          >
            {submitting ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                Submitting...
              </span>
            ) : (
              "Submit Feedback"
            )}
          </Button>
        </Card>
      </main>
    </div>
  );
}
