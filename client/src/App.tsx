import { Switch, Route, useLocation, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { BottomNavigation } from "@/components/BottomNavigation";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";

import Home from "@/pages/player/Home";
import Search from "@/pages/player/Search";
import Bookings from "@/pages/player/Bookings";
import Favorites from "@/pages/player/Favorites";
import Profile from "@/pages/player/Profile";
import Booking from "@/pages/player/Booking";
import Payment from "@/pages/player/Payment";
import Confirmation from "@/pages/player/Confirmation";
import Login from "@/pages/auth/Login";
import Register from "@/pages/auth/Register";
import ForgotPassword from "@/pages/auth/ForgotPassword";
import RoleSelect from "@/pages/RoleSelect";
import TurfOwnerLogin from "@/pages/owner/TurfOwnerLogin";
import TurfOwnerRegister from "@/pages/owner/TurfOwnerRegister";
import TurfOwnerHome from "@/pages/owner/TurfOwnerHome";
import TurfStaffHome from "@/pages/staff/TurfStaffHome";
import Admin from "@/pages/admin/Admin";
import NotFound from "@/pages/not-found";

function Loading() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

function PlayerRoute({ component: Component }: { component: React.ComponentType }) {
  const { user, isLoading } = useAuth();
  if (isLoading) return <Loading />;
  if (!user) return <Redirect to="/" />;
  if (user.role === "turf_owner") return <Redirect to="/owner/home" />;
  if (user.role === "turf_staff") return <Redirect to="/staff/home" />;
  return <Component />;
}

function StaffRoute({ component: Component }: { component: React.ComponentType }) {
  const { user, isLoading } = useAuth();
  if (isLoading) return <Loading />;
  if (!user || user.role !== "turf_staff") return <Redirect to="/" />;
  return <Component />;
}

function OwnerRoute({ component: Component }: { component: React.ComponentType }) {
  const { user, isLoading } = useAuth();
  if (isLoading) return <Loading />;
  if (!user) return <Redirect to="/owner/login" />;
  if (user.role !== "turf_owner") return <Redirect to="/owner/login" />;
  return <Component />;
}

function PublicOnlyRoute({ component: Component, ownerPath }: { component: React.ComponentType; ownerPath?: boolean }) {
  const { user, isLoading } = useAuth();
  if (isLoading) return <Loading />;
  if (user) {
    if (user.role === "turf_owner") return <Redirect to="/owner/home" />;
  if (user.role === "turf_staff") return <Redirect to="/staff/home" />;
    return <Redirect to="/home" />;
  }
  return <Component />;
}

function RootRoute() {
  const { user, isLoading } = useAuth();
  if (isLoading) return <Loading />;
  if (!user) return <RoleSelect />;
  if (user.role === "turf_owner") return <Redirect to="/owner/home" />;
  if (user.role === "turf_staff") return <Redirect to="/staff/home" />;
  return <Redirect to="/home" />;
}

function Router() {
  return (
    <Switch>
      {/* Root — role select or redirect based on role */}
      <Route path="/" component={RootRoute} />

      {/* Public auth routes — player */}
      <Route path="/login" component={() => <PublicOnlyRoute component={Login} />} />
      <Route path="/register" component={() => <PublicOnlyRoute component={Register} />} />
      <Route path="/forgot-password" component={ForgotPassword} />

      {/* Public auth routes — turf owner */}
      <Route path="/owner/login" component={() => <PublicOnlyRoute component={TurfOwnerLogin} />} />
      <Route path="/owner/register" component={() => <PublicOnlyRoute component={TurfOwnerRegister} />} />

      {/* Protected player routes */}
      <Route path="/home" component={() => <PlayerRoute component={Home} />} />
      <Route path="/search" component={() => <PlayerRoute component={Search} />} />
      <Route path="/bookings" component={() => <PlayerRoute component={Bookings} />} />
      <Route path="/favorites" component={() => <PlayerRoute component={Favorites} />} />
      <Route path="/profile" component={() => <PlayerRoute component={Profile} />} />
      <Route path="/booking/:id" component={() => <PlayerRoute component={Booking} />} />
      <Route path="/payment" component={() => <PlayerRoute component={Payment} />} />
      <Route path="/confirmation" component={() => <PlayerRoute component={Confirmation} />} />

      {/* Protected owner routes */}
      <Route path="/owner/home" component={() => <OwnerRoute component={TurfOwnerHome} />} />
      <Route path="/staff/home" component={() => <StaffRoute component={TurfStaffHome} />} />

      {/* Admin */}
      <Route path="/admin" component={Admin} />

      <Route component={NotFound} />
    </Switch>
  );
}

function AppContent() {
  const [location] = useLocation();
  const { user } = useAuth();

  const hideBottomNav =
    !user ||
    user.role === "turf_owner" ||
    user.role === "turf_staff" ||
    location === "/" ||
    location === "/login" ||
    location === "/register" ||
    location === "/forgot-password" ||
    location === "/owner/login" ||
    location === "/owner/register" ||
    location === "/owner/home" ||
    location === "/staff/home" ||
    location === "/admin" ||
    location.startsWith("/booking/") ||
    location === "/payment" ||
    location === "/confirmation";

  return (
    <div className="max-w-lg mx-auto min-h-screen bg-background">
      <Router />
      {!hideBottomNav && <BottomNavigation />}
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <ErrorBoundary>
          <AuthProvider>
            <AppContent />
            <Toaster />
          </AuthProvider>
        </ErrorBoundary>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
