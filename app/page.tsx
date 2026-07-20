"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAppStore } from "@/lib/store";
import { EDGE_COLOR, edgeToneFromWinPct, type EdgeTone } from "@/lib/edge-tone";
import { teamById } from "@/lib/data/teams";
import { venueById } from "@/lib/data/venues";
import { HeroBoard } from "@/components/home/HeroBoard";
import { HeroIntro, HeroBoardIntro } from "@/components/home/HeroIntro";
import { TeamGrid } from "@/components/home/TeamGrid";
import { VenuePicker } from "@/components/home/VenuePicker";
import { FlagBadge } from "@/components/ui/FlagBadge";
import { Disclaimer } from "@/components/ui/Disclaimer";

// 킥오프 전 방송용 예상 우세 — ELO 로지스틱(감독 개입 전 기준선).
function eloWinPctRaw(myElo: number, oppElo: number): number {
  return (1 / (1 + Math.pow(10, (oppElo - myElo) / 400))) * 100;
}

// 우세 판정은 작전실 WinGauge와 같은 규칙(lib/edge-tone.ts)을 쓴다.
const EDGE_MARK: Record<EdgeTone, string> = { favored: "▲", even: "＝", behind: "▼" };
const EDGE_LABEL: Record<EdgeTone, string> = {
  favored: "예상 우세",
  even: "예상 대등",
  behind: "예상 열세",
};

export default function Home() {
  const router = useRouter();
  const selectMatchup = useAppStore((s) => s.selectMatchup);

  // 홈 선택은 로컬 상태로 두고, "작전실 입장" 순간에만 스토어에 커밋한다.
  const [myTeamId, setMyTeamId] = useState<string>();
  const [oppTeamId, setOppTeamId] = useState<string>();
  const [venueId, setVenueId] = useState<string>();

  // 2단계 순차 선택 로직
  const handleTeamClick = (id: string) => {
    if (id === myTeamId) {
      setMyTeamId(undefined);
      setOppTeamId(undefined);
      return;
    }
    if (id === oppTeamId) {
      setOppTeamId(undefined);
      return;
    }
    if (!myTeamId) {
      setMyTeamId(id);
      return;
    }
    setOppTeamId(id);
  };

  const myTeam = myTeamId ? teamById(myTeamId) : undefined;
  const oppTeam = oppTeamId ? teamById(oppTeamId) : undefined;
  const venue = venueId ? venueById(venueId) : undefined;
  const ready = Boolean(myTeam && oppTeam && venue);
  const pctRaw = myTeam && oppTeam ? eloWinPctRaw(myTeam.elo, oppTeam.elo) : undefined;
  const pct = pctRaw !== undefined ? Math.round(pctRaw) : undefined;
  const tone = pctRaw !== undefined ? edgeToneFromWinPct(pctRaw) : "even";

  const enter = () => {
    if (!ready) return;
    selectMatchup(myTeamId!, oppTeamId!, venueId!);
    router.push("/tactics");
  };

  return (
    <main id="main" className="flex flex-1 scroll-mt-14 flex-col pb-28">
      {/* ── 히어로 ───────────────────────────────────────── */}
      <section
        aria-label="히어로"
        className="pitch-stripes relative overflow-hidden border-b border-line"
      >
        {/* 비대칭 스플릿: 좌측 카피 / 우측 전술 보드. 보드는 lg 미만에서 숨긴다 —
            모바일에서는 카피와 CTA가 한 화면에 들어가는 것이 우선이다. */}
        <div className="mx-auto grid w-full max-w-5xl grid-cols-1 items-center gap-8 px-5 pb-7 pt-8 sm:pt-11 lg:grid-cols-[minmax(0,1fr)_minmax(0,300px)]">
          <div>
            <HeroIntro index={0}>
              <p className="eyebrow text-accent">국가대표 전술 시뮬레이터</p>
            </HeroIntro>
            <HeroIntro index={1}>
              <h1 className="display mt-3 text-balance text-5xl text-ink sm:text-7xl">
                당신이<br />감독이라면.
              </h1>
            </HeroIntro>
            <HeroIntro index={2}>
              <p className="mt-4 max-w-xl text-pretty text-base leading-relaxed text-dim">
                포메이션과 지시 하나로 승부가 뒤집힙니다. 대표팀을 골라 벤치에 앉고,
                90분을 직접 지휘해 보세요.
              </p>
            </HeroIntro>
            {/* 두 가지 진입 모드를 동등하게 노출한다. "자유 매치업"은 같은 페이지 아래
                매치업 구성 섹션으로 스크롤한다(별도 라우트가 아니라 앵커). */}
            <HeroIntro index={3}>
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <Link
                href="/rewrite"
                className="group inline-flex items-center gap-3 rounded-control bg-accent px-6 py-3.5 text-lg font-black text-accent-ink transition-[transform,background-color] duration-150 hover:bg-[#4ce0f5] active:scale-[0.99]"
              >
                <span>2026 월드컵 다시 쓰기</span>
                <span aria-hidden className="transition-transform duration-150 group-hover:translate-x-1">
                  →
                </span>
              </Link>
              <a
                href="#matchup"
                className="group inline-flex items-center gap-3 rounded-control bg-accent px-6 py-3.5 text-lg font-black text-accent-ink transition-[transform,background-color] duration-150 hover:bg-[#4ce0f5] active:scale-[0.99]"
              >
                <span>자유 매치업</span>
                <span aria-hidden className="transition-transform duration-150 group-hover:translate-y-1">
                  ↓
                </span>
              </a>
            </div>
            </HeroIntro>
          </div>

          <div className="hidden h-[360px] justify-self-end lg:block">
            <HeroBoardIntro>
              <HeroBoard />
            </HeroBoardIntro>
          </div>
        </div>
      </section>

      {/* ── 매치업 구성 ──────────────────────────────────── */}
      <section id="matchup" aria-label="매치업 구성" className="mx-auto w-full max-w-5xl scroll-mt-20 px-5 pt-9">
        <header className="accent-tab mb-5 pl-4">
          <h2 className="display text-balance text-3xl text-ink">누구를 이끌고, 누구를 상대할까</h2>
        </header>
        <TeamGrid myTeamId={myTeamId} oppTeamId={oppTeamId} onSelect={handleTeamClick} />
      </section>

      {/* ── 경기장 선택 ──────────────────────────────────── */}
      <section aria-label="경기장 선택" className="mx-auto w-full max-w-5xl px-5 pt-9">
        <header className="accent-tab mb-5 pl-4">
          <h2 className="display text-balance text-3xl text-ink">어디에서 맞붙을까</h2>
        </header>
        <VenuePicker venueId={venueId} onSelect={setVenueId} />
      </section>

      {/* ── 하단 고지 ────────────────────────────────────── */}
      <footer className="mx-auto mt-16 w-full max-w-5xl px-5 pb-4">
        <Disclaimer />
      </footer>

      {/* ── 방송 스코어보드(하단 고정) — 시그니처 ─────────── */}
      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-pitch/85 backdrop-blur-md">
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-2 px-5 py-3 sm:flex-row sm:items-center sm:gap-4">
          {myTeam && oppTeam ? (
            <div className="flex min-w-0 flex-1 flex-col gap-1.5">
              <div className="flex items-center gap-2 text-sm">
                <FlagBadge code={myTeam.code} color1={myTeam.color1} color2={myTeam.color2} size={26} />
                <span className="font-bold text-ink">{myTeam.nameKo}</span>
                <span className="text-dim">vs</span>
                <span className="font-bold text-ink">{oppTeam.nameKo}</span>
                <FlagBadge code={oppTeam.code} color1={oppTeam.color1} color2={oppTeam.color2} size={26} />
                <span className="ml-auto hidden text-xs text-dim sm:inline">
                  {venue ? venue.nameKo : "경기장 미선택"}
                </span>
              </div>
              {/* 예상 우세 바 — 유리 초록↑ / 불리 빨강↓ */}
              <div className="flex items-center gap-2">
                <div className="relative h-2 flex-1 overflow-hidden rounded-full bg-surface-2">
                  <div
                    className="h-full rounded-full transition-[width,background-color]"
                    style={{
                      width: `${pct}%`,
                      background: EDGE_COLOR[tone],
                    }}
                  />
                </div>
                <span className="stat-num text-sm" style={{ color: EDGE_COLOR[tone] }}>
                  <span aria-hidden>{EDGE_MARK[tone]}</span> {EDGE_LABEL[tone]} {pct}%
                </span>
              </div>
            </div>
          ) : (
            <p className="flex-1 text-sm text-dim">
              내 팀 · 상대 팀 · 경기장을 고르면 작전실이 열립니다.
            </p>
          )}

          <button
            type="button"
            onClick={enter}
            disabled={!ready}
            className="shrink-0 rounded-control px-6 py-3 text-sm font-black transition-colors disabled:cursor-not-allowed"
            style={
              ready
                ? { background: "var(--color-accent)", color: "var(--color-accent-ink)" }
                : { background: "var(--color-surface-2)", color: "var(--color-dim)" }
            }
          >
            작전실 입장 →
          </button>
        </div>
      </div>
    </main>
  );
}
