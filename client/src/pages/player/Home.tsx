import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, Bell, SlidersHorizontal, MapPin, IndianRupee, Star, X, CalendarCheck, Clock, Info, Sparkles } from "lucide-react";
import { Link, useLocation } from "wouter";
import { TurfTimeLogo } from "@/components/TurfTimeLogo";
import { TurfCard } from "@/components/TurfCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Slider } from "@/components/ui/slider";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from "@/components/ui/sheet";
import { useAuth } from "@/contexts/AuthContext";
import type { Turf, Booking, AdminUpdate } from "@shared/schema";
import { formatDistanceToNow, format } from "date-fns";
import { useSEO } from "@/lib/seo";

const sportFilters = ["All", "Cricket", "Football", "Basketball", "Tennis", "Badminton"];

function locationKey(value: string) {
  const cleaned = value.toLowerCase().replace(/[^a-z0-9]/g, "");
  return cleaned.endsWith("a") ? cleaned.slice(0, -1) : cleaned;
}

function matchAdminLocation(value: string, adminLocations: string[]) {
  const key = locationKey(value);
  return adminLocations.find(location => locationKey(location) === key) || value;
}

function isAdminLocation(value: string, adminLocations: string[]) {
  const key = locationKey(value);
  return adminLocations.some(location => locationKey(location) === key);
}

function AdSenseBanner() {
  const env = (import.meta as any).env || {};
  const client = env.VITE_GOOGLE_ADSENSE_CLIENT;
  const slot = env.VITE_GOOGLE_ADSENSE_HOME_SLOT;

  useEffect(() => {
    if (!client || document.querySelector(`script[data-adsbygoogle-client="${client}"]`)) return;
    const script = document.createElement("script");
    script.async = true;
    script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${client}`;
    script.crossOrigin = "anonymous";
    script.dataset.adsbygoogleClient = client;
    document.head.appendChild(script);
  }, [client]);

  useEffect(() => {
    if (!client || !slot) return;
    try {
      ((window as any).adsbygoogle = (window as any).adsbygoogle || []).push({});
    } catch {
      // Google fills this asynchronously when AdSense is configured for the domain.
    }
  }, [client, slot]);

  if (!client || !slot) return null;

  return (
    <section data-testid="section-google-adsense" className="overflow-hidden rounded-lg bg-card/60">
      <ins
        className="adsbygoogle block min-h-[90px]"
        style={{ display: "block" }}
        data-ad-client={client}
        data-ad-slot={slot}
        data-ad-format="auto"
        data-full-width-responsive="true"
      />
    </section>
  );
}

export default function Home() {
  useSEO({
    title: "Find & Book Sports Turfs Near You",
    description: "Book Box Cricket, Football, and multi-sports turfs instantly. Real-time availability, flexible pricing, and instant confirmation.",
  });

  const { user } = useAuth();
  const [, navigate] = useLocation();
  const [activeFilter, setActiveFilter] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterOpen, setFilterOpen] = useState(false);
  const [locationOpen, setLocationOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const adRailRef = useRef<HTMLDivElement>(null);

  // Filter state
  const [filterCity, setFilterCity] = useState<string | null>(null);
  const [filterArea, setFilterArea] = useState<string | null>(null);
  const [filterMaxPrice, setFilterMaxPrice] = useState<number>(5000);
  const [filterMinRating, setFilterMinRating] = useState<number>(0);
  const [filterAmenities, setFilterAmenities] = useState<string[]>([]);
  const [detectedLocation, setDetectedLocation] = useState("Detecting location");
  const [activeAdIndex, setActiveAdIndex] = useState(0);

  const { data: turfs, isLoading } = useQuery<Turf[]>({
    queryKey: ["/api/turfs"],
  });

  const { data: adminLocations = [] } = useQuery<string[]>({
    queryKey: ["/api/locations"],
  });

  const { data: myBookings } = useQuery<Booking[]>({
    queryKey: ["/api/auth/my-bookings"],
    enabled: !!user && user.role === "player",
  });

  const { data: adBanners } = useQuery<AdminUpdate[]>({
    queryKey: [`/api/ads?location=${encodeURIComponent(detectedLocation)}`],
  });

  const { data: announcements = [] } = useQuery<AdminUpdate[]>({
    queryKey: [`/api/updates?location=${encodeURIComponent(detectedLocation)}`],
  });

  useEffect(() => {
    const cached = localStorage.getItem("quickturf:detected-location");
    if (cached && cached !== "All locations") {
      const matched = matchAdminLocation(cached, adminLocations);
      setDetectedLocation(matched);
      if (isAdminLocation(matched, adminLocations)) setFilterCity(matched);
    } else if (cached === "All locations") {
      setDetectedLocation(cached);
      setFilterCity(null);
    }
    if (!navigator.geolocation) {
      setDetectedLocation(cached || "Location unavailable");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords;
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}`);
          const data = await res.json();
          const address = data.address || {};
          const rawLabel = address.city || address.town || address.village || address.suburb || address.county || "Near you";
          const label = matchAdminLocation(rawLabel, adminLocations);
          setDetectedLocation(label);
          if (isAdminLocation(label, adminLocations)) setFilterCity(label);
          localStorage.setItem("quickturf:detected-location", label);
        } catch {
          setDetectedLocation("Near you");
        }
      },
      () => setDetectedLocation(cached || "Enable location"),
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 10 * 60 * 1000 }
    );
  }, [adminLocations]);

  useEffect(() => {
    if (!adBanners || adBanners.length <= 1) return;
    const timer = window.setInterval(() => {
      setActiveAdIndex(current => {
        const next = (current + 1) % adBanners.length;
        const rail = adRailRef.current;
        rail?.children[next]?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
        return next;
      });
    }, 6000);
    return () => window.clearInterval(timer);
  }, [adBanners]);

  useEffect(() => {
    setActiveAdIndex(0);
    adRailRef.current?.scrollTo({ left: 0, behavior: "smooth" });
  }, [adBanners?.length]);

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
    
    const cityMap = new Map<string, string>();
    const areaMap: Record<string, Set<string>> = {};
    
    turfs.forEach(t => {
      let city = t.location;
      let area = "";
      if (t.location.includes(",")) {
        const parts = t.location.split(",");
        city = parts[parts.length - 1].trim();
        area = parts.slice(0, -1).join(",").trim();
      }
      city = matchAdminLocation(city, adminLocations);
      cityMap.set(locationKey(city), city);
      if (!areaMap[city]) areaMap[city] = new Set();
      if (area) areaMap[city].add(area);
    });
    
    const sortedAreasByCity: Record<string, string[]> = {};
    Object.keys(areaMap).forEach(c => {
      sortedAreasByCity[c] = Array.from(areaMap[c]).sort();
    });
    
    return {
      cities: Array.from(cityMap.values()).sort(),
      areasByCity: sortedAreasByCity
    };
  }, [turfs, adminLocations]);

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
    tCity = matchAdminLocation(tCity, adminLocations);
    
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
    tCity = matchAdminLocation(tCity, adminLocations);
    
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

  const chooseLocation = (location: string | null) => {
    const next = location || "All locations";
    setDetectedLocation(next);
    localStorage.setItem("quickturf:detected-location", next);
    setFilterCity(location);
    setFilterArea(null);
    setLocationOpen(false);
  };

  // User initials for avatar fallback
  const initials = user
    ? (user.fullName || user.username).trim().charAt(0).toUpperCase()
    : "?";

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-lg border-b border-border">
        <div className="flex items-center justify-between px-4 py-3">
          <TurfTimeLogo size="sm" />
          <button
            type="button"
            className="mx-3 min-w-0 flex-1 text-left"
            onClick={() => setLocationOpen(true)}
            data-testid="button-location-picker"
          >
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <MapPin className="h-3.5 w-3.5 shrink-0 text-primary" />
              <span className="truncate" data-testid="text-detected-location">{detectedLocation}</span>
            </div>
          </button>
          
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

        {announcements.length > 0 && (
          <section className="flex snap-x snap-mandatory gap-2 overflow-x-auto scrollbar-hide" data-testid="section-announcements">
            {announcements.map(update => (
              <div key={update.id} className="min-w-full snap-center rounded-lg bg-card px-3 py-2 shadow-[inset_0_0_0_1px_rgba(255,255,255,.06)]">
                <div className="flex items-start gap-2">
                  <Info className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-foreground">{update.title}</p>
                    <p className="line-clamp-1 text-xs text-muted-foreground">{update.body}</p>
                  </div>
                </div>
              </div>
            ))}
          </section>
        )}

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

        {adBanners && adBanners.length > 0 && (
          <section data-testid="section-ad-banners" className="overflow-hidden">
            <div
              ref={adRailRef}
              className="flex snap-x snap-mandatory gap-3 overflow-x-auto scrollbar-hide"
              onScroll={(event) => {
                const width = event.currentTarget.clientWidth;
                if (width > 0) setActiveAdIndex(Math.round(event.currentTarget.scrollLeft / width));
              }}
            >
              {adBanners.map((ad, index) => (
                <button
                  type="button"
                  key={ad.id}
                  onClick={() => ad.ctaUrl && window.open(ad.ctaUrl, "_blank", "noopener,noreferrer")}
                  className="relative h-[112px] min-w-full snap-center overflow-hidden rounded-xl bg-card text-left shadow-[0_10px_24px_rgba(0,0,0,.22),inset_0_0_0_1px_rgba(255,255,255,.06)]"
                  data-testid={`card-ad-banner-${ad.id}`}
                >
                  {ad.imageUrl ? (
                    <img src={ad.imageUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />
                  ) : (
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_20%,rgba(34,197,94,.22),transparent_32%),linear-gradient(135deg,rgba(12,18,18,.96),rgba(5,7,7,.98))]" />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-r from-black/75 via-black/35 to-black/10" />
                  <div className="relative flex h-full flex-col justify-center px-4 pr-12 text-white">
                    {ad.showSponsored && (
                      <span className="mb-2 w-fit rounded-full bg-white/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide backdrop-blur-sm">
                        Sponsored
                      </span>
                    )}
                    <h2 className="line-clamp-1 text-lg font-bold leading-tight">{ad.title}</h2>
                    <p className="mt-1 line-clamp-1 text-sm text-white/80">{ad.body}</p>
                    {ad.ctaLabel && <span className="mt-1 text-xs font-semibold text-primary">{ad.ctaLabel}</span>}
                  </div>
                  {adBanners.length > 1 && (
                    <div className="absolute right-3 top-3 rounded-full bg-black/45 px-2 py-0.5 text-[10px] text-white/80">
                      {index + 1}/{adBanners.length}
                    </div>
                  )}
                </button>
              ))}
            </div>
            {adBanners.length > 1 && (
              <div className="pointer-events-none -mt-4 flex justify-center gap-1.5 pb-2">
                {adBanners.map((ad, index) => (
                  <span key={ad.id} className={`h-1.5 rounded-full shadow-sm transition-all ${index === activeAdIndex ? "w-5 bg-white" : "w-1.5 bg-white/45"}`} />
                ))}
              </div>
            )}
          </section>
        )}

        <AdSenseBanner />

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

      <Sheet open={locationOpen} onOpenChange={setLocationOpen}>
        <SheetContent side="bottom" className="rounded-t-2xl max-h-[75vh] overflow-y-auto">
          <SheetHeader className="text-left">
            <SheetTitle>Choose Location</SheetTitle>
            <SheetDescription>Select from locations added by admin.</SheetDescription>
          </SheetHeader>
          <div className="mt-5 space-y-2">
            <button
              type="button"
              onClick={() => chooseLocation(null)}
              className="w-full rounded-xl bg-card px-4 py-3 text-left text-sm font-medium text-foreground"
              data-testid="button-location-all"
            >
              All locations
            </button>
            {adminLocations.map(location => (
              <button
                type="button"
                key={location}
                onClick={() => chooseLocation(location)}
                className={`w-full rounded-xl px-4 py-3 text-left text-sm font-medium transition-colors ${
                  filterCity === location ? "bg-primary text-primary-foreground" : "bg-card text-foreground"
                }`}
                data-testid={`button-location-${location}`}
              >
                <span className="flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  {location}
                </span>
              </button>
            ))}
          </div>
        </SheetContent>
      </Sheet>

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
