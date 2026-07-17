import { createRng } from "./random";
import { playerContribution } from "./strength";
import { playersOf } from "@/lib/data/players";
import { FORMATIONS } from "@/lib/data/formations";
import { DEFAULT_ROLE } from "@/lib/data/roles";
import type { Player, SideSetup } from "@/lib/types";

export interface ShootoutResult {
  rounds: Array<{ side: "me" | "opp"; playerId: string; scored: boolean }>;
  winner: "me" | "opp";
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, v));
}

// 상대 GK 기여도: 항상 "기본 역할(gk_traditional) + 만체력(1.0)" 기준으로 계산한다
// (브리프 명세). 실제 경기 중 GK의 역할 배정이나 스태미나와 무관하게 승부차기는
// 별도 미니게임으로 취급한다.
function gkContribution(setup: SideSetup): number {
  const formation = FORMATIONS[setup.instructions.formation];
  const gkSlot = formation.slots.find((s) => s.position === "GK");
  const gkId = gkSlot ? setup.lineup[gkSlot.id] : undefined;
  const gk = playersOf(setup.teamId).find((p) => p.id === gkId);
  if (!gk) return 70; // GK를 찾지 못하면 가감 0(70)으로 중립 처리
  return playerContribution(gk, "GK", DEFAULT_ROLE.GK, 1);
}

function successProb(kicker: Player, oppGkContribution: number): number {
  return clamp(
    0.62 +
      (kicker.penalty - 70) * 0.004 +
      (kicker.mental - 70) * 0.002 -
      (oppGkContribution - 70) * 0.004,
    0.5,
    0.9
  );
}

// 상대 자동 키커: 온피치 필드 플레이어(GK 제외) 중 pk 내림차순 상위 5명.
function autoKickers(setup: SideSetup): string[] {
  const formation = FORMATIONS[setup.instructions.formation];
  const gkSlot = formation.slots.find((s) => s.position === "GK");
  const gkId = gkSlot ? setup.lineup[gkSlot.id] : undefined;
  const onPitchIds = new Set(Object.values(setup.lineup));
  return playersOf(setup.teamId)
    .filter((p) => onPitchIds.has(p.id) && p.id !== gkId)
    .sort((a, b) => b.penalty - a.penalty)
    .slice(0, 5)
    .map((p) => p.id);
}

// 5라운드씩(조기 종료 없음, 최소 10킥) 번갈아 진행 후 동률이면 서든데스로 이어간다.
// 서든데스는 6번째 키커부터 meKickers/오토 리스트를 순환(cycling)하며 계속한다 —
// 브리프가 허용한 "가장 단순한 결정론적 규칙".
export function simulateShootout(
  meKickers: string[],
  meSetup: SideSetup,
  oppSetup: SideSetup,
  seed: number
): ShootoutResult {
  const rng = createRng(seed);
  const meSquad = playersOf(meSetup.teamId);
  const oppSquad = playersOf(oppSetup.teamId);
  const oppKickers = autoKickers(oppSetup);

  const meGk = gkContribution(meSetup);
  const oppGk = gkContribution(oppSetup);

  const rounds: ShootoutResult["rounds"] = [];
  let meScore = 0;
  let oppScore = 0;

  function kick(side: "me" | "opp", playerId: string): void {
    const squad = side === "me" ? meSquad : oppSquad;
    const facingGk = side === "me" ? oppGk : meGk;
    const player = squad.find((p) => p.id === playerId);
    // playerId가 squad에서 찾아지지 않으면(스쿼드에 없는/오프피치 id 등) RNG 뽑기를
    // 그냥 건너뛰고 scored=false로 조용히 처리한다 — 예외를 던지지 않는다. 따라서
    // 호출부는 반드시 온피치 선수 id만 넘겨야 하며, 그렇지 않으면 시드 재현성은
    // 유지되지만(같은 시드→같은 결과) RNG 소비 스트림이 "정상" 실행과 달라진다.
    let scored = false;
    if (player) {
      const p = successProb(player, facingGk);
      scored = rng.next() < p;
    }
    if (scored) {
      if (side === "me") meScore++;
      else oppScore++;
    }
    rounds.push({ side, playerId, scored });
  }

  for (let i = 0; i < 5; i++) {
    kick("me", meKickers[i % meKickers.length]);
    kick("opp", oppKickers[i % oppKickers.length]);
  }

  let idx = 5;
  while (meScore === oppScore) {
    kick("me", meKickers[idx % meKickers.length]);
    kick("opp", oppKickers[idx % oppKickers.length]);
    idx++;
  }

  return { rounds, winner: meScore > oppScore ? "me" : "opp" };
}
