// components/rewrite/compare.test.ts
import { describe, it, expect } from "vitest";
import { buildCompare } from "./compare";
import type { Wc2026Match } from "@/lib/wc2026/types";

function mk(events: Wc2026Match["events"], home = "KOR", away = "BRA"): Wc2026Match {
  return {
    id: "t",
    round: "group",
    home,
    away,
    scoreHome: 0,
    scoreAway: 0,
    venueKo: "메트라이프",
    kickoffISO: "2026-06-11T00:00:00Z",
    events,
    lineups: [] as unknown as Wc2026Match["lineups"],
  };
}

describe("buildCompare", () => {
  it("실제 패배 → 나의 무승부: changedOutcome=true, deltaKo에 무승부 포함", () => {
    // 실제: KOR 0 - 1 BRA (패배). 나의 시뮬: 1 - 1 (무승부).
    const m = mk([{ minute: 30, type: "goal", teamCode: "BRA", playerId: "b1", playerName: "X" }]);
    const cmp = buildCompare(m, "KOR", { scoreMe: 1, scoreOpp: 1 });
    expect(cmp.changedOutcome).toBe(true);
    expect(cmp.deltaKo).toContain("무승부");
    expect(cmp.realScoreKo).toBe("실제: 0 - 1 패배");
    expect(cmp.myScoreKo).toBe("당신의 지휘: 1 - 1 무승부");
  });

  it("실제와 같은 결과면 changedOutcome=false", () => {
    // 실제: KOR 1 - 0 BRA (승리). 나의 시뮬도 2 - 0 (승리) → 같은 결과.
    const m = mk([{ minute: 10, type: "goal", teamCode: "KOR", playerId: "k1", playerName: "Y" }]);
    const cmp = buildCompare(m, "KOR", { scoreMe: 2, scoreOpp: 0 });
    expect(cmp.changedOutcome).toBe(false);
    expect(cmp.deltaKo).toContain("같은");
    expect(cmp.deltaKo).toContain("승리");
  });

  it("자책골(own_goal, teamCode=side)은 실제 스코어에서 side에게 불리하게 집계된다", () => {
    // KOR이 자책골 → BRA 득점으로 집계 → 실제 KOR 0 - 1 (패배)
    const m = mk([{ minute: 40, type: "own_goal", teamCode: "KOR", playerId: "k2", playerName: "Z" }]);
    const cmp = buildCompare(m, "KOR", { scoreMe: 0, scoreOpp: 0 });
    expect(cmp.realScoreKo).toBe("실제: 0 - 1 패배");
    expect(cmp.changedOutcome).toBe(true); // 실제 패배 vs 나의 무승부
  });

  it("상대 자책골(teamCode=opponent)은 side에게 득점으로 집계된다", () => {
    const m = mk([{ minute: 40, type: "own_goal", teamCode: "BRA", playerId: "b3", playerName: "W" }]);
    const cmp = buildCompare(m, "KOR", { scoreMe: 0, scoreOpp: 0 });
    expect(cmp.realScoreKo).toBe("실제: 1 - 0 승리");
  });

  it("90분 초과(연장) 이벤트는 정규시간 스코어 집계에서 제외된다", () => {
    const m = mk([
      { minute: 45, type: "goal", teamCode: "KOR", playerId: "k1", playerName: "Y" },
      { minute: 105, type: "goal", teamCode: "BRA", playerId: "b1", playerName: "X" },
    ]);
    const cmp = buildCompare(m, "KOR", { scoreMe: 1, scoreOpp: 0 });
    expect(cmp.realScoreKo).toBe("실제: 1 - 0 승리");
  });

  it("side=away 관점에서도 정확히 집계된다", () => {
    // home=KOR, away=BRA. side="BRA" 관점: BRA 득점 1(45') → BRA 1 - 0 KOR(승리)
    const m = mk([{ minute: 45, type: "goal", teamCode: "BRA", playerId: "b1", playerName: "X" }]);
    const cmp = buildCompare(m, "BRA", { scoreMe: 1, scoreOpp: 1 });
    expect(cmp.realScoreKo).toBe("실제: 1 - 0 승리");
    expect(cmp.myScoreKo).toBe("당신의 지휘: 1 - 1 무승부");
    expect(cmp.changedOutcome).toBe(true);
    expect(cmp.deltaKo).toContain("승리");
    expect(cmp.deltaKo).toContain("무승부");
  });
});
