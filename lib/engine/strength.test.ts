import { describe, it, expect } from "vitest";
import { positionFitness, ageMultiplier, playerContribution, lineStrengths } from "./strength";
import { makeSetup } from "./__testutils__";
import { playersOf } from "@/lib/data/players";

describe("positionFitness", () => {
  it("주포지션 1.0, 등록 부포지션 0.9, GK 불일치 0.25", () => {
    const squad = playersOf("kor");
    const st = squad.find((p) => p.positions[0] === "ST")!;
    expect(positionFitness(st, "ST")).toBe(1.0);
    expect(positionFitness(st, "GK")).toBe(0.25);
  });
});

describe("ageMultiplier", () => {
  it("피크 나이에서 1.0, 36세 WG는 0.9 미만, 하한 0.78", () => {
    expect(ageMultiplier(26, "WG")).toBe(1.0);
    expect(ageMultiplier(36, "WG")).toBeLessThan(0.9);
    expect(ageMultiplier(40, "WG")).toBeGreaterThanOrEqual(0.78);
  });
});

describe("playerContribution", () => {
  it("체력 0%면 기여도는 만체력의 60%", () => {
    const p = playersOf("kor")[0];
    const full = playerContribution(p, p.positions[0], /*role*/ undefined as never, 1);
    const empty = playerContribution(p, p.positions[0], undefined as never, 0);
    expect(empty / full).toBeCloseTo(0.6, 5);
  });
});

describe("lineStrengths + 맨마킹", () => {
  it("브라질 공격 라인 > 한국 공격 라인 (더미 데이터 전제)", () => {
    const bra = makeSetup("bra", "4-3-3"), kor = makeSetup("kor", "4-3-3");
    expect(lineStrengths(bra).att).toBeGreaterThan(lineStrengths(kor).att);
  });
  it("맨마킹 지정 시 상대 타깃 기여 감소 + 우리 마커 공격 기여 감소", () => {
    const kor = makeSetup("kor", "4-3-3"), bra = makeSetup("bra", "4-3-3");
    const braNoMark = lineStrengths(bra, kor);
    const target = Object.values(bra.lineup).map((id) => playersOf("bra").find((p) => p.id === id)!)
      .sort((a, b) => b.attrs.shooting - a.attrs.shooting)[0];
    const marker = Object.values(kor.lineup)[5];
    const korMarking = { ...kor, special: { ...kor.special, manMark: { markerId: marker, targetId: target.id } } };
    const braMarked = lineStrengths(bra, korMarking);
    expect(braMarked.att).toBeLessThan(braNoMark.att);
  });
  it("자기 팀 마커가 공격 라인 배정이면 우리 공격 기여 감소", () => {
    const kor = makeSetup("kor", "4-3-3"), bra = makeSetup("bra", "4-3-3");
    const markerId = kor.lineup["wg_l"];
    const targetId = Object.values(bra.lineup)[0];
    const korMarking = { ...kor, special: { ...kor.special, manMark: { markerId, targetId } } };
    expect(lineStrengths(korMarking).att).toBeLessThan(lineStrengths(kor).att);
  });
});
