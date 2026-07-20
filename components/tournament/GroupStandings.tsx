// components/tournament/GroupStandings.tsx
//
// 12개 조(A~L) 순위표. lib/wc2026/standings.ts의 groupStandings() 결과를 그대로
// 받아 그린다(계산 로직 없음 — 순수 프레젠테이션). 각 조는 실제 <table>이며,
// 상위 2팀(진출권)은 배경 강조 + "진출" 텍스트 라벨(색상만으로 구분하지 않음)로
// 표시하고, 대한민국 행은 굵은 글씨 + 배경 강조로 눈에 띄게 한다.

import { FlagBadge } from "@/components/ui/FlagBadge";
import { teamDisplay } from "@/components/tournament/team-display";
import type { GroupRow } from "@/lib/wc2026/standings";

const GROUPS = "ABCDEFGHIJKL".split("");

const COLUMNS: Array<{ key: keyof GroupRow; label: string }> = [
  { key: "played", label: "경기" },
  { key: "won", label: "승" },
  { key: "drawn", label: "무" },
  { key: "lost", label: "패" },
  { key: "goalsFor", label: "득" },
  { key: "goalsAgainst", label: "실" },
  { key: "goalDiff", label: "득실" },
  { key: "points", label: "승점" },
];

interface GroupStandingsProps {
  standings: Record<string, GroupRow[]>;
}

export function GroupStandings({ standings }: GroupStandingsProps) {
  const groups = GROUPS.filter((g) => standings[g] && standings[g].length > 0);

  if (groups.length === 0) {
    return <p className="py-8 text-center text-sm text-dim">조별리그 데이터가 없습니다.</p>;
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {groups.map((g) => (
        <GroupTable key={g} group={g} rows={standings[g]} />
      ))}
    </div>
  );
}

function GroupTable({ group, rows }: { group: string; rows: GroupRow[] }) {
  return (
    <div className="panel overflow-hidden rounded-panel">
      <div className="panel-head">
        <h3 className="text-sm font-black text-ink">{group}조</h3>
        <span className="text-[10px] font-bold uppercase tracking-wider text-dim">진출 2팀</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[300px] text-[11px]">
          <caption className="sr-only">{group}조 순위표</caption>
          <thead>
            {/* .data-head — 본문보다 한 단계 어두운 열 머리. 12개 조가 세로로 이어질 때
                머리와 몸통이 눌러붙어 보이던 문제를 없앤다. */}
            <tr className="data-head">
              <th scope="col" className="px-2.5 py-1.5 text-left">
                팀
              </th>
              {COLUMNS.map((col) => (
                <th key={col.key} scope="col" className="px-1 py-1.5 text-center">
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => {
              const advancing = i < 2;
              const isKor = row.code === "KOR";
              const team = teamDisplay(row.code);
              return (
                <tr
                  key={row.code}
                  className="data-row"
                  style={{
                    background: isKor
                      ? "rgba(34, 211, 238, 0.10)"
                      : advancing
                        ? "rgba(34, 211, 238, 0.04)"
                        : undefined,
                  }}
                >
                  <th
                    scope="row"
                    className={`px-2.5 py-1.5 text-left font-normal ${isKor ? "font-black text-accent" : "text-ink"}`}
                  >
                    <div className="flex min-w-0 items-center gap-1.5">
                      <FlagBadge code={row.code} color1={team.color1} color2={team.color2} size={18} />
                      <span className="truncate">{team.nameKo}</span>
                      {advancing && (
                        <span className="shrink-0 rounded-full bg-accent/15 px-1.5 py-0.5 text-[8px] font-black text-accent">
                          진출
                        </span>
                      )}
                    </div>
                  </th>
                  {COLUMNS.map((col) => (
                    <td key={col.key} className="tnum px-1 py-1.5 text-center text-ink">
                      {row[col.key] as number}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
