"use client";

// 복기(rewrite) 모드 비교: "실제 역사" vs "당신의 평행세계"를 나란히 보여주고,
// 결과가 바뀌었는지 한 문장(deltaKo)으로 요약한다. free 모드의 CfCompare(무개입
// 시뮬레이션과 비교)와 시각 언어를 맞추되, rewrite 모드에서는 비교 대상이
// "실제 역사"라는 점이 다르다. 유리(결과 개선)=초록, 불리(결과 악화)=빨강,
// 동일=중립.

import type { RewriteCompare, ResultWord } from "./compare";
import { resultRank } from "./compare";

interface RealVsParallelProps {
  compare: RewriteCompare;
  meCode: string;
  oppCode: string;
}

function wordColor(word: ResultWord): string {
  if (word === "승리") return "var(--color-gain)";
  if (word === "무승부") return "var(--color-dim)";
  return "var(--color-danger)";
}

function ScoreCard({
  label,
  meCode,
  oppCode,
  scoreFor,
  scoreAgainst,
  word,
  highlight,
}: {
  label: string;
  meCode: string;
  oppCode: string;
  scoreFor: number;
  scoreAgainst: number;
  word: ResultWord;
  highlight: boolean;
}) {
  return (
    <div
      className={`flex flex-1 flex-col items-center rounded-panel border px-3 py-4 ${
        highlight ? "border-accent/60 bg-accent/10" : "border-line bg-surface-2/40"
      }`}
    >
      <p className="eyebrow text-center text-dim">{label}</p>
      <div className="mt-2 flex items-center gap-1.5 text-[11px] font-bold text-dim">
        <span>{meCode}</span>
        <span className="stat-num display text-3xl text-ink">
          {scoreFor}
          <span className="px-1 text-dim">:</span>
          {scoreAgainst}
        </span>
        <span>{oppCode}</span>
      </div>
      <span className="stat-num mt-2 text-xs font-black" style={{ color: wordColor(word) }}>
        {word}
      </span>
    </div>
  );
}

export function RealVsParallel({ compare, meCode, oppCode }: RealVsParallelProps) {
  const realWord = compare.realResultKo;
  const myWord = compare.myResultKo;
  const realFor = compare.realFor;
  const realAgainst = compare.realAgainst;
  const myFor = compare.myFor;
  const myAgainst = compare.myAgainst;

  const deltaColor = !compare.changedOutcome
    ? "var(--color-dim)"
    : resultRank(myWord) > resultRank(realWord)
      ? "var(--color-gain)"
      : "var(--color-danger)";

  return (
    <section className="panel rounded-panel p-4">
      <div className="flex items-center justify-between">
        <p className="eyebrow text-accent">실제 역사 vs 평행세계</p>
        <span className="text-[11px] text-dim">당신이 지휘봉을 잡았다면?</span>
      </div>

      <div className="mt-3 flex items-stretch gap-3">
        <ScoreCard
          label="실제 역사"
          meCode={meCode}
          oppCode={oppCode}
          scoreFor={realFor}
          scoreAgainst={realAgainst}
          word={realWord}
          highlight={false}
        />
        <div className="flex items-center">
          <span className="text-lg text-dim" aria-hidden>
            vs
          </span>
        </div>
        <ScoreCard
          label="당신의 평행세계"
          meCode={meCode}
          oppCode={oppCode}
          scoreFor={myFor}
          scoreAgainst={myAgainst}
          word={myWord}
          highlight
        />
      </div>

      <p
        className="stat-num mt-4 rounded-panel bg-surface-2/50 px-3 py-3 text-center text-sm font-black"
        style={{ color: deltaColor }}
      >
        {compare.deltaKo}
      </p>
    </section>
  );
}
