// lib/wc2026/entry-points.ts
//
// Pure module: builds the list of places a user can enter a real WC2026
// match's rewrite session from — either a fixed preset (full match / first
// half / second half) or "5 minutes before" any recorded event (goal, sub,
// card). Presets are ALWAYS available regardless of the match's events, so
// there is never a dead-end even on a clean win with no cards/subs recorded
// early. No I/O, no mutation, no Math.random.

import type { Wc2026Match, Wc2026Event } from "@/lib/wc2026/types";

export interface EntryPoint {
  id: string;
  category: "preset" | "event";
  takeoverMinute: number; // where the sim resumes from
  endMinute?: number; // session end; undefined = play to natural end (regulation ~90)
  labelKo: string; // primary label
  subKo?: string; // secondary line
  minute?: number; // event minute (event category only)
  emphasis?: boolean; // highlight (our concede / our red / lost lead)
}

// 고정 진행 방식 프리셋 — 이벤트 유무와 무관하게 항상 3개를 반환한다. 이것이
// "완승/무카드 경기라 결정적 순간이 없다"는 막다른 화면을 없애는 핵심이다.
export function buildPresets(): EntryPoint[] {
  return [
    {
      id: "preset-full",
      category: "preset",
      takeoverMinute: 0,
      labelKo: "풀경기 지휘",
      subKo: "킥오프부터 90분 전체를 지휘",
    },
    {
      id: "preset-first",
      category: "preset",
      takeoverMinute: 0,
      endMinute: 45,
      labelKo: "전반전 지휘",
      subKo: "킥오프부터 전반 종료(45′)까지",
    },
    {
      id: "preset-second",
      category: "preset",
      takeoverMinute: 45,
      labelKo: "후반전 지휘",
      subKo: "후반 시작(45′)부터 종료까지",
    },
  ];
}

// side/opponent 둘 중 하나만 있는 도메인이므로 "side가 아니면 opponent"로 충분하다
// (opponent 자체는 필요 없다).
function labelForEvent(ev: Wc2026Event, side: string): { labelKo: string; emphasis: boolean } {
  const m = ev.minute;
  const isSide = ev.teamCode === side;
  switch (ev.type) {
    case "goal":
    case "pen_goal":
      if (isSide) return { labelKo: `${m}′ 우리 득점`, emphasis: false };
      return { labelKo: `${m}′ 실점`, emphasis: true };
    case "own_goal":
      // own_goal.teamCode = 자책골을 자기 골문에 넣은(가해) 팀 -> 득점은 상대에 가산.
      if (isSide) return { labelKo: `${m}′ 자책골 실점`, emphasis: true };
      return { labelKo: `${m}′ 상대 자책골(우리 득점)`, emphasis: false };
    case "sub":
      if (isSide) return { labelKo: `${m}′ 우리 선수 교체`, emphasis: false };
      return { labelKo: `${m}′ 상대 선수 교체`, emphasis: false };
    case "yellow":
      if (isSide) return { labelKo: `${m}′ 우리 경고`, emphasis: false };
      return { labelKo: `${m}′ 상대 경고`, emphasis: false };
    case "red":
      if (isSide) return { labelKo: `${m}′ 우리 퇴장`, emphasis: true };
      return { labelKo: `${m}′ 상대 퇴장`, emphasis: false };
  }
}

// match.events(90분 이하)를 분 오름차순으로, 각각 "그 시점 5분 전" 진입점으로
// 변환한다. 정규시간(90분) 이후 이벤트(연장전 등)는 제외한다 — 엔진이 정규시간만
// 시뮬레이션하기 때문.
export function buildEventEntries(match: Wc2026Match, side: string): EntryPoint[] {
  const events = [...match.events]
    .filter((e) => e.minute <= 90)
    .sort((a, b) => a.minute - b.minute);

  return events.map((ev, index) => {
    const takeoverMinute = Math.max(ev.minute - 5, 0);
    const { labelKo, emphasis } = labelForEvent(ev, side);
    return {
      id: `ev-${match.id}-${index}`,
      category: "event",
      takeoverMinute,
      labelKo,
      subKo: `이 시점 5분 전(${takeoverMinute}′)부터`,
      minute: ev.minute,
      emphasis,
    };
  });
}
