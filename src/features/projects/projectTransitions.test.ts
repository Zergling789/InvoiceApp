import { describe, expect, it } from "vitest";

import type { Project } from "@/types";
import { applyProjectTransition, canManuallyTransition } from "./projectTransitions";

const project = (phase: Project["phase"]): Project => ({
  id: "project-1",
  name: "Terrasse Müller",
  budgetType: "fixed",
  hourlyRate: 0,
  budgetTotal: 0,
  status: "active",
  phase,
  priority: "normal",
});

describe("project transitions", () => {
  it("moves an accepted quote forward", () => {
    expect(applyProjectTransition({ project: project("quote_sent"), event: "QUOTE_ACCEPTED" }).phase).toBe("accepted");
  });

  it("does not move a project backwards", () => {
    expect(applyProjectTransition({ project: project("in_progress"), event: "QUOTE_SENT" }).phase).toBe("in_progress");
  });

  it("documents valid and invalid manual transitions", () => {
    expect(canManuallyTransition("accepted", "scheduled")).toBe(true);
    expect(canManuallyTransition("accepted", "quote_draft")).toBe(false);
  });
});

