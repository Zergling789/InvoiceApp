import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { LoadErrorCard } from "@/components/LoadErrorCard";

describe("LoadErrorCard", () => {
  it("offers a clear retry without exposing a technical error", () => {
    const retry = vi.fn();
    render(<LoadErrorCard title="Dokumente konnten nicht geladen werden" onRetry={retry} />);

    expect(screen.getByRole("alert")).toHaveTextContent("Deine gespeicherten Daten bleiben unverändert");
    fireEvent.click(screen.getByRole("button", { name: "Erneut versuchen" }));
    expect(retry).toHaveBeenCalledOnce();
  });
});
