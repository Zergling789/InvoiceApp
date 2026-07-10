import type { ReactElement } from "react";
import { render, type RenderOptions } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

import { ConfirmProvider, ToastProvider } from "@/ui/FeedbackProvider";

type ProviderOptions = Omit<RenderOptions, "wrapper"> & {
  route?: string;
};

export function renderWithProviders(
  ui: ReactElement,
  { route = "/", ...options }: ProviderOptions = {}
) {
  return render(
    <MemoryRouter initialEntries={[route]}>
      <ToastProvider>
        <ConfirmProvider>{ui}</ConfirmProvider>
      </ToastProvider>
    </MemoryRouter>,
    options
  );
}
