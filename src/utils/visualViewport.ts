const VIEWPORT_HEIGHT_PROPERTY = "--app-viewport-height";
const VIEWPORT_OFFSET_PROPERTY = "--app-viewport-offset-top";

/** Keeps full-screen surfaces inside the actually visible mobile viewport. */
export function initializeVisualViewport() {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return () => undefined;
  }

  const root = document.documentElement;
  const update = () => {
    const viewport = window.visualViewport;
    const height = viewport?.height ?? window.innerHeight;
    const offsetTop = viewport?.offsetTop ?? 0;

    root.style.setProperty(VIEWPORT_HEIGHT_PROPERTY, `${Math.round(height)}px`);
    root.style.setProperty(VIEWPORT_OFFSET_PROPERTY, `${Math.round(offsetTop)}px`);
  };

  update();
  window.addEventListener("resize", update);
  window.addEventListener("orientationchange", update);
  window.visualViewport?.addEventListener("resize", update);
  window.visualViewport?.addEventListener("scroll", update);

  return () => {
    window.removeEventListener("resize", update);
    window.removeEventListener("orientationchange", update);
    window.visualViewport?.removeEventListener("resize", update);
    window.visualViewport?.removeEventListener("scroll", update);
  };
}
