#!/usr/bin/env node
// scripts/build-wc2026.mjs
//
// Transforms raw ESPN summary JSON (data/wc2026/raw/summary-*.json, produced by
// scripts/ingest-wc2026.mjs) into the clean Wc2026Match[] schema defined in
// lib/wc2026/types.ts, written to data/wc2026/matches.json.
//
// Field mapping notes (verified against real raw files — see
// .superpowers/sdd/task-A2-brief.md and task-A2-report.md for details):
//   - round: derived from header.season.name ("2026 FIFA World Cup, <Round>")
//   - group: header.competitions[0].groups.id (1..12) -> letter A..L
//       (ESPN's `groups.name` is inconsistently "Group 1".."Group 6" for the
//       first six groups but "Group G".."Group L" for the last six — the
//       numeric `id` is consistent across all 12, so we map id -> letter
//       ourselves instead of trusting the name/abbreviation strings.)
//   - team codes: header.competitions[0].competitors[].team.abbreviation
//   - score: competitors[].score (regulation+ET, excludes shootout)
//   - shootout: competitors[].shootoutScore (present only on STATUS_FINAL_PEN)
//   - venue: gameInfo.venue.fullName (header.competitions[0].venue is always
//       absent in this dataset)
//   - events: keyEvents[], filtered to goal/own-goal/penalty-scored/
//       substitution/yellow-card/red-card/var-red-card-upgrade; minute from
//       clock.displayValue via parseInt (folds "90'+3'" -> 90)
//   - lineups: rosters[].roster[], split by `starter` boolean
//
// Matches with status.type.completed === false (e.g. a Final that hasn't
// kicked off yet) are skipped entirely — they have no score/events to parse.
//
// Usage: node scripts/build-wc2026.mjs

import { readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const RAW_DIR = path.join(__dirname, "..", "data", "wc2026", "raw");
const OUT_PATH = path.join(__dirname, "..", "data", "wc2026", "matches.json");

const ROUND_MAP = [
  [/group stage/i, "group"],
  [/round of 32/i, "r32"],
  [/round of 16/i, "r16"],
  [/quarterfinal/i, "qf"],
  [/semifinal/i, "sf"],
  [/3rd.?place|third.?place/i, "third"],
  [/final/i, "final"], // must come after "semifinal"/"quarterfinal" checks
];

// keyEvents[].type.type -> Wc2026Event.type. Anything not listed here is
// skipped (kickoff/halftime/delays/period markers/missed or saved penalties/
// shootout kicks are not part of the schema).
const EVENT_TYPE_MAP = {
  goal: "goal",
  "goal---header": "goal",
  "goal---free-kick": "goal",
  "goal---volley": "goal",
  "goal---penalty": "pen_goal",
  "own-goal": "own_goal",
  "penalty---scored": "pen_goal",
  substitution: "sub",
  "yellow-card": "yellow",
  "red-card": "red",
  "var---red-card-upgrade": "red",
};

function resolveRound(seasonName) {
  const name = seasonName ?? "";
  for (const [re, code] of ROUND_MAP) {
    if (re.test(name)) return code;
  }
  return null;
}

function groupIdToLetter(groupId) {
  const n = Number(groupId);
  if (!Number.isInteger(n) || n < 1 || n > 12) return undefined;
  return String.fromCharCode(64 + n); // 1 -> A ... 12 -> L
}

function parseMinute(displayValue) {
  if (!displayValue) return NaN;
  const m = /^(\d+)/.exec(displayValue);
  return m ? Number(m[1]) : NaN;
}

function buildTeamCodeMap(competitors) {
  const map = new Map();
  for (const c of competitors) {
    map.set(String(c.team.id), c.team.abbreviation);
  }
  return map;
}

function buildEvents(keyEvents, teamCodeMap) {
  const events = [];
  for (const e of keyEvents ?? []) {
    if (e.shootout) continue; // shootout kicks aren't match events in this schema
    const mappedType = EVENT_TYPE_MAP[e.type?.type];
    if (!mappedType) continue;

    const minute = parseMinute(e.clock?.displayValue);
    if (Number.isNaN(minute)) continue;

    const teamId = e.team?.id != null ? String(e.team.id) : undefined;
    let teamCode = teamId ? teamCodeMap.get(teamId) : undefined;
    if (!teamCode) continue;

    // ESPN's `team` field on an own-goal event names the BENEFICIARY team
    // (the team credited with the goal in the running score), not the team
    // whose player put it into their own net. E.g. "Own Goal by Aymen
    // Hussein, Iraq. Iraq 1, Norway 4." has team.id === Norway even though
    // Hussein plays for Iraq. Our schema stores own_goal.teamCode as the
    // OFFENDING team (the team that conceded into their own net) so it can
    // be credited to the opponent uniformly elsewhere (see integrity gate).
    // Flip it here — always exactly two teams per match.
    if (mappedType === "own_goal") {
      const other = [...teamCodeMap.values()].find((c) => c !== teamCode);
      if (other) teamCode = other;
    }

    const participants = e.participants ?? [];
    const primary = participants[0]?.athlete;
    if (!primary?.id || !primary?.displayName) continue;

    const event = {
      minute,
      type: mappedType,
      teamCode,
      playerId: String(primary.id),
      playerName: primary.displayName,
    };

    if (mappedType === "sub") {
      const out = participants[1]?.athlete;
      if (out?.id) event.relatedPlayerId = String(out.id);
    }

    events.push(event);
  }
  // Stable sort preserves original (ESPN chronological) ordering for ties,
  // e.g. multiple stoppage-time events folded to the same minute.
  events.sort((a, b) => a.minute - b.minute);
  return events;
}

function buildLineups(rosters) {
  if (!Array.isArray(rosters) || rosters.length !== 2) return null;

  const byHomeAway = { home: null, away: null };
  for (const r of rosters) {
    const teamCode = r.team?.abbreviation;
    if (!teamCode) return null;

    const starters = [];
    const bench = [];
    for (const p of r.roster ?? []) {
      if (!p.athlete?.id || !p.athlete?.displayName) continue;
      const entry = {
        playerId: String(p.athlete.id),
        name: p.athlete.displayName,
        position: p.position?.abbreviation ?? p.position?.displayName ?? "",
      };
      if (p.starter) starters.push(entry);
      else bench.push(entry);
    }

    byHomeAway[r.homeAway] = { teamCode, starters, bench };
  }

  if (!byHomeAway.home || !byHomeAway.away) return null;
  return [byHomeAway.home, byHomeAway.away];
}

function buildMatch(raw, fileName) {
  const header = raw.header;
  const comp = header?.competitions?.[0];
  if (!comp) return { skip: `${fileName}: missing header.competitions[0]` };

  if (comp.status?.type?.completed !== true) {
    return { skip: `${fileName}: match not completed (${comp.status?.type?.name ?? "unknown status"})` };
  }

  const round = resolveRound(header?.season?.name);
  if (!round) return { skip: `${fileName}: unrecognized round name "${header?.season?.name}"` };

  const competitors = comp.competitors ?? [];
  if (competitors.length !== 2) return { skip: `${fileName}: expected 2 competitors, got ${competitors.length}` };

  const homeComp = competitors.find((c) => c.homeAway === "home");
  const awayComp = competitors.find((c) => c.homeAway === "away");
  if (!homeComp || !awayComp) return { skip: `${fileName}: missing home/away competitor` };

  const home = homeComp.team?.abbreviation;
  const away = awayComp.team?.abbreviation;
  if (!/^[A-Z]{3}$/.test(home ?? "") || !/^[A-Z]{3}$/.test(away ?? "")) {
    return { skip: `${fileName}: bad team codes home="${home}" away="${away}"` };
  }

  const scoreHome = Number(homeComp.score);
  const scoreAway = Number(awayComp.score);
  if (Number.isNaN(scoreHome) || Number.isNaN(scoreAway)) {
    return { skip: `${fileName}: unparseable score` };
  }

  const teamCodeMap = buildTeamCodeMap(competitors);
  const events = buildEvents(raw.keyEvents, teamCodeMap);

  const lineups = buildLineups(raw.rosters);
  if (!lineups) return { skip: `${fileName}: missing/malformed rosters` };

  const match = {
    id: String(header.id ?? comp.id ?? fileName),
    round,
    home,
    away,
    scoreHome,
    scoreAway,
    venueKo: raw.gameInfo?.venue?.fullName ?? "미정",
    kickoffISO: comp.date ?? "",
    events,
    lineups,
  };

  if (round === "group" && comp.groups?.id != null) {
    const letter = groupIdToLetter(comp.groups.id);
    if (letter) match.group = letter;
  }

  const hasShootout = comp.status?.type?.name === "STATUS_FINAL_PEN";
  if (hasShootout) {
    const penHome = homeComp.shootoutScore;
    const penAway = awayComp.shootoutScore;
    if (typeof penHome === "number" && typeof penAway === "number") {
      match.penHome = penHome;
      match.penAway = penAway;
    }
  }

  return { match };
}

// --- Integrity gate (Task A3) --------------------------------------------
// Same checks as lib/wc2026/integrity.test.ts, run here so bad matches can
// be marked `excluded: true` at build time rather than merely reported by
// the test suite. Each check is a pure predicate over a built Wc2026Match.

function checkGoalTally(m) {
  const goalsHome = m.events.filter(
    (e) => (e.type === "goal" || e.type === "pen_goal") && e.teamCode === m.home
  ).length;
  const ownForHome = m.events.filter(
    (e) => e.type === "own_goal" && e.teamCode === m.away
  ).length;
  return goalsHome + ownForHome === m.scoreHome;
}

function checkSubCounts(m) {
  return [m.home, m.away].every((code) => {
    const subs = m.events.filter((e) => e.type === "sub" && e.teamCode === code).length;
    return subs <= 6;
  });
}

function checkStarterCounts(m) {
  return m.lineups.every((lu) => lu.starters.length === 11);
}

function checkRedCardFollowup(m) {
  const reds = m.events.filter((e) => e.type === "red");
  return reds.every((r) => {
    const later = m.events.filter(
      (e) => e.minute > r.minute && e.playerId === r.playerId && e.type !== "red"
    );
    return later.length === 0;
  });
}

const INTEGRITY_CHECKS = [checkGoalTally, checkSubCounts, checkStarterCounts, checkRedCardFollowup];

function isIntegrityValid(match) {
  return INTEGRITY_CHECKS.every((check) => check(match));
}

async function main() {
  const files = (await readdir(RAW_DIR)).filter((f) => f.startsWith("summary-") && f.endsWith(".json"));

  const matches = [];
  const skipped = [];

  for (const fileName of files.sort()) {
    const raw = JSON.parse(await readFile(path.join(RAW_DIR, fileName), "utf-8"));
    const { match, skip } = buildMatch(raw, fileName);
    if (skip) {
      skipped.push(skip);
      continue;
    }
    matches.push(match);
  }

  matches.sort((a, b) => a.kickoffISO.localeCompare(b.kickoffISO));

  const excludedIds = [];
  for (const m of matches) {
    if (!isIntegrityValid(m)) {
      m.excluded = true;
      excludedIds.push(m.id);
    }
  }

  await writeFile(OUT_PATH, JSON.stringify(matches, null, 2) + "\n", "utf-8");

  console.log(`wrote ${matches.length} matches`);
  if (skipped.length > 0) {
    console.log(`skipped ${skipped.length} file(s):`);
    for (const s of skipped) console.log(`  - ${s}`);
  }
  console.log(`excluded ${excludedIds.length} matches: [${excludedIds.join(", ")}]`);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exitCode = 1;
});
