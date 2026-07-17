function lnFactorial(n: number): number {
  let sum = 0;
  for (let i = 2; i <= n; i++) {
    sum += Math.log(i);
  }
  return sum;
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

  // Double loop: k=0..30 for both sides to capture tail probability
  for (let a = 0; a <= 30; a++) {
    const pA = poissonPmf(lambdaA, a);
    for (let b = 0; b <= 30; b++) {
      const pB = poissonPmf(lambdaB, b);
      const prob = pA * pB;

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
