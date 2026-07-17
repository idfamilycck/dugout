// 실제 국기를 모사하지 않는다. 팀의 color1/color2를 사선으로 조합한 자체 배지 +
// 3글자 코드 텍스트만 사용한다(라이선스/엠블럼 이슈 회피, 브리프 지침).

interface FlagBadgeProps {
  code: string;
  color1: string;
  color2: string;
  size?: number;
  className?: string;
}

// hex(#rrggbb) → 상대 휘도. 텍스트 대비색(검정/흰색) 선택에 사용.
function luminance(hex: string): number {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16) / 255;
  const g = parseInt(h.slice(2, 4), 16) / 255;
  const b = parseInt(h.slice(4, 6), 16) / 255;
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function FlagBadge({ code, color1, color2, size = 44, className }: FlagBadgeProps) {
  const id = `fb-${code.toLowerCase()}`;
  // 코드 텍스트는 배지 하단(color1 영역) 위에 올린다 → color1 밝기로 대비색 결정
  const textColor = luminance(color1) > 0.6 ? "#08160a" : "#f4fff2";

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 44 44"
      role="img"
      aria-label={`${code} 팀 배지`}
      className={className}
    >
      <defs>
        <clipPath id={`${id}-clip`}>
          <rect x="1" y="1" width="42" height="42" rx="10" />
        </clipPath>
      </defs>
      <g clipPath={`url(#${id}-clip)`}>
        <rect x="0" y="0" width="44" height="44" fill={color1} />
        {/* 상단 사선 밴드 = color2 */}
        <polygon points="0,0 44,0 44,20 0,32" fill={color2} />
        {/* color1 영역 위 대각선 하이라이트 */}
        <polygon points="0,32 44,20 44,24 0,36" fill="rgba(0,0,0,0.18)" />
      </g>
      <rect
        x="1"
        y="1"
        width="42"
        height="42"
        rx="10"
        fill="none"
        stroke="rgba(255,255,255,0.22)"
        strokeWidth="1.5"
      />
      <text
        x="22"
        y="35"
        textAnchor="middle"
        fontSize="12.5"
        fontWeight="900"
        letterSpacing="0.5"
        fill={textColor}
        style={{ fontFamily: "var(--font-sans)" }}
      >
        {code}
      </text>
    </svg>
  );
}
