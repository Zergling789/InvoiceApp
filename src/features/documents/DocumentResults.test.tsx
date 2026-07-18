import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { DocumentResults, type DocumentRow } from "./DocumentResults";

const { formatDateMock } = vi.hoisted(() => ({
  formatDateMock: vi.fn((_value: string, _locale?: string) => "16.07.2026"),
}));

vi.mock("@/types", () => ({
  formatDate: (value: string, locale?: string) => formatDateMock(value, locale),
}));

const rows: DocumentRow[] = [
  {
    id: "offer-1",
    type: "offer",
    number: "ANG-0154",
    clientName: "Beispiel GmbH",
    firstName: "Fabian",
    lastName: "Heimlich",
    companyName: "Beispiel GmbH",
    date: "2026-07-16",
    amountLabel: "119,00 €",
    statusLabel: "Entwurf",
    statusTone: "gray",
    statusKey: "draft",
    validUntil: "2026-07-30",
  },
];

describe("DocumentResults", () => {
  it("skips rebuilding unchanged result rows", () => {
    const onOpen = vi.fn();
    const { rerender } = render(
      <DocumentResults rows={rows} highlightedDocument={null} onOpen={onOpen} />,
    );
    const callsAfterInitialRender = formatDateMock.mock.calls.length;

    rerender(<DocumentResults rows={rows} highlightedDocument={null} onOpen={onOpen} />);

    expect(formatDateMock).toHaveBeenCalled();
    expect(formatDateMock).toHaveBeenCalledTimes(callsAfterInitialRender);
  });

  it("opens a desktop result with the keyboard", () => {
    const onOpen = vi.fn();
    render(<DocumentResults rows={rows} highlightedDocument={null} onOpen={onOpen} />);

    fireEvent.keyDown(screen.getByRole("row", { name: /ANG-0154/i }), { key: "Enter" });

    expect(onOpen).toHaveBeenCalledWith(rows[0]);
  });

  it("shows the acceptance date for accepted offers", () => {
    render(
      <DocumentResults
        rows={[{
          ...rows[0],
          statusLabel: "Angenommen",
          statusTone: "green",
          statusKey: "accepted",
          statusChangedAt: "2026-07-18T12:00:00.000Z",
        }]}
        highlightedDocument={null}
        onOpen={vi.fn()}
      />,
    );

    expect(screen.getAllByText("Angenommen: 16.07.2026")).toHaveLength(2);
  });
});
