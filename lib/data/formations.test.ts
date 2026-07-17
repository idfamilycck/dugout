import { describe, it, expect } from "vitest";
import { FORMATIONS } from "./formations";
import { ROLES, ROLES_BY_POSITION, DEFAULT_ROLE } from "./roles";

describe("formations", () => {
  it("6종 포메이션 모두 슬롯 11개, GK 정확히 1개", () => {
    const ids = Object.keys(FORMATIONS);
    expect(ids).toHaveLength(6);
    for (const f of Object.values(FORMATIONS)) {
      expect(f.slots).toHaveLength(11);
      expect(f.slots.filter((s) => s.position === "GK")).toHaveLength(1);
      for (const s of f.slots) {
        expect(s.x).toBeGreaterThanOrEqual(0); expect(s.x).toBeLessThanOrEqual(100);
        expect(s.y).toBeGreaterThanOrEqual(0); expect(s.y).toBeLessThanOrEqual(100);
      }
    }
  });
  it("슬롯 id는 포메이션 내 유일", () => {
    for (const f of Object.values(FORMATIONS)) {
      expect(new Set(f.slots.map((s) => s.id)).size).toBe(11);
    }
  });
});

describe("roles", () => {
  it("모든 역할의 weights 합은 1(±0.001)", () => {
    for (const r of Object.values(ROLES)) {
      const sum = Object.values(r.weights).reduce((a, b) => a + (b ?? 0), 0);
      expect(Math.abs(sum - 1)).toBeLessThan(0.001);
    }
  });
  it("포지션 8종 모두 기본 역할이 있고 해당 포지션 소속", () => {
    const positions = ["GK","CB","FB","DM","CM","AM","WG","ST"] as const;
    for (const p of positions) {
      expect(ROLES_BY_POSITION[p].length).toBeGreaterThanOrEqual(2);
      expect(ROLES[DEFAULT_ROLE[p]].position).toBe(p);
    }
  });
});
