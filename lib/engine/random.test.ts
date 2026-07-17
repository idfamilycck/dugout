import { describe, it, expect } from "vitest";
import { createRng, createRngFrom } from "./random";
import { outcomeProbs, poissonPmf } from "./poisson";

describe("rng", () => {
  it("같은 시드 → 같은 수열", () => {
    const a = createRng(42), b = createRng(42);
    for (let i = 0; i < 100; i++) expect(a.next()).toBe(b.next());
  });
  it("state로 중단 지점 복원 가능", () => {
    const a = createRng(7); a.next(); a.next();
    const b = createRngFrom(a.state());
    expect(b.next()).toBe(a.next());
  });
});

describe("poisson", () => {
  it("pmf 합 ≈ 1", () => {
    let s = 0; for (let k = 0; k <= 30; k++) s += poissonPmf(1.5, k);
    expect(Math.abs(s - 1)).toBeLessThan(1e-6);
  });
  it("승+무+패 = 1, λ 우위 팀의 승률이 더 높다", () => {
    const p = outcomeProbs(2.0, 1.0);
    expect(Math.abs(p.win + p.draw + p.loss - 1)).toBeLessThan(1e-6);
    expect(p.win).toBeGreaterThan(p.loss);
  });
  it("λ 동일이면 win ≈ loss", () => {
    const p = outcomeProbs(1.3, 1.3);
    expect(Math.abs(p.win - p.loss)).toBeLessThan(1e-9);
  });
});
