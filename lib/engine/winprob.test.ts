import { describe, it, expect } from "vitest";
import { makeSetup } from "./__testutils__";
import { RULE_DEFS, type RuleCtx } from "./modifiers";
import { computeLambdas, winProbability } from "./winprob";
import { teamById } from "@/lib/data/teams";
import { venueById } from "@/lib/data/venues";
import { playersOf } from "@/lib/data/players";
import { FORMATIONS } from "@/lib/data/formations";
import type { Player, SpecialInstructions, Team, TeamInstructions, Venue } from "@/lib/types";

// ---- RULE_DEFS 단위 테스트용 헬퍼 --------------------------------------
// 실제 선수단 데이터는 pace/mental/form 등이 일부 규칙의 임계값(예: mental>=85,
// form<=3)에 자연스럽게 도달하지 않으므로, 규칙 로직 자체(when/effect/textKo)를
// RuleCtx를 직접 구성해 결정론적으로 검증한다.
function baseCtx(overrides: Partial<RuleCtx> = {}): RuleCtx {
  const me = makeSetup("kor", "4-3-3");
  const opp = makeSetup("jpn", "4-3-3");
  return {
    me,
    opp,
    venue: venueById("metlife")!,
    meTeam: teamById("kor")!,
    oppTeam: teamById("jpn")!,
    h2h: undefined,
    meSquad: playersOf("kor"),
    oppSquad: playersOf("jpn"),
    meFormation: FORMATIONS["4-3-3"],
    oppFormation: FORMATIONS["4-3-3"],
    meAttPaceAvg: 70,
    oppAttPaceAvg: 70,
    oppDefContribAvg: 60,
    oppFbLContrib: 60,
    oppFbRContrib: 60,
    ...overrides,
  };
}

function withMe(
  ctx: RuleCtx,
  instr: Partial<TeamInstructions> = {},
  special: Partial<SpecialInstructions> = {}
): RuleCtx {
  return {
    ...ctx,
    me: {
      ...ctx.me,
      instructions: { ...ctx.me.instructions, ...instr },
      special: { ...ctx.me.special, ...special },
    },
  };
}

function withOpp(ctx: RuleCtx, instr: Partial<TeamInstructions> = {}): RuleCtx {
  return { ...ctx, opp: { ...ctx.opp, instructions: { ...ctx.opp.instructions, ...instr } } };
}

function findRule(id: string) {
  const rule = RULE_DEFS.find((d) => d.id === id);
  if (!rule) throw new Error(`rule not found: ${id}`);
  return rule;
}

describe("RULE_DEFS 개별 규칙", () => {
  it("high_line_vs_pace: line=3 & 상대 공격 평균 pace>80 → deltaDefense -0.08", () => {
    const rule = findRule("high_line_vs_pace");
    const fires = withMe(baseCtx({ oppAttPaceAvg: 85 }), { line: 3 });
    expect(rule.when(fires)).toBe(true);
    expect(rule.effect(fires)).toEqual({ da: 0, dd: -0.08 });
    expect(rule.textKo(fires)).toContain("−8%");

    const noFire = withMe(baseCtx({ oppAttPaceAvg: 75 }), { line: 3 });
    expect(rule.when(noFire)).toBe(false);
  });

  it("direct_targetman: buildup=direct & ST 역할=st_target → deltaAttack +0.06", () => {
    const rule = findRule("direct_targetman");
    let ctx = withMe(baseCtx(), { buildup: "direct" });
    ctx = { ...ctx, me: { ...ctx.me, roles: { ...ctx.me.roles, st: "st_target" } } };
    expect(rule.when(ctx)).toBe(true);
    expect(rule.effect(ctx)).toEqual({ da: 0.06, dd: 0 });

    const withoutTarget = withMe(baseCtx(), { buildup: "direct" });
    expect(rule.when(withoutTarget)).toBe(false);
  });

  it("short_vs_press: buildup=short & 상대 pressing=3 → deltaAttack -0.05", () => {
    const rule = findRule("short_vs_press");
    const ctx = withOpp(withMe(baseCtx(), { buildup: "short" }), { pressing: 3 });
    expect(rule.when(ctx)).toBe(true);
    expect(rule.effect(ctx)).toEqual({ da: -0.05, dd: 0 });
  });

  it("focus_vs_weakflank: focus=left → 상대 오른쪽 FB 약체 시 deltaAttack +0.07", () => {
    const rule = findRule("focus_vs_weakflank");
    const ctx = withMe(baseCtx({ oppDefContribAvg: 60, oppFbRContrib: 50, oppFbLContrib: 60 }), {
      focus: "left",
    });
    expect(rule.when(ctx)).toBe(true);
    expect(rule.effect(ctx)).toEqual({ da: 0.07, dd: 0 });
    expect(rule.textKo(ctx)).toContain("오른쪽");

    const notWeak = withMe(baseCtx({ oppDefContribAvg: 60, oppFbRContrib: 59, oppFbLContrib: 60 }), {
      focus: "left",
    });
    expect(rule.when(notWeak)).toBe(false);
  });

  it("wide_vs_narrow: 나=wide 상대=narrow → +0.03 / 나=narrow 상대=wide → -0.03", () => {
    const rule = findRule("wide_vs_narrow");
    const plus = withOpp(withMe(baseCtx(), { width: "wide" }), { width: "narrow" });
    expect(rule.when(plus)).toBe(true);
    expect(rule.effect(plus)).toEqual({ da: 0.03, dd: 0 });

    const minus = withOpp(withMe(baseCtx(), { width: "narrow" }), { width: "wide" });
    expect(rule.when(minus)).toBe(true);
    expect(rule.effect(minus)).toEqual({ da: -0.03, dd: 0 });
  });

  it("counter_style: attacking=1 & 상대 line=3 → deltaAttack +0.06", () => {
    const rule = findRule("counter_style");
    const ctx = withOpp(withMe(baseCtx(), { attacking: 1 }), { line: 3 });
    expect(rule.when(ctx)).toBe(true);
    expect(rule.effect(ctx)).toEqual({ da: 0.06, dd: 0 });
  });

  it("offside_trap: trap=true & 상대 공격 평균 pace<=82 → deltaDefense +0.04 (이득)", () => {
    const rule = findRule("offside_trap");
    const ctx = withMe(baseCtx({ oppAttPaceAvg: 78 }), { offsideTrap: true });
    expect(rule.when(ctx)).toBe(true);
    expect(rule.effect(ctx)).toEqual({ da: 0, dd: 0.04 });
  });

  it("offside_trap: trap=true & 상대 공격 평균 pace>82 → deltaDefense -0.05 (위험)", () => {
    const rule = findRule("offside_trap");
    const ctx = withMe(baseCtx({ oppAttPaceAvg: 88 }), { offsideTrap: true });
    expect(rule.when(ctx)).toBe(true);
    expect(rule.effect(ctx)).toEqual({ da: 0, dd: -0.05 });
  });

  it("man_marking_fatigue: manMark 지정 → deltaDefense +0.05", () => {
    const rule = findRule("man_marking_fatigue");
    const ctx = withMe(baseCtx(), {}, { manMark: { markerId: "kor_10", targetId: "jpn_16" } });
    expect(rule.when(ctx)).toBe(true);
    expect(rule.effect(ctx)).toEqual({ da: 0, dd: 0.05 });

    expect(rule.when(baseCtx())).toBe(false);
  });

  it("altitude: venue.altitude>1500 & pressing=3 → deltaAttack -0.04", () => {
    const rule = findRule("altitude");
    const highAltVenue: Venue = {
      id: "test-alt",
      nameKo: "테스트",
      cityKo: "테스트",
      altitude: 2000,
      avgTempC: 20,
      dome: false,
      capacity: 1000,
    };
    const ctx = { ...withMe(baseCtx(), { pressing: 3 }), venue: highAltVenue };
    expect(rule.when(ctx)).toBe(true);
    expect(rule.effect(ctx)).toEqual({ da: -0.04, dd: 0 });
  });

  it("heat: avgTempC>=30 & !dome & pressing=3 → deltaAttack -0.03", () => {
    const rule = findRule("heat");
    const hotVenue: Venue = {
      id: "test-heat",
      nameKo: "테스트",
      cityKo: "테스트",
      altitude: 100,
      avgTempC: 33,
      dome: false,
      capacity: 1000,
    };
    const ctx = { ...withMe(baseCtx(), { pressing: 3 }), venue: hotVenue };
    expect(rule.when(ctx)).toBe(true);
    expect(rule.effect(ctx)).toEqual({ da: -0.03, dd: 0 });

    const domeVenue: Venue = { ...hotVenue, id: "test-dome", dome: true };
    const domeCtx = { ...withMe(baseCtx(), { pressing: 3 }), venue: domeVenue };
    expect(rule.when(domeCtx)).toBe(false);
  });

  it("form: form>=8 → deltaAttack +0.03 / form<=3 → deltaAttack -0.03", () => {
    const rule = findRule("form");
    const hiForm: Team = { ...teamById("kor")!, form: 9 };
    const ctxHi = { ...baseCtx(), meTeam: hiForm };
    expect(rule.when(ctxHi)).toBe(true);
    expect(rule.effect(ctxHi)).toEqual({ da: 0.03, dd: 0 });

    const loForm: Team = { ...teamById("kor")!, form: 2 };
    const ctxLo = { ...baseCtx(), meTeam: loForm };
    expect(rule.when(ctxLo)).toBe(true);
    expect(rule.effect(ctxLo)).toEqual({ da: -0.03, dd: 0 });

    const midForm: Team = { ...teamById("kor")!, form: 5 };
    expect(rule.when({ ...baseCtx(), meTeam: midForm })).toBe(false);
  });

  it("h2h_edge: 한쪽 승수가 2배 이상 & 3승 이상 → deltaAttack +0.02", () => {
    const rule = findRule("h2h_edge");
    const ctx = { ...baseCtx(), h2h: { teamA: "kor", teamB: "jpn", winA: 42, draw: 23, winB: 15 } };
    expect(rule.when(ctx)).toBe(true);
    expect(rule.effect(ctx)).toEqual({ da: 0.02, dd: 0 });

    const balanced = { ...baseCtx(), h2h: { teamA: "kor", teamB: "usa", winA: 1, draw: 2, winB: 1 } };
    expect(rule.when(balanced)).toBe(false);
  });

  it("captain_mental: 주장 mental>=85 → deltaDefense +0.02", () => {
    const rule = findRule("captain_mental");
    const synthetic: Player = { ...playersOf("kor")[0], id: "test_captain_hi", mental: 90 };
    const ctxHi = withMe({ ...baseCtx(), meSquad: [...playersOf("kor"), synthetic] }, {}, {
      captainId: "test_captain_hi",
    });
    expect(rule.when(ctxHi)).toBe(true);
    expect(rule.effect(ctxHi)).toEqual({ da: 0, dd: 0.02 });

    const lowSynthetic: Player = { ...synthetic, id: "test_captain_lo", mental: 70 };
    const ctxLo = withMe({ ...baseCtx(), meSquad: [...playersOf("kor"), lowSynthetic] }, {}, {
      captainId: "test_captain_lo",
    });
    expect(rule.when(ctxLo)).toBe(false);
  });

  it("tempo_stamina: tempo=3 → deltaAttack +0.03", () => {
    const rule = findRule("tempo_stamina");
    const ctx = withMe(baseCtx(), { tempo: 3 });
    expect(rule.when(ctx)).toBe(true);
    expect(rule.effect(ctx)).toEqual({ da: 0.03, dd: 0 });
  });
});

describe("winProbability", () => {
  it("승+무+패=1", () => {
    const kor = makeSetup("kor", "4-3-3");
    const jpn = makeSetup("jpn", "4-3-3");
    const result = winProbability(kor, jpn, "metlife");
    expect(result.win + result.draw + result.loss).toBeCloseTo(1, 5);
  });

  it("ELO 최상위 bra vs 최하위 팀 승률 ≥ 60%", () => {
    // 정석적인 우세 팀의 전술(넓은 폭 공격, 역습, 오프사이드 트랩, 높은 템포)을
    // 조합하면 브라질의 스쿼드/ELO 우위가 여러 보정 규칙과 함께 누적된다.
    const bra = makeSetup("bra", "4-3-3", {
      width: "wide",
      attacking: 1,
      tempo: 3,
      offsideTrap: true,
    });
    const usa = makeSetup("usa", "4-3-3", { width: "narrow", line: 3 });
    const result = winProbability(bra, usa, "metlife");
    expect(result.win).toBeGreaterThanOrEqual(0.6);
  });

  it("고지대(azteca)에서 pressing=3 팀의 λ가 평지 대비 감소", () => {
    const me = makeSetup("kor", "4-3-3", { pressing: 3 });
    const opp = makeSetup("jpn", "4-3-3");
    const azteca = computeLambdas(me, opp, "azteca");
    const flat = computeLambdas(me, opp, "metlife");
    expect(azteca.lambdaMe).toBeLessThan(flat.lambdaMe);
  });

  it("직접 빌드업+타겟맨이 숏패스+포처보다 규칙 direct_targetman을 발동", () => {
    const direct = makeSetup("kor", "4-3-3", { buildup: "direct" });
    direct.roles["st"] = "st_target";
    const short = makeSetup("kor", "4-3-3", { buildup: "short" });
    short.roles["st"] = "st_poacher";
    const opp = makeSetup("jpn", "4-3-3");

    const rDirect = computeLambdas(direct, opp, "metlife").rulesMe;
    const rShort = computeLambdas(short, opp, "metlife").rulesMe;

    expect(rDirect.some((r) => r.id === "direct_targetman")).toBe(true);
    expect(rShort.some((r) => r.id === "direct_targetman")).toBe(false);
  });

  it("모든 AppliedRule의 textKo는 비어있지 않고 delta는 ±0.15 이내", () => {
    const matchups: [string, string, string][] = [
      ["kor", "jpn", "metlife"],
      ["bra", "usa", "azteca"],
      ["esp", "por", "monterrey"],
      ["ger", "fra", "dallas"],
    ];
    for (const [a, b, venueId] of matchups) {
      const me = makeSetup(a, "4-3-3", { line: 3, tempo: 3, pressing: 3, offsideTrap: true });
      const opp = makeSetup(b, "4-3-3", { pressing: 3 });
      const { rulesMe, rulesOpp } = computeLambdas(me, opp, venueId);
      for (const r of [...rulesMe, ...rulesOpp]) {
        expect(r.textKo.length).toBeGreaterThan(0);
        expect(Math.abs(r.deltaAttack)).toBeLessThanOrEqual(0.15);
        expect(Math.abs(r.deltaDefense)).toBeLessThanOrEqual(0.15);
      }
    }
  });
});
