"use client";

import { useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { Wc2026Match, Wc2026Round } from "@/lib/wc2026/types";
import { wc2026TeamId } from "@/lib/wc2026/data";
import { teamById } from "@/lib/data/teams";
import { sortForBrowser, roundLabelKo, availableGroups } from "@/components/rewrite/match-browser";
import { FlagBadge } from "@/components/ui/FlagBadge";
import { ROUND_LABEL_CLASS, roundTone } from "@/lib/wc2026/stage";

const ROUND_ORDER: Wc2026Round[] = ["group", "r32", "r16", "qf", "sf", "third", "final"];
const ROUND_SET = new Set<string>(ROUND_ORDER);

function parseRound(v: string | null): Wc2026Round | undefined {
  return v && ROUND_SET.has(v) ? (v as Wc2026Round) : undefined;
}

// 렌더 예산: 초기 24장만 그리고 "더 보기"로 이어붙인다(전체 가상화는 새 의존성이
// 필요해 도입하지 않음). 필터가 바뀌면 다시 24장부터 시작한다.
const PAGE_SIZE = 24;

interface MatchBrowserProps {
  matches: Wc2026Match[];
  selectedMatchId?: string;
  selectedSide?: string;
  onSelectMatch: (match: Wc2026Match) => void;
  onSelectSide: (side: string) => void;
}

// wc 팀 코드 → 표시용 한국어 이름/배지 색상. 아직 registerWc2026()이 끝나지
// 않은 극초반 렌더에도 안전하도록 미등록 시 코드/회색으로 폴백한다.
function teamDisplay(code: string) {
  const team = teamById(wc2026TeamId(code));
  return {
    nameKo: team?.nameKo ?? code,
    color1: team?.color1 ?? "#666666",
    color2: team?.color2 ?? "#cccccc",
  };
}

export function MatchBrowser({
  matches,
  selectedMatchId,
  selectedSide,
  onSelectMatch,
  onSelectSide,
}: MatchBrowserProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // 라운드/조 필터는 URL 쿼리(?round=&group=)가 단일 소스다 — 뒤로/앞으로가기와
  // 딥링크로 그대로 복원된다.
  const roundFilter = parseRound(searchParams.get("round"));
  const groupFilter = searchParams.get("group") ?? undefined;

  function updateQuery(next: Record<string, string | undefined>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(next)) {
      if (value === undefined) params.delete(key);
      else params.set(key, value);
    }
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }

  // 실제 데이터에 존재하는 라운드만 탭으로 노출한다(예: 결승이 아직 데이터에
  // 없으면 "결승" 탭은 숨김).
  const availableRounds = useMemo(() => {
    const present = new Set(matches.map((m) => m.round));
    return ROUND_ORDER.filter((r) => present.has(r));
  }, [matches]);

  // 조별리그 선택 시 노출할 조(A~L) 목록.
  const groups = useMemo(() => availableGroups(matches), [matches]);

  // 라운드를 조별리그가 아닌 곳으로 바꾸면 조 필터를 초기화한다.
  function pickRound(r: Wc2026Round | undefined) {
    updateQuery({ round: r, group: r === "group" ? groupFilter : undefined });
  }
  function pickGroup(g: string | undefined) {
    updateQuery({ group: g });
  }

  const visible = useMemo(
    () => sortForBrowser(matches, roundFilter, roundFilter === "group" ? groupFilter : undefined),
    [matches, roundFilter, groupFilter],
  );

  // 렌더 예산: 필터가 바뀌면 24장부터 다시 시작. 이펙트 대신 렌더 중 이전 필터 키와
  // 비교해 조건부로 초기화한다("Adjusting state when a prop changes" 패턴) — 별도
  // 커밋 없이 같은 렌더에서 바로 반영돼 이펙트보다 한 프레임 빠르다.
  const filterKey = `${roundFilter ?? ""}|${groupFilter ?? ""}`;
  const [prevFilterKey, setPrevFilterKey] = useState(filterKey);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  if (filterKey !== prevFilterKey) {
    setPrevFilterKey(filterKey);
    setVisibleCount(PAGE_SIZE);
  }
  const shown = visible.slice(0, visibleCount);

  return (
    <div className="flex flex-col gap-5">
      {/* 라운드 필터 탭 */}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => pickRound(undefined)}
          className={`inline-flex min-h-[44px] items-center rounded-full px-4 text-xs font-bold transition-colors sm:min-h-[32px] ${
            roundFilter === undefined ? "bg-accent text-accent-ink" : "bg-surface-2 text-dim"
          }`}
        >
          전체
        </button>
        {/* 선택된 칩은 시안(상호작용 규칙 유지). 선택되지 않은 칩만 라운드 골드 램프로
            물들여, 대진표와 같은 "결승으로 갈수록 진해지는" 위계를 여기서도 읽히게 한다. */}
        {availableRounds.map((r) => (
          <button
            key={r}
            type="button"
            onClick={() => pickRound(r)}
            className={`inline-flex min-h-[44px] items-center rounded-full px-4 text-xs font-bold transition-colors sm:min-h-[32px] ${
              roundFilter === r
                ? "bg-accent text-accent-ink"
                : `bg-surface-2 ${ROUND_LABEL_CLASS[roundTone(r)]}`
            }`}
          >
            {roundLabelKo(r)}
          </button>
        ))}
      </div>

      {/* 조 필터(조별리그 선택 시에만) */}
      {roundFilter === "group" && groups.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => pickGroup(undefined)}
            className={`inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full px-3.5 text-[13px] font-bold transition-colors sm:min-h-[28px] sm:min-w-0 ${
              groupFilter === undefined ? "bg-accent/80 text-accent-ink" : "bg-surface text-dim"
            }`}
          >
            전체 조
          </button>
          {groups.map((g) => (
            <button
              key={g}
              type="button"
              onClick={() => pickGroup(g)}
              className={`inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full px-3.5 text-[13px] font-bold transition-colors sm:min-h-[28px] sm:min-w-0 ${
                groupFilter === g ? "bg-accent/80 text-accent-ink" : "bg-surface text-dim"
              }`}
            >
              {g}조
            </button>
          ))}
        </div>
      )}

      {/* 경기 카드 그리드 — 렌더 예산(초기 24장)을 넘는 카드는 "더 보기"로 이어붙인다 */}
      <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {shown.map((m) => {
          const home = teamDisplay(m.home);
          const away = teamDisplay(m.away);
          const isKor = m.home === "KOR" || m.away === "KOR";
          const isSelected = m.id === selectedMatchId;
          const totalGoals = m.scoreHome + m.scoreAway;

          return (
            <li key={m.id} className="min-w-0">
              <button
                type="button"
                onClick={() => onSelectMatch(m)}
                aria-pressed={isSelected}
                className="panel flex w-full flex-col gap-2.5 rounded-panel p-4 text-left transition-colors duration-150 hover:border-white/25"
                style={{ borderColor: isSelected ? "var(--color-accent)" : undefined }}
              >
                <div className="flex items-center justify-between text-[13px] text-dim">
                  <span className={`font-bold uppercase tracking-wider ${ROUND_LABEL_CLASS[roundTone(m.round)]}`}>
                    {roundLabelKo(m.round)}
                  </span>
                  {isKor && (
                    <span className="rounded-full bg-accent/15 px-2 py-0.5 font-black text-accent">
                      KOR
                    </span>
                  )}
                </div>

                <div className="flex items-center justify-between gap-2">
                  <div className="flex min-w-0 flex-1 items-center gap-2">
                    <FlagBadge code={m.home} color1={home.color1} color2={home.color2} size={28} />
                    <span className="truncate text-sm font-bold text-ink">{home.nameKo}</span>
                  </div>
                  <span className="stat-num shrink-0 px-1 text-base text-ink">
                    {m.scoreHome} : {m.scoreAway}
                  </span>
                  <div className="flex min-w-0 flex-1 flex-row-reverse items-center gap-2">
                    <FlagBadge code={m.away} color1={away.color1} color2={away.color2} size={28} />
                    <span className="truncate text-right text-sm font-bold text-ink">{away.nameKo}</span>
                  </div>
                </div>

                <div className="border-t border-line pt-2 text-[13px] text-dim">
                  총 {totalGoals}골 · 이벤트 {m.events.length}건
                </div>
              </button>

              {/* 팀 선택(관리할 팀 고르기) — 카드 선택 시에만 노출 */}
              {isSelected && (
                <div className="mt-2 flex gap-2">
                  <button
                    type="button"
                    onClick={() => onSelectSide(m.home)}
                    className={`flex-1 rounded-control px-3 py-2.5 text-xs font-bold transition-colors ${
                      selectedSide === m.home
                        ? "bg-accent text-accent-ink"
                        : "bg-surface-2 text-ink hover:bg-surface"
                    }`}
                  >
                    {home.nameKo} 지휘하기
                  </button>
                  <button
                    type="button"
                    onClick={() => onSelectSide(m.away)}
                    className={`flex-1 rounded-control px-3 py-2.5 text-xs font-bold transition-colors ${
                      selectedSide === m.away
                        ? "bg-accent text-accent-ink"
                        : "bg-surface-2 text-ink hover:bg-surface"
                    }`}
                  >
                    {away.nameKo} 지휘하기
                  </button>
                </div>
              )}
            </li>
          );
        })}
      </ul>

      {visible.length > visibleCount && (
        <button
          type="button"
          onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}
          className="mx-auto min-h-[44px] rounded-full border border-line bg-surface-2/60 px-6 text-xs font-bold text-ink transition-colors hover:border-white/25"
        >
          더 보기 · {visible.length - visibleCount}경기 남음
        </button>
      )}

      {visible.length === 0 && (
        <p className="py-8 text-center text-sm text-dim">이 라운드에는 경기가 없습니다.</p>
      )}
    </div>
  );
}
