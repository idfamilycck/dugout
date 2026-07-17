"use client";

// 경기 화면 자리표시자 — Task 15에서 실제 라이브 경기 UI로 대체된다.
// 지금은 작전실에서 "경기 시작" 시 404가 나지 않도록 최소 화면만 제공한다.

import Link from "next/link";
import { useAppStore } from "@/lib/store";
import { teamById } from "@/lib/data/teams";

export default function MatchPage() {
  const setup = useAppStore((s) => s.setup);
  const me = teamById(setup.myTeamId ?? "");
  const opp = teamById(setup.oppTeamId ?? "");

  return (
    <main className="flex flex-1 flex-col items-center justify-center px-5 py-24 text-center">
      <p className="eyebrow text-accent">경기</p>
      <h1 className="display mt-4 text-4xl text-ink">경기 준비 중</h1>
      {me && opp && (
        <p className="stat-num mt-4 text-lg text-dim">
          {me.nameKo} vs {opp.nameKo}
        </p>
      )}
      <p className="mt-4 max-w-sm text-sm text-dim">
        라이브 경기 화면은 곧 열립니다. 작전실에서 전술을 더 다듬어 보세요.
      </p>
      <Link
        href="/tactics"
        className="mt-8 rounded-full border border-line px-6 py-3 text-sm font-bold text-dim transition-colors hover:border-white/25 hover:text-ink"
      >
        ← 작전실로 돌아가기
      </Link>
    </main>
  );
}
