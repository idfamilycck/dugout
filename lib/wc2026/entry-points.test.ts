// lib/wc2026/entry-points.test.ts
import { describe, it, expect } from "vitest";
import { buildPresets, buildEventEntries } from "./entry-points";
import type { Wc2026Match } from "@/lib/wc2026/types";

function mk(
  events: Wc2026Match["events"],
  home = "KOR",
  away = "BRA",
  lineups: Wc2026Match["lineups"] = [] as unknown as Wc2026Match["lineups"],
): Wc2026Match {
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
    lineups,
  };
}

// 교체 OUT 이름 해석 테스트용 라인업 픽스처: KOR/BRA 각각 선발+벤치에 선수를 채운다.
function mkLineups(): Wc2026Match["lineups"] {
  return [
    {
      teamCode: "KOR",
      starters: [{ playerId: "k3", name: "김영권", position: "DF" }],
      bench: [{ playerId: "k2", name: "조규성", position: "FW" }],
    },
    {
      teamCode: "BRA",
      starters: [{ playerId: "b3", name: "치아구", position: "DF" }],
      bench: [{ playerId: "b2", name: "호드리구", position: "FW" }],
    },
  ];
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
    expect(entries[0].labelKo).toBe("3′ X 실점");
    expect(entries[0].kindKo).toBe("실점");
    expect(entries[0].detailKo).toBe("X");
  });

  it("실점 minute=50 → takeoverMinute=45", () => {
    const m = mk([{ minute: 50, type: "goal", teamCode: "BRA", playerId: "b1", playerName: "X" }]);
    const entries = buildEventEntries(m, "KOR");
    expect(entries[0].takeoverMinute).toBe(45);
  });

  it("side의 자책골(own_goal, teamCode=side)은 '자책골' + emphasis=true", () => {
    const m = mk([{ minute: 40, type: "own_goal", teamCode: "KOR", playerId: "k2", playerName: "Z" }]);
    const entries = buildEventEntries(m, "KOR");
    expect(entries[0].labelKo).toBe("40′ Z 자책골");
    expect(entries[0].kindKo).toBe("자책골");
    expect(entries[0].emphasis).toBe(true);
  });

  it("상대의 자책골(teamCode=opponent)은 emphasis=false", () => {
    const m = mk([{ minute: 40, type: "own_goal", teamCode: "BRA", playerId: "b3", playerName: "W" }]);
    const entries = buildEventEntries(m, "KOR");
    expect(entries[0].labelKo).toBe("40′ W 자책골");
    expect(entries[0].emphasis).toBe(false);
  });

  it("우리 득점(PK)은 emphasis=false, detailKo에 (PK) 접미", () => {
    const m = mk([{ minute: 20, type: "pen_goal", teamCode: "KOR", playerId: "k1", playerName: "A" }]);
    const entries = buildEventEntries(m, "KOR");
    expect(entries[0].labelKo).toBe("20′ A (PK) 득점");
    expect(entries[0].detailKo).toBe("A (PK)");
    expect(entries[0].kindKo).toBe("득점");
    expect(entries[0].emphasis).toBe(false);
  });

  it("일반 득점(goal)은 scorer 이름이 detailKo이고 '득점'/'실점'으로 팀에 따라 갈린다", () => {
    const m = mk([
      { minute: 12, type: "goal", teamCode: "KOR", playerId: "k1", playerName: "손흥민" },
      { minute: 30, type: "goal", teamCode: "BRA", playerId: "b1", playerName: "네이마르" },
    ]);
    const entries = buildEventEntries(m, "KOR");
    expect(entries[0].detailKo).toBe("손흥민");
    expect(entries[0].kindKo).toBe("득점");
    expect(entries[0].labelKo).toBe("12′ 손흥민 득점");
    expect(entries[1].detailKo).toBe("네이마르");
    expect(entries[1].kindKo).toBe("실점");
    expect(entries[1].labelKo).toBe("30′ 네이마르 실점");
  });

  it("우리 퇴장은 emphasis=true, 상대 퇴장은 emphasis=false, 카드 수령자 이름이 detailKo", () => {
    const m = mk([
      { minute: 55, type: "red", teamCode: "KOR", playerId: "k1", playerName: "A" },
      { minute: 65, type: "red", teamCode: "BRA", playerId: "b1", playerName: "B" },
    ]);
    const entries = buildEventEntries(m, "KOR");
    expect(entries[0].labelKo).toBe("55′ A 퇴장");
    expect(entries[0].detailKo).toBe("A");
    expect(entries[0].emphasis).toBe(true);
    expect(entries[1].labelKo).toBe("65′ B 퇴장");
    expect(entries[1].detailKo).toBe("B");
    expect(entries[1].emphasis).toBe(false);
  });

  it("옐로카드도 카드 수령자 이름이 detailKo", () => {
    const m = mk([{ minute: 15, type: "yellow", teamCode: "BRA", playerId: "b1", playerName: "카시미루" }]);
    const entries = buildEventEntries(m, "KOR");
    expect(entries[0].detailKo).toBe("카시미루");
    expect(entries[0].kindKo).toBe("경고");
    expect(entries[0].labelKo).toBe("15′ 카시미루 경고");
  });

  it("교체 이벤트: 라인업으로 OUT/IN 양쪽 이름이 해석되어 'OUT → IN' 형식", () => {
    const lineups = mkLineups();
    const m = mk(
      [
        { minute: 60, type: "sub", teamCode: "KOR", playerId: "k2", playerName: "조규성", relatedPlayerId: "k3" },
        { minute: 70, type: "sub", teamCode: "BRA", playerId: "b2", playerName: "호드리구", relatedPlayerId: "b3" },
      ],
      "KOR",
      "BRA",
      lineups,
    );
    const entries = buildEventEntries(m, "KOR");
    expect(entries[0].labelKo).toBe("60′ 김영권 → 조규성 교체");
    expect(entries[0].detailKo).toBe("김영권 → 조규성");
    expect(entries[0].kindKo).toBe("교체");
    expect(entries[1].labelKo).toBe("70′ 치아구 → 호드리구 교체");
    expect(entries[1].detailKo).toBe("치아구 → 호드리구");
  });

  it("해석 불가능한 relatedPlayerId는 raw id로 폴백한다 (undefined 렌더 금지)", () => {
    const m = mk([
      { minute: 60, type: "sub", teamCode: "KOR", playerId: "k2", playerName: "조규성", relatedPlayerId: "unknown-id" },
    ]);
    const entries = buildEventEntries(m, "KOR");
    expect(entries[0].detailKo).toBe("unknown-id → 조규성");
    expect(entries[0].detailKo).not.toContain("undefined");
    expect(entries[0].labelKo).not.toContain("undefined");
  });

  it("상대 팀 이벤트도 teamCode/isOurs/detailKo를 전부 보유한다 (우리와 동일한 상세도)", () => {
    const lineups = mkLineups();
    const m = mk(
      [{ minute: 70, type: "sub", teamCode: "BRA", playerId: "b2", playerName: "호드리구", relatedPlayerId: "b3" }],
      "KOR",
      "BRA",
      lineups,
    );
    const entries = buildEventEntries(m, "KOR");
    expect(entries[0].teamCode).toBe("BRA");
    expect(entries[0].isOurs).toBe(false);
    expect(entries[0].detailKo).toBe("치아구 → 호드리구");
    expect(entries[0].kindKo).toBe("교체");
    expect(entries[0].iconKey).toBe("sub");
  });

  it("우리 팀 이벤트는 teamCode=side, isOurs=true", () => {
    const m = mk([{ minute: 12, type: "goal", teamCode: "KOR", playerId: "k1", playerName: "손흥민" }]);
    const entries = buildEventEntries(m, "KOR");
    expect(entries[0].teamCode).toBe("KOR");
    expect(entries[0].isOurs).toBe(true);
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
    expect(entries[0].labelKo).toBe("10′ A 실점");
    expect(entries[0].emphasis).toBe(true);
    expect(entries[0].isOurs).toBe(false);
  });
});
