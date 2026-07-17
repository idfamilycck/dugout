import { describe, expect, it } from "vitest";
import type { MatchEvent } from "@/lib/engine/match";
import type { AppliedRule } from "@/lib/engine/modifiers";
import {
  sceneEventsAt,
  primaryEvent,
  sceneChain,
  attackAttribution,
  attackLean,
  isAttackScene,
  shouldStopScene,
  sceneDurationMs,
  SCENE_EVENT_TYPES,
} from "./scene";

const ev = (minute: number, type: MatchEvent["type"], side: "me" | "opp" = "me", playerId?: string): MatchEvent => ({
  minute,
  type,
  side,
  playerId,
  textKo: `${minute}' ${type}`,
});

describe("sceneEventsAt", () => {
  it("해당 분의 장면성 이벤트만 순서대로 반환한다", () => {
    const events = [
      ev(11, "chance"),
      ev(12, "chance"),
      ev(12, "shot"),
      ev(12, "goal"),
      ev(12, "kickoff"), // 장면성 아님
      ev(13, "shot"),
    ];
    const scene = sceneEventsAt(events, 12);
    expect(scene.map((e) => e.type)).toEqual(["chance", "shot", "goal"]);
  });

  it("장면성 이벤트가 없으면 빈 배열", () => {
    expect(sceneEventsAt([ev(45, "halftime"), ev(45, "sub")], 45)).toEqual([]);
  });

  it("SCENE_EVENT_TYPES는 스펙의 7종이다", () => {
    expect([...SCENE_EVENT_TYPES].sort()).toEqual(
      ["card", "chance", "corner", "crisis", "goal", "save", "shot"].sort()
    );
  });
});

describe("primaryEvent", () => {
  it("골 > 세이브 > 슛 > 코너 > 찬스 > 위기 > 카드 우선순위", () => {
    expect(primaryEvent([ev(1, "chance"), ev(1, "shot"), ev(1, "goal")])!.type).toBe("goal");
    expect(primaryEvent([ev(1, "chance"), ev(1, "shot"), ev(1, "save")])!.type).toBe("save");
    expect(primaryEvent([ev(1, "corner"), ev(1, "chance")])!.type).toBe("corner");
    expect(primaryEvent([ev(1, "card"), ev(1, "crisis")])!.type).toBe("crisis");
  });

  it("빈 배열이면 undefined", () => {
    expect(primaryEvent([])).toBeUndefined();
  });
});

describe("sceneChain", () => {
  it("이벤트 순서대로 한국어 라벨 체인을 만든다", () => {
    expect(sceneChain([ev(1, "chance"), ev(1, "shot"), ev(1, "goal")])).toEqual(["찬스", "슛", "골!"]);
  });
});

describe("shouldStopScene", () => {
  it("슛 전개·위기·카드가 있으면 정지, 찬스만 있으면 스킵 유지", () => {
    expect(shouldStopScene([ev(1, "chance"), ev(1, "shot")])).toBe(true);
    expect(shouldStopScene([ev(1, "crisis")])).toBe(true);
    expect(shouldStopScene([ev(1, "card")])).toBe(true);
    expect(shouldStopScene([ev(1, "chance")])).toBe(false);
    expect(shouldStopScene([])).toBe(false);
  });
});

describe("sceneDurationMs", () => {
  it("골 장면은 3200ms, 그 외 정지 장면은 1800ms", () => {
    expect(sceneDurationMs([ev(1, "chance"), ev(1, "shot"), ev(1, "goal")])).toBe(3200);
    expect(sceneDurationMs([ev(1, "chance"), ev(1, "shot"), ev(1, "save")])).toBe(1800);
  });
});

describe("isAttackScene", () => {
  it("공격 장면(chance/shot/goal/corner/save)만 true", () => {
    expect(isAttackScene(ev(1, "goal"))).toBe(true);
    expect(isAttackScene(ev(1, "save"))).toBe(true);
    expect(isAttackScene(ev(1, "crisis"))).toBe(false);
    expect(isAttackScene(ev(1, "card"))).toBe(false);
  });
});

describe("attackAttribution", () => {
  const rule = (id: string, deltaAttack: number): AppliedRule => ({
    id,
    textKo: `rule-${id}`,
    deltaAttack,
    deltaDefense: 0,
    icon: "⚡",
  });

  it("deltaAttack이 가장 큰 양수 규칙을 고른다", () => {
    const picked = attackAttribution([rule("a", 0.03), rule("b", 0.08), rule("c", -0.05)]);
    expect(picked?.id).toBe("b");
  });

  it("양수 공격 규칙이 없으면 null", () => {
    expect(attackAttribution([rule("a", -0.02), rule("b", 0)])).toBeNull();
  });

  it("빈 배열이면 null", () => {
    expect(attackAttribution([])).toBeNull();
  });
});

describe("attackLean", () => {
  it("우리 쪽 장면이 많으면 양수, 상대면 음수, -1..1 클램프", () => {
    const meHeavy = [ev(1, "shot", "me"), ev(2, "chance", "me"), ev(3, "goal", "me")];
    expect(attackLean(meHeavy)).toBeGreaterThan(0);
    expect(attackLean(meHeavy)).toBeLessThanOrEqual(1);

    const oppHeavy = [ev(1, "shot", "opp"), ev(2, "chance", "opp"), ev(3, "shot", "opp"), ev(4, "goal", "opp"), ev(5, "shot", "opp")];
    expect(attackLean(oppHeavy)).toBe(-1);
  });

  it("장면성 이벤트가 없으면 0, 최근 5개만 반영", () => {
    expect(attackLean([ev(1, "kickoff"), ev(45, "halftime")])).toBe(0);
    // 앞의 me 6개는 창 밖, 최근 5개는 전부 opp → -1
    const events = [
      ...Array.from({ length: 6 }, (_, i) => ev(i + 1, "shot", "me" as const)),
      ...Array.from({ length: 5 }, (_, i) => ev(i + 10, "shot", "opp" as const)),
    ];
    expect(attackLean(events)).toBe(-1);
  });
});
