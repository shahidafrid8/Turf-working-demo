import { CheckCircle, ShieldCheck, Trophy } from "lucide-react";
import { cn } from "@/lib/utils";

type Step = {
  label: string;
  status: "complete" | "current" | "next";
};

const steps: Step[] = [
  { label: "Account", status: "complete" },
  { label: "Turf details", status: "current" },
  { label: "Admin review", status: "next" },
];

export function OnboardingProgress() {
  return (
    <section className="space-y-4">
      <div className="rounded-xl border border-primary/20 bg-primary/10 px-4 py-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/15 flex items-center justify-center shrink-0">
            <ShieldCheck className="w-5 h-5 text-primary" />
          </div>
          <div>
            <p className="text-primary font-semibold text-sm">Account approved</p>
            <p className="text-muted-foreground text-xs mt-1 leading-relaxed">
              Add the turf details below. Admin approval will make it live for players.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {steps.map((step, index) => (
          <div
            key={step.label}
            className={cn(
              "rounded-lg border px-2 py-3 text-center",
              step.status === "complete" && "border-primary/30 bg-primary/10",
              step.status === "current" && "border-blue-400/30 bg-blue-500/10",
              step.status === "next" && "border-border bg-card"
            )}
          >
            <div className="flex justify-center mb-1">
              {step.status === "complete" ? (
                <CheckCircle className="w-4 h-4 text-primary" />
              ) : (
                <Trophy className={cn("w-4 h-4", step.status === "current" ? "text-blue-400" : "text-muted-foreground")} />
              )}
            </div>
            <p className="text-[11px] font-semibold text-foreground">{index + 1}. {step.label}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
