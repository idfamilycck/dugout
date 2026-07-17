import { FORMATIONS } from "@/lib/data/formations";
import { DEFAULT_ROLE, ROLES } from "@/lib/data/roles";
import { playersOf } from "@/lib/data/players";
import type { Player, Position, RoleId, SideSetup } from "@/lib/types";

const ADJACENT: Record<Position, Position[]> = {
  GK: [],
  CB: ["FB", "DM"],
  FB: ["CB", "WG"],
  DM: ["CB", "CM"],
  CM: ["DM", "AM"],
  AM: ["CM", "WG", "ST"],
  WG: ["FB", "AM", "ST"],
  ST: ["AM", "WG"],
};

const PEAK_AGE: Record<Position, number> = {
  GK: 31,
  CB: 29,
  FB: 27,
  DM: 27,
  CM: 27,
  AM: 27,
  WG: 26,
  ST: 26,
};

export function positionFitness(player: Player, slotPos: Position): number {
  const playerIsGK = player.positions.includes("GK");
  const slotIsGK = slotPos === "GK";
  if (playerIsGK !== slotIsGK) return 0.25;

  const primary = player.positions[0];
  if (primary === slotPos) return 1.0;
  if (player.positions.includes(slotPos)) return 0.9;
  if (ADJACENT[primary]?.includes(slotPos)) return 0.75;
  return 0.5;
}

export function ageMultiplier(age: number, pos: Position): number {
  const peak = PEAK_AGE[pos];
  return Math.max(0.78, 1 - 0.006 * Math.pow(Math.abs(age - peak), 1.35));
}

function attrValue(player: Player, key: string): number {
  if (key === "aerial" || key === "setPiece" || key === "mental") {
    return player[key];
  }
  return player.attrs[key as keyof Player["attrs"]];
}

export function playerContribution(
  player: Player,
  slotPos: Position,
  role?: RoleId,
  staminaPct = 1
): number {
  const resolvedRole = ROLES[role ?? DEFAULT_ROLE[slotPos]];
  let weighted = 0;
  for (const [key, weight] of Object.entries(resolvedRole.weights)) {
    if (weight === undefined) continue;
    weighted += weight * attrValue(player, key);
  }
  const fitness = positionFitness(player, slotPos);
  const ageMult = ageMultiplier(player.age, slotPos);
  const staminaFactor = 0.6 + 0.4 * staminaPct;
  return weighted * fitness * ageMult * staminaFactor;
}

export interface LineStrengths {
  gk: number;
  def: number;
  mid: number;
  att: number;
}

function lineOf(pos: Position): keyof LineStrengths {
  if (pos === "GK") return "gk";
  if (pos === "CB" || pos === "FB") return "def";
  if (pos === "DM" || pos === "CM" || pos === "AM") return "mid";
  return "att"; // WG, ST
}

export function lineStrengths(side: SideSetup, opp?: SideSetup): LineStrengths {
  const formation = FORMATIONS[side.instructions.formation];
  const squad = playersOf(side.teamId);
  const sums: LineStrengths = { gk: 0, def: 0, mid: 0, att: 0 };
  const counts: LineStrengths = { gk: 0, def: 0, mid: 0, att: 0 };

  for (const slot of formation.slots) {
    const playerId = side.lineup[slot.id];
    const player = squad.find((p) => p.id === playerId);
    if (!player) continue;

    const roleId = side.roles[slot.id] ?? DEFAULT_ROLE[slot.position];
    const role = ROLES[roleId];
    let contribution = playerContribution(player, slot.position, roleId, 1);

    // 맨마킹: 상대(opp)가 이 선수를 타깃으로 지정한 경우 기여도 감소
    if (opp?.special?.manMark && opp.special.manMark.targetId === player.id) {
      contribution *= 0.69;
    }

    const own = lineOf(slot.position);
    let toOwn = contribution;
    let toAtt = 0;
    let toMid = 0;

    if (own === "def" || own === "mid") {
      if (role.attackBias > 0) {
        toAtt = contribution * role.attackBias;
        toOwn = contribution - toAtt;
      }
    } else if (own === "att") {
      if (role.attackBias < 0) {
        toMid = contribution * Math.abs(role.attackBias);
        toOwn = contribution - toMid;
      }
    }

    // 맨마킹: 우리 마커의 공격 기여 감소 (GK는 영향 없음)
    if (side.special?.manMark && side.special.manMark.markerId === player.id) {
      if (own === "att") {
        toOwn *= 0.92;
      } else {
        toAtt *= 0.92;
      }
    }

    sums[own] += toOwn;
    counts[own]++;
    if (toAtt > 0) sums.att += toAtt;
    if (toMid > 0) sums.mid += toMid;
  }

  return {
    gk: counts.gk ? sums.gk / counts.gk : 0,
    def: counts.def ? sums.def / counts.def : 0,
    mid: counts.mid ? sums.mid / counts.mid : 0,
    att: counts.att ? sums.att / counts.att : 0,
  };
}
