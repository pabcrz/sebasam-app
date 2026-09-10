import "@testing-library/jest-dom/vitest";

class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}

if (typeof globalThis.ResizeObserver === "undefined") {
  (globalThis as typeof globalThis & { ResizeObserver: typeof ResizeObserver }).ResizeObserver =
    ResizeObserverStub as unknown as typeof ResizeObserver;
}

if (typeof window !== "undefined" && !window.matchMedia) {
  window.matchMedia = function matchMedia(query: string) {
    return {
      matches: false,
      media: query,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => true,
      addListener: () => {},
      removeListener: () => {},
    } as unknown as MediaQueryList;
  };
}

if (typeof window !== "undefined") {
  const store = new Map<string, string>();
  const localStorageMock: Storage = {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => {
      store.set(key, String(value));
    },
    removeItem: (key: string) => {
      store.delete(key);
    },
    clear: () => {
      store.clear();
    },
    key: (index: number) => Array.from(store.keys())[index] ?? null,
    get length() {
      return store.size;
    },
  };
  try {
    Object.defineProperty(window, "localStorage", {
      value: localStorageMock,
      writable: true,
      configurable: true,
    });
  } catch {}
}

const elementPrototype = typeof Element !== "undefined" ? Element.prototype : null;

if (elementPrototype) {
  if (!("hasPointerCapture" in elementPrototype)) {
    Object.defineProperty(elementPrototype, "hasPointerCapture", {
      value: () => false,
      writable: true,
      configurable: true,
    });
  }

  if (!("setPointerCapture" in elementPrototype)) {
    Object.defineProperty(elementPrototype, "setPointerCapture", {
      value: () => {},
      writable: true,
      configurable: true,
    });
  }

  if (!("releasePointerCapture" in elementPrototype)) {
    Object.defineProperty(elementPrototype, "releasePointerCapture", {
      value: () => {},
      writable: true,
      configurable: true,
    });
  }

  if (!("scrollIntoView" in elementPrototype)) {
    Object.defineProperty(elementPrototype, "scrollIntoView", {
      value: () => {},
      writable: true,
      configurable: true,
    });
  }
}
import { vi } from "vitest";
vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn(), replace: vi.fn(), prefetch: vi.fn(), back: vi.fn(), forward: vi.fn(), pathname: "/", query: {} }),
  usePathname: () => "/",
  useSearchParams: () => new URLSearchParams(),
}));

