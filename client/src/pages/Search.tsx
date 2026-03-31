import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search as SearchIcon, SlidersHorizontal, MapPin, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TurfCard } from "@/components/TurfCard";
import { Skeleton } from "@/components/ui/skeleton";
import type { Turf } from "@shared/schema";

const recentSearches = ["Football turf near me", "Cricket ground", "Basketball court"];
const popularLocations = ["Indiranagar", "Koramangala", "HSR Layout", "Whitefield"];

export default function Search() {
  const [query, setQuery] = useState("");
  const [hasSearched, setHasSearched] = useState(false);

  const { data: turfs, isLoading } = useQuery<Turf[]>({
    queryKey: ["/api/turfs"],
    enabled: hasSearched && query.length > 0,
  });

  const filteredTurfs = turfs?.filter((t) =>
    t.name.toLowerCase().includes(query.toLowerCase()) ||
    t.location.toLowerCase().includes(query.toLowerCase())
  ) || [];

  const handleSearch = () => {
    if (query.length > 0) {
      setHasSearched(true);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Search Header */}
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-lg border-b border-border p-4">
        <div className="relative">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search turfs, locations, sports..."
            className="pl-10 pr-20 h-12 bg-card border-none"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            data-testid="input-search"
          />
          {query && (
            <button
              onClick={() => {
                setQuery("");
                setHasSearched(false);
              }}
              className="absolute right-12 top-1/2 -translate-y-1/2 p-1"
              data-testid="button-clear-search"
            >
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          )}
          <Button
            size="icon"
            variant="ghost"
            className="absolute right-1 top-1/2 -translate-y-1/2"
            data-testid="button-filter"
          >
            <SlidersHorizontal className="w-5 h-5" />
          </Button>
        </div>
      </header>

      <main className="px-4 py-6 space-y-6">
        {!hasSearched ? (
          <>
            {/* Recent Searches */}
            <section className="space-y-3" data-testid="section-recent">
              <h2 className="font-semibold text-foreground">Recent Searches</h2>
              <div className="flex flex-wrap gap-2">
                {recentSearches.map((search) => (
                  <Badge
                    key={search}
                    variant="secondary"
                    className="px-3 py-2 cursor-pointer hover-elevate"
                    onClick={() => {
                      setQuery(search);
                      setHasSearched(true);
                    }}
                    data-testid={`badge-recent-${search.toLowerCase().replace(/\s+/g, '-')}`}
                  >
                    <SearchIcon className="w-3 h-3 mr-2" />
                    {search}
                  </Badge>
                ))}
              </div>
            </section>

            {/* Popular Locations */}
            <section className="space-y-3" data-testid="section-locations">
              <h2 className="font-semibold text-foreground">Popular Locations</h2>
              <div className="grid grid-cols-2 gap-3">
                {popularLocations.map((location) => (
                  <button
                    key={location}
                    onClick={() => {
                      setQuery(location);
                      setHasSearched(true);
                    }}
                    className="flex items-center gap-3 p-4 bg-card rounded-xl hover-elevate"
                    data-testid={`button-location-${location.toLowerCase()}`}
                  >
                    <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center">
                      <MapPin className="w-5 h-5 text-primary" />
                    </div>
                    <span className="font-medium text-foreground">{location}</span>
                  </button>
                ))}
              </div>
            </section>
          </>
        ) : (
          <>
            {/* Search Results */}
            <section className="space-y-4" data-testid="section-results">
              <div className="flex items-center justify-between">
                <h2 className="font-semibold text-foreground">
                  Results for "{query}"
                </h2>
                <span className="text-sm text-muted-foreground">
                  {filteredTurfs.length} found
                </span>
              </div>

              {isLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <Skeleton key={i} className="h-28 rounded-xl" />
                  ))}
                </div>
              ) : filteredTurfs.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-card flex items-center justify-center">
                    <SearchIcon className="w-8 h-8 text-muted-foreground" />
                  </div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">No results found</h3>
                  <p className="text-muted-foreground text-sm">
                    Try different keywords or check the spelling
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredTurfs.map((turf) => (
                    <TurfCard key={turf.id} turf={turf} variant="list" />
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </main>
    </div>
  );
}
