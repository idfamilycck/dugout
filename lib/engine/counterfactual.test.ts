import { describe, it, expect } from "vitest";
import { makeSetup } from "./__testutils__";
import { runFullMatch, type Intervention, type MatchEvent } from "./match";
import { counterfactual } from "./counterfactual";

describe("counterfactual invariants (스펙 §5.3 불변식 3종)", () => {
  const kor = makeSetup("kor", "4-3-3");
  const bra = makeSetup("bra", "4-3-3");
  const aggressive = { ...kor.instructions, tempo: 3 as const, pressing: 3 as const };
  const iv: Intervention = { minute: 60, side: "me", instructions: aggressive };

  it("① 무개입 baseline은 원 경기의 개입 이전 구간과 이벤트 완전 동일", () => {
    const orig = runFullMatch(kor, bra, "metlife", 55, [iv]);
    const base = counterfactual(orig).baseline;
    const before = (e: MatchEvent) => e.minute < 60 && e.type !== "tactic_change";
    expect(orig.events.filter(before)).toEqual(base.events.filter(before));
  });

  it("② 원 경기의 개입 로그 재적용 → 원 경기 100% 재현", () => {
    const orig = runFullMatch(kor, bra, "metlife", 55, [iv]);
    const replay = runFullMatch(kor, bra, "metlife", 55, orig.interventions);
    expect(replay.events).toEqual(orig.events);
  });

  it("③ 개입 없는 경기의 카운터팩추얼 델타 = 0", () => {
    const orig = runFullMatch(kor, bra, "metlife", 55, []);
    const cf = counterfactual(orig);
    expect(cf.deltas).toHaveLength(0);
    expect(cf.baseline.events).toEqual(orig.events);
  });
});

describe("counterfactual 부가 검증", () => {
  it("개입이 있으면 deltas.length === interventions.length, scoreDiffText는 실제/무개입 스코어를 모두 포함한다", () => {
    const kor = makeSetup("kor", "4-3-3");
    const bra = makeSetup("bra", "4-3-3");
    const iv: Intervention = {
      minute: 60,
      side: "me",
      instructions: { ...kor.instructions, tempo: 3 as const },
    };
    const orig = runFullMatch(kor, bra, "metlife", 55, [iv]);
    const cf = counterfactual(orig);

    expect(cf.deltas).toHaveLength(1);
    expect(cf.deltas[0].intervention).toEqual(iv);
    expect(typeof cf.deltas[0].probDelta).toBe("number");
    expect(cf.scoreDiffText).toContain(`${orig.scoreMe}-${orig.scoreOpp}`);
    expect(cf.scoreDiffText).toContain(`${cf.baseline.scoreMe}-${cf.baseline.scoreOpp}`);
  });
});
