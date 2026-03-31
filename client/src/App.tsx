import { Switch, Route, useLocation, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { BottomNavigation } from "@/components/BottomNavigation";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";

import Home from "@/pages/Home";
import Search from "@/pages/Search";
import Bookings from "@/pages/Bookings";
import Favorites from "@/pages/Favorites";
import Profile from "@/pages/Profile";
import Booking from "@/pages/Booking";
import Payment from "@/pages/Payment";
import Confirmation from "@/pages/Confirmation";
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import ForgotPassword from "@/pages/ForgotPassword";
import RoleSelect from "@/pages/RoleSelect";
import TurfOwnerLogin from "@/pages/TurfOwnerLogin";
import TurfOwnerRegister from "@/pages/TurfOwnerRegister";
import TurfOwnerHome from "@/pages/TurfOwnerHome";
import Admin from "@/pages/Admin";
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
  return <Component />;
}

function OwnerRoute({ component: Component }: { component: React.ComponentType }) {
  const { user, isLoading } = useAuth();
  if (isLoading) return <Loading />;
  if (!user) return <Redirect to="/owner/login" />;
  if (user.role !== "turf_owner") return <Redirect to="/" />;
  return <Component />;
}

function PublicOnlyRoute({ component: Component, ownerPath }: { component: React.ComponentType; ownerPath?: boolean }) {
  const { user, isLoading } = useAuth();
  if (isLoading) return <Loading />;
  if (user) {
    if (user.role === "turf_owner") return <Redirect to="/owner/home" />;
    return <Redirect to="/home" />;
  }
  return <Component />;
}

function RootRoute() {
  const { user, isLoading } = useAuth();
  if (isLoading) return <Loading />;
  if (!user) return <RoleSelect />;
  if (user.role === "turf_owner") return <Redirect to="/owner/home" />;
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
    location === "/" ||
    location === "/login" ||
    location === "/register" ||
    location === "/forgot-password" ||
    location === "/owner/login" ||
    location === "/owner/register" ||
    location === "/owner/home" ||
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
        <AuthProvider>
          <AppContent />
          <Toaster />
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
