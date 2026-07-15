import { describe, expect, it } from "vitest";

import { formatRegistrationError } from "./RegisterPage";

describe("formatRegistrationError", () => {
  it("maps the closed-beta hook rejection to a German user message", () => {
    expect(formatRegistrationError("BETA_INVITE_REQUIRED")).toBe(
      "Die Registrierung ist derzeit nur mit einer freigeschalteten Beta-Einladung möglich.",
    );
  });

  it("keeps unrelated Supabase errors intact", () => {
    expect(formatRegistrationError("User already registered")).toBe("User already registered");
  });
});
