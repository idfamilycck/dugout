// ENGINE_CONSTANTS: λ(기대 득점) 계산과 슈팅 후 골 확률에 쓰이는 매직넘버를 한
// 곳에 모은 튜닝 지점. Task 10(밸런싱 몬테카를로 검증)이 lib/engine/balance.test.ts의
// 4개 통계 임계값(선호팀 승률/평균 총득점/블로아웃 비율/무승부 비율)을 통과시키기
// 위해 이 객체의 값만 조정한다 — winprob.ts/match.ts의 계산식 구조 자체는 그대로다.
// 값을 바꾸면 두 모듈의 동작이 일관되게 바뀌므로, 튜닝은 반드시 이 파일에서만 한다.
export const ENGINE_CONSTANTS = {
  // λ_me = LAMBDA_BASE × (attack/defense)^LAMBDA_ELASTICITY × modMult × eloMult,
  // 이후 [LAMBDA_MIN, LAMBDA_MAX]로 clamp (lib/engine/winprob.ts의 lambdasFromParts)
  LAMBDA_BASE: 1.35,
  LAMBDA_ELASTICITY: 1.6,
  LAMBDA_MIN: 0.2,
  LAMBDA_MAX: 4.0,

  // eloMult(myElo, oppElo) = 1 + clamp(myElo-oppElo, -ELO_DIFF_CAP, ELO_DIFF_CAP) / ELO_DIFF_CAP × ELO_MULT_COEF
  ELO_DIFF_CAP: 400,
  ELO_MULT_COEF: 0.1,

  // 슈팅 후 골 확률 = clamp(GOAL_PROB_BASE + (contribution - attAvg) / GOAL_PROB_DIVISOR, GOAL_PROB_MIN, GOAL_PROB_MAX)
  // (lib/engine/match.ts의 processChance)
  GOAL_PROB_BASE: 0.3,
  GOAL_PROB_DIVISOR: 300,
  GOAL_PROB_MIN: 0.03,
  GOAL_PROB_MAX: 0.95,
} as const;
