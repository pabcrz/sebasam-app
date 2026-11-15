/**
 * Invisible 44px hit area for controls shorter than the touch minimum.
 * Same technique as Button; the element also needs `relative`.
 */
export const tapAreaClassName =
  "before:absolute before:left-1/2 before:top-1/2 before:h-[max(100%,var(--tap-min-height))] before:w-[max(100%,var(--tap-min-height))] before:-translate-x-1/2 before:-translate-y-1/2 before:content-['']";
