// 복기(rewrite) 비교 로직 — 순수 함수, React/스토어 비의존.
//
// 실제 WC2026 경기 기록(Wc2026Match)의 "정규시간(90분 이하) 스코어"를 side 관점으로
// 집계하고, 유저가 인수한 시점부터 시뮬레이션한 나의 스코어(mine)와 승/무/패를
// 비교해 결과가 바뀌었는지·바뀐 내용을 한국어 한 문장으로 만든다.
//
// 90분까지만 보는 이유: 시뮬레이션 엔진은 정규시간(0~90')만 재생하고 연장전을
// 모델링하지 않는다. 실제 경기가 연장에 갔다면 Wc2026Match.scoreHome/Away는
// 연장 포함 최종 스코어라 시뮬레이션 결과와 비교 기준이 달라진다 — 그래서 저장된
// 최종 스코어 대신 이벤트를 minute<=90으로 걸러 정규시간 스코어를 직접 센다.

import type { Wc2026Match } from "@/lib/wc2026/types";

export interface RewriteCompare {
  realScoreKo: string; // e.g. "실제: 1 - 2 패배"
  myScoreKo: string; // e.g. "당신의 지휘: 2 - 2 무승부"
  changedOutcome: boolean; // 승패 결과가 바뀌었는가
  deltaKo: string; // e.g. "실제 패배를 무승부로 바꿨습니다"
}

export type ResultWord = "승리" | "무승부" | "패배";

export function resultWord(scored: number, against: number): ResultWord {
  if (scored > against) return "승리";
  if (scored === against) return "무승부";
  return "패배";
}

// 결과 단어의 상대적 우열(패배<무승부<승리) — "결과가 개선/악화됐는가" 판정에 쓴다.
const RESULT_RANK: Record<ResultWord, number> = { 패배: 0, 무승부: 1, 승리: 2 };
export function resultRank(word: ResultWord): number {
  return RESULT_RANK[word];
}

// realScoreKo/myScoreKo(고정 포맷 문자열)에서 결과 단어만 다시 뽑아낸다 — UI 쪽에서
// 색/톤을 정할 때 원본 숫자 없이 문구만 갖고 있어도 되도록 하는 얇은 헬퍼.
export function resultWordFromKo(scoreKo: string): ResultWord {
  if (scoreKo.includes("승리")) return "승리";
  if (scoreKo.includes("무승부")) return "무승부";
  return "패배";
}

// 한글 음절의 받침(종성) 유무 판정 — 유니코드 완성형 한글(가~힣) 범위에서
// (code - 0xAC00) % 28 === 0 이면 종성 없음.
function hasBatchim(word: string): boolean {
  const ch = word.charCodeAt(word.length - 1);
  if (ch < 0xac00 || ch > 0xd7a3) return false;
  return (ch - 0xac00) % 28 !== 0;
}

function withObjParticle(word: string): string {
  return `${word}${hasBatchim(word) ? "을" : "를"}`;
}

function withRoParticle(word: string): string {
  return `${word}${hasBatchim(word) ? "으로" : "로"}`;
}

// 실제 경기의 정규시간(90분 이하) 스코어를 side 관점으로 집계한다.
// own_goal.teamCode는 "자책골을 넣은(자기 골문에 넣은) 팀"이므로 득점은 상대에 가산한다.
function realRegulationScore(
  match: Wc2026Match,
  side: string
): { realFor: number; realAgainst: number } {
  const opponent = side === match.home ? match.away : match.home;
  let realFor = 0;
  let realAgainst = 0;
  for (const ev of match.events) {
    if (ev.minute > 90) continue;
    if (ev.type === "goal" || ev.type === "pen_goal") {
      if (ev.teamCode === side) realFor += 1;
      else if (ev.teamCode === opponent) realAgainst += 1;
    } else if (ev.type === "own_goal") {
      if (ev.teamCode === side) realAgainst += 1;
      else if (ev.teamCode === opponent) realFor += 1;
    }
  }
  return { realFor, realAgainst };
}

export function buildCompare(
  match: Wc2026Match,
  side: string,
  mine: { scoreMe: number; scoreOpp: number }
): RewriteCompare {
  const { realFor, realAgainst } = realRegulationScore(match, side);
  const realWord = resultWord(realFor, realAgainst);
  const myWord = resultWord(mine.scoreMe, mine.scoreOpp);
  const changedOutcome = realWord !== myWord;

  const realScoreKo = `실제: ${realFor} - ${realAgainst} ${realWord}`;
  const myScoreKo = `당신의 지휘: ${mine.scoreMe} - ${mine.scoreOpp} ${myWord}`;
  const deltaKo = changedOutcome
    ? `실제 ${withObjParticle(realWord)} ${withRoParticle(myWord)} 바꿨습니다`
    : `실제와 같은 ${myWord} 결과입니다`;

  return { realScoreKo, myScoreKo, changedOutcome, deltaKo };
}
