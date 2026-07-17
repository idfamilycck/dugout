// ln(k!)는 outcomeProbs의 이중 루프(a,b 각 0..30)에서 k당 수백~수천 번 재요청되므로,
// 매번 O(k) 루프로 재계산하지 않고 모듈 전역에 한 번 채운 누적합 캐시를 조회한다(O(1)).
// 캐시는 지금까지 요청된 최대 n까지만 채워지며(지연 확장), 결과값은 기존 loop 구현과
// 수학적으로 동일하다(부동소수점 합산 순서까지 동일 — 캐시도 앞에서부터 누적).
const LN_FACTORIAL_CACHE: number[] = [0]; // ln(0!) = ln(1) = 0

function lnFactorial(n: number): number {
  while (LN_FACTORIAL_CACHE.length <= n) {
    const i = LN_FACTORIAL_CACHE.length;
    LN_FACTORIAL_CACHE.push(LN_FACTORIAL_CACHE[i - 1] + Math.log(i));
  }
  return LN_FACTORIAL_CACHE[n];
}

export function poissonPmf(lambda: number, k: number): number {
  // exp(-lambda + k*ln(lambda) - lnFactorial(k))
  return Math.exp(-lambda + k * Math.log(lambda) - lnFactorial(k));
}

export function outcomeProbs(
  lambdaA: number,
  lambdaB: number
): { win: number; draw: number; loss: number } {
  let win = 0;
  let draw = 0;
  let loss = 0;

  // pB(b)는 바깥쪽 a 루프와 무관하므로 안쪽 루프마다 재계산하지 않고 한 번만
  // 채워서 재사용한다(31회 계산 → 961회 재사용). win/draw/loss 합산 결과는
  // 이전 구현과 수학적으로 동일하다.
  const pBs: number[] = [];
  for (let b = 0; b <= 30; b++) pBs.push(poissonPmf(lambdaB, b));

  // Double loop: k=0..30 for both sides to capture tail probability
  for (let a = 0; a <= 30; a++) {
    const pA = poissonPmf(lambdaA, a);
    for (let b = 0; b <= 30; b++) {
      const prob = pA * pBs[b];

      if (a > b) {
        win += prob;
      } else if (a === b) {
        draw += prob;
      } else {
        loss += prob;
      }
    }
  }

  return { win, draw, loss };
}
