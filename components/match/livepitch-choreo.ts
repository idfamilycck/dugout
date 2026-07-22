// 장면 안무(순수 로직): 실제 축구 같은 공·선수 연계 동선을 만든다.
// - 골/슛/선방: 2:1 월패스 — 주인공이 동료에게 내주고 침투, 리턴패스 받아 슛.
// - 코너킥: 키커가 코너 깃발로, 센터백 포함 최대 5명이 상대 박스로 올라가 헤딩 경합.
// - crisis/card: 공 연출 없음(null).
// (스펙 §6 확장: docs/superpowers/specs/2026-07-18-match-highlight-jump-design.md)

import type { MatchEventType } from "@/lib/engine/match";
import { VB_W, VB_H, type PlayerDot } from "./livepitch-geometry";

const CY = VB_H / 2;

export interface BallPath {
  xs: number[];
  ys: number[];
  times: number[]; // 0~1, xs와 같은 길이
  dur: number; // 초
}

export interface SceneChoreo {
  ball: BallPath;
  /** slotId → 공격 측 선수의 목표 위치 오버라이드 */
  overrides: Record<string, { cx: number; cy: number }>;
  shooterSlot?: string;
  takerSlot?: string;
  headerSlot?: string; // 코너킥 헤딩 경합 선수 (펄스 강조)
}

function nearest(dots: PlayerDot[], to: PlayerDot, exclude: Set<string>): PlayerDot | undefined {
  let best: PlayerDot | undefined;
  let bestD = Infinity;
  for (const d of dots) {
    if (d.slotId === "gk" || exclude.has(d.slotId)) continue;
    const dd = (d.cx - to.cx) ** 2 + (d.cy - to.cy) ** 2;
    if (dd < bestD) {
      bestD = dd;
      best = d;
    }
  }
  return best;
}

export function buildSceneChoreo(
  type: MatchEventType,
  side: "me" | "opp",
  attackDots: PlayerDot[],
  playerId?: string
): SceneChoreo | null {
  const attackRight = side === "me";
  const dir = attackRight ? 1 : -1;
  const goalX = attackRight ? VB_W - 12 : 12;
  const boxX = attackRight ? VB_W - 48 : 48; // 페널티박스 부근

  if (type === "corner") {
    // 키커: 코너 깃발(위쪽 코너 고정)에서 가장 가까운 필드플레이어
    const corner = { cx: attackRight ? VB_W - 9 : 9, cy: 12 };
    const field = attackDots.filter((d) => d.slotId !== "gk");
    const taker =
      field.sort(
        (a, b) => (a.cx - corner.cx) ** 2 + (a.cy - corner.cy) ** 2 - ((b.cx - corner.cx) ** 2 + (b.cy - corner.cy) ** 2)
      )[0] ?? field[0];
    if (!taker) return null;

    // 박스 경합조: ST > CB > AM/CM 우선순위로 최대 5명 (키커 제외)
    const priority = (slot: string) =>
      slot.startsWith("st") ? 0 : slot.startsWith("cb") ? 1 : slot.startsWith("am") ? 2 : slot.startsWith("cm") ? 3 : slot.startsWith("wg") ? 4 : 5;
    const crowd = field
      .filter((d) => d.slotId !== taker.slotId)
      .sort((a, b) => priority(a.slotId) - priority(b.slotId))
      .slice(0, 5);

    const overrides: Record<string, { cx: number; cy: number }> = {
      [taker.slotId]: { cx: corner.cx - dir * 2, cy: corner.cy + 2 },
    };
    const spots = [
      { cx: boxX + dir * 6, cy: CY - 4 }, // 골에어리어 정면 (헤딩 포인트)
      { cx: boxX - dir * 4, cy: CY - 22 },
      { cx: boxX - dir * 2, cy: CY + 16 },
      { cx: boxX - dir * 12, cy: CY - 12 },
      { cx: boxX - dir * 14, cy: CY + 26 },
    ];
    crowd.forEach((d, i) => {
      const s = spots[i] ?? spots[spots.length - 1];
      overrides[d.slotId] = { cx: Math.max(10, Math.min(VB_W - 10, s.cx)), cy: Math.max(10, Math.min(VB_H - 10, s.cy)) };
    });
    const headerSlot = crowd[0]?.slotId;
    const headerSpot = crowd[0] ? overrides[crowd[0].slotId] : { cx: boxX, cy: CY };

    // 공: 코너 깃발 대기 → 크로스(헤딩 포인트) → 걷어내기(박스 밖)
    const clear = { cx: boxX - dir * 34, cy: CY - 28 };
    return {
      ball: {
        xs: [corner.cx, corner.cx, headerSpot.cx, clear.cx],
        ys: [corner.cy, corner.cy, headerSpot.cy, clear.cy],
        times: [0, 0.3, 0.62, 1],
        dur: 2.4,
      },
      overrides,
      takerSlot: taker.slotId,
      headerSlot,
    };
  }

  if (type === "goal" || type === "save" || type === "shot" || type === "chance") {
    // 2:1 월패스: 주인공 → 동료 → (주인공 침투) → 리턴 → 슛
    const shooter =
      attackDots.find((d) => d.playerId === playerId && d.slotId !== "gk") ??
      [...attackDots].filter((d) => d.slotId !== "gk").sort((a, b) => (attackRight ? b.cx - a.cx : a.cx - b.cx))[0];
    if (!shooter) return null;
    const mate = nearest(attackDots, shooter, new Set([shooter.slotId]));

    const advanced = {
      cx: attackRight ? Math.max(shooter.cx, VB_W - 62) : Math.min(shooter.cx, 62),
      cy: shooter.cy + (CY - shooter.cy) * 0.45,
    };
    const outcome =
      type === "goal"
        ? { cx: goalX + dir * 1, cy: CY }
        : type === "save"
          ? { cx: goalX - dir * 9, cy: CY }
          : { cx: goalX - dir * 3, cy: CY - 30 }; // 슛/찬스: 골문 옆으로 빗나감

    const overrides: Record<string, { cx: number; cy: number }> = {
      [shooter.slotId]: advanced,
    };
    if (mate) overrides[mate.slotId] = { cx: mate.cx + dir * 10, cy: mate.cy + (CY - mate.cy) * 0.15 };

    const mateP = mate ?? shooter;
    return {
      ball: {
        xs: [shooter.cx, mateP.cx + dir * 4, advanced.cx + dir * 5, outcome.cx],
        ys: [shooter.cy, mateP.cy, advanced.cy, outcome.cy],
        times: [0, 0.3, 0.62, 1],
        dur: type === "goal" ? 2.0 : 1.7,
      },
      overrides,
      shooterSlot: shooter.slotId,
    };
  }

  return null; // crisis/card 등
}
