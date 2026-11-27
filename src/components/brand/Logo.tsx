import Image from "next/image";
// Official wordmark (public/brand). "light" = white strokes for dark surfaces, gold accents kept.
export function Logo({ variant = "dark", className = "h-5 w-auto" }: { variant?: "dark" | "light"; className?: string }) {
  return <Image src={variant === "light" ? "/brand/agoojiye-logo-light.png" : "/brand/agoojiye-logo.png"} alt="AGOOJIYÉ" width={900} height={139} priority className={className} />;
}
