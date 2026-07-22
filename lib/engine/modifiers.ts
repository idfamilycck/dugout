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
  oppAttDribblingAvg: number;
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

// attPaceAvg와 동일한 att라인(WG/ST) 평균 산식이되, pace 대신 dribbling을 집계한다.
// man_marking_scheme 규칙("맨마킹이 개인기 있는 드리블러에게는 뚫린다")의 조건에
// 쓰인다 — instructions.marking(수비방식 UI 토글)이 아직 어떤 규칙에서도 읽히지
// 않아 사장돼 있던 것을 이 규칙으로 살린다.
function attDribblingAvg(side: SideSetup, squad: Player[], formation: Formation): number {
  const slots = formation.slots.filter((s) => s.position === "WG" || s.position === "ST");
  const vals = slots
    .map((s) => playerAt(side, squad, s.id)?.attrs.dribbling)
    .filter((v): v is number => v !== undefined);
  if (!vals.length) return 0;
  return vals.reduce((a, b) => a + b, 0) / vals.length;
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

// export: recommend.ts(23,328개 전술 조합 전수 탐색)가 포메이션당 1회만 이 함수를 호출해
// lineup/스쿼드에서 파생되는 값들(meAttPaceAvg 등, TeamInstructions와 무관)을 캐시해 두고,
// 콤보마다는 evaluateModifiers()만 반복 호출하도록 buildCtx/evaluateModifiers를 분리했다
// (원래는 applyModifiers 내부에 인라인되어 있었다). applyModifiers의 동작은 동일하다.
export function buildCtx(
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
    oppAttDribblingAvg: attDribblingAvg(opp, oppSquad, oppFormation),
  };
}

function offsideTrapIsRisk(ctx: RuleCtx): boolean {
  return ctx.oppAttPaceAvg > 82;
}

// 23개 보정 규칙. 각 규칙은 me 시점 조건(when)을 평가하고, 발동 시
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
    id: "man_marking_scheme",
    // instructions.marking(수비방식: 지역방어/맨마킹 UI 토글)은 이 규칙이 추가되기
    // 전까지 어떤 규칙도 읽지 않는 사장된 값이었다. man_marking_fatigue(위)는
    // special.manMark(특정 1인 전담 마크 지정)를 보는 별개 메커니즘이라 서로
    // 독립적으로 발동할 수 있다.
    when: (ctx) => ctx.me.instructions.marking === "man",
    effect: (ctx) => (ctx.oppAttDribblingAvg >= 78 ? { da: 0, dd: -0.03 } : { da: 0, dd: 0.02 }),
    textKo: (ctx) =>
      ctx.oppAttDribblingAvg >= 78
        ? "🧲 맨마킹, 상대의 뛰어난 개인기에 뚫릴 위험이 있습니다 −3%"
        : "🧲 맨마킹으로 상대 공격을 밀착 봉쇄합니다 +2%",
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
  {
    id: "tempo_fatigue_risk",
    // tempo_stamina의 반대급부. match.ts의 실시간 시뮬레이션은 highTempo일 때 체력
    // 소모율을 1.15배로 늘리지만(decayOnPitch), recommend()가 쓰는 사전 승률 계산은
    // 그 라이브 로직을 안 거치므로 여기서 별도 규칙으로 "90분 동안 유지되는 빠른
    // 템포의 체력 대가"를 근사한다. da +3%와 대칭으로 맞춰(dd −3%) 빠른 템포가
    // 상대와 무관하게 항상 이득인 공짜 보너스가 되지 않도록 한다.
    when: (ctx) => ctx.me.instructions.tempo === 3,
    effect: () => ({ da: 0, dd: -0.03 }),
    textKo: () => "🥵 빠른 템포가 후반으로 갈수록 체력을 갉아먹습니다 −3%",
    icon: () => "🥵",
  },
  {
    id: "compact_line_solidity",
    // 압축은 공짜 보너스가 아니다: 수비 조직력을 얻는 만큼 라인 사이 공간이 좁아져
    // 공격 전개 폭을 그대로 희생한다(da −4% / dd +4%, 1:1 등가교환). defenseMult는
    // 상대 λ를, attackMult는 내 λ를 움직이는 구조라 크기를 맞추지 않으면 한쪽이
    // 항상 이겨 lineSpacing=1이 상대와 무관하게 최선이 되어버린다(winprob.ts 참고).
    // 1:1로 맞춰두면 실제로 유리한지는 두 팀의 λ 곡률(전력차)에 따라 매치업마다 달라진다.
    when: (ctx) => ctx.me.instructions.lineSpacing === 1,
    effect: () => ({ da: -0.04, dd: 0.04 }),
    textKo: () => "🧱 압축된 라인 간격, 수비는 단단해지지만 공격 전개 공간을 그만큼 내줍니다 (수비+4%/공격−4%)",
    icon: () => "🧱",
  },
  {
    id: "spread_line_gaps",
    when: (ctx) => ctx.me.instructions.lineSpacing === 3 && ctx.oppAttDribblingAvg >= 78,
    effect: () => ({ da: 0, dd: -0.05 }),
    textKo: () => "⚠ 벌어진 라인 사이 공간을 상대의 개인기가 파고듭니다 −5%",
    icon: () => "⚠️",
  },
  {
    id: "spread_line_space",
    // 분산 라인의 반대급부: 빠른 공격진을 보유했을 때만 벌어진 공간을 실제로
    // 활용할 수 있다(팀 구성에 좌우되는 상황부 보너스, 압축의 무조건 보너스와 대비).
    when: (ctx) => ctx.me.instructions.lineSpacing === 3 && ctx.meAttPaceAvg >= 78,
    effect: () => ({ da: 0.04, dd: 0 }),
    textKo: () => "↔ 벌어진 라인 간격의 공간을 빠른 공격진이 파고듭니다 +4%",
    icon: () => "↔️",
  },
  {
    id: "possession_control",
    when: (ctx) => ctx.me.instructions.possession === 3 && ctx.me.instructions.buildup === "short",
    effect: () => ({ da: 0.05, dd: 0 }),
    textKo: () => "⚽ 높은 점유율 지향과 짧은 빌드업이 경기를 지배합니다 +5%",
    icon: () => "⚽",
  },
  {
    id: "possession_press_risk",
    // 상대 압박이 "상"일 때만 걸리면 기본값(중)인 대부분의 매치업에서 전혀 발동하지
    // 않아 possession_control(+5%)이 사실상 무조건 이득이 되어버린다. "중" 이상으로
    // 넓히고, "중"(기본값) 상대에게는 possession_control의 +5%를 거의 상쇄하는 −5%를
    // 줘서 평범한 상대에게는 순효과가 거의 0(매치업별 λ 곡률에 따라 갈림)이 되도록,
    // "상" 상대에게는 순수 손해(−7%)가 되도록 한다.
    when: (ctx) => ctx.me.instructions.possession === 3 && ctx.opp.instructions.pressing >= 2,
    effect: (ctx) => (ctx.opp.instructions.pressing === 3 ? { da: 0, dd: -0.07 } : { da: 0, dd: -0.05 }),
    textKo: (ctx) =>
      ctx.opp.instructions.pressing === 3
        ? "⚠ 높은 점유율 지향이 상대의 강한 압박에 위험해집니다 −7%"
        : "⚠ 높은 점유율 지향이 상대의 압박에 위험해집니다 −5%",
    icon: () => "⚠️",
  },
  {
    id: "fast_transition_exploit",
    when: (ctx) => ctx.me.instructions.transitionSpeed === 3 && ctx.opp.instructions.line === 3,
    effect: () => ({ da: 0.06, dd: 0 }),
    textKo: () => "🚀 빠른 전환이 상대의 높은 라인 뒷공간을 순식간에 노립니다 +6%",
    icon: () => "🚀",
  },
  {
    id: "slow_transition_control",
    when: (ctx) => ctx.me.instructions.transitionSpeed === 1 && ctx.me.instructions.possession === 3,
    effect: () => ({ da: 0, dd: 0.03 }),
    textKo: () => "🐢 느린 전환으로 안정적인 점유를 유지합니다 +3%",
    icon: () => "🐢",
  },
];

// export: buildCtx와 짝을 이루는 규칙 평가 단계만 분리한 함수. RuleCtx를 이미 갖고 있는
// 호출자(recommend.ts)는 이 함수만 반복 호출해 buildCtx의 파생값 재계산을 피할 수 있다.
export function evaluateModifiers(ctx: RuleCtx): ModifierResult {
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
      altitude: ctx.venue.altitude > 1500,
      heat: ctx.venue.avgTempC >= 30 && !ctx.venue.dome,
      highTempo: ctx.me.instructions.tempo === 3,
      highPress: ctx.me.instructions.pressing === 3,
    },
  };
}

export function applyModifiers(
  me: SideSetup,
  opp: SideSetup,
  venue: Venue,
  meTeam: Team,
  oppTeam: Team,
  h2h?: HeadToHead
): ModifierResult {
  return evaluateModifiers(buildCtx(me, opp, venue, meTeam, oppTeam, h2h));
}
