"use client";

import { useRouter } from "next/navigation";
import { useAppStore } from "@/lib/store";
import { buildPresets, buildEventEntries, type EntryPoint } from "@/lib/wc2026/entry-points";
import type { Wc2026Match } from "@/lib/wc2026/types";

interface MomentCardsProps {
  match: Wc2026Match;
  side: string; // 3-letter code (match.home 또는 match.away)
}

// buildPresets()는 이벤트 유무와 무관하게 항상 3개를 반환하므로, 여기엔 더 이상
// "결정적 순간이 없습니다" 같은 막다른 화면이 없다 — 완승/무카드 경기라도 항상
// 최소 3개의 진입점(풀경기/전반전/후반전)이 뜬다.
export function MomentCards({ match, side }: MomentCardsProps) {
  const router = useRouter();
  const startRewrite = useAppStore((s) => s.startRewrite);

  const presets = buildPresets();
  const events = buildEventEntries(match, side);

  const handlePick = (entry: EntryPoint) => {
    startRewrite(match.id, side, entry);
    router.push("/tactics");
  };

  return (
    <div className="flex flex-col gap-7">
      {/* 진행 방식: 항상 존재하는 3개 프리셋 — 클린 승리 등 이벤트가 적은 경기에서도
          여기서 막다른 길 없이 진입할 수 있다. */}
      <div>
        <p className="mb-3 text-[11px] font-black uppercase tracking-wide text-dim">진행 방식</p>
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {presets.map((entry) => (
            <li key={entry.id}>
              <button
                type="button"
                onClick={() => handlePick(entry)}
                className="panel flex w-full flex-col gap-1.5 rounded-2xl border border-accent/40 bg-accent/5 p-4 text-left transition-colors duration-150 hover:border-accent/70 hover:bg-accent/10"
              >
                <p className="text-sm font-black text-ink">{entry.labelKo}</p>
                {entry.subKo && <p className="text-[11px] leading-snug text-dim">{entry.subKo}</p>}
              </button>
            </li>
          ))}
        </ul>
      </div>

      {/* 모든 순간: 이 경기에 기록된 모든 이벤트(득점/교체/카드)를 5분 전 진입점으로. */}
      {events.length > 0 && (
        <div>
          <p className="mb-3 text-[11px] font-black uppercase tracking-wide text-dim">
            모든 순간 · 5분 전부터
          </p>
          <ul className="grid max-h-[420px] grid-cols-1 gap-3 overflow-y-auto pr-1 sm:grid-cols-2">
            {events.map((entry) => (
              <li key={entry.id}>
                <button
                  type="button"
                  onClick={() => handlePick(entry)}
                  className="panel flex w-full flex-col gap-2 rounded-2xl border-l-4 p-4 text-left transition-colors duration-150 hover:border-white/25"
                  style={{
                    borderLeftColor: entry.emphasis ? "var(--color-danger)" : "transparent",
                  }}
                >
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="stat-num text-dim">{entry.takeoverMinute}&apos;부터 개입</span>
                  </div>
                  <p className="text-sm font-bold text-ink">{entry.labelKo}</p>
                  {entry.subKo && <p className="text-[11px] text-dim">{entry.subKo}</p>}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
