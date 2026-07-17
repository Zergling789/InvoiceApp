import { act, fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { CLIENT_ERROR_EVENT } from "@/app/observability/clientErrorReporter";
import { GlobalBrowserErrorNotice } from "@/components/GlobalBrowserErrorNotice";

describe("GlobalBrowserErrorNotice", () => {
  it("shows a correlation id and can be dismissed", () => {
    render(<GlobalBrowserErrorNotice />);

    act(() => {
      window.dispatchEvent(
        new CustomEvent(CLIENT_ERROR_EVENT, {
          detail: { errorId: "41968d9d-d552-4a6b-8f84-ae5c97a98b34" },
        }),
      );
    });

    expect(screen.getByRole("alert")).toHaveTextContent("41968d9d-d552-4a6b-8f84-ae5c97a98b34");
    fireEvent.click(screen.getByRole("button", { name: "Fehlerhinweis schließen" }));
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});
