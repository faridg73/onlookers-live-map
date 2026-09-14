import { useState } from "react";
import { cn } from "@/lib/utils";

type Props = {
  src: string | null | undefined;
  fallbackSrc: string;
  alt: string;
  className?: string;
  eager?: boolean;
};

/** Consistent place photography with a contextual image if a venue has no photo. */
export function PlacePhoto({ src, fallbackSrc, alt, className, eager = false }: Props) {
  const [failed, setFailed] = useState(false);
  const imageSrc = src && !failed ? src : fallbackSrc;

  return (
    <img
      src={imageSrc}
      alt={alt}
      loading={eager ? "eager" : "lazy"}
      width={1200}
      height={675}
      onError={() => setFailed(true)}
      className={cn("size-full object-cover", className)}
    />
  );
}