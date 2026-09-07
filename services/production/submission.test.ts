import { it, expect } from "vitest";
import { mkdirSync, writeFileSync } from "node:fs";
import { emptyStore, estimateJob } from "./model";
import { ApparelType } from "../../types";
import { validateStore } from "./storage";
it("creates a reproducible synthetic submission job from actual formulas", () => {
  const s = emptyStore(),
    j = s.jobs[0];
  j.id = "demo-24-polos";
  j.name = "24 embroidered polos";
  j.quantity = 24;
  j.machine.heads = 6;
  j.machine.apparelType = ApparelType.Polo;
  j.createdAt = j.updatedAt = j.plannedStart = "2026-09-07T08:00:00Z";
  j.designs[0] = {
    ...j.designs[0],
    id: "left-chest",
    quantity: 24,
    stitches: 10000,
    colors: 3,
  };
  s.activeId = j.id;
  s.jobs[0] = { ...estimateJob(j), status: "ready" };
  expect(validateStore(s).jobs[0].quote!.total).toBeGreaterThan(0);
  mkdirSync("artifacts/submission", { recursive: true });
  writeFileSync(
    "artifacts/submission/demo-ready.json",
    JSON.stringify(s, null, 2),
  );
});
