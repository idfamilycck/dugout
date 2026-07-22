import { describe, it, expect } from "vitest";
import { makeVirtualPlayer } from "@/lib/wc2026/players";

const base = { id: "esp_p01", teamId: "wc_esp", name: "Pedri", position: "CM", teamElo: 2020 };

describe("makeVirtualPlayer", () => {
  it("동일 입력은 동일 출력(결정론)", () => {
    expect(makeVirtualPlayer(base)).toEqual(makeVirtualPlayer(base));
  });
  it("모든 능력치가 1~99 정수", () => {
    const p = makeVirtualPlayer(base);
    for (const v of Object.values(p.attrs)) {
      expect(Number.isInteger(v)).toBe(true);
      expect(v).toBeGreaterThanOrEqual(1);
      expect(v).toBeLessThanOrEqual(99);
    }
  });
  it("GK는 goalkeeping이 높고 필드플레이어는 낮다", () => {
    const gk = makeVirtualPlayer({ ...base, position: "GK" });
    const cm = makeVirtualPlayer(base);
    expect(gk.attrs.goalkeeping).toBeGreaterThan(cm.attrs.goalkeeping);
  });
  it("팀 ELO가 높을수록 평균 능력치가 높다", () => {
    const strong = makeVirtualPlayer({ ...base, teamElo: 2050 });
    const weak = makeVirtualPlayer({ ...base, teamElo: 1500 });
    const avg = (p: ReturnType<typeof makeVirtualPlayer>) =>
      Object.values(p.attrs).reduce((a, b) => a + b, 0);
    expect(avg(strong)).toBeGreaterThan(avg(weak));
  });
});
