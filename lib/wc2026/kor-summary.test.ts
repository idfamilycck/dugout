import { describe, it, expect } from "vitest";
import { korSummary } from "@/lib/wc2026/kor-summary";
import { groupStandings } from "@/lib/wc2026/standings";
import { wc2026Matches } from "@/lib/wc2026/data";
import type { Wc2026Match, Wc2026Round } from "@/lib/wc2026/types";

function match(
  id: string,
  round: Wc2026Round,
  home: string,
  away: string,
  scoreHome: number,
  scoreAway: number,
  group?: string,
): Wc2026Match {
  return {
    id,
    round,
    group,
    home,
    away,
    scoreHome,
    scoreAway,
    venueKo: "테스트 경기장",
    kickoffISO: `2026-06-${id.padStart(2, "0")}T00:00:00Z`,
    events: [],
    lineups: [
      { teamCode: home, starters: [], bench: [] },
      { teamCode: away, starters: [], bench: [] },
    ],
  };
}

describe("korSummary", () => {
  it("KOR이 없는 데이터에서는 undefined", () => {
    const matches = [match("01", "group", "MEX", "CZE", 1, 0, "A")];
    expect(korSummary(matches, groupStandings(matches))).toBeUndefined();
  });

  it("조별리그 탈락이면 advanced=false, finishRound='group'", () => {
    const matches = [
      match("01", "group", "KOR", "CZE", 2, 1, "A"),
      match("02", "group", "MEX", "KOR", 1, 0, "A"),
      match("03", "group", "RSA", "KOR", 1, 0, "A"),
      match("04", "group", "MEX", "CZE", 2, 0, "A"),
      match("05", "group", "RSA", "CZE", 1, 0, "A"),
      match("06", "group", "MEX", "RSA", 1, 1, "A"),
    ];
    const s = korSummary(matches, groupStandings(matches));
    expect(s).toBeDefined();
    expect(s!.group).toBe("A");
    expect(s!.advanced).toBe(false);
    expect(s!.finishRound).toBe("group");
    expect(s!.row.points).toBe(3);
    expect(s!.row.goalDiff).toBe(-1);
    // 승점 3(MEX 7, RSA 5, KOR 3, CZE 0) -> 3위.
    expect(s!.rank).toBe(3);
  });

  it("토너먼트 경기를 뛰었으면 가장 깊은 라운드를 finishRound로 잡는다", () => {
    const matches = [
      match("01", "group", "KOR", "CZE", 2, 1, "A"),
      match("02", "group", "KOR", "MEX", 1, 0, "A"),
      match("03", "group", "KOR", "RSA", 1, 0, "A"),
      match("04", "r32", "KOR", "BRA", 1, 0),
      match("05", "r16", "KOR", "ARG", 0, 2),
    ];
    const s = korSummary(matches, groupStandings(matches));
    expect(s!.advanced).toBe(true);
    expect(s!.finishRound).toBe("r16");
    expect(s!.rank).toBe(1);
  });

  it("3·4위전을 4강보다 깊게 본다(마지막에 치른 경기)", () => {
    const matches = [
      match("01", "group", "KOR", "CZE", 1, 0, "A"),
      match("02", "sf", "KOR", "BRA", 0, 1),
      match("03", "third", "KOR", "ARG", 2, 1),
    ];
    const s = korSummary(matches, groupStandings(matches));
    expect(s!.finishRound).toBe("third");
  });

  it("실제 2026 데이터에서 A조 대한민국을 찾아낸다", () => {
    const matches = wc2026Matches();
    const s = korSummary(matches, groupStandings(matches));
    expect(s).toBeDefined();
    expect(s!.group).toBe("A");
    expect(s!.row.code).toBe("KOR");
    expect(s!.row.played).toBe(3);
    expect(s!.rank).toBeGreaterThanOrEqual(1);
    expect(s!.rank).toBeLessThanOrEqual(4);
  });
});
