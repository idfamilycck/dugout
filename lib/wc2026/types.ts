export type Wc2026Round =
  | "group" | "r32" | "r16" | "qf" | "sf" | "third" | "final";
export interface Wc2026Event {
  minute: number;            // 정규 분(90'+는 90 유지, extra는 별도 플래그)
  type: "goal" | "own_goal" | "pen_goal" | "sub" | "yellow" | "red";
  teamCode: string;          // "KOR" - own_goal의 경우 자책골을 넣은(자기 골문에 넣은) 팀 코드이며 득점은 상대 팀에 가산됨
  playerId: string;          // wc 선수 id
  playerName: string;
  relatedPlayerId?: string;  // sub의 out 선수, 골 어시스트는 미사용
}
export interface Wc2026Lineup {
  teamCode: string;
  starters: Array<{ playerId: string; name: string; position: string }>;
  bench: Array<{ playerId: string; name: string; position: string }>;
}
export interface Wc2026Match {
  id: string;
  round: Wc2026Round;
  group?: string;            // "A"~"L" (조별만)
  home: string; away: string;// 팀 코드
  scoreHome: number; scoreAway: number; // 정규+연장(승부차기 제외)
  penHome?: number; penAway?: number;    // 승부차기 있으면
  venueKo: string;
  kickoffISO: string;
  events: Wc2026Event[];     // minute 오름차순
  lineups: [Wc2026Lineup, Wc2026Lineup];
  excluded?: boolean;        // 정합성 실패 시 true
}
