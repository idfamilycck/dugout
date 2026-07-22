import { describe, it, expect } from "vitest";
import { attrColor, attrTierKo } from "@/components/tactics/attr-color";

describe("attrColor", () => {
  it("85 이상은 elite", () => {
    expect(attrColor(85)).toBe("var(--color-attr-elite)");
    expect(attrColor(99)).toBe("var(--color-attr-elite)");
  });

  it("84는 good (85 경계 아래)", () => {
    expect(attrColor(84)).toBe("var(--color-attr-good)");
  });

  it("70 이상 84 이하는 good", () => {
    expect(attrColor(70)).toBe("var(--color-attr-good)");
    expect(attrColor(84)).toBe("var(--color-attr-good)");
  });

  it("69는 mid (70 경계 아래)", () => {
    expect(attrColor(69)).toBe("var(--color-attr-mid)");
  });

  it("55 이상 69 이하는 mid", () => {
    expect(attrColor(55)).toBe("var(--color-attr-mid)");
    expect(attrColor(69)).toBe("var(--color-attr-mid)");
  });

  it("54는 low (55 경계 아래)", () => {
    expect(attrColor(54)).toBe("var(--color-attr-low)");
  });

  it("40 이상 54 이하는 low", () => {
    expect(attrColor(40)).toBe("var(--color-attr-low)");
    expect(attrColor(54)).toBe("var(--color-attr-low)");
  });

  it("39는 poor (40 경계 아래)", () => {
    expect(attrColor(39)).toBe("var(--color-attr-poor)");
  });

  it("40 미만은 poor", () => {
    expect(attrColor(0)).toBe("var(--color-attr-poor)");
    expect(attrColor(39)).toBe("var(--color-attr-poor)");
  });
});

describe("attrTierKo", () => {
  it("경계값마다 올바른 한글 등급을 반환한다", () => {
    expect(attrTierKo(85)).toBe("최상");
    expect(attrTierKo(84)).toBe("우수");
    expect(attrTierKo(70)).toBe("우수");
    expect(attrTierKo(69)).toBe("보통");
    expect(attrTierKo(55)).toBe("보통");
    expect(attrTierKo(54)).toBe("미흡");
    expect(attrTierKo(40)).toBe("미흡");
    expect(attrTierKo(39)).toBe("취약");
  });
});
