/**
 * Server component that injects a minimal inline script into <head>.
 * Reads theme from localStorage and applies the `.dark` class before
 * React hydrates, preventing a flash of unstyled content.
 *
 * Does NOT render a <script> element inside the React component tree,
 * so it does not conflict with Turbopack's script-in-RFC warning.
 */
export function ThemeScript() {
  return (
    <script
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
