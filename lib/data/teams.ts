import type { Team } from "@/lib/types";

export const TEAMS: Team[] = [
  { id: "bra", nameKo: "브라질", code: "BRA", elo: 2050, fifaRank: 3, form: 8, styleTags: ["개인기", "역습"], color1: "#FFDF00", color2: "#009C3B" },
  { id: "arg", nameKo: "아르헨티나", code: "ARG", elo: 2060, fifaRank: 1, form: 9, styleTags: ["점유", "역습"], color1: "#75AADB", color2: "#FFFFFF" },
  { id: "fra", nameKo: "프랑스", code: "FRA", elo: 2040, fifaRank: 2, form: 8, styleTags: ["역습", "피지컬"], color1: "#002395", color2: "#ED2939" },
  { id: "esp", nameKo: "스페인", code: "ESP", elo: 2020, fifaRank: 4, form: 9, styleTags: ["티키타카", "점유"], color1: "#AA151B", color2: "#F1BF00" },
  { id: "eng", nameKo: "잉글랜드", code: "ENG", elo: 1960, fifaRank: 5, form: 7, styleTags: ["피지컬", "세트피스"], color1: "#FFFFFF", color2: "#CE1124" },
  { id: "por", nameKo: "포르투갈", code: "POR", elo: 1950, fifaRank: 6, form: 8, styleTags: ["역습", "개인기"], color1: "#FF0000", color2: "#006600" },
  { id: "ger", nameKo: "독일", code: "GER", elo: 1940, fifaRank: 7, form: 7, styleTags: ["압박", "조직력"], color1: "#000000", color2: "#DD0000" },
  { id: "ned", nameKo: "네덜란드", code: "NED", elo: 1920, fifaRank: 8, form: 7, styleTags: ["압박", "점유"], color1: "#FF6600", color2: "#FFFFFF" },
  { id: "ita", nameKo: "이탈리아", code: "ITA", elo: 1900, fifaRank: 9, form: 6, styleTags: ["수비조직", "역습"], color1: "#0066CC", color2: "#FFFFFF" },
  { id: "bel", nameKo: "벨기에", code: "BEL", elo: 1880, fifaRank: 10, form: 6, styleTags: ["역습", "피지컬"], color1: "#ED2939", color2: "#000000" },
  { id: "cro", nameKo: "크로아티아", code: "CRO", elo: 1860, fifaRank: 11, form: 7, styleTags: ["중원장악", "투쟁심"], color1: "#FF0000", color2: "#FFFFFF" },
  { id: "mar", nameKo: "모로코", code: "MAR", elo: 1820, fifaRank: 13, form: 8, styleTags: ["역습", "수비조직"], color1: "#C1272D", color2: "#006233" },
  { id: "jpn", nameKo: "일본", code: "JPN", elo: 1780, fifaRank: 17, form: 7, styleTags: ["조직력", "빠른전개"], color1: "#000080", color2: "#FFFFFF" },
  { id: "kor", nameKo: "대한민국", code: "KOR", elo: 1760, fifaRank: 22, form: 7, styleTags: ["빠른전환", "투쟁심"], color1: "#C60C30", color2: "#003478" },
  { id: "usa", nameKo: "미국", code: "USA", elo: 1740, fifaRank: 14, form: 6, styleTags: ["피지컬", "역습"], color1: "#B22234", color2: "#3C3B6E" },
  { id: "mex", nameKo: "멕시코", code: "MEX", elo: 1710, fifaRank: 15, form: 6, styleTags: ["점유", "개인기"], color1: "#006847", color2: "#CE1126" },
];

// 런타임 등록 레지스트리(예: WC2026 로더). teamById는 이 레지스트리를 먼저
// 확인하고, 없으면 기존 TEAMS 배열로 폴백한다. 기존 팀(kor/bra 등)의 동작은
// 변경되지 않는다.
const extraTeams: Record<string, Team> = {};

export function registerTeam(team: Team): void {
  extraTeams[team.id] = team;
}

export function teamById(id: string): Team | undefined {
  return extraTeams[id] ?? TEAMS.find((t) => t.id === id);
}
