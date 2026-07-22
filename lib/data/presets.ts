import type { TeamInstructions } from "@/lib/types";

export interface TacticPreset {
  id: string;
  nameKo: string;
  descKo: string;
  values: Omit<TeamInstructions, "formation" | "focus" | "offsideTrap">;
}

// 7종 기본 전술 프리셋: 버튼 클릭 한 번으로 슬라이더/토글 10개를 동시에 세팅한다.
// formation/focus/offsideTrap은 프리셋 정의에 없는 축이라 값을 유지한다(setInstructions는
// Partial 병합이라 여기서 안 건드리는 필드는 호출 전 값이 그대로 남는다).
export const TACTIC_PRESETS: TacticPreset[] = [
  {
    id: "gegenpressing",
    nameKo: "게겐프레싱",
    descKo: "공을 뺏기자마자 곧바로 다시 강하게 압박해 되찾는 전술",
    values: {
      pressing: 3, line: 3, attacking: 3, tempo: 3,
      buildup: "balanced", width: "wide", marking: "zonal",
      lineSpacing: 1, possession: 2, transitionSpeed: 3,
    },
  },
  {
    id: "high_press",
    nameKo: "하이프레싱",
    descKo: "높은 라인과 짧은 패스로 상대 진영에서부터 압박하는 전술",
    values: {
      pressing: 3, line: 3, attacking: 3, tempo: 3,
      buildup: "short", width: "wide", marking: "zonal",
      lineSpacing: 1, possession: 3, transitionSpeed: 3,
    },
  },
  {
    id: "mid_block",
    nameKo: "미드블록",
    descKo: "중원에 조직적인 블록을 세우고 안정적으로 대응하는 전술",
    values: {
      pressing: 2, line: 2, attacking: 2, tempo: 2,
      buildup: "balanced", width: "balanced", marking: "zonal",
      lineSpacing: 1, possession: 2, transitionSpeed: 2,
    },
  },
  {
    id: "low_block",
    nameKo: "로우블록",
    descKo: "수비 라인을 내려 골문 앞을 단단히 걸어잠그는 전술",
    values: {
      pressing: 1, line: 1, attacking: 1, tempo: 1,
      buildup: "direct", width: "narrow", marking: "man",
      lineSpacing: 3, possession: 1, transitionSpeed: 1,
    },
  },
  {
    id: "tiki_taka",
    nameKo: "티키타카",
    descKo: "짧은 패스로 점유율을 지배하며 경기를 조율하는 전술",
    values: {
      pressing: 2, line: 3, attacking: 2, tempo: 2,
      buildup: "short", width: "balanced", marking: "zonal",
      lineSpacing: 1, possession: 3, transitionSpeed: 1,
    },
  },
  {
    id: "counter_attack",
    nameKo: "카운터어택",
    descKo: "물러서 있다가 볼을 따내면 빠르게 역습을 노리는 전술",
    values: {
      pressing: 1, line: 1, attacking: 2, tempo: 1,
      buildup: "direct", width: "wide", marking: "balanced",
      lineSpacing: 3, possession: 1, transitionSpeed: 3,
    },
  },
  {
    id: "direct_football",
    nameKo: "다이렉트풋볼",
    descKo: "롱볼로 공격 전개를 단순화해 빠르게 골문을 노리는 전술",
    values: {
      pressing: 2, line: 2, attacking: 3, tempo: 3,
      buildup: "direct", width: "wide", marking: "balanced",
      lineSpacing: 2, possession: 1, transitionSpeed: 3,
    },
  },
];
