import Image from "next/image";
import { cn } from "@/lib/utils";

export function ChiffreWordmark({
  className,
  priority = false,
  inverted = false,
}: {
  className?: string;
  priority?: boolean;
  inverted?: boolean;
}) {
  return (
    <span
      role="img"
      aria-label="Chiffre"
      className={cn("relative block aspect-[774/256] overflow-hidden", className)}
    >
      <Image
        src="/brand/mbf-logo.png"
        alt=""
        width={1536}
        height={1024}
        priority={priority}
        className={cn(
          "pointer-events-none absolute -left-[52.58%] -top-[134.38%] h-auto w-[198.45%] max-w-none",
          inverted && "brightness-0 invert",
        )}
      />
    </span>
  );
}
