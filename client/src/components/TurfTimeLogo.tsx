import logoImg from "@assets/quickturf-logo-transparent.png";

interface TurfTimeLogoProps {
  size?: "sm" | "md" | "lg";
  showText?: boolean;
}

export function TurfTimeLogo({ size = "md", showText = true }: TurfTimeLogoProps) {
  const heights = {
    sm: 32,
    md: 42,
    lg: 56,
  };

  const h = heights[size];

  return (
    <div className="flex items-center" data-testid="logo-turftime">
      <img
        src={logoImg}
        alt="QuickTurf"
        style={{ height: h, width: "auto" }}
        className="object-contain"
      />
    </div>
  );
}
