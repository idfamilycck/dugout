// 가상 데이터 고지 — 모든 화면 하단에 노출(브리프 요구, 문구 고정).

export function Disclaimer({ className }: { className?: string }) {
  return (
    <p
      className={`text-center text-xs leading-relaxed text-dim ${className ?? ""}`}
    >
      본 서비스의 모든 선수·팀 능력치는 가상으로 구성된 데이터입니다.
    </p>
  );
}
