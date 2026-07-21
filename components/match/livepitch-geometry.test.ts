import { describe, expect, it } from "vitest";
import { playerDots, dynamicDots, shiftTeamTowardBall, VB_W, VB_H } from "./livepitch-geometry";
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

  it("shiftTeamTowardBall: 팀이 공 쪽으로 이동하되 라인 간격(형태)을 보존한다", () => {
    const dots = playerDots(me, "me");
    const ball = { cx: 250, cy: 40 }; // 오른쪽 위 (상대 진영)
    const shifted = shiftTeamTowardBall(dots, ball);
    const byId = Object.fromEntries(dots.map((d) => [d.slotId, d]));
    const sById = Object.fromEntries(shifted.map((d) => [d.slotId, d]));

    // 무게중심이 공 쪽(+x, -y)으로 이동한다.
    const c0 = dots.reduce((a, d) => ({ x: a.x + d.cx, y: a.y + d.cy }), { x: 0, y: 0 });
    const c1 = shifted.reduce((a, d) => ({ x: a.x + d.cx, y: a.y + d.cy }), { x: 0, y: 0 });
    expect(c1.x).toBeGreaterThan(c0.x);
    expect(c1.y).toBeLessThan(c0.y);

    // 형태 보존: 두 아웃필드 선수 사이의 상대 간격이 시프트 전후로 (거의) 같다.
    // 개별 끌림(옛 followBall)이면 간격이 달라지지만, 팀 공통 시프트는 보존한다.
    const gap0 = byId["cm_l"].cx - byId["cb1"].cx;
    const gap1 = sById["cm_l"].cx - sById["cb1"].cx;
    expect(gap1).toBeCloseTo(gap0, 5);
    const wgap0 = byId["cm_l"].cy - byId["cb1"].cy;
    const wgap1 = sById["cm_l"].cy - sById["cb1"].cy;
    expect(wgap1).toBeCloseTo(wgap0, 5);
  });

  it("shiftTeamTowardBall: GK는 골문 근처에 머문다(소폭만 따라감)", () => {
    const dots = playerDots(me, "me");
    const gk0 = dots.find((d) => d.slotId === "gk")!;
    const gk1 = shiftTeamTowardBall(dots, { cx: VB_W - 8, cy: 10 }).find((d) => d.slotId === "gk")!;
    const outfieldMove = 3; // GK 이동은 아웃필드보다 훨씬 작아야 한다
    expect(Math.abs(gk1.cx - gk0.cx)).toBeLessThan(outfieldMove);
  });

  it("shiftTeamTowardBall: 모든 점이 피치 경계 안에 머문다", () => {
    for (const d of shiftTeamTowardBall(playerDots(me, "me"), { cx: VB_W - 8, cy: 10 })) {
      expect(d.cx).toBeGreaterThan(6);
      expect(d.cx).toBeLessThan(VB_W - 6);
      expect(d.cy).toBeGreaterThan(6);
      expect(d.cy).toBeLessThan(VB_H - 6);
    }
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
