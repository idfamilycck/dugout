import { describe, it, expect, beforeAll } from "vitest";
import { registerWc2026 } from "@/lib/wc2026/register";
import { playersOf } from "@/lib/data/players";
import { teamById } from "@/lib/data/teams";

beforeAll(() => registerWc2026());

describe("wc2026 등록", () => {
  it("등록 후 wc 팀 조회 가능", () => {
    expect(teamById("wc_esp")?.code).toBe("ESP");
  });
  it("wc 팀 선수 명단이 11명 이상", () => {
    expect(playersOf("wc_esp").length).toBeGreaterThanOrEqual(11);
  });
  it("기존 자유 모드 팀은 그대로 유지", () => {
    expect(teamById("kor")?.nameKo).toBe("대한민국");
    expect(playersOf("kor").length).toBe(20);
  });
  it("registerWc2026 중복 호출해도 선수 수 불변(idempotent)", () => {
    const n = playersOf("wc_esp").length;
    registerWc2026();
    expect(playersOf("wc_esp").length).toBe(n);
  });
});
