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

// ── 공 쪽으로 팀 전체가 "형태를 유지한 채" 함께 이동한다 ──
// 예전 followBall은 선수를 "각자" 공으로 끌어당겨서, 공에 가까운 선수는 많이·먼
// 선수는 적게 움직였다 → 라인 간격이 무너지며 공 주변에 뭉쳤다. 실제 축구는 팀이
// 하나의 블록으로 공 쪽으로 슬라이드하며 수비·중원·공격 라인 간격을 유지한다.
// 그래서 팀 공통 시프트 벡터(무게중심→공)를 구해 전원에 "동일하게" 적용한다.
// 깊이(x) 전진/후퇴는 dynamicDots(tilt)가 이미 담당하므로 여기선 약하게만,
// 좌우(y) 볼사이드 이동은 조금 더 준다. GK는 골문을 지켜야 하므로 소폭만 따라간다.
export function shiftTeamTowardBall(
  dots: PlayerDot[],
  ball: { cx: number; cy: number }
): PlayerDot[] {
  const outfield = dots.filter((d) => d.slotId !== "gk");
  if (outfield.length === 0) return dots;
  const cx0 = outfield.reduce((s, d) => s + d.cx, 0) / outfield.length;
  const cy0 = outfield.reduce((s, d) => s + d.cy, 0) / outfield.length;
  const shiftX = clamp((ball.cx - cx0) * 0.08, -7, 7);
  const shiftY = clamp((ball.cy - cy0) * 0.18, -14, 14);
  return dots.map((d) => {
    const gk = d.slotId === "gk";
    return {
      ...d,
      cx: clamp(d.cx + shiftX * (gk ? 0.15 : 1), 10, VB_W - 10),
      cy: clamp(d.cy + shiftY * (gk ? 0.3 : 1), 10, VB_H - 10),
    };
  });
}

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
