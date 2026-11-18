export function useRouter() {
  return {
    push: (href: string) => window.history.pushState({}, "", href),
    replace: (href: string) => window.history.replaceState({}, "", href),
    refresh: () => undefined,
  };
}

export function useSearchParams() {
  return new URLSearchParams(window.location.search);
}
