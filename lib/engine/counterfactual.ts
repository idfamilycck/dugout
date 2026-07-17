import { runFullMatch, type Intervention, type MatchState } from "./match";

export interface CfDelta {
  intervention: Intervention;
  probDelta: number;
}

export interface CfResult {
  baseline: MatchState;
  deltas: CfDelta[];
  scoreDiffText: string;
}

function resultWord(scoreMe: number, scoreOpp: number): string {
  if (scoreMe > scoreOpp) return "승리";
  if (scoreMe === scoreOpp) return "무승부";
  return "패배";
}

function buildScoreDiffText(original: MatchState, baseline: MatchState): string {
  const actual = `실제 ${original.scoreMe}-${original.scoreOpp} ${resultWord(original.scoreMe, original.scoreOpp)}`;
  const base = `무개입 시뮬레이션 ${baseline.scoreMe}-${baseline.scoreOpp} ${resultWord(baseline.scoreMe, baseline.scoreOpp)}`;
  return `${actual} · ${base}`;
}

// counterfactual: "이 개입들이 없었다면?"을 재현한다.
// baseline = 원 경기와 동일한 초기 라인업(initialMe/initialOpp)·venue·seed로 개입 없이
// 처음부터 다시 시뮬레이션한 경기. 개입 시점 이후로는 RNG 소비 경로 자체가 갈라지므로
// (다른 확률 → 다른 분기 → 이후 rng.next() 호출 횟수까지 달라짐) 원 경기와 baseline의
// probTimeline 길이가 다를 수 있다 — 델타 평균은 항상 "양쪽에 다 존재하는 분"만 쓴다.
export function counterfactual(original: MatchState): CfResult {
  const baseline = runFullMatch(
    original.initialMe,
    original.initialOpp,
    original.venueId,
    original.seed,
    []
  );

  const baseWinByMinute = new Map(baseline.probTimeline.map((p) => [p.minute, p.win]));

  const deltas: CfDelta[] = original.interventions.map((iv) => {
    const diffs: number[] = [];
    // minute === iv.minute도 창에 포함된다 — 개입 시점 그 자체의 샘플은 baseWin과
    // 항상 동일한 win 값을 참조하므로(구조상) diff가 정확히 0이 되어 평균을 소폭
    // 희석시킨다(개입 직후부터만 세는 strictly-after 방식보다 delta 크기가 작아짐).
    // 의도된 동작이며 버그가 아니다.
    for (const { minute, win } of original.probTimeline) {
      if (minute < iv.minute) continue;
      const baseWin = baseWinByMinute.get(minute);
      if (baseWin === undefined) continue;
      diffs.push(win - baseWin);
    }
    const probDelta = diffs.length > 0 ? diffs.reduce((a, b) => a + b, 0) / diffs.length : 0;
    return { intervention: iv, probDelta };
  });

  return { baseline, deltas, scoreDiffText: buildScoreDiffText(original, baseline) };
}
