import { describe, it, expect } from "vitest";
import { simulateShootout } from "./shootout";
import { makeSetup } from "./__testutils__";
import { PLAYERS } from "@/lib/data/players";
import { FORMATIONS } from "@/lib/data/formations";
import { DEFAULT_ROLE } from "@/lib/data/roles";
import type { Player, RoleId, SideSetup, TeamInstructions } from "@/lib/types";

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

function makePlayer(id: string, teamId: string, overrides: Partial<Player> = {}): Player {
  return {
    id,
    teamId,
    name: id,
    age: 27,
    caps: 10,
    positions: ["ST"],
    attrs: {
      shooting: 60,
      passing: 60,
      dribbling: 60,
      defending: 60,
      pace: 60,
      physical: 60,
      goalkeeping: 10,
      stamina: 60,
    },
    setPiece: 60,
    aerial: 60,
    penalty: 60,
    mental: 60,
    ...overrides,
  };
}

// 골키퍼 기여도를 정확히 70으로 맞춰(goalkeeping=70, mental=70, age=31=피크나이) 두 테스트
// 팀 사이에서 GK 변수를 완전히 제거하고, 오직 키커의 pk/mental 차이만으로 승률 격차를
// 검증할 수 있게 한다.
function buildTestTeam(teamId: string, penalty: number, mental: number): SideSetup {
  const gk = makePlayer(`${teamId}_gk`, teamId, {
    positions: ["GK"],
    age: 31,
    attrs: {
      shooting: 10,
      passing: 40,
      dribbling: 20,
      defending: 30,
      pace: 40,
      physical: 60,
      goalkeeping: 70,
      stamina: 60,
    },
    penalty: 40,
    mental: 70,
  });
  const outfield = Array.from({ length: 10 }, (_, i) =>
    makePlayer(`${teamId}_p${i}`, teamId, { penalty, mental })
  );
  PLAYERS.push(gk, ...outfield);

  const slots = FORMATIONS["4-3-3"].slots;
  const lineup: Record<string, string> = {};
  const roles: Record<string, RoleId> = {};
  slots.forEach((slot, i) => {
    lineup[slot.id] = slot.position === "GK" ? gk.id : outfield[i - 1].id;
    roles[slot.id] = DEFAULT_ROLE[slot.position];
  });

  return {
    teamId,
    lineup,
    roles,
    instructions: DEFAULT_INSTRUCTIONS,
    special: { ckBigMenForward: false },
  };
}

describe("simulateShootout", () => {
  it("같은 시드 재현성, winner는 me/opp 중 하나, 라운드 수 >= 10", () => {
    const kor = makeSetup("kor", "4-3-3");
    const bra = makeSetup("bra", "4-3-3");
    const meKickers = [
      kor.lineup["wg_l"],
      kor.lineup["wg_r"],
      kor.lineup["st"],
      kor.lineup["cm_l"],
      kor.lineup["cm_r"],
    ];

    const a = simulateShootout(meKickers, kor, bra, 42);
    const b = simulateShootout(meKickers, kor, bra, 42);

    expect(a).toEqual(b);
    expect(["me", "opp"]).toContain(a.winner);
    expect(a.rounds.length).toBeGreaterThanOrEqual(10);
  });

  it("다른 시드는 대체로 다른 결과 로그를 만든다", () => {
    const kor = makeSetup("kor", "4-3-3");
    const bra = makeSetup("bra", "4-3-3");
    const meKickers = [
      kor.lineup["wg_l"],
      kor.lineup["wg_r"],
      kor.lineup["st"],
      kor.lineup["cm_l"],
      kor.lineup["cm_r"],
    ];
    const a = simulateShootout(meKickers, kor, bra, 1);
    const b = simulateShootout(meKickers, kor, bra, 2);
    expect(a.rounds.map((r) => r.scored)).not.toEqual(b.rounds.map((r) => r.scored));
  });

  it("PK 90 팀 vs PK 55 팀: 100회 시뮬 중 강팀 승수 > 60", () => {
    const strong = buildTestTeam("test_pk_hi", 90, 90);
    const weak = buildTestTeam("test_pk_lo", 55, 55);
    const meKickers = Object.values(strong.lineup).filter((id) => id !== strong.lineup["gk"]).slice(0, 5);

    let strongWins = 0;
    for (let seed = 1; seed <= 100; seed++) {
      const result = simulateShootout(meKickers, strong, weak, seed);
      if (result.winner === "me") strongWins++;
    }
    expect(strongWins).toBeGreaterThan(60);
  });
});
