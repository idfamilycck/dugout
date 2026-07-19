// lib/wc2026/register.ts
//
// Wires the WC2026 dataset (data/wc2026/teams.json + matches.json) into the
// engine's existing lookup functions (teamById/playersOf/venueById) so the
// rest of the engine can consume WC teams/players/venues transparently,
// without knowing they came from a different data source.
//
// registerWc2026() is idempotent: it is safe to call many times (e.g. once
// per page/route that needs WC data) and will only do the registration work
// once per process.

import type { Team, Venue } from "@/lib/types";
import { registerTeam } from "@/lib/data/teams";
import { registerPlayers } from "@/lib/data/players";
import { registerVenue, venueById } from "@/lib/data/venues";
import { makeVirtualPlayer } from "@/lib/wc2026/players";
import { wc2026Matches, wc2026TeamId } from "@/lib/wc2026/data";
import teamsJson from "@/data/wc2026/teams.json";

interface Wc2026TeamRow {
  code: string;
  id: string;
  nameKo: string;
  elo: number;
  finishRound: string;
}

const WC_TEAMS = teamsJson as Wc2026TeamRow[];

// 기본 WC 경기장. 실제 경기장별 프로필(고도/기온 등)을 아직 매핑하지 않았으므로
// metlife를 복제한 단일 기본값을 사용한다 (plan상 허용된 단순화).
const WC_DEFAULT_VENUE: Venue = {
  id: "wc_default",
  nameKo: "2026 월드컵 경기장",
  cityKo: "미국/캐나다/멕시코",
  altitude: 200,
  avgTempC: 26,
  dome: false,
  capacity: 75000,
};

let done = false;

export function registerWc2026(): void {
  if (done) return;
  done = true;

  // (a) 팀 등록
  const eloRank = [...WC_TEAMS].sort((a, b) => b.elo - a.elo);
  const rankByCode = new Map<string, number>();
  eloRank.forEach((t, i) => rankByCode.set(t.code, i + 1));
  const eloByCode = new Map<string, number>();

  for (const row of WC_TEAMS) {
    eloByCode.set(row.code, row.elo);
    const team: Team = {
      id: row.id,
      nameKo: row.nameKo,
      code: row.code,
      elo: row.elo,
      fifaRank: rankByCode.get(row.code) ?? 99,
      form: 6,
      styleTags: [],
      color1: "#666666",
      color2: "#CCCCCC",
    };
    registerTeam(team);
  }

  // (b) 팀별 고유 선수 수집 (playerId 기준 dedup) 후 가상 선수 생성
  const playersByTeam = new Map<string, Map<string, { name: string; position: string }>>();

  for (const match of wc2026Matches()) {
    for (const lineup of match.lineups) {
      const teamId = wc2026TeamId(lineup.teamCode);
      let bucket = playersByTeam.get(teamId);
      if (!bucket) {
        bucket = new Map();
        playersByTeam.set(teamId, bucket);
      }
      for (const p of [...lineup.starters, ...lineup.bench]) {
        if (!bucket.has(p.playerId)) {
          bucket.set(p.playerId, { name: p.name, position: p.position });
        }
      }
    }
  }

  for (const [teamId, bucket] of playersByTeam) {
    const code = teamId.slice(3).toUpperCase(); // "wc_esp" -> "ESP"
    const teamElo = eloByCode.get(code) ?? 1600;
    const players = [...bucket.entries()].map(([playerId, info]) =>
      makeVirtualPlayer({
        id: playerId,
        teamId,
        name: info.name,
        position: info.position,
        teamElo,
      }),
    );
    registerPlayers(teamId, players);
  }

  // (c) 경기장 등록: 기존 venue와 이름이 겹치지 않는 한 기본 WC venue 하나로 충분.
  if (!venueById(WC_DEFAULT_VENUE.id)) {
    registerVenue(WC_DEFAULT_VENUE);
  }
}
