import { describe, it, expect, beforeAll } from "vitest";
import { runFullMatch } from "./match";
import { computeLambdas } from "./winprob";
import { autoPlace } from "./autoplace";
import { ENGINE_CONSTANTS } from "./constants";
import { TEAMS } from "@/lib/data/teams";
import type { SideSetup, SpecialInstructions, TeamInstructions } from "@/lib/types";

// 브리프(task-10-brief.md) 지정 기본 전술: 16개 팀 전원에게 동일한 기본
// TeamInstructions/SpecialInstructions를 적용해 "전술 차이"가 아니라 "팀/선수단
// 능력치+ELO 차이"만으로 벌어지는 결과 분포를 측정한다.
const DEFAULT_INSTRUCTIONS: TeamInstructions = {
  formation: "4-3-3",
  pressing: 2,
  line: 2,
  attacking: 2,
  tempo: 2,
  buildup: "short",
  focus: "center",
  width: "wide",
  marking: "zonal",
  offsideTrap: false,
};
const DEFAULT_SPECIAL: SpecialInstructions = { ckBigMenForward: false };

// autoPlace(lib/engine/autoplace.ts)를 사용한다 — lib/engine/__testutils__.ts의
// makeSetup은 슬롯마다 DEFAULT_ROLE 고정 하에 그리디로 선수만 고르는 반면,
// autoPlace는 슬롯마다 (선수 × 해당 포지션의 후보 역할) 조합까지 함께 최적화해
// 더 현실적인 "각 팀의 실제 베스트 라인업" 기본값을 만든다. 16개 팀 x 1회만
// 계산하면 되므로 beforeAll 밖(모듈 로드 시점)에서 한 번만 만들어 재사용한다.
function autoSetup(teamId: string): SideSetup {
  const { lineup, roles } = autoPlace(teamId, "4-3-3");
  return {
    teamId,
    lineup,
    roles,
    instructions: { ...DEFAULT_INSTRUCTIONS },
    special: { ...DEFAULT_SPECIAL },
  };
}

const SETUPS = new Map<string, SideSetup>(TEAMS.map((t) => [t.id, autoSetup(t.id)]));

// SEEDS_PER_MATCHUP: 브리프는 20을 지정한다. 4800회(16×15 매치업 × 20시드)
// runFullMatch를 beforeAll 한 번에 모아 실행한 실측 wall time은 약 4~5초로
// 120s 타임아웃에 크게 여유가 있어(테스트 파일 자체 소요 시간 기준) 20을 그대로
// 유지한다 — 브리프가 축소를 "120s 초과 시에만" 허용했기 때문에 초과하지 않는 한
// 축소하지 않는다.
const SEEDS_PER_MATCHUP = 20;

interface MatchResult {
  meId: string;
  oppId: string;
  eloDiff: number; // me.elo - opp.elo
  scoreMe: number;
  scoreOpp: number;
  // 킥오프 시점 분석적 λ_me+λ_opp (computeLambdas). 시드와 무관 — 같은 매치업의
  // 20개 시드 결과는 모두 동일한 값을 공유한다 (λ는 라인업/전술/venue에만
  // 의존, RNG 시드에 의존하지 않음). REALIZED_GOAL_CALIBRATION 회귀 검증용.
  analyticLambdaSum: number;
}

// 16×15=240개 순서쌍(ordered matchup) × 20시드 = 4800회 runFullMatch를 이 배열
// 하나에 모아둔다. 4개의 it()이 전부 이 배열만 읽고 재시뮬레이션하지 않는다
// (브리프의 "Collect once in a beforeAll... do NOT re-simulate per assertion" 요구).
let results: MatchResult[] = [];

beforeAll(() => {
  const collected: MatchResult[] = [];
  for (const a of TEAMS) {
    for (const b of TEAMS) {
      if (a.id === b.id) continue;
      const me = SETUPS.get(a.id)!;
      const opp = SETUPS.get(b.id)!;
      // λ는 시드와 무관(라인업/전술/venue에만 의존)하므로 매치업당 한 번만 계산해
      // 20개 시드 각각의 결과 행에 동일한 값을 붙인다 (재시뮬레이션 아님).
      const { lambdaMe, lambdaOpp } = computeLambdas(me, opp, "metlife");
      const analyticLambdaSum = lambdaMe + lambdaOpp;
      for (let seed = 1; seed <= SEEDS_PER_MATCHUP; seed++) {
        const state = runFullMatch(me, opp, "metlife", seed);
        collected.push({
          meId: a.id,
          oppId: b.id,
          eloDiff: a.elo - b.elo,
          scoreMe: state.scoreMe,
          scoreOpp: state.scoreOpp,
          analyticLambdaSum,
        });
      }
    }
  }
  results = collected;
}, 120_000);

describe(
  "balance sanity (Monte Carlo)",
  () => {
    it("ELO 150+ 우위 매치업의 평균 승률(승부차기 제외 승/전체)이 55%~90%", () => {
      const favored = results.filter((r) => r.eloDiff >= 150);
      expect(favored.length).toBeGreaterThan(0);
      const winRate = favored.filter((r) => r.scoreMe > r.scoreOpp).length / favored.length;
      expect(winRate).toBeGreaterThanOrEqual(0.55);
      expect(winRate).toBeLessThanOrEqual(0.9);
    });

    it("전체 경기 평균 총득점이 1.8~3.6골", () => {
      expect(results.length).toBeGreaterThan(0);
      const avgGoals =
        results.reduce((sum, r) => sum + r.scoreMe + r.scoreOpp, 0) / results.length;
      expect(avgGoals).toBeGreaterThanOrEqual(1.8);
      expect(avgGoals).toBeLessThanOrEqual(3.6);
    });

    it("한 경기 5골차 이상 빈도 < 4%", () => {
      const blowouts = results.filter((r) => Math.abs(r.scoreMe - r.scoreOpp) >= 5).length;
      expect(blowouts / results.length).toBeLessThan(0.04);
    });

    it("무승부 비율 15%~35%", () => {
      const draws = results.filter((r) => r.scoreMe === r.scoreOpp).length / results.length;
      expect(draws).toBeGreaterThanOrEqual(0.15);
      expect(draws).toBeLessThanOrEqual(0.35);
    });

    // REALIZED_GOAL_CALIBRATION(lib/engine/constants.ts) 회귀 검증: 실시간 승률
    // 그래프(probTimeline)가 참조하는 이 상수는 "실현 총득점 평균 ÷ 킥오프 분석적
    // λ_me+λ_opp 평균" 비율의 실측값(도출 당시 ≈1.1188)을 반올림한 것이다. 이후
    // CHANCE_RATE_SCALE/SHOT_CONVERSION_PROB/GOAL_PROB_* 등을 재튜닝해 이 비율이
    // 크게 벌어지면(±0.15 밖) 실시간 그래프가 실제 시뮬레이션 득점 페이스와
    // 어긋나게 되므로, 그 시점에 이 상수도 함께 재도출해야 함을 여기서 잡아낸다.
    it("실현 총득점/킥오프 분석적 λ합 비율이 REALIZED_GOAL_CALIBRATION ±0.15 이내", () => {
      const avgGoals =
        results.reduce((sum, r) => sum + r.scoreMe + r.scoreOpp, 0) / results.length;
      const avgAnalyticLambdaSum =
        results.reduce((sum, r) => sum + r.analyticLambdaSum, 0) / results.length;
      const realizedOverAnalytic = avgGoals / avgAnalyticLambdaSum;
      expect(Math.abs(realizedOverAnalytic - ENGINE_CONSTANTS.REALIZED_GOAL_CALIBRATION)).toBeLessThan(
        0.15
      );
    });
  },
  120_000
);
