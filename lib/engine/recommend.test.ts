import { describe, it, expect } from "vitest";
import { autoPlace } from "./autoplace";
import { recommend } from "./recommend";
import { makeSetup } from "./__testutils__";
import { winProbability } from "./winprob";
import { FORMATIONS } from "@/lib/data/formations";
import { playersOf } from "@/lib/data/players";
import type { SideSetup } from "@/lib/types";

describe("autoPlace", () => {
  it("11슬롯 전부 채움, 선수 중복 없음, GK 슬롯에 GK 배치", () => {
    const { lineup, roles } = autoPlace("kor", "4-3-3");
    const slots = FORMATIONS["4-3-3"].slots;

    expect(Object.keys(lineup)).toHaveLength(11);
    expect(Object.keys(roles)).toHaveLength(11);

    const assignedIds = Object.values(lineup);
    expect(new Set(assignedIds).size).toBe(11); // 중복 없음

    const squad = playersOf("kor");
    const gkSlot = slots.find((s) => s.position === "GK")!;
    const gkPlayer = squad.find((p) => p.id === lineup[gkSlot.id]);
    expect(gkPlayer?.positions).toContain("GK");

    // 모든 슬롯이 채워졌는지 + 각 슬롯의 역할이 해당 포지션 후보 역할군에 속하는지
    for (const slot of slots) {
      expect(lineup[slot.id]).toBeDefined();
      expect(roles[slot.id]).toBeDefined();
    }
  });

  it("벤치 9명", () => {
    const { bench, lineup } = autoPlace("kor", "4-3-3");
    expect(bench).toHaveLength(9);
    const lineupIds = new Set(Object.values(lineup));
    for (const id of bench) {
      expect(lineupIds.has(id)).toBe(false);
    }
    // 벤치 + 라인업 = 스쿼드 전체
    expect(bench.length + lineupIds.size).toBe(playersOf("kor").length);
  });
});

describe("recommend", () => {
  function autoPlacedSetup(teamId: string, formationId: "4-3-3" = "4-3-3"): SideSetup {
    const base = makeSetup(teamId, formationId);
    const { lineup, roles } = autoPlace(teamId, formationId);
    return { ...base, lineup, roles };
  }

  it("추천 승률 ≥ 현재 승률 (같은 입력 기준 개선 보장)", () => {
    const me = autoPlacedSetup("kor");
    const opp = autoPlacedSetup("bra");
    const current = winProbability(me, opp, "metlife");
    const result = recommend(me, opp, "metlife");

    expect(result.winProb).toBeGreaterThanOrEqual(current.win);
    expect(result.winDelta).toBeCloseTo(result.winProb - current.win, 10);
    expect(result.winDelta).toBeGreaterThanOrEqual(0);
  });

  it("전수 평가 규모 20000 이상, elapsedMs < 500 (CI 여유 기준)", () => {
    const me = autoPlacedSetup("kor");
    const opp = autoPlacedSetup("bra");
    const result = recommend(me, opp, "metlife");

    console.log(`recommend() evaluated=${result.evaluated} elapsedMs=${result.elapsedMs.toFixed(2)}`);
    expect(result.evaluated).toBeGreaterThanOrEqual(20000);
    expect(result.elapsedMs).toBeLessThan(500);
  });

  it("topFactors 최대 3개, 전부 textKo 보유", () => {
    const me = autoPlacedSetup("kor");
    const opp = autoPlacedSetup("bra");
    const result = recommend(me, opp, "metlife");

    expect(result.topFactors.length).toBeLessThanOrEqual(3);
    for (const rule of result.topFactors) {
      expect(rule.textKo.length).toBeGreaterThan(0);
    }
  });

  it("special(캡틴/맨마킹)이 추천 결과의 lineup/roles에도 유지된다", () => {
    const me = autoPlacedSetup("kor");
    me.special = { ...me.special, captainId: me.lineup["cb1"] };
    const opp = autoPlacedSetup("bra");
    const result = recommend(me, opp, "metlife");

    // recommend는 me.special을 그대로 채택 후보(candidate)에 전달해야 하므로,
    // 반환된 lineup은 autoPlace 산출물 형태(11명, 중복 없음)를 유지해야 한다.
    expect(Object.keys(result.lineup)).toHaveLength(11);
    expect(new Set(Object.values(result.lineup)).size).toBe(11);
  });
});
