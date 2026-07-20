// components/rewrite/RewriteContextBadge.tsx
//
// 복기(rewrite) 모드 배지: "실제 경기 · {팀A} vs {팀B} · [OfficialBoard] 부터 지휘".
// app/tactics/page.tsx와 app/match/page.tsx가 각자 렌더링하던 거의 동일한 마크업을
// 하나로 합친 것 — 두 화면의 시각적 출력은 그대로 유지하고, 바깥 래퍼에 붙는
// 레이아웃 클래스(margin/self-align 등)만 className prop으로 화면별로 다르게 준다.

import { OfficialBoard } from "@/components/ui/OfficialBoard";

interface RewriteContextBadgeProps {
  meNameKo: string;
  oppNameKo: string;
  takeoverMinute: number;
  className?: string;
}

export function RewriteContextBadge({
  meNameKo,
  oppNameKo,
  takeoverMinute,
  className = "",
}: RewriteContextBadgeProps) {
  return (
    <span
      className={`inline-flex max-w-full items-center gap-2 rounded-full border border-accent/40 bg-accent/10 py-1 pl-3 pr-1.5 text-[13px] font-bold text-accent ${className}`}
    >
      <span className="truncate">
        실제 경기 · {meNameKo} vs {oppNameKo}
      </span>
      <OfficialBoard minute={takeoverMinute} size="sm" label="부터 지휘" />
    </span>
  );
}
