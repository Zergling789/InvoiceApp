import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ActivityTimeline } from "@/features/documents/ActivityTimeline";

const listActivityMock = vi.fn();

vi.mock("@/db/documentActivityDb", () => ({
  dbListDocumentActivity: () => listActivityMock(),
}));

describe("ActivityTimeline", () => {
  beforeEach(() => vi.clearAllMocks());

  it("offers retry after a loading failure", async () => {
    listActivityMock.mockRejectedValueOnce(new Error("private database detail")).mockResolvedValueOnce([]);
    render(<ActivityTimeline docType="offer" docId="offer-1" />);

    expect(await screen.findByRole("alert")).toHaveTextContent("Aktivitäten konnten nicht geladen werden");
    expect(screen.queryByText("private database detail")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Erneut versuchen" }));

    await waitFor(() => expect(listActivityMock).toHaveBeenCalledTimes(2));
    expect(await screen.findByText("Noch keine Aktivitäten.")).toBeVisible();
  });
});
