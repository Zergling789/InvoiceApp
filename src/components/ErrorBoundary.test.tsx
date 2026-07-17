import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ErrorBoundary } from "./ErrorBoundary";

function BrokenComponent(): never {
  throw new Error("render failed");
}

describe("ErrorBoundary", () => {
  beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    vi.spyOn(window, "fetch").mockResolvedValue(new Response(null, { status: 202 }));
  });
  afterEach(() => vi.restoreAllMocks());

  it("shows a German recovery screen without technical error details", () => {
    render(<ErrorBoundary><BrokenComponent /></ErrorBoundary>);
    expect(screen.getByRole("alert")).toHaveTextContent("Die Anwendung konnte nicht angezeigt werden");
    expect(screen.getByRole("button", { name: "Seite neu laden" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Zur Startseite" })).toHaveAttribute("href", "/");
    expect(screen.queryByText("render failed")).not.toBeInTheDocument();
  });
});
