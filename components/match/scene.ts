// 하이라이트 점프 재생의 순수 로직: 장면 감지·주 이벤트 선정·체인 라벨·전술 귀속·진형 쏠림.
// (스펙: docs/superpowers/specs/2026-07-18-match-highlight-jump-design.md)

import type { MatchEvent, MatchEventType } from "@/lib/engine/match";
import type { AppliedRule } from "@/lib/engine/modifiers";

export const SCENE_EVENT_TYPES = new Set<MatchEventType>([
  "chance",
  "shot",
  "goal",
  "save",
  "corner",
  "crisis",
  "card",
]);

// 주 이벤트 우선순위 (높을수록 헤드라인 자격)
const PRIORITY: Partial<Record<MatchEventType, number>> = {
  goal: 7,
  save: 6,
  shot: 5,
  corner: 4,
  chance: 3,
  crisis: 2,
  card: 1,
};

const CHAIN_LABEL: Partial<Record<MatchEventType, string>> = {
  chance: "찬스",
  shot: "슛",
  goal: "골!",
  save: "선방",
  corner: "코너킥",
  crisis: "위기",
  card: "카드",
};

export function sceneEventsAt(events: MatchEvent[], minute: number): MatchEvent[] {
  return events.filter((e) => e.minute === minute && SCENE_EVENT_TYPES.has(e.type));
}

// 정지 연출 여부: 슛 전개(슛/골/선방/코너)·위기·카드가 있어야 멈춘다.
// 슛으로 이어지지 않은 단순 찬스는 스킵을 유지하고 중계 피드에만 남긴다 —
// 경기당 찬스 분이 ~28개라 전부 멈추면 "핵심 장면만"이라는 목적이 무너진다.
export function shouldStopScene(sceneEvents: MatchEvent[]): boolean {
  return sceneEvents.some((e) => e.type !== "chance");
}

// 장면 길이: 골은 길게, 나머지는 짧게.
export function sceneDurationMs(sceneEvents: MatchEvent[]): number {
  return sceneEvents.some((e) => e.type === "goal") ? 3200 : 1800;
}

export function primaryEvent(sceneEvents: MatchEvent[]): MatchEvent | undefined {
  let best: MatchEvent | undefined;
  let bestScore = -1;
  for (const e of sceneEvents) {
    const score = PRIORITY[e.type] ?? 0;
    if (score > bestScore) {
      bestScore = score;
      best = e;
    }
  }
  return best;
}

export function sceneChain(sceneEvents: MatchEvent[]): string[] {
  return sceneEvents.map((e) => CHAIN_LABEL[e.type] ?? e.type);
}

// 공격 전개 장면인가(전술 귀속 칩 대상). crisis/card는 제외.
export function isAttackScene(event: MatchEvent): boolean {
  return event.type === "chance" || event.type === "shot" || event.type === "goal" || event.type === "save" || event.type === "corner";
}

// 공격 측에 실제 발동 중인 규칙 중 공격 기여(deltaAttack)가 가장 큰 양수 규칙.
export function attackAttribution(rules: AppliedRule[]): AppliedRule | null {
  let best: AppliedRule | null = null;
  for (const r of rules) {
    if (r.deltaAttack <= 0) continue;
    if (!best || r.deltaAttack > best.deltaAttack) best = r;
  }
  return best;
}

// 최근 장면성 이벤트 5개의 공수 균형 → 진형 쏠림 (-1=상대 공세, +1=우리 공세)
export function attackLean(events: MatchEvent[]): number {
  const recent: MatchEvent[] = [];
  for (let i = events.length - 1; i >= 0 && recent.length < 5; i--) {
    if (SCENE_EVENT_TYPES.has(events[i].type)) recent.push(events[i]);
  }
  if (recent.length === 0) return 0;
  const sum = recent.reduce((acc, e) => acc + (e.side === "me" ? 1 : -1), 0);
  return Math.max(-1, Math.min(1, sum / recent.length));
}
