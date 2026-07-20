"use client";

// 스크롤 진입 리빌. 화면에 들어올 때 한 번만 올라오며 나타난다.
//
// 왜 넣는가(장식이 아니라 위계용): 이 앱의 정보 화면은 48장 팀 카드, 12개 조 순위표,
// 5개 라운드 대진표처럼 "같은 모양이 길게 반복되는" 구조다. 전부 한꺼번에 떠 있으면
// 어디부터 봐야 할지 알기 어렵다. 스크롤에 맞춰 순서대로 들어오면 읽는 순서가 생긴다.
//
// 규칙:
//  - once: true. 스크롤을 되감을 때마다 다시 재생되면 성가시고 산만하다.
//  - transform/opacity만 애니메이션한다(레이아웃 속성 금지).
//  - prefers-reduced-motion이면 애니메이션 없이 즉시 최종 상태로 렌더한다.

import { motion, useReducedMotion } from "framer-motion";
import type { ReactNode } from "react";

interface RevealProps {
  children: ReactNode;
  /** 목록에서의 순번. 같은 그룹 안에서 계단식으로 들어오게 한다. */
  index?: number;
  /** 계단 간격(초). 항목이 많으면 줄여서 총 지연이 길어지지 않게 한다. */
  step?: number;
  /** 계단 지연 상한(초). 48장짜리 목록에서 뒤쪽이 하염없이 늦어지는 것을 막는다. */
  maxDelay?: number;
  className?: string;
}

export function Reveal({
  children,
  index = 0,
  step = 0.04,
  maxDelay = 0.24,
  className,
}: RevealProps) {
  const reduce = useReducedMotion();

  if (reduce) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 14 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.15 }}
      transition={{
        duration: 0.45,
        delay: Math.min(index * step, maxDelay),
        ease: [0.16, 1, 0.3, 1],
      }}
    >
      {children}
    </motion.div>
  );
}
