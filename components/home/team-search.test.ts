import { describe, it, expect } from "vitest";
import { matchesQuery } from "./team-search";
import type { Team } from "@/lib/types";

const team = (nameKo: string, code: string): Team =>
  ({ id: `wc_${code.toLowerCase()}`, nameKo, code }) as Team;

const KOR = team("대한민국", "KOR");
const BRA = team("브라질", "BRA");
const RSA = team("남아프리카공화국", "RSA");

describe("matchesQuery", () => {
  it("빈 검색어는 전부 통과시킨다", () => {
    expect(matchesQuery(KOR, "")).toBe(true);
    expect(matchesQuery(BRA, "")).toBe(true);
  });

  it("한글 이름 부분 일치로 찾는다", () => {
    expect(matchesQuery(BRA, "브라")).toBe(true);
    expect(matchesQuery(BRA, "질")).toBe(true);
    expect(matchesQuery(BRA, "독일")).toBe(false);
  });

  it("3글자 국가 코드로 찾는다(대소문자 무관)", () => {
    expect(matchesQuery(KOR, "kor")).toBe(true);
    expect(matchesQuery(KOR, "KOR")).toBe(true);
    expect(matchesQuery(BRA, "kor")).toBe(false);
  });

  // 회귀: 데이터상 이름이 "대한민국"이라 "한국"으로 검색하면 0건이 나왔다.
  // 플레이스홀더가 "예: 한국"이라고 안내하고 있어서 더 나빴다.
  it("흔히 쓰는 줄임말로도 찾는다", () => {
    expect(matchesQuery(KOR, "한국")).toBe(true);
    expect(matchesQuery(KOR, "한")).toBe(true);
    expect(matchesQuery(RSA, "남아공")).toBe(true);
  });

  it("별칭이 엉뚱한 팀을 걸리게 하지는 않는다", () => {
    expect(matchesQuery(BRA, "한국")).toBe(false);
    expect(matchesQuery(BRA, "남아공")).toBe(false);
  });
});
