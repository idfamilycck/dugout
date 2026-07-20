"use client";

// 홈 히어로 진입 모션. 첫 화면이 정적으로 툭 떠 있던 것을 아이브로우 → 헤드라인 →
// 설명 → CTA 순서로 들여보낸다.
//
// 왜 이 순서인가(장식이 아니라 위계용): 사용자가 읽어야 하는 순서와 같다. 무엇에 대한
// 서비스인지(아이브로우) -> 한 문장 주장(헤드라인) -> 부연(설명) -> 할 일(CTA).
// 순서를 눈으로 따라가게 만드는 것이 목적이라 지연은 짧게 잡는다.
//
// prefers-reduced-motion이면 애니메이션 없이 즉시 최종 상태로 렌더한다.

import { motion, useReducedMotion } from "framer-motion";
import type { ReactNode } from "react";

export function HeroIntro({ children, index }: { children: ReactNode; index: number }) {
  const reduce = useReducedMotion();

  if (reduce) return <>{children}</>;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.55,
        delay: index * 0.09,
        ease: [0.16, 1, 0.3, 1],
      }}
    >
      {children}
    </motion.div>
  );
}

/** 히어로 우측 전술 보드용. 살짝 늦게, 조금 더 크게 들어온다. */
export function HeroBoardIntro({ children }: { children: ReactNode }) {
  const reduce = useReducedMotion();

  if (reduce) return <>{children}</>;

  return (
    <motion.div
      className="h-full"
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.7, delay: 0.18, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </motion.div>
  );
}
