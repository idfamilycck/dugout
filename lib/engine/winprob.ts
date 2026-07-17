import { teamById } from "@/lib/data/teams";
import { venueById } from "@/lib/data/venues";
import { h2hOf } from "@/lib/data/h2h";
import { lineStrengths, type LineStrengths } from "./strength";
import { outcomeProbs } from "./poisson";
import { applyModifiers, type AppliedRule, type ModifierResult } from "./modifiers";
import type { SideSetup } from "@/lib/types";

function clamp(v: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, v));
}

function eloMult(myElo: number, oppElo: number): number {
  const diff = clamp(myElo - oppElo, -400, 400);
  return 1 + (diff / 400) * 0.1;
}

export interface LambdaResult {
  lambdaMe: number;
  lambdaOpp: number;
  rulesMe: AppliedRule[];
  rulesOpp: AppliedRule[];
  lines: { me: LineStrengths; opp: LineStrengths };
  staminaFlags: { me: ModifierResult["staminaFlags"]; opp: ModifierResult["staminaFlags"] };
}

export function computeLambdas(me: SideSetup, opp: SideSetup, venueId: string): LambdaResult {
  const venue = venueById(venueId);
  if (!venue) throw new Error(`unknown venue: ${venueId}`);
  const meTeam = teamById(me.teamId);
  const oppTeam = teamById(opp.teamId);
  if (!meTeam) throw new Error(`unknown team: ${me.teamId}`);
  if (!oppTeam) throw new Error(`unknown team: ${opp.teamId}`);

  // h2hOf는 호출자가 넘긴 (a, b) 순서에 맞춰 winA/winB를 정규화해 돌려준다.
  // rulesMe에는 (me, opp) 순서, rulesOpp에는 (opp, me) 순서로 각각 넘겨야
  // h2h_edge 규칙이 "나 기준" 승수 비교를 올바르게 할 수 있다.
  const h2hMe = h2hOf(me.teamId, opp.teamId);
  const h2hOpp = h2hOf(opp.teamId, me.teamId);

  const meLines = lineStrengths(me, opp);
  const oppLines = lineStrengths(opp, me);

  const modMe = applyModifiers(me, opp, venue, meTeam, oppTeam, h2hMe);
  const modOpp = applyModifiers(opp, me, venue, oppTeam, meTeam, h2hOpp);

  // myAtt: 나의 공격 종합력 (att 55% + mid 35% + def 10%)
  const myAtt = 0.55 * meLines.att + 0.35 * meLines.mid + 0.1 * meLines.def;
  // oppDef: 상대 수비 종합력 (def 50% + mid 30% + gk 20%)
  const oppDef = 0.5 * oppLines.def + 0.3 * oppLines.mid + 0.2 * oppLines.gk;
  const oppAtt = 0.55 * oppLines.att + 0.35 * oppLines.mid + 0.1 * oppLines.def;
  const meDef = 0.5 * meLines.def + 0.3 * meLines.mid + 0.2 * meLines.gk;

  // defenseMult 방향성 (중요):
  // λ_me = ... × attackMult_me / defenseMult_opp × eloMult_me
  // → "상대"의 defenseMult가 λ_me의 분모로 들어간다. 즉 상대 수비가 보정으로
  //   강화되면(defenseMult_opp > 1) 내 λ가 줄고, 상대 수비가 약화되면
  //   (defenseMult_opp < 1, 예: 상대의 high_line_vs_pace 리스크) 내 λ가 늘어난다.
  // 대칭적으로 λ_opp는 "나"의 defenseMult를 분모로 사용한다.
  const lambdaMe = clamp(
    1.35 *
      Math.pow(myAtt / oppDef, 1.6) *
      (modMe.attackMult / modOpp.defenseMult) *
      eloMult(meTeam.elo, oppTeam.elo),
    0.2,
    4.0
  );
  const lambdaOpp = clamp(
    1.35 *
      Math.pow(oppAtt / meDef, 1.6) *
      (modOpp.attackMult / modMe.defenseMult) *
      eloMult(oppTeam.elo, meTeam.elo),
    0.2,
    4.0
  );

  return {
    lambdaMe,
    lambdaOpp,
    rulesMe: modMe.rules,
    rulesOpp: modOpp.rules,
    lines: { me: meLines, opp: oppLines },
    staminaFlags: { me: modMe.staminaFlags, opp: modOpp.staminaFlags },
  };
}

export function winProbability(
  me: SideSetup,
  opp: SideSetup,
  venueId: string
): { win: number; draw: number; loss: number; lambdaMe: number; lambdaOpp: number; rules: AppliedRule[] } {
  const { lambdaMe, lambdaOpp, rulesMe } = computeLambdas(me, opp, venueId);
  const { win, draw, loss } = outcomeProbs(lambdaMe, lambdaOpp);
  return { win, draw, loss, lambdaMe, lambdaOpp, rules: rulesMe };
}
