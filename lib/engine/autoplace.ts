import { FORMATIONS } from "@/lib/data/formations";
import { ROLES_BY_POSITION } from "@/lib/data/roles";
import { playersOf } from "@/lib/data/players";
import { playerContribution } from "./strength";
import type { FormationId, Player, RoleId } from "@/lib/types";

export interface AutoPlaceResult {
  lineup: Record<string, string>;
  roles: Record<string, RoleId>;
  bench: string[];
}

// 그리디 자동 배치: 슬롯을 GK 먼저, 이후 포메이션 정의 순서대로 순회하며 각 슬롯에
// 대해 (아직 배정되지 않은 선수 × 해당 포지션의 후보 역할) 조합 중 playerContribution이
// 최대인 조합을 그 자리에 확정 배정한다. 슬롯 순서가 고정이므로 매 호출마다 결정적이다.
export function autoPlace(teamId: string, formation: FormationId): AutoPlaceResult {
  const squad = playersOf(teamId);
  const slots = FORMATIONS[formation].slots;
  const orderedSlots = [...slots].sort((a, b) => {
    if (a.position === "GK" && b.position !== "GK") return -1;
    if (b.position === "GK" && a.position !== "GK") return 1;
    return 0; // Array.prototype.sort는 안정 정렬이므로 GK 외에는 원래 순서를 유지
  });

  const used = new Set<string>();
  const lineup: Record<string, string> = {};
  const roles: Record<string, RoleId> = {};

  for (const slot of orderedSlots) {
    const candidateRoles = ROLES_BY_POSITION[slot.position];
    let bestPlayer: Player | undefined;
    let bestRole: RoleId | undefined;
    let bestScore = -Infinity;

    for (const player of squad) {
      if (used.has(player.id)) continue;
      for (const role of candidateRoles) {
        const score = playerContribution(player, slot.position, role, 1);
        if (score > bestScore) {
          bestScore = score;
          bestPlayer = player;
          bestRole = role;
        }
      }
    }

    if (!bestPlayer || !bestRole) continue; // 스쿼드가 11명 미만인 비정상 케이스 방어
    used.add(bestPlayer.id);
    lineup[slot.id] = bestPlayer.id;
    roles[slot.id] = bestRole;
  }

  const bench = squad.filter((p) => !used.has(p.id)).map((p) => p.id);

  return { lineup, roles, bench };
}
