"use client";

import { wc2026TeamList } from "@/lib/wc2026/data";
import { h2hOf } from "@/lib/data/h2h";
import { FlagBadge } from "@/components/ui/FlagBadge";
import { attrColor, attrTierKo } from "@/components/tactics/attr-color";
import { STAGE_CHIP, toneOfLabel } from "@/lib/wc2026/stage";
import { Reveal } from "@/components/ui/Reveal";

interface TeamGridProps {
  myTeamId?: string;
  oppTeamId?: string;
  onSelect: (teamId: string) => void;
}

// 폼(0~10)을 능력치 스케일(0~99)에 얹어 FM식 등급 색으로 칠한다. 전 팀이 같은 초록이던
// 이전 버전과 달리, 48장을 훑는 것만으로 폼 좋은 팀이 눈에 먼저 들어온다.
// 색이 유일한 신호가 되지 않도록 등급 한글 라벨을 sr-only로 함께 낸다.
function FormMeter({ form }: { form: number }) {
  const scaled = form * 10;
  const color = attrColor(scaled);
  return (
    <div className="flex shrink-0 items-center gap-1.5">
      <span className="data-label hidden sm:inline">폼</span>
      {/* 375px 2열에서는 카드 폭이 ~155px라 게이지+수치가 넘쳐 "/10"이 잘렸다.
          좁은 화면에서는 막대를 줄이고 sm 이상에서만 원래 폭으로 돌린다. */}
      <div className="h-1.5 w-8 overflow-hidden rounded-full bg-surface-2 sm:w-14">
        <div
          className="h-full rounded-full"
          style={{ width: `${(form / 10) * 100}%`, background: color }}
        />
      </div>
      <span className="stat-num whitespace-nowrap text-[13px]" style={{ color }}>
        {form}/10
      </span>
      <span className="sr-only">폼 {attrTierKo(scaled)}</span>
    </div>
  );
}

export function TeamGrid({ myTeamId, oppTeamId, onSelect }: TeamGridProps) {
  const teams = wc2026TeamList();
  const step = !myTeamId ? 1 : !oppTeamId ? 2 : 3;
  const stepLabel =
    step === 1 ? "내 팀을 고르세요" : step === 2 ? "상대 팀을 고르세요" : "매치업 확정";

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

      {/* 카드에 찍히는 두 수치의 뜻을 한 줄로 밝힌다. "전력 2060", "8/10"만 보고는
          무슨 단위인지 알 수 없다는 지적이 있었다. */}
      <p className="-mt-2 text-[13px] leading-relaxed text-dim">
        <b className="font-bold text-ink">전력</b>은 국제 축구 Elo 레이팅입니다(높을수록 강팀,
        대략 1600~2100). <b className="font-bold text-ink">폼</b>은 최근 경기력을 10점 만점으로
        환산한 값이고, 색이 진할수록 좋습니다.
      </p>

      <ul className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4">
        {teams.map((t, i) => {
          const isMine = t.id === myTeamId;
          const isOpp = t.id === oppTeamId;
          const selected = isMine || isOpp;
          const h2h = myTeamId && !isMine ? h2hOf(myTeamId, t.id) : undefined;

          const ring = isMine
            ? "var(--color-accent)"
            : isOpp
              ? "var(--color-danger)"
              : "var(--color-line)";

          return (
            // content-visibility: auto — 화면 밖 카드는 레이아웃/페인트를 건너뛴다.
            // 48장 전체를 그대로 렌더하되(가상화는 새 의존성이 필요해 도입하지 않음)
            // 렌더 비용만 낮춘다. contain-intrinsic-size는 스크롤바 튐 방지용 추정 높이.
            // 48장이 한꺼번에 떠 있으면 어디부터 볼지 알기 어렵다. 스크롤에 맞춰 한 번씩
            // 들어오게 해 읽는 순서를 만든다. 계단은 4열 기준(i % 4)이라 한 행씩 들어온다.
            <li
              key={t.id}
              className="[content-visibility:auto] [contain-intrinsic-size:220px]"
            >
              <Reveal index={i % 4} step={0.05}>
              <button
                type="button"
                onClick={() => onSelect(t.id)}
                aria-pressed={selected}
                className="panel group relative flex h-full w-full flex-col gap-2.5 rounded-panel p-2.5 text-left transition-colors duration-150 hover:border-white/25"
                style={{ borderColor: selected ? ring : undefined }}
              >
                {/* 선택 상태는 스크린리더에 텍스트로도 전달(색/리본은 시각 전용) */}
                {selected && <span className="sr-only">{isMine ? "내 팀으로 선택됨" : "상대 팀으로 선택됨"}</span>}
                {selected && (
                  <span
                    className="absolute right-2 top-2 rounded-full px-2 py-0.5 text-[13px] font-black"
                    style={{
                      background: ring,
                      color: isMine ? "var(--color-accent-ink)" : "#2a0710",
                    }}
                  >
                    {isMine ? "내 팀" : "상대"}
                  </span>
                )}

                <div className="flex items-center gap-2.5">
                  <FlagBadge code={t.code} color1={t.color1} color2={t.color2} size={40} />
                  <div className="min-w-0">
                    <div className="truncate text-sm font-bold text-ink">{t.nameKo}</div>
                    <div className="text-[13px] text-dim">FIFA {t.fifaRank}위</div>
                  </div>
                </div>

                <div className="flex items-baseline justify-between gap-2">
                  <div className="flex min-w-0 items-baseline gap-1.5">
                    {/* "ELO"는 축구 팬이 아니면 읽히지 않는 약어라 화면에는 "전력"으로 쓴다. */}
                    <span className="data-label">전력</span>
                    <span className="stat-num text-xl leading-none text-ink sm:text-2xl">{t.elo}</span>
                  </div>
                  <FormMeter form={t.form} />
                </div>

                {/* 상대전적이 없는 WC 팀은 2026 최종 성적 태그를 단다. 성적을 골드 세기로
                    인코딩해, 48장을 훑는 것만으로 어디까지 간 팀인지가 먼저 보이게 한다
                    (전부 같은 회색이면 그냥 국가 목록으로 읽힌다). */}
                {h2h ? (
                  <div className="flex items-center gap-2 border-t border-line pt-2 text-[13px]">
                    <span className="text-dim">상대전적</span>
                    <span className="stat-num text-gain">{h2h.winA}승</span>
                    <span className="stat-num text-dim">{h2h.draw}무</span>
                    <span className="stat-num text-danger">{h2h.winB}패</span>
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-1 border-t border-line pt-2">
                    {t.styleTags.map((tag) => (
                      <span
                        key={tag}
                        className={`rounded px-2 py-0.5 text-[13px] ${STAGE_CHIP[toneOfLabel(tag)]}`}
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </button>
              </Reveal>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
