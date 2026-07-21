// 데이터 고지 — 모든 화면 하단에 노출.
// 팀 전력은 공개된 국제 축구 랭킹(경기 전) 기반이고, 개별 선수 능력치는 저작권·명예훼손
// 리스크를 피하기 위해 실제 레이팅을 쓰지 않고 포지션·팀 전력으로 생성한 가상값이다.

export function Disclaimer({ className }: { className?: string }) {
  return (
    <p
      className={`text-center text-xs leading-relaxed text-dim ${className ?? ""}`}
    >
      팀 전력은 국제 축구 랭킹 기반이며, 개별 선수 능력치는 가상으로 구성된 데이터입니다.
    </p>
  );
}
