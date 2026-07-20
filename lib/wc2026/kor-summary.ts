// lib/wc2026/kor-summary.ts
//
// "대한민국은 어느 조에서 어떻게 됐나" 한 줄 요약을 만드는 순수 계산.
// /tournament의 사용자는 한국인이고, 12개 조 순위표를 훑기 전에 가장 먼저 궁금한 것이
// 이것이다. 그래서 이 요약을 히어로 바로 아래 최상단에 놓는다.
//
// 진출 여부는 순위(상위 2팀)로 추정하지 않는다. 2026 대회는 각 조 3위 중 성적 상위
// 8팀도 32강에 오르므로 순위만으로는 판정할 수 없다. 대신 "KOR이 실제로 토너먼트
// 경기를 뛰었는가"라는 데이터 상의 사실로 판정한다 - 추정이 아니라 관측이다.

import type { Wc2026Match, Wc2026Round } from "@/lib/wc2026/types";
import type { GroupRow } from "@/lib/wc2026/standings";

// 3·4위전은 4강에서 진 팀이 뛴다. 4강과 같은 깊이로 두면 어느 쪽이 먼저 스캔되는지에
// 따라 라벨이 흔들리므로, 실제로 치른 마지막 경기가 이기도록 반 단계 위에 둔다.
const ROUND_DEPTH: Record<Wc2026Round, number> = {
  group: 0,
  r32: 1,
  r16: 2,
  qf: 3,
  sf: 4,
  third: 4.5,
  final: 5,
};

export interface KorSummary {
  /** 소속 조 문자(A~L). */
  group: string;
  /** 조 내 순위(1-based). */
  rank: number;
  /** 그 조 순위표의 KOR 행 그대로. */
  row: GroupRow;
  /** 조별리그를 통과했는가. 토너먼트 경기 출전 여부로 판정한다. */
  advanced: boolean;
  /** 실제로 치른 가장 깊은 라운드. 진출하지 못했으면 "group". */
  finishRound: Wc2026Round;
}

export function korSummary(
  matches: Wc2026Match[],
  standings: Record<string, GroupRow[]>,
): KorSummary | undefined {
  for (const [group, rows] of Object.entries(standings)) {
    const rank = rows.findIndex((r) => r.code === "KOR");
    if (rank < 0) continue;

    let finishRound: Wc2026Round = "group";
    for (const m of matches) {
      if (m.home !== "KOR" && m.away !== "KOR") continue;
      if (ROUND_DEPTH[m.round] > ROUND_DEPTH[finishRound]) finishRound = m.round;
    }

    return {
      group,
      rank: rank + 1,
      row: rows[rank],
      advanced: finishRound !== "group",
      finishRound,
    };
  }
  return undefined;
}
