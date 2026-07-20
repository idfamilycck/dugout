// components/tournament/KnockoutBracket.tsx
//
// 토너먼트 대진표: 32강 → 16강 → 8강 → 4강 → 결승을 가로 컬럼으로, 3·4위전은
// 별도 카드로 그린다. 순수 프레젠테이션(계산은 lib/wc2026/standings.ts). 결승
// 데이터가 아직 없으면(final 라운드가 비어 있으면) 빈 대진 대신 안내 placeholder를
// 보여준다. 좁은 화면에서는 이 컴포넌트 자신의 컨테이너 안에서만 가로 스크롤되고,
// 페이지 본문은 가로로 스크롤되지 않는다.

import Link from "next/link";
import { FlagBadge } from "@/components/ui/FlagBadge";
import { teamDisplay } from "@/components/tournament/team-display";
import { roundLabelKo } from "@/components/rewrite/match-browser";
import type { Wc2026Round } from "@/lib/wc2026/types";
import type { BracketMatch } from "@/lib/wc2026/standings";

const MAIN_ROUNDS: Wc2026Round[] = ["r32", "r16", "qf", "sf", "final"];

interface KnockoutBracketProps {
  bracket: Record<Wc2026Round, BracketMatch[]>;
}

export function KnockoutBracket({ bracket }: KnockoutBracketProps) {
  return (
    <div className="flex flex-col gap-6">
      <div className="overflow-x-auto rounded-[10px] border border-line bg-surface/40 p-4">
        <div className="flex min-w-max items-start gap-4">
          {MAIN_ROUNDS.map((round) => {
            const ties = bracket[round] ?? [];
            if (ties.length === 0 && round !== "final") return null;
            return (
              <div key={round} className="flex w-60 shrink-0 flex-col gap-2.5">
                <p className="eyebrow px-1 text-dim">{roundLabelKo(round)}</p>
                {ties.length > 0 ? (
                  ties.map((tie) => <BracketTie key={tie.id} tie={tie} />)
                ) : (
                  <div className="panel flex min-h-[88px] items-center justify-center rounded-[10px] p-4 text-center">
                    <p className="text-xs leading-relaxed text-dim">결승 데이터 준비 중</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {(bracket.third ?? []).length > 0 && (
        <div className="flex flex-col gap-2.5">
          <p className="eyebrow px-1 text-dim">{roundLabelKo("third")}</p>
          <div className="max-w-xs">
            {bracket.third.map((tie) => (
              <BracketTie key={tie.id} tie={tie} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function BracketTie({ tie }: { tie: BracketMatch }) {
  const home = teamDisplay(tie.home);
  const away = teamDisplay(tie.away);
  const hasPens = tie.penHome !== undefined && tie.penAway !== undefined;

  return (
    <Link
      href={`/rewrite?match=${tie.id}`}
      className="panel flex flex-col gap-1.5 rounded-[10px] p-2.5 transition-colors duration-150 hover:border-white/25"
    >
      <TieRow
        code={tie.home}
        name={home.nameKo}
        color1={home.color1}
        color2={home.color2}
        score={tie.scoreHome}
        isWinner={tie.winner === tie.home}
      />
      <TieRow
        code={tie.away}
        name={away.nameKo}
        color1={away.color1}
        color2={away.color2}
        score={tie.scoreAway}
        isWinner={tie.winner === tie.away}
      />
      {hasPens && (
        <p className="tnum pt-0.5 text-center text-[10px] font-bold text-dim">
          (승부차기 {tie.penHome}-{tie.penAway})
        </p>
      )}
    </Link>
  );
}

function TieRow({
  code,
  name,
  color1,
  color2,
  score,
  isWinner,
}: {
  code: string;
  name: string;
  color1: string;
  color2: string;
  score: number;
  isWinner: boolean;
}) {
  return (
    <div
      className="flex items-center justify-between gap-2 rounded-[8px] px-1.5 py-1"
      style={{ background: isWinner ? "rgba(34, 211, 238, 0.10)" : undefined }}
    >
      <div className="flex min-w-0 items-center gap-1.5">
        <FlagBadge code={code} color1={color1} color2={color2} size={20} />
        <span className={`relative truncate text-xs ${isWinner ? "font-black text-ink" : "text-dim"}`}>
          {name}
          {/* relative 부모 안에 가둬 sr-only(absolute)가 가로 스크롤 컨테이너 밖으로
              튀어나가 문서 전체의 가로 스크롤을 유발하지 않도록 한다. */}
          {isWinner && <span className="sr-only"> (승)</span>}
        </span>
      </div>
      <span className={`stat-num shrink-0 text-sm ${isWinner ? "text-accent" : "text-ink"}`}>{score}</span>
    </div>
  );
}
