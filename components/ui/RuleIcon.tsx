"use client";

// AppliedRule.iconKey(시맨틱) -> 실제 Phosphor 아이콘.
// MomentCards.tsx의 EntryPointIcon과 같은 패턴 — 엔진(lib/engine/modifiers.ts)은
// 의미만 들고, 그림은 여기서 한 번만 정한다. 근거 카드 3곳(FactorCards /
// RecommendPanel / TacticsReviewPanel)이 이 컴포넌트를 공유한다.
// 의미는 옆의 한글 문구가 전달하므로 아이콘은 항상 aria-hidden.

import {
  Warning,
  Target,
  Lock,
  ArrowsLeftRight,
  Lightning,
  ShieldCheck,
  Magnet,
  Mountains,
  ThermometerHot,
  Fire,
  TrendDown,
  ChartBar,
  Brain,
  PersonSimpleRun,
  Info,
} from "@phosphor-icons/react";
import type { RuleIconKey } from "@/lib/engine/modifiers";

const ICONS: Record<RuleIconKey, typeof Info> = {
  warning: Warning,
  target: Target,
  lock: Lock,
  swap: ArrowsLeftRight,
  bolt: Lightning,
  shield: ShieldCheck,
  magnet: Magnet,
  mountain: Mountains,
  heat: ThermometerHot,
  flame: Fire,
  slump: TrendDown,
  chart: ChartBar,
  brain: Brain,
  run: PersonSimpleRun,
};

export function RuleIcon({
  iconKey,
  size = 16,
  className,
}: {
  iconKey: RuleIconKey;
  size?: number;
  className?: string;
}) {
  // 폴백: 엔진에 새 키가 추가됐는데 매핑이 아직 없을 때도 레이아웃이 깨지지 않게 한다.
  const Icon = ICONS[iconKey] ?? Info;
  return <Icon size={size} weight="bold" className={className} aria-hidden />;
}
