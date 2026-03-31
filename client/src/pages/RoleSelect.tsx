import { useLocation } from "wouter";
import { Users, Store } from "lucide-react";
import logoImg from "@assets/image_1774343851801.png";

export default function RoleSelect() {
  const [, navigate] = useLocation();

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Logo */}
      <div className="flex flex-col items-center justify-center pt-16 pb-10 px-6">
        <img
          src={logoImg}
          alt="QuickTurf"
          className="object-contain mb-2"
          style={{ height: 90, width: "auto" }}
        />
      </div>

      {/* Role selection */}
      <div className="flex-1 px-6 pb-12">
        <p className="text-center text-foreground font-medium mb-6 text-lg">
          Who are you?
        </p>

        <div className="flex flex-col gap-4">
          {/* Player */}
          <button
            type="button"
            data-testid="button-role-player"
            onClick={() => navigate("/login")}
            className="flex items-center gap-5 bg-card border border-border rounded-md px-6 py-5 text-left hover-elevate active-elevate-2 transition-all"
          >
            <div className="w-12 h-12 rounded-full bg-primary/15 flex items-center justify-center shrink-0">
              <Users className="w-6 h-6 text-primary" />
            </div>
            <div>
              <p className="text-foreground font-semibold text-base">Player</p>
              <p className="text-muted-foreground text-sm mt-0.5">
                Find and book cricket turfs near you
              </p>
            </div>
          </button>

          {/* Turf Owner */}
          <button
            type="button"
            data-testid="button-role-owner"
            onClick={() => navigate("/owner/login")}
            className="flex items-center gap-5 bg-card border border-border rounded-md px-6 py-5 text-left hover-elevate active-elevate-2 transition-all"
          >
            <div className="w-12 h-12 rounded-full bg-primary/15 flex items-center justify-center shrink-0">
              <Store className="w-6 h-6 text-primary" />
            </div>
            <div>
              <p className="text-foreground font-semibold text-base">Turf Owner</p>
              <p className="text-muted-foreground text-sm mt-0.5">
                List and manage your cricket ground
              </p>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}
