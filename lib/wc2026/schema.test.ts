import { describe, it, expect } from "vitest";
import matches from "@/data/wc2026/matches.json";
import type { Wc2026Match } from "@/lib/wc2026/types";

describe("wc2026 matches.json", () => {
  const all = matches as Wc2026Match[];
  it("경기 수가 90개 이상 104개 이하", () => {
    expect(all.length).toBeGreaterThanOrEqual(90);
    expect(all.length).toBeLessThanOrEqual(104);
  });
  it("모든 경기가 필수 필드를 가진다", () => {
    for (const m of all) {
      expect(m.id).toBeTruthy();
      expect(m.home).toMatch(/^[A-Z]{3}$/);
      expect(m.away).toMatch(/^[A-Z]{3}$/);
      expect(Array.isArray(m.events)).toBe(true);
      expect(m.lineups).toHaveLength(2);
    }
  });
  it("이벤트 minute가 오름차순", () => {
    for (const m of all) {
      const mins = m.events.map((e) => e.minute);
      expect(mins).toEqual([...mins].sort((a, b) => a - b));
    }
  });
});
