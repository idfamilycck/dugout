import { describe, expect, it } from "vitest";
import { buildSceneChoreo } from "./livepitch-choreo";
import { dynamicDots, VB_W } from "./livepitch-geometry";
import { makeSetup } from "@/lib/engine/__testutils__";

const me = makeSetup("kor");
const dotsAtt = dynamicDots(me, "me", 0.85); // 공세 국면의 우리 팀
const stId = dotsAtt.find((d) => d.slotId === "st")!.playerId;

describe("buildSceneChoreo — 2:1 월패스 슛", () => {
  it("골 장면: 공이 주인공→동료→리턴(전진)→골망 4개 키프레임으로 움직인다", () => {
    const c = buildSceneChoreo("goal", "me", dotsAtt, stId)!;
    expect(c.ball.xs).toHaveLength(4);
    expect(c.ball.times).toHaveLength(4);
    // 마지막 키프레임 = 골망 안
    expect(c.ball.xs[3]).toBeGreaterThan(VB_W - 14);
    // 주인공은 상대 박스 근처까지 전진 오버라이드
    const shooter = c.overrides[c.shooterSlot!];
    expect(shooter.cx).toBeGreaterThan(232);
    // 2번째 키프레임은 동료 위치(주인공 위치와 다름)
    expect(c.ball.xs[1]).not.toBeCloseTo(c.ball.xs[0], 1);
  });

  it("선방 장면: 공이 골라인 앞(GK 위치)에서 멈춘다", () => {
    const c = buildSceneChoreo("save", "me", dotsAtt, stId)!;
    expect(c.ball.xs[3]).toBeLessThan(VB_W - 12 + 1);
    expect(c.ball.xs[3]).toBeGreaterThan(VB_W - 30);
  });

  it("opp 골 장면은 왼쪽(우리 골문) 방향으로 미러된다", () => {
    const oppSetup = makeSetup("bra");
    const oppDots = dynamicDots(oppSetup, "opp", 0.15); // 상대 공세
    const c = buildSceneChoreo("goal", "opp", oppDots, oppDots[0].playerId)!;
    expect(c.ball.xs[3]).toBeLessThan(14);
  });
});

describe("buildSceneChoreo — 코너킥 헤딩", () => {
  it("키커는 코너 깃발로, 센터백 포함 4명 이상이 상대 박스로 올라가 헤딩 경합한다", () => {
    const c = buildSceneChoreo("corner", "me", dotsAtt, stId)!;
    // 키커 오버라이드 = 코너 깃발 근처
    const taker = c.overrides[c.takerSlot!];
    expect(taker.cx).toBeGreaterThan(VB_W - 16);
    // 박스 안 경합 인원 ≥ 4 (키커 제외), 센터백 1명 이상 포함
    const crowd = Object.entries(c.overrides).filter(([slot]) => slot !== c.takerSlot);
    expect(crowd.length).toBeGreaterThanOrEqual(4);
    for (const [, pos] of crowd) expect(pos.cx).toBeGreaterThan(232);
    expect(crowd.some(([slot]) => slot.startsWith("cb"))).toBe(true);
    // 헤딩 선수 지정
    expect(c.headerSlot).toBeDefined();
    // 공: 코너 → 크로스(박스 안) → 클리어
    expect(c.ball.xs[0]).toBeGreaterThan(VB_W - 16);
    expect(Math.max(...c.ball.ys) - Math.min(...c.ball.ys)).toBeGreaterThan(20);
  });
});

describe("buildSceneChoreo — 비대상", () => {
  it("crisis/card는 공 연출이 없다(null)", () => {
    expect(buildSceneChoreo("crisis", "me", dotsAtt)).toBeNull();
    expect(buildSceneChoreo("card", "me", dotsAtt)).toBeNull();
  });
});
