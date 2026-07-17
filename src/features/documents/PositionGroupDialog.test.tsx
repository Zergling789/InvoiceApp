import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  loadPositionGroups,
  type PositionGroup,
} from "@/app/positions/positionCatalogService";
import { PositionGroupDialog } from "./PositionGroupDialog";

vi.mock("@/app/positions/positionCatalogService", () => ({
  loadPositionGroups: vi.fn(),
}));

const group: PositionGroup = {
  id: "group-1",
  name: "Gartenpaket",
  description: "",
  category: "Garten",
  position_group_items: [
    {
      id: "item-1",
      title: "Montage",
      description: "Vor Ort",
      quantity: 2,
      unit: "Std",
      unit_price: 75,
      tax_category: "STANDARD",
      tax_rate: 19,
      optional: false,
    },
    {
      id: "item-2",
      title: "Anfahrt",
      description: "",
      quantity: 1,
      unit: "Stk",
      unit_price: 25,
      tax_category: "STANDARD",
      tax_rate: 19,
      optional: true,
    },
  ],
};

describe("PositionGroupDialog", () => {
  beforeEach(() => {
    vi.mocked(loadPositionGroups).mockResolvedValue([group]);
  });

  it("is mobile-safe and applies only the selected package positions", async () => {
    const onApply = vi.fn();
    render(<PositionGroupDialog onApply={onApply} onClose={vi.fn()} />);

    const dialog = screen.getByRole("dialog", { name: "Paket übernehmen" });
    expect(dialog.parentElement).toHaveClass("app-visual-viewport");
    fireEvent.click(await screen.findByRole("button", { name: /Gartenpaket/ }));

    const checkboxes = screen.getAllByRole("checkbox");
    expect(checkboxes[0]).toBeChecked();
    expect(checkboxes[1]).not.toBeChecked();
    fireEvent.click(screen.getByRole("button", { name: "Paket übernehmen" }));

    await waitFor(() => expect(onApply).toHaveBeenCalledOnce());
    expect(onApply).toHaveBeenCalledWith([
      expect.objectContaining({
        description: "Montage\nVor Ort",
        quantity: 2,
        unit: "Std",
        price: 75,
      }),
    ]);
  });
});
