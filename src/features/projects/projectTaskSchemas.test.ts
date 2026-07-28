import { describe, expect, it } from "vitest";

import {
  projectTaskCreateSchema,
  projectTaskUpdateSchema,
} from "./projectTaskSchemas";

describe("project task schemas", () => {
  it("normalizes valid task input", () => {
    expect(
      projectTaskCreateSchema.parse({
        title: "  Baustellentermin abstimmen  ",
        priority: "urgent",
      }),
    ).toEqual({
      title: "Baustellentermin abstimmen",
      priority: "urgent",
    });
  });

  it("rejects arbitrary task statuses", () => {
    expect(() =>
      projectTaskUpdateSchema.parse({ status: "almost_done" }),
    ).toThrow();
  });

  it("allows clearing the due date during an update", () => {
    expect(projectTaskUpdateSchema.parse({ dueAt: "" })).toEqual({
      dueAt: null,
    });
  });
});
