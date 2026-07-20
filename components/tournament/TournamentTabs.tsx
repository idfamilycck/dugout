"use client";

// components/tournament/TournamentTabs.tsx
//
// /tournament의 최상위 뷰 전환(조별리그 / 토너먼트). 순수 프레젠테이션 -
// 선택 상태는 부모가 URL 쿼리(?view=)로 소유하고 여기는 값과 콜백만 받는다.
//
// 왜 탭인가: 예전에는 12개 조 순위표와 5개 라운드 대진표가 한 페이지에 세로로
// 이어져 있어 스크롤이 끝없이 길고 위계가 없었다. 한 번에 하나만 보여주면 페이지
// 길이가 절반으로 줄고, 두 정보가 "같은 층위의 서로 다른 관점"이라는 것이 드러난다.
//
// 색: 선택된 탭은 시안(상호작용 전용 색) - 골드는 대회 단계 시맨틱이라 탭에 쓰지 않는다.

import { useRef } from "react";
import { ListNumbers, Trophy, type Icon } from "@phosphor-icons/react";

export type TournamentView = "group" | "knockout";

export const TOURNAMENT_VIEWS: Array<{
  id: TournamentView;
  label: string;
  icon: Icon;
}> = [
  { id: "group", label: "조별리그", icon: ListNumbers },
  { id: "knockout", label: "토너먼트", icon: Trophy },
];

export function tabId(view: TournamentView) {
  return `tournament-tab-${view}`;
}
export function panelId(view: TournamentView) {
  return `tournament-panel-${view}`;
}

interface TournamentTabsProps {
  view: TournamentView;
  onSelect: (view: TournamentView) => void;
}

export function TournamentTabs({ view, onSelect }: TournamentTabsProps) {
  const listRef = useRef<HTMLDivElement>(null);

  // 좌우 화살표로 탭을 옮긴다(WAI-ARIA 탭 패턴). 선택된 탭만 tabIndex=0이라
  // Tab 키는 탭 목록 전체를 한 번에 지나간다.
  function handleKeyDown(e: React.KeyboardEvent) {
    const delta = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
    if (delta === 0) return;
    e.preventDefault();
    const index = TOURNAMENT_VIEWS.findIndex((v) => v.id === view);
    const next = TOURNAMENT_VIEWS[(index + delta + TOURNAMENT_VIEWS.length) % TOURNAMENT_VIEWS.length];
    onSelect(next.id);
    listRef.current?.querySelector<HTMLButtonElement>(`#${tabId(next.id)}`)?.focus();
  }

  return (
    <div
      ref={listRef}
      role="tablist"
      aria-label="대회 보기 전환"
      onKeyDown={handleKeyDown}
      className="flex w-full gap-2 sm:w-auto"
    >
      {TOURNAMENT_VIEWS.map((v) => {
        const active = v.id === view;
        const TabIcon = v.icon;
        return (
          <button
            key={v.id}
            id={tabId(v.id)}
            type="button"
            role="tab"
            aria-selected={active}
            aria-controls={panelId(v.id)}
            tabIndex={active ? 0 : -1}
            onClick={() => onSelect(v.id)}
            className={`inline-flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-full px-5 text-sm font-bold transition-colors sm:flex-none sm:min-h-[38px] ${
              active
                ? "bg-accent text-accent-ink"
                : "bg-surface-2 text-dim hover:text-ink"
            }`}
          >
            <TabIcon size={17} weight={active ? "fill" : "regular"} aria-hidden />
            {v.label}
          </button>
        );
      })}
    </div>
  );
}
