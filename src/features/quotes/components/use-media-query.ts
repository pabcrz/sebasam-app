import { useSyncExternalStore } from "react";

/**
 * Subscribes to a media query. The server snapshot is `false`, so SSR and the first client
 * render use the mobile layout; the real match is applied right after hydration.
 */
export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (callback) => {
      const mql = window.matchMedia(query);
      mql.addEventListener("change", callback);
      return () => mql.removeEventListener("change", callback);
    },
    () => window.matchMedia(query).matches,
    () => false,
  );
}

/** Concept editing switches to the table layout at the Tailwind `lg` breakpoint. */
export const CONCEPT_TABLE_MEDIA_QUERY = "(min-width: 1024px)";

export function useIsConceptTableLayout() {
  return useMediaQuery(CONCEPT_TABLE_MEDIA_QUERY);
}
