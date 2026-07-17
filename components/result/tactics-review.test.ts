import { describe, expect, it } from "vitest";
import type { MatchEvent, MatchState } from "@/lib/engine/match";
import type { AppliedRule, ModifierResult } from "@/lib/engine/modifiers";
import { buildTacticsReview } from "./tactics-review";

const rule = (id: string, da: number, dd = 0): AppliedRule => ({
  id,
  textKo: `rule-${id}`,
  deltaAttack: da,
  deltaDefense: dd,
  icon: "⚡",
});

const mod = (rules: AppliedRule[], flags: Partial<ModifierResult["staminaFlags"]> = {}): ModifierResult => ({
  rules,
  attackMult: 1,
  defenseMult: 1,
  staminaFlags: { altitude: false, heat: false, highTempo: false, highPress: false, ...flags },
});

const ev = (type: MatchEvent["type"], side: "me" | "opp" = "me"): MatchEvent => ({
  minute: 10,
  type,
  side,
  textKo: type,
});

const matchOf = (over: Partial<MatchState>): MatchState =>
  ({ events: [], scoreMe: 0, scoreOpp: 0, ...over }) as MatchState;

describe("buildTacticsReview", () => {
  it("내 규칙을 종합효과 부호로 통함/발목으로 나누고 효과 크기순 정렬한다", () => {
    const review = buildTacticsReview(
      matchOf({}),
      mod([rule("plus_small", 0.02), rule("minus", -0.05), rule("plus_big", 0.08), rule("zero", 0)]),
      mod([])
    );
    expect(review.worked.map((r) => r.id)).toEqual(["plus_big", "plus_small"]);
    expect(review.hurt.map((r) => r.id)).toEqual(["minus"]);
  });

  it("위기 2회 이상이면 라인/역할 조정 팁이 나온다", () => {
    const review = buildTacticsReview(
      matchOf({ events: [ev("crisis"), ev("crisis")] }),
      mod([]),
      mod([])
    );
    expect(review.tips.some((t) => t.includes("위기"))).toBe(true);
  });

  it("슛 열세면 기회 생산 팁, 2실점 이상이면 상대 강점 억제 팁이 나온다", () => {
    const review = buildTacticsReview(
      matchOf({
        scoreOpp: 2,
        events: [ev("shot", "me"), ev("shot", "opp"), ev("shot", "opp"), ev("shot", "opp")],
      }),
      mod([]),
      mod([rule("opp_strength", 0.07)])
    );
    expect(review.tips.some((t) => t.includes("슛 1:3"))).toBe(true);
    expect(review.tips.some((t) => t.includes("rule-opp_strength"))).toBe(true);
  });

  it("폭염+고압박이면 체력 관리 팁이 나온다", () => {
    const review = buildTacticsReview(matchOf({}), mod([], { heat: true, highPress: true }), mod([]));
    expect(review.tips.some((t) => t.includes("폭염"))).toBe(true);
  });

  it("근거가 없으면 유지 코멘트 1개, 팁은 최대 4개", () => {
    const clean = buildTacticsReview(matchOf({ scoreMe: 2, scoreOpp: 0 }), mod([]), mod([]));
    expect(clean.tips).toHaveLength(1);

    const busy = buildTacticsReview(
      matchOf({
        scoreOpp: 3,
        events: [ev("crisis"), ev("crisis"), ev("shot", "opp"), ev("shot", "opp")],
      }),
      mod([rule("bad", -0.06)], { heat: true, highTempo: true }),
      mod([rule("opp_top", 0.05)])
    );
    expect(busy.tips.length).toBeLessThanOrEqual(4);
    expect(busy.tips.length).toBeGreaterThanOrEqual(2);
  });
});
