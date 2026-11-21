"use client";

import { fontScaleScript } from "@/lib/inline-scripts";

export function FontScaleScript() {
  return (
    <script
      type={typeof window === "undefined" ? "text/javascript" : "text/plain"}
      suppressHydrationWarning
      dangerouslySetInnerHTML={{ __html: fontScaleScript }}
    />
  );
}
