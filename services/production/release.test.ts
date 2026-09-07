import { describe, it, expect } from "vitest";
import { emptyStore, estimateJob, transition, FORMULA_VERSION } from "./model";
import { validateStore, mergeBackup } from "./storage";
const running = () => {
  const s = emptyStore();
  s.jobs[0].designs[0].stitches = 10000;
  s.jobs[0] = transition(
    { ...estimateJob(s.jobs[0]), status: "ready" },
    "start",
    "2026-01-01T08:00:00Z",
  );
  return s;
};
describe("release data regression cases", () => {
  it("preserves incomplete numeric drafts but invalidates stale results", () => {
    const s = emptyStore();
    s.jobs[0].quantity = 0;
    s.jobs[0].machine.heads = 0;
    s.jobs[0].rates.margin = 100;
    expect(validateStore(s).jobs[0].quantity).toBe(0);
  });
  it.each([NaN, Infinity])("rejects nonfinite draft inputs %s", (n) => {
    const s = emptyStore();
    s.jobs[0].quantity = n;
    expect(() => validateStore(s)).toThrow();
  });
  it("rejects invalid profiles even when no job uses them", () => {
    const s = emptyStore();
    s.profiles[0].machine.heads = 0;
    expect(() => validateStore(s)).toThrow();
  });
  it("rejects duplicate profile and design IDs", () => {
    const s = emptyStore();
    s.profiles.push(structuredClone(s.profiles[0]));
    expect(() => validateStore(s)).toThrow(/unique/);
    s.profiles.pop();
    s.jobs[0].designs.push(structuredClone(s.jobs[0].designs[0]));
    expect(() => validateStore(s)).toThrow(/unique/);
  });
  it("preserves conflicting imported profiles", () => {
    const s = emptyStore(),
      incoming = structuredClone(s);
    incoming.profiles[0].name = "Different";
    expect(mergeBackup(s, incoming).profiles).toHaveLength(2);
  });
  it("does not import forged quote totals", () => {
    const s = emptyStore();
    s.jobs[0].designs[0].stitches = 10000;
    s.jobs[0] = { ...estimateJob(s.jobs[0]), status: "ready" };
    s.jobs[0].quote!.total = 999999;
    expect(mergeBackup(emptyStore(), s).jobs.at(-1)!.quote!.total).not.toBe(
      999999,
    );
  });
  it("rejects status inconsistent with an open pause", () => {
    const s = running();
    s.jobs[0].run!.pauses.push({
      startedAt: "2026-01-01T09:00:00Z",
      reason: "off",
    });
    expect(() => validateStore(s)).toThrow(/disagree/);
  });
  it("rejects a completed duration that disagrees with timestamps", () => {
    const s = running();
    s.jobs[0] = transition(s.jobs[0], "complete", "2026-01-01T09:00:00Z");
    s.jobs[0].run!.actualMinutes = 1;
    expect(() => validateStore(s)).toThrow(/disagrees/);
  });
  it("rejects malformed completion and unfinished completion metadata", () => {
    const s = running();
    s.jobs[0].run!.completedAt = "bad";
    expect(() => validateStore(s)).toThrow();
    s.jobs[0] = transition(s.jobs[0], "complete", "2026-01-01T09:00:00Z");
    s.jobs[0].run!.completedAt = "bad";
    expect(() => validateStore(s)).toThrow();
  });
  it("keeps frozen 3.0.0 production while old ready jobs need recalculation", () => {
    const s = running();
    s.jobs[0] = estimateJob(s.jobs[0], "3.0.0");
    const before = s.jobs[0].estimate!.netMinutes;
    const restored = validateStore(s).jobs[0];
    expect(restored.formulaVersion).toBe("3.0.0");
    expect(restored.estimate!.netMinutes).toBe(before);
    s.jobs[0].status = "ready";
    delete s.jobs[0].run;
    expect(validateStore(s).jobs[0].status).toBe("draft");
    expect(FORMULA_VERSION).toBe("3.1.0");
  });
});
