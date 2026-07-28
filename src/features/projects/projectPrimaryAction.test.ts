import { describe, expect, it } from "vitest";

import type { Project } from "@/types";
import { getProjectPrimaryAction } from "./projectPrimaryAction";

const project = (phase: Project["phase"]): Project => ({
  id: "project-1",
  clientId: "client-1",
  name: "Einfahrt Weber",
  budgetType: "fixed",
  hourlyRate: 0,
  budgetTotal: 0,
  status: "active",
  phase,
  priority: "normal",
});

describe("project primary action", () => {
  it("routes planning work to a preselected quote", () => {
    const action = getProjectPrimaryAction(project("site_visit"));
    expect(action.label).toBe("Angebot vorbereiten");
    expect(action.to).toContain("projectId=project-1");
    expect(action.to).toContain("clientId=client-1");
  });

  it("routes completion work to an invoice", () => {
    expect(getProjectPrimaryAction(project("completion")).label).toBe("Rechnung erstellen");
  });
});

