import { describe, expect, it } from "vitest";
import { playerDots, dynamicDots, reactiveDots, VB_W, VB_H } from "./livepitch-geometry";
import { makeSetup } from "@/lib/engine/__testutils__";
import { FORMATIONS } from "@/lib/data/formations";

describe("playerDots (라이브 피치 선수 좌표)", () => {
  const me = makeSetup("kor");
  const opp = makeSetup("bra");

  it("양 팀 각 11명, 라인업의 playerId를 그대로 사용한다", () => {
    const mine = playerDots(me, "me");
    const theirs = playerDots(opp, "opp");
    expect(mine).toHaveLength(11);
    expect(theirs).toHaveLength(11);
    expect(new Set(mine.map((d) => d.playerId))).toEqual(new Set(Object.values(me.lineup)));
  });

  it("me는 왼쪽 절반(오른쪽 공격), opp는 오른쪽 절반에 배치된다", () => {
    for (const d of playerDots(me, "me")) expect(d.cx).toBeLessThan(VB_W / 2);
    for (const d of playerDots(opp, "opp")) expect(d.cx).toBeGreaterThan(VB_W / 2);
  });

  // 회귀: 킥오프 전에도 dynamicDots를 쓰는 바람에 22명이 중앙선 근처 좁은 띠에
  // 뭉쳐 서서 "포메이션이 아니라 뭉쳐 있는" 그림이 나왔다. 킥오프 대형은 playerDots다.
  it("킥오프 대형(playerDots)은 중립 국면의 dynamicDots보다 진영을 넓게 쓴다", () => {
    const spread = (dots: { cx: number }[]) =>
      Math.max(...dots.map((d) => d.cx)) - Math.min(...dots.map((d) => d.cx));

    const kickoff = [...playerDots(me, "me"), ...playerDots(opp, "opp")];
    const neutral = [...dynamicDots(me, "me", 0.5), ...dynamicDots(opp, "opp", 0.5)];

    expect(spread(kickoff)).toBeGreaterThan(spread(neutral));

    // 킥오프에서는 두 팀이 각자 진영에 있어 서로 겹치지 않는다.
    const meMax = Math.max(...playerDots(me, "me").map((d) => d.cx));
    const oppMin = Math.min(...playerDots(opp, "opp").map((d) => d.cx));
    expect(meMax).toBeLessThanOrEqual(oppMin);
  });

  it("모든 점이 피치 라인(6px 여백) 안쪽에 있다", () => {
    for (const d of [...playerDots(me, "me"), ...playerDots(opp, "opp")]) {
      expect(d.cx).toBeGreaterThan(6);
      expect(d.cx).toBeLessThan(VB_W - 6);
      expect(d.cy).toBeGreaterThan(6);
      expect(d.cy).toBeLessThan(VB_H - 6);
    }
  });

  it("공격 방향: me GK는 스트라이커보다 왼쪽, opp GK는 오른쪽", () => {
    const slots = FORMATIONS[me.instructions.formation].slots;
    const gkSlot = slots.find((s) => s.position === "GK")!.id;
    const stSlot = slots.find((s) => s.position === "ST")!.id;
    const mine = Object.fromEntries(playerDots(me, "me").map((d) => [d.slotId, d]));
    expect(mine[gkSlot].cx).toBeLessThan(mine[stSlot].cx);

    const oppSlots = FORMATIONS[opp.instructions.formation].slots;
    const oppGk = oppSlots.find((s) => s.position === "GK")!.id;
    const oppSt = oppSlots.find((s) => s.position === "ST")!.id;
    const theirs = Object.fromEntries(playerDots(opp, "opp").map((d) => [d.slotId, d]));
    expect(theirs[oppGk].cx).toBeGreaterThan(theirs[oppSt].cx);
  });

  it("dynamicDots: 공세(tilt 0.85)면 팀이 하프라인을 넘어 상대 진영까지 올라간다", () => {
    const dots = Object.fromEntries(dynamicDots(me, "me", 0.85).map((d) => [d.slotId, d]));
    expect(dots["st"].cx).toBeGreaterThan(220); // 스트라이커는 상대 박스 근처
    expect(dots["cm_l"].cx).toBeGreaterThan(VB_W / 2); // 미드필더도 상대 진영
    expect(dots["cb1"].cx).toBeGreaterThan(130); // 센터백은 하프라인 부근
    expect(dots["gk"].cx).toBeLessThan(50); // GK는 골문 근처
  });

  it("dynamicDots: 수세(tilt 0.15)면 전원이 자기 진영으로 내려앉는다", () => {
    const dots = dynamicDots(me, "me", 0.15);
    for (const d of dots) expect(d.cx).toBeLessThan(VB_W / 2);
  });

  it("dynamicDots: opp는 (1-tilt) 미러 — 우리 공세면 상대는 수세로 수축한다", () => {
    const oppDots = Object.fromEntries(dynamicDots(opp, "opp", 0.85).map((d) => [d.slotId, d]));
    // 상대 전원이 자기 진영(오른쪽 절반)으로 물러남
    for (const d of Object.values(oppDots)) expect(d.cx).toBeGreaterThan(VB_W / 2);
    expect(oppDots["gk"].cx).toBeGreaterThan(VB_W - 50);
  });

  it("dynamicDots: 중립(tilt 0.5)에서도 모든 점이 피치 안에 있다", () => {
    for (const t of [0, 0.3, 0.5, 0.7, 1]) {
      for (const d of [...dynamicDots(me, "me", t), ...dynamicDots(opp, "opp", t)]) {
        expect(d.cx).toBeGreaterThan(6);
        expect(d.cx).toBeLessThan(VB_W - 6);
        expect(d.cy).toBeGreaterThan(6);
        expect(d.cy).toBeLessThan(VB_H - 6);
      }
    }
  });

  it("dynamicDots: 전형이 세로로 펼쳐져 수비·중원·공격 라인 간격이 유지된다", () => {
    // 앵커(전형)는 라인 구조를 잡는다. 개별 생동감(wander)은 LivePitch 렌더에서
    // 각 선수에 얹히므로 여기서는 전형이 뭉치지 않고 펼쳐지는지만 본다.
    const dots = Object.fromEntries(dynamicDots(me, "me", 0.5).map((d) => [d.slotId, d]));
    expect(dots["st"].cx).toBeGreaterThan(dots["cm_l"].cx); // 공격이 중원보다 앞
    expect(dots["cm_l"].cx).toBeGreaterThan(dots["cb1"].cx); // 중원이 수비보다 앞
    expect(dots["cb1"].cx).toBeGreaterThan(dots["gk"].cx); // 수비가 GK보다 앞
  });

  it("같은 포메이션이면 opp 좌표는 me 좌표의 점대칭 미러다", () => {
    const mine = Object.fromEntries(playerDots(me, "me").map((d) => [d.slotId, d]));
    const mirrored = Object.fromEntries(playerDots(me, "opp").map((d) => [d.slotId, d]));
    for (const slotId of Object.keys(mine)) {
      expect(mirrored[slotId].cx).toBeCloseTo(VB_W - mine[slotId].cx, 5);
      expect(mirrored[slotId].cy).toBeCloseTo(VB_H - mine[slotId].cy, 5);
    }
  });
});

describe("reactiveDots (전술 라인 국면 + 개별 공 반응)", () => {
  const me = makeSetup("kor");
  const opp = makeSetup("bra");
  const mid = { cx: VB_W / 2, cy: VB_H / 2 };

  it("국면과 무관하게 수비<중원<공격 깊이 순서(라인 구조)를 유지한다", () => {
    const d = Object.fromEntries(reactiveDots(me, "me", 0.5, mid).map((x) => [x.slotId, x]));
    expect(d["st"].cx).toBeGreaterThan(d["cm_l"].cx);
    expect(d["cm_l"].cx).toBeGreaterThan(d["cb1"].cx);
    expect(d["cb1"].cx).toBeGreaterThan(d["gk"].cx);
  });

  it("우리 공세(tilt↑)면 라인이 올라가고, 상대 공세(tilt↓)면 수비 라인이 내려앉는다", () => {
    const defend = Object.fromEntries(reactiveDots(me, "me", 0.15, mid).map((x) => [x.slotId, x]));
    const attack = Object.fromEntries(reactiveDots(me, "me", 0.85, mid).map((x) => [x.slotId, x]));
    expect(attack["cb1"].cx).toBeGreaterThan(defend["cb1"].cx); // 수비 라인 상승
    expect(attack["st"].cx).toBeGreaterThan(defend["st"].cx); // 공격 라인 상승
    // 수세일 땐 수비 라인이 우리 골문 쪽(작은 cx)으로 확연히 내려앉는다
    expect(defend["cb1"].cx).toBeLessThan(VB_W / 2);
  });

  it("opp는 미러 — 같은 tilt에서 우리가 공세면 상대 라인은 자기 진영으로 내려간다", () => {
    const oppDots = Object.fromEntries(reactiveDots(opp, "opp", 0.85, mid).map((x) => [x.slotId, x]));
    // 우리(me) 공세(tilt 0.85) = 상대는 수세 → 상대 수비 라인이 자기 골문(오른쪽) 쪽
    expect(oppDots["cb1"].cx).toBeGreaterThan(VB_W / 2);
  });

  it("공 사이드(좌우)로 붙되 이동량이 선수마다 제각각이다(개별성)", () => {
    const base = Object.fromEntries(playerDots(me, "me").map((x) => [x.slotId, x]));
    const moves = reactiveDots(me, "me", 0.5, { cx: 150, cy: 30 })
      .filter((d) => d.slotId !== "gk")
      .map((d) => base[d.slotId].cy - d.cy); // 위로 이동량(양수 = 공 쪽)
    expect(moves.filter((m) => m > 0).length).toBeGreaterThan(moves.length / 2);
    expect(new Set(moves.map((m) => Math.round(m))).size).toBeGreaterThan(3);
  });

  it("높은 라인 전술이 팀을 더 전진시킨다", () => {
    const low = { ...me, instructions: { ...me.instructions, line: 1 as const } };
    const high = { ...me, instructions: { ...me.instructions, line: 3 as const } };
    const lo = Object.fromEntries(reactiveDots(low, "me", 0.5, mid).map((x) => [x.slotId, x]));
    const hi = Object.fromEntries(reactiveDots(high, "me", 0.5, mid).map((x) => [x.slotId, x]));
    expect(hi["cb1"].cx).toBeGreaterThan(lo["cb1"].cx);
  });

  it("모든 점이 피치 경계 안에 머문다", () => {
    for (const tilt of [0.15, 0.5, 0.85]) {
      for (const ball of [mid, { cx: 20, cy: 20 }, { cx: VB_W - 20, cy: VB_H - 20 }]) {
        for (const d of [...reactiveDots(me, "me", tilt, ball), ...reactiveDots(opp, "opp", tilt, ball)]) {
          expect(d.cx).toBeGreaterThan(6);
          expect(d.cx).toBeLessThan(VB_W - 6);
          expect(d.cy).toBeGreaterThan(6);
          expect(d.cy).toBeLessThan(VB_H - 6);
        }
      }
    }
  });
});
