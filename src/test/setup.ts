import "@testing-library/jest-dom/vitest";

// jsdom does not implement matchMedia, and Astryx's navigation and menu components read it on
// mount. A stub that never matches is the "desktop, no preferences" answer.
if (typeof window.matchMedia !== "function") {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
      addListener: () => undefined,
      removeListener: () => undefined,
      dispatchEvent: () => false,
    }),
  });
}
