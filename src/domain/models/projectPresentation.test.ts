import { describe, expect, it } from "vitest";

import { formatProjectBudget, getProjectPlannedValue, PROJECT_STATUS_LABELS } from "./projectPresentation";

describe("project presentation", () => {
  it("formats project values in user-facing German", () => {
    expect(formatProjectBudget({ id: "1", clientId: "c", name: "Bad", budgetType: "hourly", hourlyRate: 75, budgetTotal: 12, status: "active", phase: "inquiry", priority: "normal" })).toContain("12 Std. geplant");
    expect(formatProjectBudget({ id: "2", clientId: "c", name: "Dach", budgetType: "fixed", hourlyRate: 0, budgetTotal: 2500, status: "completed", phase: "completed", priority: "normal" })).toContain("Festpreis 2.500,00 €");
    expect(PROJECT_STATUS_LABELS.completed).toBe("Abgeschlossen");
  });

  it("calculates the planned value without duplicating it in the UI", () => {
    expect(getProjectPlannedValue({ id: "1", clientId: "c", name: "Bad", budgetType: "hourly", hourlyRate: 75, budgetTotal: 12, status: "active", phase: "inquiry", priority: "normal" })).toBe(900);
  });
});
