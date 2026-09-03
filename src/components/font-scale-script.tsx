"use client";

const fontScaleScript = `
  (function () {
    try {
      var scale = localStorage.getItem('sebasam-font-scale');
      if (scale === 'large') {
        document.documentElement.setAttribute('data-font-scale', 'large');
      } else {
        document.documentElement.removeAttribute('data-font-scale');
      }
    } catch (_) {
      // localStorage inaccessible
    }
  })();
`;

export function FontScaleScript() {
  return (
    <script
      type={typeof window === "undefined" ? "text/javascript" : "text/plain"}
      suppressHydrationWarning
      dangerouslySetInnerHTML={{ __html: fontScaleScript }}
    />
  );
}
