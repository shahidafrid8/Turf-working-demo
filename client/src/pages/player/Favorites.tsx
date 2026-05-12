import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Heart, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { TurfCard } from "@/components/TurfCard";
import { useFavoriteTurfs } from "@/lib/favorites";
import type { Turf } from "@shared/schema";
import { Link } from "wouter";

export default function Favorites() {
  const { favoriteIds } = useFavoriteTurfs();
  const { data: turfs, isLoading } = useQuery<Turf[]>({
    queryKey: ["/api/turfs"],
  });

  const favoriteTurfs = useMemo(() => {
    if (!turfs) return [];
    const favoriteSet = new Set(favoriteIds);
    return turfs.filter(turf => favoriteSet.has(turf.id));
  }, [favoriteIds, turfs]);

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-lg border-b border-border px-4 py-4">
        <h1 className="text-xl font-bold text-foreground">Favorites</h1>
      </header>

      <main className="px-4 py-6">
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <Skeleton key={index} className="h-28 rounded-xl" />
            ))}
          </div>
        ) : favoriteTurfs.length > 0 ? (
          <section className="space-y-4" data-testid="section-favorite-turfs">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-foreground">Saved Turfs</h2>
                <p className="text-sm text-muted-foreground">
                  {favoriteTurfs.length} {favoriteTurfs.length === 1 ? "favorite" : "favorites"}
                </p>
              </div>
              <Heart className="h-5 w-5 fill-red-500 text-red-500" />
            </div>

            <div className="space-y-3">
              {favoriteTurfs.map(turf => (
                <TurfCard key={turf.id} turf={turf} variant="list" />
              ))}
            </div>
          </section>
        ) : (
          <div className="text-center py-12">
            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-card flex items-center justify-center">
              <Heart className="w-10 h-10 text-muted-foreground" />
            </div>
            <h2 className="text-xl font-semibold text-foreground mb-2">No favorites yet</h2>
            <p className="text-muted-foreground text-sm mb-6 max-w-xs mx-auto">
              Tap the heart on any turf card to save it here for quick booking.
            </p>
            <Link href="/home">
              <Button className="green-glow" data-testid="button-browse-turfs">
                <Plus className="w-4 h-4 mr-2" />
                Browse Turfs
              </Button>
            </Link>
          </div>
        )}
      </main>
    </div>
  );
}
