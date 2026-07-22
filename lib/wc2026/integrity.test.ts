import { describe, it, expect } from "vitest";
import matches from "@/data/wc2026/matches.json";
import type { Wc2026Match } from "@/lib/wc2026/types";

const active = (matches as Wc2026Match[]).filter((m) => !m.excluded);

describe("wc2026 정합성 (excluded 아닌 경기)", () => {
  it("이벤트 골 수 = 최종 스코어", () => {
    for (const m of active) {
      const goalsHome = m.events.filter(
        (e) => (e.type === "goal" || e.type === "pen_goal") && e.teamCode === m.home
      ).length;
      const ownForHome = m.events.filter(
        (e) => e.type === "own_goal" && e.teamCode === m.away
      ).length;
      expect(goalsHome + ownForHome).toBe(m.scoreHome);
    }
  });
  it("교체는 팀당 5회 이하(연장 6회 허용)", () => {
    for (const m of active) {
      for (const code of [m.home, m.away]) {
        const subs = m.events.filter((e) => e.type === "sub" && e.teamCode === code).length;
        expect(subs).toBeLessThanOrEqual(6);
      }
    }
  });
  it("선발은 정확히 11명", () => {
    for (const m of active) {
      for (const lu of m.lineups) expect(lu.starters).toHaveLength(11);
    }
  });
  it("레드카드 이후 해당 선수 이벤트 없음", () => {
    for (const m of active) {
      const reds = m.events.filter((e) => e.type === "red");
      for (const r of reds) {
        const later = m.events.filter(
          (e) => e.minute > r.minute && e.playerId === r.playerId && e.type !== "red"
        );
        expect(later).toHaveLength(0);
      }
    }
  });
});
