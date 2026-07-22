// lib/wc2026/data.ts
//
// Thin read-only accessors over the WC2026 raw JSON dataset
// (data/wc2026/matches.json). No mutation, no registration side effects —
// that lives in lib/wc2026/register.ts.
//
// wc2026Matches/wc2026MatchById/wc2026TeamId are re-exported from the leaf
// module lib/wc2026/source.ts (no imports back from here), which is what
// keeps this file and register.ts from importing each other.

import type { Team } from "@/lib/types";
import { registerWc2026 } from "@/lib/wc2026/register";
import { teamById } from "@/lib/data/teams";
import teamsJson from "@/data/wc2026/teams.json";

export { wc2026Matches, wc2026MatchById, wc2026TeamId } from "@/lib/wc2026/source";

interface Wc2026TeamRow {
  code: string;
  id: string;
  nameKo: string;
  elo: number;
  finishRound: string;
}

const ALL_TEAM_ROWS = teamsJson as Wc2026TeamRow[];

// 실제 2026 월드컵 48개국을 engine Team[]로 돌려준다. registerWc2026()이 아직 안
// 돌았어도(예: 이 함수를 가장 먼저 호출하는 진입점) 여기서 한 번 더 호출해 보장한다
// (idempotent). ELO 내림차순으로 정렬해 그리드 맨 앞에 강팀이 오도록 한다.
export function wc2026TeamList(): Team[] {
  registerWc2026();
  return ALL_TEAM_ROWS
    .map((row) => teamById(row.id))
    .filter((t): t is Team => t !== undefined)
    .sort((a, b) => b.elo - a.elo);
}
