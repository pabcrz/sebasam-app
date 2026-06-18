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
