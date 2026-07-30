/**
 * Reads theme from localStorage and applies the `.dark` class before
 * React hydrates, preventing a flash of unstyled content.
 */
export const themeScript = `
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
`;
