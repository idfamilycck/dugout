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
