"use client";

import { useRouter } from "next/navigation";
import { useAppStore } from "@/lib/store";
import { extractMoments, type DecisiveMoment } from "@/lib/wc2026/moments";
import type { Wc2026Match } from "@/lib/wc2026/types";

interface MomentCardsProps {
  match: Wc2026Match;
  side: string; // 3-letter code (match.home 또는 match.away)
}

// 순간의 종류별로 방송 그래픽 톤의 강조색을 붙인다(실점/리드상실=위험,
// 퇴장=경고, 동점 승부처=액센트).
const KIND_COLOR: Record<DecisiveMoment["kind"], string> = {
  concede: "var(--color-danger)",
  lead_lost: "var(--color-danger)",
  red: "#ffb020",
  late_tie: "var(--color-accent)",
};

const KIND_TAG: Record<DecisiveMoment["kind"], string> = {
  concede: "실점",
  lead_lost: "리드 상실",
  red: "퇴장",
  late_tie: "동점 승부처",
};

export function MomentCards({ match, side }: MomentCardsProps) {
  const router = useRouter();
  const startRewrite = useAppStore((s) => s.startRewrite);

  const moments = extractMoments(match, side);

  const handlePick = (moment: DecisiveMoment) => {
    startRewrite(match.id, side, moment.id);
    router.push("/tactics");
  };

  if (moments.length === 0) {
    return (
      <div className="panel rounded-2xl p-6 text-center">
        <p className="text-sm text-dim">
          이 팀은 결정적 순간이 없습니다 (완승/무실점 등).
        </p>
      </div>
    );
  }

  return (
    <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {moments.map((moment) => (
        <li key={moment.id}>
          <button
            type="button"
            onClick={() => handlePick(moment)}
            className="panel flex w-full flex-col gap-2 rounded-2xl p-4 text-left transition-colors duration-150 hover:border-white/25"
          >
            <div className="flex items-center justify-between text-[10px]">
              <span
                className="rounded-full px-2 py-0.5 font-black"
                style={{ background: `${KIND_COLOR[moment.kind]}22`, color: KIND_COLOR[moment.kind] }}
              >
                {KIND_TAG[moment.kind]}
              </span>
              <span className="stat-num text-dim">{moment.takeoverMinute}&apos;부터 개입</span>
            </div>
            <p className="text-sm font-bold text-ink">{moment.labelKo}</p>
          </button>
        </li>
      ))}
    </ul>
  );
}
