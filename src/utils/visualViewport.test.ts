import { afterEach, describe, expect, it } from "vitest";

import { initializeVisualViewport } from "./visualViewport";

const originalInnerHeight = window.innerHeight;
const originalVisualViewport = window.visualViewport;

afterEach(() => {
  Object.defineProperty(window, "innerHeight", {
    configurable: true,
    value: originalInnerHeight,
  });
  Object.defineProperty(window, "visualViewport", {
    configurable: true,
    value: originalVisualViewport,
  });
  document.documentElement.style.removeProperty("--app-viewport-height");
  document.documentElement.style.removeProperty("--app-viewport-offset-top");
});

describe("initializeVisualViewport", () => {
  it("tracks the available window height and reacts to resizing", () => {
    Object.defineProperty(window, "visualViewport", {
      configurable: true,
      value: undefined,
    });
    Object.defineProperty(window, "innerHeight", {
      configurable: true,
      value: 844,
    });

    const cleanup = initializeVisualViewport();
    expect(document.documentElement.style.getPropertyValue("--app-viewport-height")).toBe("844px");
    expect(document.documentElement.style.getPropertyValue("--app-viewport-offset-top")).toBe("0px");

    Object.defineProperty(window, "innerHeight", {
      configurable: true,
      value: 521,
    });
    window.dispatchEvent(new Event("resize"));

    expect(document.documentElement.style.getPropertyValue("--app-viewport-height")).toBe("521px");
    cleanup();
  });
});
