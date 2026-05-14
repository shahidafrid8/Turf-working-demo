import logoImg from "@assets/image_1774343851801.png";

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
  const w = Math.round(h * 1.56);

  return (
    <div className="flex shrink-0 items-center" data-testid="logo-turftime">
      <img
        src={logoImg}
        alt="QuickTurf"
        style={{ height: h, width: w }}
        className="object-contain mix-blend-screen"
      />
    </div>
  );
}
