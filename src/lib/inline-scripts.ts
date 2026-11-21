/** Inline scripts that run before first paint. The CSP allows them by hash, so edit them only here. */
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

export const fontScaleScript = `
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
