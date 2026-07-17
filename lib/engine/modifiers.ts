import { FORMATIONS } from "@/lib/data/formations";
import { playersOf } from "@/lib/data/players";
import { playerContribution } from "./strength";
import type { Formation, HeadToHead, Player, SideSetup, Team, Venue } from "@/lib/types";

export interface AppliedRule {
  id: string;
  textKo: string;
  deltaAttack: number;
  deltaDefense: number;
  icon: string;
}

export interface ModifierResult {
  rules: AppliedRule[];
  attackMult: number;
  defenseMult: number;
  staminaFlags: {
    altitude: boolean;
    heat: boolean;
    highTempo: boolean;
    highPress: boolean;
  };
}

// RULE_DEFS는 항상 "me" 시점으로 평가된다: 조건은 me/opp의 지시사항을 보고,
// 효과(deltaAttack/deltaDefense)는 me의 공격력/수비력에 곱해질 보정치(-1)다.
// applyModifiers(me, opp, ...)와 applyModifiers(opp, me, ...)를 각각 호출해
// 양 팀의 ModifierResult를 얻는다 (winprob.ts의 computeLambdas 참고).
export interface RuleCtx {
  me: SideSetup;
  opp: SideSetup;
  venue: Venue;
  meTeam: Team;
  oppTeam: Team;
  h2h?: HeadToHead;
  meSquad: Player[];
  oppSquad: Player[];
  meFormation: Formation;
  oppFormation: Formation;
  meAttPaceAvg: number;
  oppAttPaceAvg: number;
  oppDefContribAvg: number;
  oppFbLContrib: number | null;
  oppFbRContrib: number | null;
}

interface RuleDef {
  id: string;
  when: (ctx: RuleCtx) => boolean;
  effect: (ctx: RuleCtx) => { da: number; dd: number };
  textKo: (ctx: RuleCtx) => string;
  icon: (ctx: RuleCtx) => string;
}

function playerAt(side: SideSetup, squad: Player[], slotId: string): Player | undefined {
  const playerId = side.lineup[slotId];
  return squad.find((p) => p.id === playerId);
}

function slotContribution(
  side: SideSetup,
  squad: Player[],
  formation: Formation,
  slotId: string
): number {
  const slot = formation.slots.find((s) => s.id === slotId);
  if (!slot) return 0;
  const player = playerAt(side, squad, slotId);
  if (!player) return 0;
  const role = side.roles[slotId];
  return playerContribution(player, slot.position, role, 1);
}

function attPaceAvg(side: SideSetup, squad: Player[], formation: Formation): number {
  const slots = formation.slots.filter((s) => s.position === "WG" || s.position === "ST");
  const paces = slots
    .map((s) => playerAt(side, squad, s.id)?.attrs.pace)
    .filter((v): v is number => v !== undefined);
  if (!paces.length) return 0;
  return paces.reduce((a, b) => a + b, 0) / paces.length;
}

function defContribAvg(side: SideSetup, squad: Player[], formation: Formation): number {
  const slots = formation.slots.filter((s) => s.position === "CB" || s.position === "FB");
  const vals = slots.map((s) => slotContribution(side, squad, formation, s.id));
  if (!vals.length) return 0;
  return vals.reduce((a, b) => a + b, 0) / vals.length;
}

// 특정 측(좌/우)에 배치된 FB 슬롯 중 기여도가 가장 낮은 값을 반환한다.
// 해당 측에 FB 슬롯이 없으면 null (규칙 미발동 처리용).
function fbContribBySuffix(
  side: SideSetup,
  squad: Player[],
  formation: Formation,
  suffix: "_l" | "_r"
): number | null {
  const candidates = formation.slots.filter((s) => s.position === "FB" && s.id.endsWith(suffix));
  if (!candidates.length) return null;
  let weakest: number | null = null;
  for (const slot of candidates) {
    const c = slotContribution(side, squad, formation, slot.id);
    if (weakest === null || c < weakest) weakest = c;
  }
  return weakest;
}

function buildCtx(
  me: SideSetup,
  opp: SideSetup,
  venue: Venue,
  meTeam: Team,
  oppTeam: Team,
  h2h?: HeadToHead
): RuleCtx {
  const meSquad = playersOf(me.teamId);
  const oppSquad = playersOf(opp.teamId);
  const meFormation = FORMATIONS[me.instructions.formation];
  const oppFormation = FORMATIONS[opp.instructions.formation];
  return {
    me,
    opp,
    venue,
    meTeam,
    oppTeam,
    h2h,
    meSquad,
    oppSquad,
    meFormation,
    oppFormation,
    meAttPaceAvg: attPaceAvg(me, meSquad, meFormation),
    oppAttPaceAvg: attPaceAvg(opp, oppSquad, oppFormation),
    oppDefContribAvg: defContribAvg(opp, oppSquad, oppFormation),
    oppFbLContrib: fbContribBySuffix(opp, oppSquad, oppFormation, "_l"),
    oppFbRContrib: fbContribBySuffix(opp, oppSquad, oppFormation, "_r"),
  };
}

function offsideTrapIsRisk(ctx: RuleCtx): boolean {
  return ctx.oppAttPaceAvg > 82;
}

// 14개 보정 규칙. 각 규칙은 me 시점 조건(when)을 평가하고, 발동 시
// deltaAttack/deltaDefense(effect)와 근거 카드 문구(textKo)를 만든다.
export const RULE_DEFS: RuleDef[] = [
  {
    id: "high_line_vs_pace",
    when: (ctx) => ctx.me.instructions.line === 3 && ctx.oppAttPaceAvg > 80,
    effect: () => ({ da: 0, dd: -0.08 }),
    textKo: () => "⚠ 높은 라인, 상대 스피드에 배후가 뚫릴 수 있어요 −8%",
    icon: () => "⚠️",
  },
  {
    id: "direct_targetman",
    when: (ctx) =>
      ctx.me.instructions.buildup === "direct" &&
      ctx.meFormation.slots
        .filter((s) => s.position === "ST")
        .some((s) => ctx.me.roles[s.id] === "st_target"),
    effect: () => ({ da: 0.06, dd: 0 }),
    textKo: () => "🎯 롱볼과 타겟맨 조합, 상대 배후를 노립니다 +6%",
    icon: () => "🎯",
  },
  {
    id: "short_vs_press",
    when: (ctx) => ctx.me.instructions.buildup === "short" && ctx.opp.instructions.pressing === 3,
    effect: () => ({ da: -0.05, dd: 0 }),
    textKo: () => "🔒 짧은 빌드업이 상대의 강한 압박에 막힙니다 −5%",
    icon: () => "🔒",
  },
  {
    id: "focus_vs_weakflank",
    when: (ctx) => {
      const focus = ctx.me.instructions.focus;
      if (focus === "center") return false;
      // focus=left → 내가 공략하는 쪽은 상대의 오른쪽(fb_r), focus=right → 상대의 왼쪽(fb_l)
      const target = focus === "left" ? ctx.oppFbRContrib : ctx.oppFbLContrib;
      if (target === null) return false;
      return target < ctx.oppDefContribAvg * 0.93;
    },
    effect: () => ({ da: 0.07, dd: 0 }),
    textKo: (ctx) => {
      const side = ctx.me.instructions.focus === "left" ? "오른쪽" : "왼쪽";
      return `🎯 상대 ${side} 측면이 약점입니다 +7%`;
    },
    icon: () => "🎯",
  },
  {
    id: "wide_vs_narrow",
    when: (ctx) => {
      const mw = ctx.me.instructions.width;
      const ow = ctx.opp.instructions.width;
      return (mw === "wide" && ow === "narrow") || (mw === "narrow" && ow === "wide");
    },
    effect: (ctx) =>
      ctx.me.instructions.width === "wide" ? { da: 0.03, dd: 0 } : { da: -0.03, dd: 0 },
    textKo: (ctx) =>
      ctx.me.instructions.width === "wide"
        ? "↔ 넓은 폭 공격이 상대의 좁은 수비 사이 공간을 벌립니다 +3%"
        : "↔ 좁은 폭이 상대의 넓은 수비 조직에 고립됩니다 −3%",
    icon: () => "↔️",
  },
  {
    id: "counter_style",
    when: (ctx) => ctx.me.instructions.attacking === 1 && ctx.opp.instructions.line === 3,
    effect: () => ({ da: 0.06, dd: 0 }),
    textKo: () => "⚡ 상대의 높은 라인 뒤 공간을 역습으로 노립니다 +6%",
    icon: () => "⚡",
  },
  {
    id: "offside_trap",
    // 기획 문서상 "상대 deltaAttack −4%"로 명시되어 있으나, 본 엔진은 규칙을 항상
    // me 시점(자신의 deltaAttack/deltaDefense)으로 평가하므로 상대 공격력을
    // 직접 낮추는 대신 동등한 효과인 "자신의 deltaDefense +0.04"로 구현했다.
    when: (ctx) => ctx.me.instructions.offsideTrap === true,
    effect: (ctx) => (offsideTrapIsRisk(ctx) ? { da: 0, dd: -0.05 } : { da: 0, dd: 0.04 }),
    textKo: (ctx) =>
      offsideTrapIsRisk(ctx)
        ? "⚠ 오프사이드 트랩이 상대의 스피드에 무너질 위험이 있습니다 −5%"
        : "🥅 오프사이드 트랩이 상대 공격을 무력화합니다 −4%",
    icon: (ctx) => (offsideTrapIsRisk(ctx) ? "⚠️" : "🥅"),
  },
  {
    id: "man_marking_fatigue",
    when: (ctx) => !!ctx.me.special?.manMark,
    effect: () => ({ da: 0, dd: 0.05 }),
    textKo: () => "🧲 맨마킹으로 수비 조직력이 강화됩니다 +5%",
    icon: () => "🧲",
  },
  {
    id: "altitude",
    when: (ctx) => ctx.venue.altitude > 1500 && ctx.me.instructions.pressing === 3,
    effect: () => ({ da: -0.04, dd: 0 }),
    textKo: () => "🏔 고지대, 강한 압박은 후반에 지칩니다 −4%",
    icon: () => "🏔",
  },
  {
    id: "heat",
    when: (ctx) =>
      ctx.venue.avgTempC >= 30 && !ctx.venue.dome && ctx.me.instructions.pressing === 3,
    effect: () => ({ da: -0.03, dd: 0 }),
    textKo: () => "🥵 폭염, 체력 소모가 큽니다 −3%",
    icon: () => "🥵",
  },
  {
    id: "form",
    when: (ctx) => ctx.meTeam.form >= 8 || ctx.meTeam.form <= 3,
    effect: (ctx) => (ctx.meTeam.form >= 8 ? { da: 0.03, dd: 0 } : { da: -0.03, dd: 0 }),
    textKo: (ctx) =>
      ctx.meTeam.form >= 8
        ? "🔥 물오른 폼, 경기력이 살아납니다 +3%"
        : "📉 부진한 폼이 발목을 잡습니다 −3%",
    icon: (ctx) => (ctx.meTeam.form >= 8 ? "🔥" : "📉"),
  },
  {
    id: "h2h_edge",
    // winA >= 3 최소 표본 가드는 의도적인 안티노이즈 장치다: 표본이 1~2건뿐인
    // 전적으로 "우위"를 판정하면 우연에 의한 노이즈를 규칙으로 오인할 수 있다.
    when: (ctx) => !!ctx.h2h && ctx.h2h.winA >= 3 && ctx.h2h.winA >= ctx.h2h.winB * 2,
    effect: () => ({ da: 0.02, dd: 0 }),
    textKo: () => "📊 상대 전적 우위, 심리적으로 앞서갑니다 +2%",
    icon: () => "📊",
  },
  {
    id: "captain_mental",
    when: (ctx) => {
      const captainId = ctx.me.special?.captainId;
      if (!captainId) return false;
      const captain = ctx.meSquad.find((p) => p.id === captainId);
      return !!captain && captain.mental >= 85;
    },
    effect: () => ({ da: 0, dd: 0.02 }),
    textKo: () => "🧠 강심장 주장이 수비 라인을 안정시킵니다 +2%",
    icon: () => "🧠",
  },
  {
    id: "tempo_stamina",
    when: (ctx) => ctx.me.instructions.tempo === 3,
    effect: () => ({ da: 0.03, dd: 0 }),
    textKo: () => "🏃 빠른 템포로 상대를 몰아붙입니다 +3%",
    icon: () => "🏃",
  },
];

export function applyModifiers(
  me: SideSetup,
  opp: SideSetup,
  venue: Venue,
  meTeam: Team,
  oppTeam: Team,
  h2h?: HeadToHead
): ModifierResult {
  const ctx = buildCtx(me, opp, venue, meTeam, oppTeam, h2h);
  const rules: AppliedRule[] = [];
  for (const def of RULE_DEFS) {
    if (!def.when(ctx)) continue;
    const { da, dd } = def.effect(ctx);
    rules.push({
      id: def.id,
      textKo: def.textKo(ctx),
      deltaAttack: da,
      deltaDefense: dd,
      icon: def.icon(ctx),
    });
  }
  const attackMult = rules.reduce((m, r) => m * (1 + r.deltaAttack), 1);
  const defenseMult = rules.reduce((m, r) => m * (1 + r.deltaDefense), 1);
  return {
    rules,
    attackMult,
    defenseMult,
    staminaFlags: {
      altitude: venue.altitude > 1500,
      heat: venue.avgTempC >= 30 && !venue.dome,
      highTempo: me.instructions.tempo === 3,
      highPress: me.instructions.pressing === 3,
    },
  };
}
