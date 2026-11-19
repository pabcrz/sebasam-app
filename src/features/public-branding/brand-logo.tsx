import Image from "next/image";

export const BRAND_LOGO_SCREEN_SRC = "/logo-white-short.png";
// Navy version of the same mark, so paper never depends on a CSS invert filter.
export const BRAND_LOGO_PAPER_SRC = "/logo-ink-short.png";

type BrandLogoProps = {
  src: string;
  alt: string;
  size: number;
  className?: string;
  priority?: boolean;
};

/** One logo for every document: white on screen, navy on paper. Custom logos fall back to an invert filter. */
export function BrandLogo({ src, alt, size, className = "", priority = false }: BrandLogoProps) {
  const hasPaperVariant = src === BRAND_LOGO_SCREEN_SRC;
  const paperSize = "print:h-10 print:w-10";

  return (
    <>
      <Image
        src={src}
        alt={alt}
        width={size}
        height={size}
        priority={priority}
        className={`object-contain ${paperSize} ${hasPaperVariant ? "print:hidden" : "print:invert"} ${className}`}
      />
      {hasPaperVariant ? (
        <Image
          src={BRAND_LOGO_PAPER_SRC}
          alt=""
          aria-hidden="true"
          width={size}
          height={size}
          className={`hidden object-contain print:block ${paperSize}`}
        />
      ) : null}
    </>
  );
}
