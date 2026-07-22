// components/tournament/team-display.ts
//
// wc 팀 코드 → 표시용 한국어 이름/배지 색상. MatchBrowser.tsx/MomentCards.tsx의
// teamDisplay()와 같은 폴백 규칙(미등록 시 코드 텍스트 + 회색)을 공유한다 —
// registerWc2026()이 아직 끝나지 않은 극초반 렌더에도 안전하게 만든다.

import { wc2026TeamId } from "@/lib/wc2026/data";
import { teamById } from "@/lib/data/teams";

export interface TeamDisplay {
  nameKo: string;
  color1: string;
  color2: string;
}

export function teamDisplay(code: string): TeamDisplay {
  const team = teamById(wc2026TeamId(code));
  return {
    nameKo: team?.nameKo ?? code,
    color1: team?.color1 ?? "#666666",
    color2: team?.color2 ?? "#cccccc",
  };
}
