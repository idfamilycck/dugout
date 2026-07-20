// FM식 능력치 색상 스케일 — 선수 능력치 값을 등급 색 토큰으로 변환한다.
// 액센트(시안)와 별개의 시맨틱 데이터 색상이며, 값 하나만으로 접근성을 담보하지
// 않도록 스크린리더용 한글 등급 텍스트(attrTierKo)를 항상 함께 제공한다.

/** 능력치 값(0~99 등)을 등급 색 CSS 변수 문자열로 변환한다. */
export function attrColor(value: number): string {
  if (value >= 85) return "var(--color-attr-elite)";
  if (value >= 70) return "var(--color-attr-good)";
  if (value >= 55) return "var(--color-attr-mid)";
  if (value >= 40) return "var(--color-attr-low)";
  return "var(--color-attr-poor)";
}

/** 능력치 값의 한글 등급 라벨(색이 유일한 신호가 되지 않도록 sr-only 텍스트용). */
export function attrTierKo(value: number): string {
  if (value >= 85) return "최상";
  if (value >= 70) return "우수";
  if (value >= 55) return "보통";
  if (value >= 40) return "미흡";
  return "취약";
}
