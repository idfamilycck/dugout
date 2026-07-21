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

// ── 개별 반응 배치: "전술적 라인 국면(협응) + 개인 공 반응(제각각)"을 합친다 ──
// (1) 라인 국면(tilt): 상대가 공격하면 우리 수비 라인이 우리 골문 쪽으로 내려앉고,
//     우리가 공격하면 라인을 올린다 — 실제 축구의 팀 라인 유동. 라인은 협응 단위다.
// (2) 개인 공 반응: 그 라인 위에서 각 선수가 공 사이드로 붙고, 가까운 선수는 공 쪽으로
//     나가 압박/커버한다. 반응 크기는 포지션·개인마다 다르다.
// (3) 전술: 라인 높이·공격성·압박이 라인 국면을 보정한다.
// 여기에 렌더의 선수별 스프링 지연·wander가 더해져, 라인은 유동적으로 오르내리되
// 개개인은 제각기 움직이는 "실제 축구 화면"이 된다.
const LAT_GAIN: Record<Role, number> = { gk: 0.05, def: 0.2, mid: 0.26, att: 0.16 };
const LAT_CAP: Record<Role, number> = { gk: 5, def: 12, mid: 15, att: 11 };
// 깊이(공 쪽으로 개별 스텝): 공에 가까운 선수가 나가 압박/커버하는 개인 반응.
const DEPTH_GAIN: Record<Role, number> = { gk: 0.02, def: 0.07, mid: 0.1, att: 0.07 };
const DEPTH_CAP: Record<Role, number> = { gk: 3, def: 8, mid: 10, att: 9 };

// tilt: 0(우리 수세 — 라인 하강) ~ 1(우리 공세 — 라인 상승). me 기준, opp는 1-tilt.
export function reactiveDots(
  setup: SideSetup,
  side: "me" | "opp",
  tilt: number,
  ball: { cx: number; cy: number }
): PlayerDot[] {
  const formation = FORMATIONS[setup.instructions.formation];
  const attackRight = side === "me";
  const ins = setup.instructions;
  // 라인 국면(전술 보정): 높은 라인·공격성·압박이면 더 전진, 아니면 하강.
  const t0 = attackRight ? tilt : 1 - tilt;
  const t = clamp(
    t0 + (ins.line - 2) * 0.06 + (ins.attacking - 2) * 0.04 + (ins.pressing - 2) * 0.03,
    0.05,
    0.98
  );
  // 라인: 수세(t=0)면 최후방이 우리 골문 앞(18)까지 강하게 내려앉고, 공세(t=1)면
  // 하프라인 너머(138)까지 올라간다 — 상대 공격/우리 공격에 라인이 확연히 유동한다.
  const defLine = 18 + t * 120; // 최후방 라인 18~138
  const attLine = 112 + t * 156; // 최전방 라인 112~268
  const dots: PlayerDot[] = [];
  for (const slot of formation.slots) {
    const playerId = setup.lineup[slot.id];
    if (!playerId) continue;
    const role = roleOf(slot.id);
    const g = 0.8 + unitSeed(`${side}:${slot.id}`) * 0.4; // 개인 반응 편차 0.8..1.2

    // me-frame 라인 좌표 → 절대 좌표.
    const cyBase = WIDTH_Y_MIN + (slot.x / 100) * WIDTH_Y_SPAN;
    const cxMe = role === "gk" ? 12 + t * 30 : defLine + Math.min(1, slot.y / 85) * (attLine - defLine);
    let ax = attackRight ? cxMe : VB_W - cxMe;
    let ay = attackRight ? cyBase : VB_H - cyBase;

    // 개인 좌우: 공 사이드로 개인 반응만큼(포지션·개인 편차).
    ay = clamp(ay + clamp((ball.cy - ay) * LAT_GAIN[role] * g, -LAT_CAP[role], LAT_CAP[role]), 10, VB_H - 10);
    // 개인 깊이: 공 쪽으로 개별 스텝(가까운 선수가 더 나간다) — 협응 라인 위의 개인차.
    ax = clamp(ax + clamp((ball.cx - ax) * DEPTH_GAIN[role] * g, -DEPTH_CAP[role], DEPTH_CAP[role]), 10, VB_W - 10);

    dots.push({ slotId: slot.id, playerId, cx: ax, cy: ay });
  }
  return dots;
}
