import { describe, it, expect } from "vitest";
import { makeSetup } from "./__testutils__";
import { initMatch, simulateMinute, applyIntervention, runFullMatch, type MatchState } from "./match";
import { playersOf } from "@/lib/data/players";

function runMinutes(state: MatchState, n: number): MatchState {
  let s = state;
  for (let i = 0; i < n; i++) s = simulateMinute(s);
  return s;
}

function avgStaminaOnPitch(state: MatchState): number {
  const ids = [...Object.values(state.me.lineup), ...Object.values(state.opp.lineup)];
  const vals = ids.map((id) => state.stamina[id] ?? 1);
  return vals.reduce((a, b) => a + b, 0) / vals.length;
}

describe("match simulation", () => {
  it("같은 시드+같은 개입 → 이벤트 로그 완전 동일 (재현성)", () => {
    const kor = makeSetup("kor", "4-3-3");
    const bra = makeSetup("bra", "4-3-3");
    const a = runFullMatch(kor, bra, "metlife", 123);
    const b = runFullMatch(kor, bra, "metlife", 123);
    expect(a.events).toEqual(b.events);
    expect(a.scoreMe).toBe(b.scoreMe);
  });

  it("다른 시드 → 대체로 다른 전개 (10개 시드 중 8개 이상 이벤트 수 상이)", () => {
    const kor = makeSetup("kor", "4-3-3");
    const bra = makeSetup("bra", "4-3-3");
    const baseline = runFullMatch(kor, bra, "metlife", 1000);
    let differing = 0;
    for (let seed = 1; seed <= 10; seed++) {
      const run = runFullMatch(kor, bra, "metlife", seed);
      if (run.events.length !== baseline.events.length) differing++;
    }
    expect(differing).toBeGreaterThanOrEqual(8);
  });

  it("90분 이상 진행 후 finished=true, 이벤트에 fulltime 존재", () => {
    const kor = makeSetup("kor", "4-3-3");
    const bra = makeSetup("bra", "4-3-3");
    const result = runFullMatch(kor, bra, "metlife", 42);
    expect(result.finished).toBe(true);
    expect(result.minute).toBeGreaterThan(90);
    expect(result.events.some((e) => e.type === "fulltime")).toBe(true);
  });

  it("교체 개입이 라인업에 반영되고 subsUsedMe 증가, 5명 초과 교체는 무시", () => {
    const kor = makeSetup("kor", "4-3-3");
    const bra = makeSetup("bra", "4-3-3");
    let state = initMatch(kor, bra, "metlife", 7);
    state = runMinutes(state, 60);

    const onPitch = Object.values(state.me.lineup);
    const bench = playersOf("kor")
      .map((p) => p.id)
      .filter((id) => !onPitch.includes(id));

    // 첫 교체 하나: 라인업 반영 + subsUsedMe=1 확인
    const outId = state.me.lineup["st"];
    const afterFirst = applyIntervention(state, {
      minute: state.minute,
      side: "me",
      subs: [{ out: outId, in: bench[0] }],
    });
    expect(afterFirst.me.lineup["st"]).toBe(bench[0]);
    expect(afterFirst.subsUsedMe).toBe(1);
    expect(afterFirst.events.some((e) => e.type === "sub")).toBe(true);

    // 온피치 11명 중 6명을 한 번에 벤치 6명과 교체 시도 → 5명 초과분은 무시되어야 함
    const stillOnPitch = Object.values(state.me.lineup);
    const subs = stillOnPitch.slice(0, 6).map((out, i) => ({ out, in: bench[i] }));
    const capped = applyIntervention(state, { minute: state.minute, side: "me", subs });
    expect(capped.subsUsedMe).toBe(5);
    expect(capped.events.filter((e) => e.type === "sub")).toHaveLength(5);
    // 6번째(마지막) 교체는 반영되지 않아야 함
    const sixthOut = subs[5].out;
    const sixthIn = subs[5].in;
    expect(Object.values(capped.me.lineup)).toContain(sixthOut);
    expect(Object.values(capped.me.lineup)).not.toContain(sixthIn);
  });

  it("후반 평균 스태미나 < 전반 평균 스태미나", () => {
    const kor = makeSetup("kor", "4-3-3");
    const bra = makeSetup("bra", "4-3-3");
    let state = initMatch(kor, bra, "metlife", 55);
    state = runMinutes(state, 45);
    const firstHalfAvg = avgStaminaOnPitch(state);
    state = runMinutes(state, 45);
    const secondHalfAvg = avgStaminaOnPitch(state);
    expect(secondHalfAvg).toBeLessThan(firstHalfAvg);
  });

  it("고지대 경기의 80분 시점 평균 스태미나 < 평지 경기 (같은 시드·매치업)", () => {
    const kor = makeSetup("kor", "4-3-3");
    const bra = makeSetup("bra", "4-3-3");
    const azteca = runMinutes(initMatch(kor, bra, "azteca", 99), 80);
    const metlife = runMinutes(initMatch(kor, bra, "metlife", 99), 80);
    expect(avgStaminaOnPitch(azteca)).toBeLessThan(avgStaminaOnPitch(metlife));
  });
});
