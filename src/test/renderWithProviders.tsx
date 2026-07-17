import type { ReactElement } from "react";
import { render, type RenderOptions } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

import { ConfirmProvider, ToastProvider } from "@/ui/FeedbackProvider";

type ProviderOptions = Omit<RenderOptions, "wrapper"> & {
  route?: string;
  routeState?: unknown;
};

export function renderWithProviders(
  ui: ReactElement,
  { route = "/", routeState, ...options }: ProviderOptions = {}
) {
  return render(
    <MemoryRouter initialEntries={[routeState === undefined ? route : { pathname: route, state: routeState }]}>
      <ToastProvider>
        <ConfirmProvider>{ui}</ConfirmProvider>
      </ToastProvider>
    </MemoryRouter>,
    options
  );
}
