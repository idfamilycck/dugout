// components/tournament/KoreaSummary.tsx
//
// /tournament 최상단 고정 요약 - "대한민국은 어느 조에서 어떻게 됐나" 한 줄.
// 이 앱의 사용자는 한국인이고, 12개 조 순위표를 훑기 전에 가장 먼저 확인하는 것이
// 이것이다. 순수 프레젠테이션(계산은 lib/wc2026/kor-summary.ts).
//
// 색: 팀 이름의 시안은 순위표의 KOR 행과 같은 기존 규칙을 따른다. 대회 단계 칩은
// 골드 램프(STAGE_CHIP)를 쓴다 - 진출/탈락은 상호작용이 아니라 대회 단계 시맨틱이다.

import Link from "next/link";
import { Trophy, FlagCheckered, ArrowRight } from "@phosphor-icons/react";
import { FlagBadge } from "@/components/ui/FlagBadge";
import { teamDisplay } from "@/components/tournament/team-display";
import { roundLabelKo } from "@/components/rewrite/match-browser";
import { STAGE_CHIP, roundTone } from "@/lib/wc2026/stage";
import type { KorSummary } from "@/lib/wc2026/kor-summary";

interface KoreaSummaryProps {
  summary: KorSummary;
}

export function KoreaSummary({ summary }: KoreaSummaryProps) {
  const team = teamDisplay(summary.row.code);
  const { row } = summary;
  const StageIcon = summary.advanced ? Trophy : FlagCheckered;
  const stageText = summary.advanced ? `${roundLabelKo(summary.finishRound)} 진출` : "조별리그 탈락";

  return (
    <div className="panel flex flex-col gap-4 rounded-panel p-4 sm:p-5 lg:flex-row lg:items-center lg:justify-between lg:gap-6">
      {/* 팀 + 조 순위 + 단계 칩 */}
      <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-2">
        <FlagBadge code={row.code} color1={team.color1} color2={team.color2} size={32} />
        <span className="text-base font-black text-accent sm:text-lg">{team.nameKo}</span>
        <span className="stat-num text-base text-ink sm:text-lg">
          {summary.group}조 {summary.rank}위
        </span>
        <span
          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[13px] ${
            STAGE_CHIP[roundTone(summary.finishRound)]
          }`}
        >
          <StageIcon size={14} weight="fill" aria-hidden />
          {stageText}
        </span>
      </div>

      {/* 전적 - 라벨/값 쌍을 한 줄에. 좁은 화면에서는 두 줄로 접힌다. */}
      <dl className="flex flex-wrap items-center gap-x-5 gap-y-2 lg:shrink-0">
        <Stat label="전적" value={`${row.won}승 ${row.drawn}무 ${row.lost}패`} />
        <Stat label="승점" value={String(row.points)} />
        <Stat label="득실" value={row.goalDiff > 0 ? `+${row.goalDiff}` : String(row.goalDiff)} />
        <Stat label="득점" value={`${row.goalsFor} : ${row.goalsAgainst}`} />
      </dl>

      <Link
        href={`/rewrite?round=group&group=${summary.group}`}
        className="inline-flex min-h-[44px] shrink-0 items-center justify-center gap-1.5 rounded-full bg-surface-2 px-4 text-[13px] font-bold text-accent transition-colors hover:bg-raised sm:min-h-[36px]"
      >
        {summary.group}조 경기 다시 쓰기
        <ArrowRight size={14} weight="bold" aria-hidden />
      </Link>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline gap-1.5">
      <dt className="data-label">{label}</dt>
      <dd className="stat-num text-[15px] text-ink">{value}</dd>
    </div>
  );
}
