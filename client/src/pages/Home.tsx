import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, Bell, SlidersHorizontal, MapPin, IndianRupee, Star, X, CalendarCheck, Clock, Info, Sparkles } from "lucide-react";
import { Link, useLocation } from "wouter";
import { TurfTimeLogo } from "@/components/TurfTimeLogo";
import { TurfCard } from "@/components/TurfCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Slider } from "@/components/ui/slider";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from "@/components/ui/sheet";
import { useAuth } from "@/contexts/AuthContext";
import type { Turf, Booking } from "@shared/schema";
import { formatDistanceToNow, format } from "date-fns";

const sportFilters = ["All", "Cricket", "Football", "Basketball", "Tennis", "Badminton"];

export default function Home() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const [activeFilter, setActiveFilter] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterOpen, setFilterOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  // Filter state
  const [filterCity, setFilterCity] = useState<string | null>(null);
  const [filterArea, setFilterArea] = useState<string | null>(null);
  const [filterMaxPrice, setFilterMaxPrice] = useState<number>(5000);
  const [filterMinRating, setFilterMinRating] = useState<number>(0);
  const [filterAmenities, setFilterAmenities] = useState<string[]>([]);

  const { data: turfs, isLoading } = useQuery<Turf[]>({
    queryKey: ["/api/turfs"],
  });

  const { data: myBookings } = useQuery<Booking[]>({
    queryKey: ["/api/auth/my-bookings"],
    enabled: !!user && user.role === "player",
  });

  const notifications = useMemo(() => {
    const list: any[] = [];
    if (myBookings && turfs) {
      const todayStr = format(new Date(), "yyyy-MM-dd");
      
      const activeBookings = [...myBookings]
        .filter(b => b.status === "confirmed")
        .sort((a, b) => new Date(b.createdAt as any).getTime() - new Date(a.createdAt as any).getTime())
        .reverse();

      activeBookings.forEach((b) => {
        const turf = turfs.find(t => t.id === b.turfId);
        const turfName = turf ? turf.name : "the turf";
        const createdDate = b.createdAt ? new Date(b.createdAt as any) : new Date();
        
        try {
          const timeAgo = formatDistanceToNow(createdDate, { addSuffix: true });
          
          if (b.date === todayStr) {
            list.push({
              id: `rem-${b.id}`,
              icon: <Clock className="w-5 h-5 text-amber-500" />,
              iconBg: "bg-amber-500/10",
              title: "Upcoming Match Reminder",
              desc: `You have a booking at ${turfName} today at ${b.startTime}. Don't forget!`,
              time: "Today",
              unread: true
            });
          }
          
          list.push({
            id: `conf-${b.id}`,
            icon: <CalendarCheck className="w-5 h-5 text-emerald-500" />,
            iconBg: "bg-emerald-500/10",
            title: "Booking Confirmed!",
            desc: `Your slot at ${turfName} is confirmed for ${b.date}, ${b.startTime}.`,
            time: timeAgo,
            unread: false
          });
        } catch (e) {
          // ignore
        }
      });
    }

    list.push({
      id: "welcome-1",
      icon: <Info className="w-5 h-5 text-muted-foreground" />,
      iconBg: "bg-secondary",
      title: "Welcome to Quick Turf!",
      desc: "Browse turfs, pick your slot, and book in seconds. Enjoy your game!",
      time: "1 week ago",
      unread: false
    });

    return list;
  }, [myBookings, turfs]);

  const unreadCount = notifications.filter(n => n.unread).length;

  // Extract unique cities and areas for filter
  const { cities, areasByCity } = useMemo(() => {
    if (!turfs) return { cities: [], areasByCity: {} as Record<string, string[]> };
    
    const citySet = new Set<string>();
    const areaMap: Record<string, Set<string>> = {};
    
    turfs.forEach(t => {
      let city = t.location;
      let area = "";
      if (t.location.includes(",")) {
        const parts = t.location.split(",");
        city = parts[parts.length - 1].trim();
        area = parts.slice(0, -1).join(",").trim();
      }
      citySet.add(city);
      if (!areaMap[city]) areaMap[city] = new Set();
      if (area) areaMap[city].add(area);
    });
    
    const sortedAreasByCity: Record<string, string[]> = {};
    Object.keys(areaMap).forEach(c => {
      sortedAreasByCity[c] = Array.from(areaMap[c]).sort();
    });
    
    return {
      cities: Array.from(citySet).sort(),
      areasByCity: sortedAreasByCity
    };
  }, [turfs]);

  const amenities = useMemo(() => {
    if (!turfs) return [];
    const allAmenities = turfs.flatMap((t) => t.amenities);
    return Array.from(new Set(allAmenities)).sort();
  }, [turfs]);

  const allFeaturedTurfs = turfs?.filter((t) => t.featured) || [];
  const availableTurfs = turfs?.filter((t) => t.isAvailable) || [];

  // Apply sport filter to both featured and available turfs
  const featuredTurfs = activeFilter === "All" || activeFilter === "Cricket"
    ? allFeaturedTurfs
    : allFeaturedTurfs.filter((t) => t.sportTypes.includes(activeFilter));

  const filteredTurfs = activeFilter === "All" || activeFilter === "Cricket"
    ? availableTurfs 
    : availableTurfs.filter((t) => t.sportTypes.includes(activeFilter));

  // Apply advanced filters (location, price, rating)
  const advancedFiltered = filteredTurfs.filter((t) => {
    let tCity = t.location;
    let tArea = "";
    if (t.location.includes(",")) {
      const parts = t.location.split(",");
      tCity = parts[parts.length - 1].trim();
      tArea = parts.slice(0, -1).join(",").trim();
    }
    
    if (filterCity && tCity !== filterCity) return false;
    if (filterArea && tArea !== filterArea) return false;
    if (t.pricePerHour > filterMaxPrice) return false;
    if (t.rating < filterMinRating) return false;
    if (filterAmenities.length > 0 && !filterAmenities.every((a) => t.amenities.includes(a))) return false;
    return true;
  });

  // Apply advanced filters to featured turfs too
  const advancedFeatured = featuredTurfs.filter((t) => {
    let tCity = t.location;
    let tArea = "";
    if (t.location.includes(",")) {
      const parts = t.location.split(",");
      tCity = parts[parts.length - 1].trim();
      tArea = parts.slice(0, -1).join(",").trim();
    }
    
    if (filterCity && tCity !== filterCity) return false;
    if (filterArea && tArea !== filterArea) return false;
    if (t.pricePerHour > filterMaxPrice) return false;
    if (t.rating < filterMinRating) return false;
    if (filterAmenities.length > 0 && !filterAmenities.every((a) => t.amenities.includes(a))) return false;
    return true;
  });

  const searchedTurfs = searchQuery 
    ? advancedFiltered.filter((t) => 
        t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.location.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : advancedFiltered;

  const hasActiveFilters = filterCity !== null || filterArea !== null || filterMaxPrice < 5000 || filterMinRating > 0 || filterAmenities.length > 0;

  const clearFilters = () => {
    setFilterCity(null);
    setFilterArea(null);
    setFilterMaxPrice(5000);
    setFilterMinRating(0);
    setFilterAmenities([]);
  };

  // User initials for avatar fallback
  const initials = user
    ? (user.fullName || user.username)
        .split(" ")
        .map((w) => w[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "?";

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-lg border-b border-border">
        <div className="flex items-center justify-between px-4 py-3">
          <TurfTimeLogo size="sm" />
          
          <div className="flex items-center gap-3">
            <Button 
              size="icon" 
              variant="ghost" 
              className="relative"
              data-testid="button-notifications"
              onClick={() => setNotificationsOpen(true)}
            >
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-primary rounded-full" />}
            </Button>
            
            <Link href="/profile">
              <Avatar className="w-8 h-8 cursor-pointer" data-testid="avatar-profile">
                {user?.profileImageUrl ? (
                  <AvatarImage src={user.profileImageUrl} alt={user.fullName || user.username} />
                ) : null}
                <AvatarFallback className="text-xs font-bold bg-gradient-to-br from-primary to-emerald-600 text-white">
                  {initials}
                </AvatarFallback>
              </Avatar>
            </Link>
          </div>
        </div>
      </header>

      <main className="px-4 pt-4 space-y-4">
        {/* Hero Section */}
        <section className="space-y-1" data-testid="section-hero">
          <h1 className="text-2xl font-bold text-foreground">
            Find Your Perfect
            <span className="text-primary"> Turf</span>
          </h1>
          <p className="text-muted-foreground text-sm">
            Book your next game in seconds
          </p>
        </section>

        {/* Search Bar */}
        <section className="relative" data-testid="section-search">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground z-10" />
          <Input
            type="search"
            placeholder="Search turfs, locations..."
            className="pl-10 pr-12 h-12 bg-card border-none rounded-xl"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            data-testid="input-search"
          />
          <button
            className={`absolute right-3 top-1/2 -translate-y-1/2 transition-colors z-10 ${
              hasActiveFilters 
                ? "text-primary" 
                : "text-muted-foreground hover:text-foreground"
            }`}
            onClick={() => setFilterOpen(true)}
            data-testid="button-filter"
          >
            <SlidersHorizontal className="w-5 h-5" />
            {hasActiveFilters && (
              <span className="absolute -top-1 -right-1 w-2 h-2 bg-primary rounded-full" />
            )}
          </button>
        </section>

        {/* Active filters indicator */}
        {hasActiveFilters && (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-muted-foreground">Filters:</span>
            {filterCity && (
              <Badge variant="secondary" className="text-xs gap-1 pr-1">
                <MapPin className="w-3 h-3" />
                {filterCity}
                <button onClick={() => { setFilterCity(null); setFilterArea(null); }} className="ml-1 hover:text-foreground">
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            )}
            {filterArea && (
              <Badge variant="secondary" className="text-xs gap-1 pr-1">
                <MapPin className="w-3 h-3" />
                {filterArea}
                <button onClick={() => setFilterArea(null)} className="ml-1 hover:text-foreground">
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            )}
            {filterMaxPrice < 5000 && (
              <Badge variant="secondary" className="text-xs gap-1 pr-1">
                <IndianRupee className="w-3 h-3" />
                ≤ ₹{filterMaxPrice}
                <button onClick={() => setFilterMaxPrice(5000)} className="ml-1 hover:text-foreground">
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            )}
            {filterMinRating > 0 && (
              <Badge variant="secondary" className="text-xs gap-1 pr-1">
                <Star className="w-3 h-3" />
                ≥ {filterMinRating}★
                <button onClick={() => setFilterMinRating(0)} className="ml-1 hover:text-foreground">
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            )}
            <button onClick={clearFilters} className="text-xs text-primary hover:underline">
              Clear all
            </button>
          </div>
        )}





        {/* Available Now */}
        <section className="space-y-4" data-testid="section-available">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold text-foreground">Available Now</h2>
              <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
            </div>
            <span className="text-sm text-muted-foreground">
              {searchedTurfs.length} {searchedTurfs.length === 1 ? "turf" : "turfs"}
            </span>
          </div>
          
          <div className="space-y-3">
            {isLoading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-28 rounded-xl" />
              ))
            ) : searchedTurfs.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-card flex items-center justify-center">
                  <Search className="w-8 h-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">No turfs found</h3>
                <p className="text-muted-foreground text-sm">
                  Try adjusting your search or filters
                </p>
              </div>
            ) : (
              searchedTurfs.map((turf, index) => (
                <div 
                  key={turf.id}
                  className="animate-slide-up"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <TurfCard turf={turf} variant="list" />
                </div>
              ))
            )}
          </div>
        </section>
      </main>

      {/* ── Filter Sheet ─────────────────────────────────────────────── */}
      <Sheet open={filterOpen} onOpenChange={setFilterOpen}>
        <SheetContent side="bottom" className="rounded-t-2xl max-h-[85vh] overflow-y-auto">
          <SheetHeader className="text-left">
            <SheetTitle>Filters</SheetTitle>
            <SheetDescription>Narrow down turfs by location, price, and rating</SheetDescription>
          </SheetHeader>
          <div className="mt-6 space-y-6">
            {/* Location filter */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-primary" />
                <span className="font-medium text-foreground text-sm">City</span>
              </div>
              <div className="flex flex-wrap gap-2">
                <Badge
                  variant={filterCity === null ? "default" : "secondary"}
                  className="px-3 py-1.5 text-sm cursor-pointer transition-all"
                  onClick={() => { setFilterCity(null); setFilterArea(null); }}
                >
                  All
                </Badge>
                {cities.map((city) => (
                  <Badge
                    key={city}
                    variant={filterCity === city ? "default" : "secondary"}
                    className="px-3 py-1.5 text-sm cursor-pointer transition-all"
                    onClick={() => { setFilterCity(filterCity === city ? null : city); setFilterArea(null); }}
                  >
                    {city}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Area filter */}
            {filterCity && areasByCity[filterCity]?.length > 0 && (
              <div className="space-y-3 pt-2">
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-primary opacity-70" />
                  <span className="font-medium text-foreground text-sm">Area / Locality</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Badge
                    variant={filterArea === null ? "default" : "secondary"}
                    className="px-3 py-1.5 text-sm cursor-pointer transition-all"
                    onClick={() => setFilterArea(null)}
                  >
                    All Areas
                  </Badge>
                  {areasByCity[filterCity].map((area) => (
                    <Badge
                      key={area}
                      variant={filterArea === area ? "default" : "secondary"}
                      className="px-3 py-1.5 text-sm cursor-pointer transition-all"
                      onClick={() => setFilterArea(filterArea === area ? null : area)}
                    >
                      {area}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Price range */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <IndianRupee className="w-4 h-4 text-primary" />
                  <span className="font-medium text-foreground text-sm">Max Price</span>
                </div>
                <span className="text-sm text-primary font-semibold">₹{filterMaxPrice}/hr</span>
              </div>
              <Slider
                value={[filterMaxPrice]}
                onValueChange={([v]) => setFilterMaxPrice(v)}
                min={200}
                max={5000}
                step={100}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>₹200</span>
                <span>₹5,000</span>
              </div>
            </div>

            {/* Rating filter */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Star className="w-4 h-4 text-primary" />
                <span className="font-medium text-foreground text-sm">Minimum Rating</span>
              </div>
              <div className="flex gap-2">
                {[0, 3, 4, 5].map((r) => (
                  <Badge
                    key={r}
                    variant={filterMinRating === r ? "default" : "secondary"}
                    className="px-3 py-1.5 text-sm cursor-pointer transition-all"
                    onClick={() => setFilterMinRating(r)}
                  >
                    {r === 0 ? "Any" : `${r}★+`}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Amenities filter */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-primary" />
                <span className="font-medium text-foreground text-sm">Amenities</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {amenities.map((amenity) => {
                  const isSelected = filterAmenities.includes(amenity);
                  return (
                    <Badge
                      key={amenity}
                      variant={isSelected ? "default" : "secondary"}
                      className="px-3 py-1.5 text-sm cursor-pointer transition-all"
                      onClick={() => {
                        setFilterAmenities((prev) =>
                          isSelected
                            ? prev.filter((a) => a !== amenity)
                            : [...prev, amenity]
                        );
                      }}
                    >
                      {amenity}
                    </Badge>
                  );
                })}
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex gap-3 pt-2 pb-4">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => {
                  clearFilters();
                  setFilterOpen(false);
                }}
              >
                Reset
              </Button>
              <Button
                className="flex-1"
                onClick={() => setFilterOpen(false)}
              >
                Apply Filters
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* ── Notifications Sheet ──────────────────────────────────────── */}
      <Sheet open={notificationsOpen} onOpenChange={setNotificationsOpen}>
        <SheetContent side="right" className="w-full sm:max-w-md p-0">
          <div className="p-6 pb-3 border-b border-border">
            <SheetHeader className="text-left">
              <SheetTitle className="flex items-center gap-2">
                <Bell className="w-5 h-5 text-primary" />
                Notifications
              </SheetTitle>
              <SheetDescription>Your latest alerts and updates</SheetDescription>
            </SheetHeader>
          </div>
          <div className="overflow-y-auto max-h-[calc(100vh-120px)]">
            <div className="divide-y divide-border">
              {notifications.map((n) => (
                <NotificationItem
                  key={n.id}
                  icon={n.icon}
                  iconBg={n.iconBg}
                  title={n.title}
                  desc={n.desc}
                  time={n.time}
                  unread={n.unread}
                />
              ))}
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}

/* ── Notification Item ─────────────────────────────────────────────── */
function NotificationItem({
  icon, iconBg, title, desc, time, unread,
}: {
  icon: React.ReactNode;
  iconBg: string;
  title: string;
  desc: string;
  time: string;
  unread?: boolean;
}) {
  return (
    <div className={`flex gap-3 p-4 transition-colors hover:bg-secondary/40 ${unread ? "bg-primary/[0.03]" : ""}`}>
      <div className={`w-10 h-10 rounded-xl ${iconBg} flex items-center justify-center flex-shrink-0 mt-0.5`}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p className={`text-sm ${unread ? "font-semibold text-foreground" : "font-medium text-foreground/80"}`}>{title}</p>
          {unread && <span className="w-2 h-2 bg-primary rounded-full flex-shrink-0 mt-1.5" />}
        </div>
        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{desc}</p>
        <p className="text-[11px] text-muted-foreground/60 mt-1">{time}</p>
      </div>
    </div>
  );
}
