// components/rewrite/goal-timeline.test.ts
import { describe, it, expect } from "vitest";
import { buildGoalTimeline, type SimGoalEvent } from "./goal-timeline";
import type { Wc2026Match } from "@/lib/wc2026/types";

function mk(events: Wc2026Match["events"], home = "KOR", away = "ENG"): Wc2026Match {
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

function goal(minute: number, teamCode: string, playerName: string): Wc2026Match["events"][number] {
  return { minute, type: "goal", teamCode, playerId: `p${minute}`, playerName };
}

function sim(minute: number, side: "me" | "opp"): SimGoalEvent {
  return { minute, type: "goal", side };
}

describe("buildGoalTimeline", () => {
  it("takeoverMinute 이전(및 그 분)의 골은 집계에서 제외된다", () => {
    const m = mk([
      goal(20, "ENG", "Early"), // 인수 이전 실점 - 제외
      goal(60, "ENG", "Harry Kane"), // 인수 이후 실점 - 포함
      goal(60, "KOR", "Son"), // 인수 이후 득점 - 포함
      goal(30, "KOR", "TooEarly"), // 인수 시점 = 30, 경계값이라 제외
    ]);
    const t = buildGoalTimeline(m, "KOR", [], 30);
    expect(t.realConceded).toHaveLength(1);
    expect(t.realConceded[0].playerName).toBe("Harry Kane");
    expect(t.realScored).toHaveLength(1);
    expect(t.realScored[0].playerName).toBe("Son");
    expect(t.fromMinute).toBe(30);
    expect(t.toMinute).toBe(90);
  });

  it("시뮬 이벤트도 takeoverMinute 이전 골은 집계하지 않고, goal 타입만 센다", () => {
    const m = mk([]);
    const events: SimGoalEvent[] = [
      { minute: 10, type: "goal", side: "me" }, // 인수 이전 - 제외
      { minute: 70, type: "shot", side: "me" }, // 골 아님 - 제외
      sim(70, "me"),
      sim(80, "opp"),
      { minute: 100, type: "goal", side: "me" }, // 90분 초과 - 제외
    ];
    const t = buildGoalTimeline(m, "KOR", events, 30);
    expect(t.myScored).toBe(1);
    expect(t.myConceded).toBe(1);
  });

  it("실제 실점을 줄인 경우: 득점자 이름과 줄어든 수를 문장에 담는다", () => {
    const m = mk([goal(62, "ENG", "Harry Kane"), goal(70, "ENG", "Bellingham"), goal(85, "ENG", "Saka")]);
    const t = buildGoalTimeline(m, "KOR", [sim(75, "opp")], 45);
    expect(t.realConceded).toHaveLength(3);
    expect(t.myConceded).toBe(1);
    expect(t.concededDelta).toBe(-2);
    expect(t.linesKo[0]).toContain("62분 Harry Kane의 골");
    expect(t.linesKo[0]).toContain("3실점");
    expect(t.linesKo[0]).toContain("1실점으로 줄였습니다");
  });

  it("실제 실점을 완봉한 경우: 무실점으로 막았다는 문장이 나온다", () => {
    const m = mk([goal(62, "ENG", "Harry Kane"), goal(70, "ENG", "Saka")]);
    const t = buildGoalTimeline(m, "KOR", [], 45);
    expect(t.myConceded).toBe(0);
    expect(t.concededDelta).toBe(-2);
    expect(t.linesKo[0]).toContain("무실점으로 막았습니다");
    expect(t.linesKo[0]).toContain("Harry Kane");
  });

  it("실제 실점을 늘린 경우: 실제로는 없던 실점이라고 말한다", () => {
    const m = mk([]);
    const t = buildGoalTimeline(m, "KOR", [sim(70, "opp")], 45);
    expect(t.concededDelta).toBe(1);
    expect(t.linesKo[0]).toContain("실제로는 없던 실점");
    expect(t.linesKo[0]).toContain("1골");
  });

  it("실제와 실점 수가 같지만 득점이 다르면 실점 문장은 '같은 N실점'이 된다", () => {
    const m = mk([goal(60, "ENG", "Kane")]);
    const t = buildGoalTimeline(m, "KOR", [sim(70, "opp"), sim(80, "me")], 45);
    expect(t.concededDelta).toBe(0);
    expect(t.scoredDelta).toBe(1);
    expect(t.linesKo[0]).toContain("실제와 같은 1실점");
    expect(t.linesKo[1]).toContain("실제로는 없던 득점");
  });

  it("자책골은 올바른 팀에 가산된다 (내 자책골 = 실점, 상대 자책골 = 득점)", () => {
    const m = mk([
      { minute: 55, type: "own_goal", teamCode: "KOR", playerId: "k1", playerName: "Kim" },
      { minute: 75, type: "own_goal", teamCode: "ENG", playerId: "e1", playerName: "Stones" },
    ]);
    const t = buildGoalTimeline(m, "KOR", [], 45);
    expect(t.realConceded).toHaveLength(1);
    expect(t.realConceded[0]).toMatchObject({ minute: 55, playerName: "Kim", ownGoal: true });
    expect(t.realScored).toHaveLength(1);
    expect(t.realScored[0]).toMatchObject({ minute: 75, playerName: "Stones", ownGoal: true });
    expect(t.linesKo[0]).toContain("자책골");
  });

  it("pen_goal도 일반 골과 같이 집계된다", () => {
    const m = mk([{ minute: 80, type: "pen_goal", teamCode: "KOR", playerId: "k9", playerName: "Son" }]);
    const t = buildGoalTimeline(m, "KOR", [], 45);
    expect(t.realScored).toHaveLength(1);
    expect(t.realScored[0].ownGoal).toBe(false);
  });

  it("yellow/red/sub 이벤트는 골 집계에 포함되지 않는다", () => {
    const m = mk([
      { minute: 50, type: "yellow", teamCode: "ENG", playerId: "e2", playerName: "Rice" },
      { minute: 60, type: "sub", teamCode: "ENG", playerId: "e3", playerName: "Foden" },
      { minute: 70, type: "red", teamCode: "KOR", playerId: "k3", playerName: "Lee" },
    ]);
    const t = buildGoalTimeline(m, "KOR", [], 45);
    expect(t.realConceded).toHaveLength(0);
    expect(t.realScored).toHaveLength(0);
  });

  it("90분 초과(연장) 이벤트는 제외된다", () => {
    const m = mk([goal(88, "ENG", "Kane"), goal(105, "ENG", "Extra"), goal(120, "KOR", "Extra2")]);
    const t = buildGoalTimeline(m, "KOR", [], 45);
    expect(t.realConceded).toHaveLength(1);
    expect(t.realConceded[0].minute).toBe(88);
    expect(t.realScored).toHaveLength(0);
  });

  it("throughMinute을 지정하면 그 분 이후는 제외된다(전반전/후반전 프리셋)", () => {
    const m = mk([goal(30, "ENG", "Kane"), goal(60, "ENG", "Saka")]);
    const t = buildGoalTimeline(m, "KOR", [], 20, 45);
    expect(t.realConceded).toHaveLength(1);
    expect(t.realConceded[0].minute).toBe(30);
    expect(t.toMinute).toBe(45);
  });

  it("실제·시뮬 모두 무득점이어도 문장이 최소 하나 나온다", () => {
    const t = buildGoalTimeline(mk([]), "KOR", [], 45);
    expect(t.linesKo).toHaveLength(1);
    expect(t.linesKo[0]).toBe("실제와 같은 흐름이었습니다.");
    expect(t.concededDelta).toBe(0);
    expect(t.scoredDelta).toBe(0);
  });

  it("득실이 실제와 완전히 같으면(0이 아니어도) 한 줄로 요약한다", () => {
    const m = mk([goal(60, "ENG", "Kane"), goal(70, "KOR", "Son")]);
    const t = buildGoalTimeline(m, "KOR", [sim(65, "opp"), sim(75, "me")], 45);
    expect(t.linesKo).toEqual(["실제와 같은 흐름이었습니다."]);
  });

  it("side=away 관점에서도 정확히 집계된다", () => {
    const m = mk([goal(60, "ENG", "Kane"), goal(70, "KOR", "Son")]);
    const t = buildGoalTimeline(m, "ENG", [], 45);
    expect(t.realScored.map((g) => g.playerName)).toEqual(["Kane"]);
    expect(t.realConceded.map((g) => g.playerName)).toEqual(["Son"]);
  });

  it("실제 골 목록은 분 오름차순으로 정렬된다", () => {
    const m = mk([goal(80, "ENG", "C"), goal(50, "ENG", "A"), goal(65, "ENG", "B")]);
    const t = buildGoalTimeline(m, "KOR", [], 45);
    expect(t.realConceded.map((g) => g.minute)).toEqual([50, 65, 80]);
    expect(t.linesKo[0]).toContain("50분 A의 골");
  });

  it("실제 득점 구간에서 득점하지 못한 경우 문장에 반영된다", () => {
    const m = mk([goal(60, "KOR", "Son")]);
    const t = buildGoalTimeline(m, "KOR", [sim(70, "opp")], 45);
    expect(t.scoredDelta).toBe(-1);
    expect(t.linesKo[1]).toContain("득점하지 못했습니다");
    expect(t.linesKo[1]).toContain("60분 Son의 골");
  });
});
