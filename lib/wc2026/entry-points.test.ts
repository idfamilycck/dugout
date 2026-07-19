// lib/wc2026/entry-points.test.ts
import { describe, it, expect } from "vitest";
import { buildPresets, buildEventEntries } from "./entry-points";
import type { Wc2026Match } from "@/lib/wc2026/types";

function mk(events: Wc2026Match["events"], home = "KOR", away = "BRA"): Wc2026Match {
  return {
    id: "t",
    round: "group",
    home,
    away,
    scoreHome: 0,
    scoreAway: 0,
    venueKo: "메트라이프",
    kickoffISO: "2026-06-11T00:00:00Z",
    events,
    lineups: [] as unknown as Wc2026Match["lineups"],
  };
}

describe("buildPresets", () => {
  it("항상 정확히 3개, 지정된 순서/값으로 반환한다", () => {
    const presets = buildPresets();
    expect(presets).toHaveLength(3);
    expect(presets[0]).toMatchObject({
      id: "preset-full",
      category: "preset",
      takeoverMinute: 0,
      labelKo: "풀경기 지휘",
    });
    expect(presets[0].endMinute).toBeUndefined();
    expect(presets[1]).toMatchObject({
      id: "preset-first",
      category: "preset",
      takeoverMinute: 0,
      endMinute: 45,
      labelKo: "전반전 지휘",
    });
    expect(presets[2]).toMatchObject({
      id: "preset-second",
      category: "preset",
      takeoverMinute: 45,
      labelKo: "후반전 지휘",
    });
    expect(presets[2].endMinute).toBeUndefined();
  });

  it("이벤트가 없는 경기여도(빈 events) 항상 3개 — 막다른 화면이 없다", () => {
    expect(buildPresets()).toHaveLength(3);
  });
});

describe("buildEventEntries", () => {
  it("90분 이하 이벤트마다 하나씩, 분 오름차순으로 생성한다", () => {
    const m = mk([
      { minute: 60, type: "goal", teamCode: "KOR", playerId: "k1", playerName: "A" },
      { minute: 10, type: "yellow", teamCode: "BRA", playerId: "b1", playerName: "B" },
      { minute: 30, type: "sub", teamCode: "KOR", playerId: "k2", playerName: "C", relatedPlayerId: "k3" },
    ]);
    const entries = buildEventEntries(m, "KOR");
    expect(entries).toHaveLength(3);
    expect(entries.map((e) => e.minute)).toEqual([10, 30, 60]);
    expect(entries.every((e) => e.category === "event")).toBe(true);
  });

  it("실점(상대 득점)은 emphasis=true, takeoverMinute=minute-5(0 하한)", () => {
    const m = mk([{ minute: 3, type: "goal", teamCode: "BRA", playerId: "b1", playerName: "X" }]);
    const entries = buildEventEntries(m, "KOR");
    expect(entries).toHaveLength(1);
    expect(entries[0].emphasis).toBe(true);
    expect(entries[0].takeoverMinute).toBe(0); // max(3-5, 0)
    expect(entries[0].labelKo).toBe("3′ 실점");
  });

  it("실점 minute=50 → takeoverMinute=45", () => {
    const m = mk([{ minute: 50, type: "goal", teamCode: "BRA", playerId: "b1", playerName: "X" }]);
    const entries = buildEventEntries(m, "KOR");
    expect(entries[0].takeoverMinute).toBe(45);
  });

  it("side의 자책골(own_goal, teamCode=side)은 '자책골 실점' + emphasis=true", () => {
    const m = mk([{ minute: 40, type: "own_goal", teamCode: "KOR", playerId: "k2", playerName: "Z" }]);
    const entries = buildEventEntries(m, "KOR");
    expect(entries[0].labelKo).toBe("40′ 자책골 실점");
    expect(entries[0].emphasis).toBe(true);
  });

  it("상대의 자책골(teamCode=opponent)은 emphasis=false", () => {
    const m = mk([{ minute: 40, type: "own_goal", teamCode: "BRA", playerId: "b3", playerName: "W" }]);
    const entries = buildEventEntries(m, "KOR");
    expect(entries[0].labelKo).toBe("40′ 상대 자책골(우리 득점)");
    expect(entries[0].emphasis).toBe(false);
  });

  it("우리 득점은 emphasis=false", () => {
    const m = mk([{ minute: 20, type: "pen_goal", teamCode: "KOR", playerId: "k1", playerName: "A" }]);
    const entries = buildEventEntries(m, "KOR");
    expect(entries[0].labelKo).toBe("20′ 우리 득점");
    expect(entries[0].emphasis).toBe(false);
  });

  it("우리 퇴장은 emphasis=true, 상대 퇴장은 emphasis=false", () => {
    const m = mk([
      { minute: 55, type: "red", teamCode: "KOR", playerId: "k1", playerName: "A" },
      { minute: 65, type: "red", teamCode: "BRA", playerId: "b1", playerName: "B" },
    ]);
    const entries = buildEventEntries(m, "KOR");
    expect(entries[0].labelKo).toBe("55′ 우리 퇴장");
    expect(entries[0].emphasis).toBe(true);
    expect(entries[1].labelKo).toBe("65′ 상대 퇴장");
    expect(entries[1].emphasis).toBe(false);
  });

  it("교체 이벤트: 우리/상대 라벨 분기", () => {
    const m = mk([
      { minute: 60, type: "sub", teamCode: "KOR", playerId: "k2", playerName: "A", relatedPlayerId: "k3" },
      { minute: 70, type: "sub", teamCode: "BRA", playerId: "b2", playerName: "B", relatedPlayerId: "b3" },
    ]);
    const entries = buildEventEntries(m, "KOR");
    expect(entries[0].labelKo).toBe("60′ 우리 선수 교체");
    expect(entries[1].labelKo).toBe("70′ 상대 선수 교체");
  });

  it("subKo는 '이 시점 5분 전(N′)부터' 형식이며 minute은 원래 이벤트 분이다", () => {
    const m = mk([{ minute: 88, type: "goal", teamCode: "KOR", playerId: "k1", playerName: "A" }]);
    const entries = buildEventEntries(m, "KOR");
    expect(entries[0].minute).toBe(88);
    expect(entries[0].takeoverMinute).toBe(83);
    expect(entries[0].subKo).toBe("이 시점 5분 전(83′)부터");
  });

  it("id는 ev-{matchId}-{index} 형식이다", () => {
    const m = mk([
      { minute: 10, type: "yellow", teamCode: "KOR", playerId: "k1", playerName: "A" },
      { minute: 20, type: "yellow", teamCode: "KOR", playerId: "k1", playerName: "A" },
    ]);
    const entries = buildEventEntries(m, "KOR");
    expect(entries[0].id).toBe("ev-t-0");
    expect(entries[1].id).toBe("ev-t-1");
  });

  it("90분 초과(연장) 이벤트는 제외된다", () => {
    const m = mk([
      { minute: 45, type: "goal", teamCode: "KOR", playerId: "k1", playerName: "A" },
      { minute: 105, type: "goal", teamCode: "BRA", playerId: "b1", playerName: "B" },
    ]);
    const entries = buildEventEntries(m, "KOR");
    expect(entries).toHaveLength(1);
    expect(entries[0].minute).toBe(45);
  });

  it("이벤트가 하나도 없으면 빈 배열", () => {
    const m = mk([]);
    expect(buildEventEntries(m, "KOR")).toEqual([]);
  });

  it("away 관점(side=away)에서도 정확히 라벨링된다", () => {
    const m = mk([{ minute: 10, type: "goal", teamCode: "KOR", playerId: "k1", playerName: "A" }], "KOR", "BRA");
    const entries = buildEventEntries(m, "BRA");
    expect(entries[0].labelKo).toBe("10′ 실점");
    expect(entries[0].emphasis).toBe(true);
  });
});
