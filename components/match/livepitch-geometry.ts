// 라이브 피치(가로형 300×180) 위 선수 점 좌표 계산.
// 포메이션 슬롯 좌표계는 세로형(자기 골문 기준: x=피치 폭 0~100, y=깊이 0~100)이므로,
// me(오른쪽 공격)는 깊이→X(왼쪽 골문에서 중앙선 방향), 폭→Y로 눕혀서 배치하고
// opp는 같은 변환의 점대칭(180°) 미러로 오른쪽 절반에 배치한다.

import { FORMATIONS } from "@/lib/data/formations";
import type { SideSetup } from "@/lib/types";

export const VB_W = 300;
export const VB_H = 180;

// 자기 골문(깊이 0) → X=14, 최대 깊이(100) → 중앙선 못 미친 X=144.
const DEPTH_X_MIN = 14;
const DEPTH_X_SPAN = 130;
// 피치 폭(0~100) → Y=14~166.
const WIDTH_Y_MIN = 14;
const WIDTH_Y_SPAN = VB_H - 2 * WIDTH_Y_MIN;

export interface PlayerDot {
  slotId: string;
  playerId: string;
  cx: number;
  cy: number;
}

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

export type Role = "gk" | "def" | "mid" | "att";
export function roleOf(slotId: string): Role {
  const p = slotId.replace(/[_0-9].*$/, "");
  if (p === "gk") return "gk";
  if (p === "cb" || p === "fb") return "def";
  if (p === "wg" || p === "st") return "att";
  return "mid";
}

// 선수별 고유 0..1 난수(반응 편차용) — 같은 포지션이라도 개인마다 반응 크기가 다르게.
export function unitSeed(seed: string): number {
  let h = 2166136261;
  for (const ch of seed) {
    h ^= ch.charCodeAt(0);
    h = Math.imul(h, 16777619);
  }
  h ^= h << 13;
  h ^= h >>> 17;
  h ^= h << 5;
  return (h >>> 0) / 4294967296;
}

// 선수 좌표계에 대한 주석: 공 쪽으로 팀 전체를 "함께" 미끄러뜨리는 방식은 쓰지
// 않는다 — 22명이 한 덩어리로 움직여 "다같이 한번에" 이동하는 부자연스러움을 낳기
// 때문이다. 대신 앵커는 전형(dynamicDots)이 잡고, 개별 생동감은 LivePitch의 선수별
// wander(각자 고유 경로·주기의 유기적 방황)가 담당한다.

export function playerDots(setup: SideSetup, side: "me" | "opp"): PlayerDot[] {
  const formation = FORMATIONS[setup.instructions.formation];
  const dots: PlayerDot[] = [];
  for (const slot of formation.slots) {
    const playerId = setup.lineup[slot.id];
    if (!playerId) continue;
    const cx = DEPTH_X_MIN + (slot.y / 100) * DEPTH_X_SPAN;
    const cy = WIDTH_Y_MIN + (slot.x / 100) * WIDTH_Y_SPAN;
    dots.push(
      side === "me"
        ? { slotId: slot.id, playerId, cx, cy }
        : { slotId: slot.id, playerId, cx: VB_W - cx, cy: VB_H - cy }
    );
  }
  return dots;
}

// ── 동적 전형: 경기 국면(tilt)에 따라 팀 전체가 하프라인을 넘나든다 ──
// tilt: 0(우리 골문 앞 수세) ~ 1(상대 골문 앞 공세). me 기준이며 opp는 (1-tilt)를 쓴다.
// 실제 축구처럼 공세일 땐 수비수가 하프라인 부근, 공격수는 상대 박스 근처까지 올라가고
// 수세일 땐 전원이 자기 진영으로 내려앉는다. GK는 골문 근처에서 소폭만 움직인다.
export function dynamicDots(setup: SideSetup, side: "me" | "opp", tilt: number): PlayerDot[] {
  const t = Math.max(0, Math.min(1, side === "me" ? tilt : 1 - tilt));
  const lerp = (a: number, b: number, f: number) => a + (b - a) * f;
  const formation = FORMATIONS[setup.instructions.formation];
  // 최후방/최전방 기준선. 공세(t=1)에도 최후방은 센터라인(150) 살짝 뒤에 머물러
  // 수비 라인을 남기고, 수세(t=0)에도 최전방은 센터 부근에 outlet으로 남긴다 —
  // 그래야 팀이 한 진영에 뭉치지 않고 세로로 늘 펼쳐진 모양을 유지한다.
  const defLine = lerp(22, 132, t); // 최후방 필드플레이어 기준선
  const attLine = lerp(116, 266, t); // 최전방 기준선
  const dots: PlayerDot[] = [];
  for (const slot of formation.slots) {
    const playerId = setup.lineup[slot.id];
    if (!playerId) continue;
    const cy = WIDTH_Y_MIN + (slot.x / 100) * WIDTH_Y_SPAN;
    let cx: number;
    if (slot.id === "gk") {
      cx = lerp(13, 42, t);
    } else {
      const f = Math.min(1, slot.y / 85); // 슬롯 깊이 0~1
      cx = defLine + f * (attLine - defLine);
    }
    cx = Math.max(10, Math.min(VB_W - 10, cx));
    dots.push(
      side === "me"
        ? { slotId: slot.id, playerId, cx, cy }
        : { slotId: slot.id, playerId, cx: VB_W - cx, cy: VB_H - cy }
    );
  }
  return dots;
}

// ── 개별 반응 배치: 각 선수가 "자기 포지션 + 팀 전술 + 공 위치"에 따라 제각기
//    목표 위치를 잡는다 ──
// 팀 공통 tilt 하나로 22명을 한꺼번에 움직이지 않는다(그게 "다같이 움직인다"의 원인).
// 대신 (1) 포지션: 포메이션 존이 기준. (2) 전술: 라인 높이·공격성·압박이 팀 전진도를
// 민다. (3) 공: 깊이는 공 전진도를 따라 라인이 연속적으로 오르내리고, 좌우는 각자
// 공 사이드로 붙되 포지션별·개인별로 반응 크기가 다르다. 여기에 렌더의 선수별 스프링
// 지연·wander가 더해져 도착 시점·미세 동선까지 흩어져 개개인이 움직여 보인다.
// 공 반응은 "은은한 배경 바이어스"로만 준다 — 크게 주면 공 스텝마다 22명이 동시에
// 같은 쪽으로 튀어 군대식으로 보인다. 지배적 움직임은 개인 wander가 담당한다.
const LAT_GAIN: Record<Role, number> = { gk: 0.04, def: 0.15, mid: 0.19, att: 0.12 };
const LAT_CAP: Record<Role, number> = { gk: 4, def: 9, mid: 11, att: 8 };
// 깊이(공 쪽으로 개별 스텝): 공에 가까운 선수가 나가 압박/커버하는 개인 반응.
const DEPTH_GAIN: Record<Role, number> = { gk: 0.02, def: 0.05, mid: 0.07, att: 0.05 };
const DEPTH_CAP: Record<Role, number> = { gk: 3, def: 6, mid: 8, att: 7 };

export function reactiveDots(
  setup: SideSetup,
  side: "me" | "opp",
  ball: { cx: number; cy: number }
): PlayerDot[] {
  const formation = FORMATIONS[setup.instructions.formation];
  const attackRight = side === "me";
  const ins = setup.instructions;
  // 공 전진도(내 공격 방향 기준) 0..1.
  const rawAdv = attackRight ? ball.cx - DEPTH_X_MIN : VB_W - DEPTH_X_MIN - ball.cx;
  const adv0 = clamp(rawAdv / (DEPTH_X_SPAN + 40), 0, 1);
  // 전술: 높은 라인·공격성·압박이면 팀 라인을 더 전진시킨다(전술 특성 반영).
  const adv = clamp(
    adv0 + (ins.line - 2) * 0.07 + (ins.attacking - 2) * 0.05 + (ins.pressing - 2) * 0.04,
    0,
    1
  );
  // 공 전진도에 팀 라인이 반응하되(공 움직임 반영), 스윙 폭을 더 줄여 22명이 한꺼번에
  // 같은 방향으로 밀려가는 동조성을 낮춘다. 개별 생동감은 렌더의 wander가 담당한다.
  const defLine = 40 + adv * 62; // 최후방 라인(40~102)
  const attLine = 132 + adv * 96; // 최전방 라인(132~228)
  const dots: PlayerDot[] = [];
  for (const slot of formation.slots) {
    const playerId = setup.lineup[slot.id];
    if (!playerId) continue;
    const role = roleOf(slot.id);
    const g = 0.8 + unitSeed(`${side}:${slot.id}`) * 0.4; // 개인 반응 편차 0.8..1.2

    // me-frame 기준 좌표 → 절대 좌표.
    const cyBase = WIDTH_Y_MIN + (slot.x / 100) * WIDTH_Y_SPAN;
    let cxMe: number;
    if (role === "gk") cxMe = 13 + adv * 29;
    else cxMe = defLine + Math.min(1, slot.y / 85) * (attLine - defLine);
    let ax = attackRight ? cxMe : VB_W - cxMe;
    let ay = attackRight ? cyBase : VB_H - cyBase;

    // 좌우: 공 사이드로 개인 반응만큼(포지션별·개인별 편차).
    ay = clamp(ay + clamp((ball.cy - ay) * LAT_GAIN[role] * g, -LAT_CAP[role], LAT_CAP[role]), 10, VB_H - 10);
    // 깊이: 공 쪽으로 개별 스텝(가까운 선수가 더 나간다) — 라인 위에 개인차를 얹는다.
    ax = clamp(ax + clamp((ball.cx - ax) * DEPTH_GAIN[role] * g, -DEPTH_CAP[role], DEPTH_CAP[role]), 10, VB_W - 10);

    dots.push({ slotId: slot.id, playerId, cx: ax, cy: ay });
  }
  return dots;
}
