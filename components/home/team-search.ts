// 팀 검색 매칭(순수 함수).
//
// 데이터의 공식 국가명과 사람들이 실제로 치는 이름이 다른 경우가 있어 별칭을 둔다.
// 이게 없으면 "한국"으로 검색했을 때 0건이 나온다(데이터상 이름은 "대한민국").

import type { Team } from "@/lib/types";

/** 흔히 쓰는 줄임말 -> 데이터상 공식 이름. */
export const SEARCH_ALIASES: Record<string, string> = {
  한국: "대한민국",
  남한: "대한민국",
  남아공: "남아프리카공화국",
  보스니아: "보스니아 헤르체고비나",
  헤르체고비나: "보스니아 헤르체고비나",
  네델란드: "네덜란드",
  화란: "네덜란드",
  코디: "코트디부아르",
};

/**
 * 팀이 검색어에 걸리는가. 한글 이름, 3글자 국가 코드, 별칭 모두로 찾을 수 있다.
 * 별칭은 앞부분만 쳐도 걸린다("한" -> 한국 -> 대한민국).
 */
export function matchesQuery(t: Team, rawQuery: string): boolean {
  const q = rawQuery.trim().toLowerCase();
  if (!q) return true;

  if (t.nameKo.toLowerCase().includes(q)) return true;
  if (t.code.toLowerCase().includes(q)) return true;

  for (const [alias, official] of Object.entries(SEARCH_ALIASES)) {
    if (t.nameKo !== official) continue;
    if (alias.toLowerCase().startsWith(q) || alias.toLowerCase().includes(q)) return true;
  }
  return false;
}
