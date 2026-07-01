/**
 * Injects a minimal inline script into the initial HTML.
 * Reads theme from localStorage and applies the `.dark` class before
 * React hydrates, preventing a flash of unstyled content.
 *
 * Next.js 16/React warns when an executable <script> is rendered while
 * hydrating on the client, so the script is executable on the server output
 * and inert (`text/plain`) on the client render.
 */
export function ThemeScript() {
  return (
    <script
      type={typeof window === "undefined" ? "text/javascript" : "text/plain"}
      suppressHydrationWarning
      dangerouslySetInnerHTML={{
        __html: `
          (function () {
            try {
              var theme = localStorage.getItem('sebasam-theme');
              if (theme === 'dark') {
                document.documentElement.classList.add('dark');
              } else {
                document.documentElement.classList.remove('dark');
              }
            } catch (_) {
              // localStorage inaccessible; stay with default light theme
            }
          })();
        `,
      }}
    />
  );
}
