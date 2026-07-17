import { playersOf } from "@/lib/data/players";
import { FORMATIONS } from "@/lib/data/formations";
import { DEFAULT_ROLE } from "@/lib/data/roles";
import { playerContribution } from "./strength";
import type {
  FormationId,
  Player,
  RoleId,
  SideSetup,
  SpecialInstructions,
  TeamInstructions,
} from "@/lib/types";

const DEFAULT_INSTRUCTIONS: TeamInstructions = {
  formation: "4-3-3",
  pressing: 2,
  line: 2,
  attacking: 2,
  tempo: 2,
  buildup: "short",
  focus: "center",
  width: "wide",
  marking: "zonal",
  offsideTrap: false,
};

const DEFAULT_SPECIAL: SpecialInstructions = { ckBigMenForward: false };

// 헬퍼: DEFAULT_ROLE·능력치순 그리디로 SideSetup 구성 (strength.test.ts의 makeSetup과 동일한
// 방식이지만, instructions/special을 오버라이드할 수 있도록 확장했다)
export function makeSetup(
  teamId: string,
  formationId: FormationId = "4-3-3",
  instructions: Partial<TeamInstructions> = {},
  special: Partial<SpecialInstructions> = {}
): SideSetup {
  const squad = playersOf(teamId);
  const formation = FORMATIONS[formationId];
  const used = new Set<string>();
  const lineup: Record<string, string> = {};
  const roles: Record<string, RoleId> = {};

  for (const slot of formation.slots) {
    let best: Player | undefined;
    let bestScore = -Infinity;
    for (const p of squad) {
      if (used.has(p.id)) continue;
      const role = DEFAULT_ROLE[slot.position];
      const score = playerContribution(p, slot.position, role, 1);
      if (score > bestScore) {
        bestScore = score;
        best = p;
      }
    }
    if (!best) continue;
    used.add(best.id);
    lineup[slot.id] = best.id;
    roles[slot.id] = DEFAULT_ROLE[slot.position];
  }

  return {
    teamId,
    lineup,
    roles,
    instructions: { ...DEFAULT_INSTRUCTIONS, formation: formationId, ...instructions },
    special: { ...DEFAULT_SPECIAL, ...special },
  };
}
