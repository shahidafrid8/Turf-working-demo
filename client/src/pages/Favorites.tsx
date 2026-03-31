import { Heart, Plus } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";

export default function Favorites() {
  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-lg border-b border-border px-4 py-4">
        <h1 className="text-xl font-bold text-foreground">Favorites</h1>
      </header>

      <main className="px-4 py-6">
        {/* Empty State */}
        <div className="text-center py-12">
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-card flex items-center justify-center">
            <Heart className="w-10 h-10 text-muted-foreground" />
          </div>
          <h2 className="text-xl font-semibold text-foreground mb-2">No favorites yet</h2>
          <p className="text-muted-foreground text-sm mb-6 max-w-xs mx-auto">
            Save your favorite turfs here for quick access when booking
          </p>
          <Link href="/">
            <Button className="green-glow" data-testid="button-browse-turfs">
              <Plus className="w-4 h-4 mr-2" />
              Browse Turfs
            </Button>
          </Link>
        </div>

        {/* How it works */}
        <Card className="p-4 mt-8" data-testid="card-how-it-works">
          <h3 className="font-semibold text-foreground mb-4">How to add favorites</h3>
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center flex-shrink-0">
                <span className="text-primary font-semibold">1</span>
              </div>
              <div>
                <p className="font-medium text-foreground">Browse turfs</p>
                <p className="text-sm text-muted-foreground">Explore available turfs near you</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center flex-shrink-0">
                <span className="text-primary font-semibold">2</span>
              </div>
              <div>
                <p className="font-medium text-foreground">Tap the heart icon</p>
                <p className="text-sm text-muted-foreground">Save turfs you like for later</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center flex-shrink-0">
                <span className="text-primary font-semibold">3</span>
              </div>
              <div>
                <p className="font-medium text-foreground">Quick booking</p>
                <p className="text-sm text-muted-foreground">Book your favorites with one tap</p>
              </div>
            </div>
          </div>
        </Card>
      </main>
    </div>
  );
}
