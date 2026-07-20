"use client";

// 전술 평가 & 보완 패널: 통한 전술 / 발목 잡은 부분 / 다음 경기 보완 제안.
// 내용은 buildTacticsReview(순수 로직)가 엔진 데이터로 생성한다.

import { CheckCircle, Warning, ClipboardText } from "@phosphor-icons/react";
import type { TacticsReview } from "./tactics-review";
import type { AppliedRule } from "@/lib/engine/modifiers";

// rule.icon은 lib/engine/modifiers.ts의 규칙 문구(방송 근거 카드 텍스트)에 딸린 값이라
// 그대로 표시한다 — 이 패널 자체의 UI 크롬(섹션 헤딩 아이콘)만 Phosphor로 교체한다.
function RuleRow({ rule, tone }: { rule: AppliedRule; tone: "good" | "bad" }) {
  return (
    <li className="flex items-start gap-2 text-sm">
      <span aria-hidden>{rule.icon}</span>
      <span className={tone === "good" ? "text-ink" : "text-ink"}>
        {rule.textKo}
      </span>
    </li>
  );
}

export function TacticsReviewPanel({ review }: { review: TacticsReview }) {
  return (
    <section className="panel rounded-[10px] p-5 sm:p-6" aria-label="전술 평가 및 보완">
      <p className="eyebrow text-accent">감독 리포트</p>
      <h2 className="mt-1 text-lg font-bold text-ink">전술 평가 &amp; 보완</h2>

      <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="rounded-[10px] border border-gain/30 bg-gain/5 p-4">
          <h3 className="flex items-center gap-1.5 text-sm font-bold text-gain">
            <CheckCircle size={16} weight="bold" aria-hidden /> 통한 전술
          </h3>
          {review.worked.length > 0 ? (
            <ul className="mt-2 flex flex-col gap-1.5">
              {review.worked.map((r) => (
                <RuleRow key={r.id} rule={r} tone="good" />
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-sm text-dim">특별히 발동한 플러스 규칙이 없었어요.</p>
          )}
        </div>

        <div className="rounded-[10px] border border-danger/30 bg-danger/5 p-4">
          <h3 className="flex items-center gap-1.5 text-sm font-bold text-danger">
            <Warning size={16} weight="bold" aria-hidden /> 발목 잡은 부분
          </h3>
          {review.hurt.length > 0 ? (
            <ul className="mt-2 flex flex-col gap-1.5">
              {review.hurt.map((r) => (
                <RuleRow key={r.id} rule={r} tone="bad" />
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-sm text-dim">전술 감점 요인은 없었어요.</p>
          )}
        </div>
      </div>

      <div className="mt-4 rounded-[10px] border border-line bg-surface-2/60 p-4">
        <h3 className="flex items-center gap-1.5 text-sm font-bold text-ink">
          <ClipboardText size={16} weight="bold" aria-hidden /> 다음 경기 보완
        </h3>
        <ol className="mt-2 flex list-decimal flex-col gap-1.5 pl-5">
          {review.tips.map((tip) => (
            <li key={tip} className="text-sm leading-relaxed text-ink">
              {tip}
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
