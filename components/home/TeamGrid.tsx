"use client";

// 매치업 구성의 팀 선택.
//
// 이전 구조: 48장이 전부 같은 크기 카드로 4열 그리드에 깔렸다. 위계가 없어 어디부터
// 봐야 할지 알 수 없고, 특정 팀(대개 대한민국)을 찾으려면 눈으로 48장을 훑어야 했다.
//
// 지금 구조: 두 개의 다른 레이아웃을 섞는다.
//   1) 우승 후보(결승 진출/4강) = 큰 카드. 대회에서 끝까지 간 팀은 크게 보여준다.
//   2) 나머지 = 한 줄짜리 컴팩트 행. 같은 정보를 4분의 1 높이에 담아 한 화면에 더 들어온다.
// 여기에 검색과 단계 필터를 얹어, 48장을 훑지 않고 바로 집어낼 수 있게 한다.

import { useMemo, useState } from "react";
import { MagnifyingGlass, X } from "@phosphor-icons/react";
import { wc2026TeamList } from "@/lib/wc2026/data";
import { h2hOf } from "@/lib/data/h2h";
import { FlagBadge } from "@/components/ui/FlagBadge";
import { attrColor, attrTierKo } from "@/components/tactics/attr-color";
import { STAGE_CHIP, toneOfLabel, type StageTone } from "@/lib/wc2026/stage";
import { Reveal } from "@/components/ui/Reveal";
import { matchesQuery } from "@/components/home/team-search";
import type { Team } from "@/lib/types";

interface TeamGridProps {
  myTeamId?: string;
  oppTeamId?: string;
  onSelect: (teamId: string) => void;
}

// 단계 필터. "전체"는 필터 없음.
const STAGE_FILTERS: Array<{ key: string; label: string; tones: StageTone[] }> = [
  { key: "all", label: "전체", tones: [] },
  { key: "top", label: "4강 이상", tones: ["gold", "gold-soft"] },
  { key: "mid", label: "8·16강", tones: ["neutral"] },
  { key: "early", label: "32강·조별", tones: ["dim"] },
];

function toneOfTeam(t: Team): StageTone {
  return toneOfLabel(t.styleTags[0] ?? "");
}


function FormMeter({ form, compact }: { form: number; compact?: boolean }) {
  const scaled = form * 10;
  const color = attrColor(scaled);
  return (
    <div className="flex shrink-0 items-center gap-1.5">
      {!compact && <span className="data-label hidden sm:inline">폼</span>}
      <div className={`h-1.5 overflow-hidden rounded-full bg-surface-2 ${compact ? "w-10" : "w-8 sm:w-14"}`}>
        <div className="h-full rounded-full" style={{ width: `${(form / 10) * 100}%`, background: color }} />
      </div>
      <span className="stat-num whitespace-nowrap text-[13px]" style={{ color }}>
        {form}/10
      </span>
      <span className="sr-only">폼 {attrTierKo(scaled)}</span>
    </div>
  );
}

/** 선택 상태의 테두리색. 내 팀=액센트, 상대=위험색. */
function ringOf(isMine: boolean, isOpp: boolean): string | undefined {
  if (isMine) return "var(--color-accent)";
  if (isOpp) return "var(--color-danger)";
  return undefined;
}

function SelectedBadge({ isMine }: { isMine: boolean }) {
  return (
    <span
      className="shrink-0 rounded-full px-2 py-0.5 text-[13px] font-black"
      style={{
        background: isMine ? "var(--color-accent)" : "var(--color-danger)",
        color: isMine ? "var(--color-accent-ink)" : "#2a0710",
      }}
    >
      {isMine ? "내 팀" : "상대"}
    </span>
  );
}

/** 우승 후보용 큰 카드. */
function FeatureCard({
  t,
  isMine,
  isOpp,
  h2h,
  onSelect,
}: {
  t: Team;
  isMine: boolean;
  isOpp: boolean;
  h2h?: ReturnType<typeof h2hOf>;
  onSelect: (id: string) => void;
}) {
  const selected = isMine || isOpp;
  return (
    <button
      type="button"
      onClick={() => onSelect(t.id)}
      aria-pressed={selected}
      className="panel group relative flex h-full w-full flex-col gap-3 rounded-panel p-3.5 text-left transition-colors duration-150 hover:border-white/25"
      style={{ borderColor: ringOf(isMine, isOpp) }}
    >
      {selected && (
        <span className="sr-only">{isMine ? "내 팀으로 선택됨" : "상대 팀으로 선택됨"}</span>
      )}
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-center gap-3">
          <FlagBadge code={t.code} color1={t.color1} color2={t.color2} size={48} />
          <div className="min-w-0">
            <div className="truncate text-base font-bold text-ink">{t.nameKo}</div>
            <div className="text-[13px] text-dim">FIFA {t.fifaRank}위</div>
          </div>
        </div>
        {selected && <SelectedBadge isMine={isMine} />}
      </div>

      <div className="flex items-end justify-between gap-2">
        <div className="flex min-w-0 items-baseline gap-1.5">
          <span className="data-label">전력</span>
          <span className="stat-num text-3xl leading-none text-ink">{t.elo}</span>
        </div>
        <FormMeter form={t.form} />
      </div>

      <div className="flex items-center justify-between gap-2 border-t border-line pt-2">
        {h2h ? (
          <div className="flex items-center gap-2 text-[13px]">
            <span className="text-dim">상대전적</span>
            <span className="stat-num text-gain">{h2h.winA}승</span>
            <span className="stat-num text-dim">{h2h.draw}무</span>
            <span className="stat-num text-danger">{h2h.winB}패</span>
          </div>
        ) : (
          <span className={`rounded px-2 py-0.5 text-[13px] ${STAGE_CHIP[toneOfTeam(t)]}`}>
            {t.styleTags[0]}
          </span>
        )}
      </div>
    </button>
  );
}

/** 나머지 팀용 한 줄 행. 같은 정보를 훨씬 낮은 높이에 담는다. */
function TeamRow({
  t,
  isMine,
  isOpp,
  h2h,
  onSelect,
}: {
  t: Team;
  isMine: boolean;
  isOpp: boolean;
  h2h?: ReturnType<typeof h2hOf>;
  onSelect: (id: string) => void;
}) {
  const selected = isMine || isOpp;
  return (
    <button
      type="button"
      onClick={() => onSelect(t.id)}
      aria-pressed={selected}
      className="flex w-full items-center gap-3 rounded-control border px-3 py-2 text-left transition-colors duration-150 hover:bg-raised/60"
      style={{
        borderColor: ringOf(isMine, isOpp) ?? "transparent",
        background: selected ? "rgba(255,255,255,0.05)" : undefined,
      }}
    >
      {selected && <span className="sr-only">{isMine ? "내 팀으로 선택됨" : "상대 팀으로 선택됨"}</span>}
      <FlagBadge code={t.code} color1={t.color1} color2={t.color2} size={26} />
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-bold text-ink">{t.nameKo}</div>
        <div className="text-[13px] text-dim">FIFA {t.fifaRank}위</div>
      </div>

      {h2h ? (
        <span className="hidden shrink-0 items-center gap-1.5 text-[13px] sm:flex">
          <span className="stat-num text-gain">{h2h.winA}</span>
          <span className="text-dim">-</span>
          <span className="stat-num text-danger">{h2h.winB}</span>
        </span>
      ) : (
        <span className={`hidden shrink-0 rounded px-2 py-0.5 text-[13px] sm:inline ${STAGE_CHIP[toneOfTeam(t)]}`}>
          {t.styleTags[0]}
        </span>
      )}

      <div className="flex shrink-0 items-baseline gap-1">
        <span className="data-label hidden md:inline">전력</span>
        <span className="stat-num text-lg leading-none text-ink">{t.elo}</span>
      </div>
      <span className="hidden lg:block">
        <FormMeter form={t.form} compact />
      </span>
      {selected && <SelectedBadge isMine={isMine} />}
    </button>
  );
}

export function TeamGrid({ myTeamId, oppTeamId, onSelect }: TeamGridProps) {
  const teams = wc2026TeamList();
  const [query, setQuery] = useState("");
  const [stageKey, setStageKey] = useState("all");

  const step = !myTeamId ? 1 : !oppTeamId ? 2 : 3;
  const stepLabel =
    step === 1 ? "내 팀을 고르세요" : step === 2 ? "상대 팀을 고르세요" : "매치업 확정";

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const tones = STAGE_FILTERS.find((f) => f.key === stageKey)?.tones ?? [];
    return teams.filter((t) => {
      if (tones.length > 0 && !tones.includes(toneOfTeam(t))) return false;
      return matchesQuery(t, q);
    });
  }, [teams, query, stageKey]);

  // 우승 후보(4강 이상)와 나머지를 나눠 서로 다른 레이아웃으로 그린다.
  const featured = filtered.filter((t) => {
    const tone = toneOfTeam(t);
    return tone === "gold" || tone === "gold-soft";
  });
  const rest = filtered.filter((t) => !featured.includes(t));

  const decorate = (t: Team) => ({
    isMine: t.id === myTeamId,
    isOpp: t.id === oppTeamId,
    h2h: myTeamId && t.id !== myTeamId ? h2hOf(myTeamId, t.id) : undefined,
  });

  return (
    <div className="flex flex-col gap-5">
      {/* 단계 인디케이터 */}
      <div className="flex flex-wrap items-center gap-3">
        <span
          className={`flex h-7 items-center gap-2 rounded-full px-3 text-xs font-bold ${
            step === 1 ? "bg-accent text-accent-ink" : "bg-surface-2 text-dim"
          }`}
        >
          <span className="stat-num">1</span> 내 팀
        </span>
        <span aria-hidden className="text-dim">→</span>
        <span
          className={`flex h-7 items-center gap-2 rounded-full px-3 text-xs font-bold ${
            step === 2 ? "bg-accent text-accent-ink" : "bg-surface-2 text-dim"
          }`}
        >
          <span className="stat-num">2</span> 상대 팀
        </span>
        <span className="ml-auto text-sm font-semibold text-ink">{stepLabel}</span>
      </div>

      {/* 검색 + 단계 필터. 48개국을 눈으로 훑지 않고 바로 집어낼 수 있게 한다. */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <MagnifyingGlass
            size={16}
            weight="bold"
            aria-hidden
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-dim"
          />
          <label htmlFor="team-search" className="sr-only">
            팀 이름 또는 국가 코드로 검색
          </label>
          {/* type="search"는 브라우저 기본 X 버튼을 덧붙여 우리 지우기 버튼과 두 개가 겹친다. */}
          <input
            id="team-search"
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="팀 이름이나 국가 코드 (예: 한국, KOR)"
            className="w-full rounded-control border border-line bg-surface-2 py-2.5 pl-9 pr-9 text-sm text-ink placeholder:text-dim focus:border-accent focus:outline-none"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              aria-label="검색어 지우기"
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1 text-dim hover:text-ink"
            >
              <X size={14} weight="bold" aria-hidden />
            </button>
          )}
        </div>
        <div className="flex flex-wrap gap-1.5">
          {STAGE_FILTERS.map((f) => (
            <button
              key={f.key}
              type="button"
              onClick={() => setStageKey(f.key)}
              aria-pressed={stageKey === f.key}
              className={`rounded-full px-3 py-1.5 text-xs font-bold transition-colors ${
                stageKey === f.key ? "bg-accent text-accent-ink" : "bg-surface-2 text-dim hover:text-ink"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <p className="-mt-1 text-[13px] leading-relaxed text-dim">
        <b className="font-bold text-ink">전력</b>은 국제 축구 Elo 레이팅입니다(높을수록 강팀,
        대략 1600~2100). <b className="font-bold text-ink">폼</b>은 최근 경기력을 10점 만점으로
        환산한 값이고, 색이 진할수록 좋습니다.
      </p>

      {filtered.length === 0 ? (
        <div className="panel rounded-panel px-4 py-10 text-center">
          <p className="text-sm text-ink">조건에 맞는 팀이 없어요.</p>
          <p className="mt-1 text-[13px] text-dim">검색어를 지우거나 단계 필터를 바꿔보세요.</p>
        </div>
      ) : (
        <>
          {featured.length > 0 && (
            <section aria-label="4강 이상 진출 팀" className="flex flex-col gap-2.5">
              <h3 className="text-sm font-bold text-ink">
                4강 이상 <span className="stat-num text-dim">{featured.length}</span>
              </h3>
              {/* 4강 이상은 결승 진출 2 + 4강 2 = 4팀이라 4열이면 한 줄에 딱 맞는다.
                  3열이면 둘째 줄에 1장만 남아 빈 칸이 생긴다. */}
              <ul aria-label="팀 목록" className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
                {featured.map((t, i) => {
                  const d = decorate(t);
                  return (
                    <li key={t.id}>
                      <Reveal index={i % 4} step={0.05}>
                        <FeatureCard t={t} {...d} onSelect={onSelect} />
                      </Reveal>
                    </li>
                  );
                })}
              </ul>
            </section>
          )}

          {rest.length > 0 && (
            <section aria-label="그 외 참가국" className="flex flex-col gap-2.5">
              <h3 className="text-sm font-bold text-ink">
                그 외 참가국 <span className="stat-num text-dim">{rest.length}</span>
              </h3>
              {/* 한 줄 행 2열. 카드 그리드와 다른 레이아웃 패밀리라 같은 화면에서 위계가 생긴다. */}
              <ul
                aria-label="팀 목록"
                className="grid grid-cols-1 gap-1.5 lg:grid-cols-2 lg:gap-x-3"
              >
                {rest.map((t) => {
                  const d = decorate(t);
                  return (
                    <li key={t.id} className="[content-visibility:auto] [contain-intrinsic-size:52px]">
                      <TeamRow t={t} {...d} onSelect={onSelect} />
                    </li>
                  );
                })}
              </ul>
            </section>
          )}
        </>
      )}
    </div>
  );
}
