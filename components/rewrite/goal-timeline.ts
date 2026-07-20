// 복기(rewrite) 골 타임라인 대조 — 순수 함수, React/스토어 비의존.
//
// compare.ts가 "최종 스코어 대 최종 스코어"만 비교하는 데 비해, 여기서는 실제 경기의
// 골 타임라인과 내 시뮬레이션의 골 타임라인을 같은 시간 구간 위에서 대조한다.
//
// 구간 정의(중요): (takeoverMinute, throughMinute]
//   - takeoverMinute 이전(및 그 분 자체)은 유저가 개입할 수 없었던 구간이다.
//     lib/engine/rewrite.ts의 fromRealState가 minute <= takeoverMinute인 실제 이벤트를
//     시작 스코어에 이미 반영해 두므로, 그 골들은 "내가 막았다/못 막았다"의 대상이
//     아니다. 따라서 대조는 minute > takeoverMinute 부터 시작한다.
//   - 상한은 기본 90분(정규시간). compare.ts와 같은 이유로 연장전 이벤트는 제외한다.
//     rewriteContext.endMinute(전반전/후반전 프리셋)이 있으면 그 값을 넘기면 된다.
//
// 데이터 제약: 실제 이벤트에는 분/종류/팀코드/선수 이름만 있다. 슛 위치·어시스트·xG는
// 없으므로 문장은 이 네 가지로만 만든다.

import type { Wc2026Match } from "@/lib/wc2026/types";

// 실제 경기에서 이 구간에 기록된 골 하나.
export interface RealGoal {
  minute: number;
  playerName: string;
  ownGoal: boolean; // 자책골로 발생한 득점인가(문장에서 "골" 대신 "자책골"로 부른다)
}

// 시뮬레이션 이벤트의 구조적 최소 형태. lib/engine/match.ts의 MatchEvent가 그대로
// 대입되지만(type이 더 좁은 유니온, side가 동일), 엔진 타입에 의존하지 않아 테스트에서
// 리터럴만으로 호출할 수 있다.
export interface SimGoalEvent {
  minute: number;
  type: string;
  side: "me" | "opp";
}

export interface GoalTimeline {
  fromMinute: number; // 이 분 "초과"부터 비교 (= takeoverMinute)
  toMinute: number; // 이 분 "이하"까지 비교 (기본 90)
  realConceded: RealGoal[]; // 실제로 이 구간에 내가 내준 실점
  realScored: RealGoal[]; // 실제로 이 구간에 내가 넣은 골
  myConceded: number; // 내 시뮬에서의 실점 수
  myScored: number; // 내 시뮬에서의 득점 수
  concededDelta: number; // myConceded - realConceded.length (음수면 실점을 줄임)
  scoredDelta: number; // myScored - realScored.length (양수면 득점을 늘림)
  linesKo: string[]; // 요약 문장(최소 1개)
}

// 한 골을 문장 안에서 인용하는 조각. 예: "62분 Harry Kane의 골"
function citeGoal(goal: RealGoal): string {
  return `${goal.minute}분 ${goal.playerName}의 ${goal.ownGoal ? "자책골" : "골"}`;
}

// 실점에 대한 한 문장. 실제 실점 목록(real)과 내 실점 수(mine)를 대조한다.
function concededLine(real: RealGoal[], mine: number): string {
  const rc = real.length;
  if (rc === 0 && mine === 0) return "실제로도, 당신도 이 구간을 무실점으로 지켰습니다.";
  if (rc === 0) return `실제로는 없던 실점을 ${mine}골 내줬습니다.`;

  const cite = citeGoal(real[0]);
  if (mine === 0) {
    return rc === 1
      ? `실제로는 ${cite}로 1실점 하던 구간을 무실점으로 막았습니다.`
      : `실제 ${cite}을 포함해 ${rc}실점 하던 구간을 무실점으로 막았습니다.`;
  }
  if (mine < rc) {
    return `실제 ${cite}을 포함해 ${rc}실점 하던 구간을 ${mine}실점으로 줄였습니다.`;
  }
  if (mine > rc) {
    return `실제로는 ${rc}실점 하던 구간에서 ${mine}실점 했습니다.`;
  }
  return `실제와 같은 ${rc}실점이었습니다.`;
}

// 득점에 대한 한 문장.
function scoredLine(real: RealGoal[], mine: number): string {
  const rs = real.length;
  if (rs === 0 && mine === 0) return "양쪽 모두 이 구간에서 득점은 없었습니다.";
  if (rs === 0) return `실제로는 없던 득점을 ${mine}골 만들어냈습니다.`;

  const cite = citeGoal(real[0]);
  if (mine === 0) {
    return rs === 1
      ? `실제로는 ${cite}로 1골을 넣던 구간에서 득점하지 못했습니다.`
      : `실제 ${cite}을 포함해 ${rs}골 넣던 구간에서 득점하지 못했습니다.`;
  }
  if (mine > rs) {
    return `실제 ${rs}골이던 구간에서 ${mine}골을 넣었습니다.`;
  }
  if (mine < rs) {
    return `실제 ${cite}을 포함해 ${rs}골 넣던 구간에서 ${mine}골에 그쳤습니다.`;
  }
  return `실제와 같은 ${rs}득점이었습니다.`;
}

export function buildGoalTimeline(
  match: Wc2026Match,
  side: string,
  simEvents: readonly SimGoalEvent[],
  takeoverMinute: number,
  throughMinute = 90
): GoalTimeline {
  const opponent = side === match.home ? match.away : match.home;

  const realScored: RealGoal[] = [];
  const realConceded: RealGoal[] = [];

  for (const ev of match.events) {
    if (ev.minute <= takeoverMinute || ev.minute > throughMinute) continue;
    // own_goal.teamCode는 "자기 골문에 넣은 팀"이라 득점은 상대에 가산된다
    // (compare.ts의 realRegulationScore와 동일한 규칙).
    if (ev.type === "goal" || ev.type === "pen_goal") {
      const entry: RealGoal = { minute: ev.minute, playerName: ev.playerName, ownGoal: false };
      if (ev.teamCode === side) realScored.push(entry);
      else if (ev.teamCode === opponent) realConceded.push(entry);
    } else if (ev.type === "own_goal") {
      const entry: RealGoal = { minute: ev.minute, playerName: ev.playerName, ownGoal: true };
      if (ev.teamCode === side) realConceded.push(entry);
      else if (ev.teamCode === opponent) realScored.push(entry);
    }
  }

  realScored.sort((a, b) => a.minute - b.minute);
  realConceded.sort((a, b) => a.minute - b.minute);

  let myScored = 0;
  let myConceded = 0;
  for (const ev of simEvents) {
    if (ev.type !== "goal") continue;
    if (ev.minute <= takeoverMinute || ev.minute > throughMinute) continue;
    if (ev.side === "me") myScored += 1;
    else myConceded += 1;
  }

  const concededDelta = myConceded - realConceded.length;
  const scoredDelta = myScored - realScored.length;

  // 득실 양쪽 모두 실제와 같으면 문장을 둘로 늘려봐야 같은 말의 반복이라 한 줄로 묶는다.
  const linesKo =
    concededDelta === 0 && scoredDelta === 0
      ? ["실제와 같은 흐름이었습니다."]
      : [concededLine(realConceded, myConceded), scoredLine(realScored, myScored)];

  return {
    fromMinute: takeoverMinute,
    toMinute: throughMinute,
    realConceded,
    realScored,
    myConceded,
    myScored,
    concededDelta,
    scoredDelta,
    linesKo,
  };
}
