import { FORMATIONS } from "@/lib/data/formations";

// 히어로 우측 전술 보드.
//
// 가짜 스크린샷(div로 흉내낸 제품 UI)이 아니라 실제 앱이 쓰는 FORMATIONS 데이터를 그대로
// 읽어 그린다 — 작전실의 4-3-3과 좌표가 같다. 포메이션 데이터가 바뀌면 이 그림도 함께
// 바뀌므로 홍보용 그림과 제품이 어긋날 일이 없다.
//
// 서버 컴포넌트(클라이언트 JS 0)이며 순수 SVG라 히어로 LCP에 이미지 요청을 더하지 않는다.

const PITCH = FORMATIONS["4-3-3"];

// 포지션 약어는 화면에 그대로 노출된다(작전실과 동일 표기).
const LABEL: Record<string, string> = {
  GK: "GK",
  CB: "CB",
  FB: "FB",
  DM: "DM",
  CM: "CM",
  WG: "WG",
  ST: "ST",
};

export function HeroBoard() {
  return (
    <svg
      viewBox="0 0 100 116"
      className="h-full w-full"
      role="img"
      aria-label="4-3-3 포메이션 전술 보드. 골키퍼 1명, 수비 4명, 미드필더 3명, 공격 3명."
    >
      {/* 잔디 — 작전실과 같은 --color-turf 계열 */}
      <defs>
        <linearGradient id="hero-turf" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--color-turf)" />
          <stop offset="100%" stopColor="var(--color-turf-2)" />
        </linearGradient>
      </defs>
      <rect x="0" y="0" width="100" height="116" rx="2" fill="url(#hero-turf)" />

      {/* 이랑(모잉 스트라이프) */}
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <rect
          key={i}
          x="0"
          y={i * 19.34}
          width="100"
          height="9.67"
          fill="rgba(255,255,255,0.022)"
        />
      ))}

      {/* 라인 마킹 */}
      <g stroke="rgba(255,255,255,0.18)" strokeWidth="0.5" fill="none">
        <rect x="3" y="3" width="94" height="110" />
        <line x1="3" y1="58" x2="97" y2="58" />
        <circle cx="50" cy="58" r="13" />
        <rect x="24" y="3" width="52" height="18" />
        <rect x="24" y="95" width="52" height="18" />
        <rect x="38" y="3" width="24" height="7" />
        <rect x="38" y="106" width="24" height="7" />
      </g>
      <circle cx="50" cy="58" r="1" fill="rgba(255,255,255,0.28)" />

      {/* 선수 — 실제 슬롯 좌표. y는 위가 상대 골문이 되도록 뒤집는다. */}
      {PITCH.slots.map((s) => {
        const cy = 113 - (s.y / 100) * 108;
        const isGk = s.position === "GK";
        return (
          <g key={s.id}>
            <circle
              cx={s.x}
              cy={cy}
              r="4.6"
              fill={isGk ? "var(--color-surface-2)" : "var(--color-accent)"}
              stroke="rgba(255,255,255,0.5)"
              strokeWidth="0.5"
            />
            <text
              x={s.x}
              y={cy + 1.5}
              textAnchor="middle"
              fontSize="3.4"
              fontWeight="700"
              fill={isGk ? "var(--color-ink)" : "var(--color-accent-ink)"}
              fontFamily="var(--font-display)"
            >
              {LABEL[s.position] ?? s.position}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
