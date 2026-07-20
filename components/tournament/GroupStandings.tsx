// components/tournament/GroupStandings.tsx
//
// 12개 조(A~L) 순위표. lib/wc2026/standings.ts의 groupStandings() 결과를 그대로
// 받아 그린다(계산 로직 없음 — 순수 프레젠테이션). 각 조는 실제 <table>이며,
// 상위 2팀(진출권)은 배경 강조 + "진출" 텍스트 라벨(색상만으로 구분하지 않음)로
// 표시하고, 대한민국 행은 굵은 글씨 + 배경 강조로 눈에 띄게 한다.
//
// 위계: 12개 조가 전부 같은 크기 카드로 3열에 깔리면 어디부터 볼지 알 수 없다.
// featuredGroup(=대한민국이 속한 조)이 주어지면 그 조만 먼저, 넓은 카드로 단독
// 배치하고 나머지 11개 조를 그 아래 그리드에 둔다.

import { FlagBadge } from "@/components/ui/FlagBadge";
import { Reveal } from "@/components/ui/Reveal";
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
  /** 먼저·크게 보여줄 조(대한민국이 속한 조). 없으면 12개 조를 균등 그리드로 그린다. */
  featuredGroup?: string;
}

export function GroupStandings({ standings, featuredGroup }: GroupStandingsProps) {
  const groups = GROUPS.filter((g) => standings[g] && standings[g].length > 0);

  if (groups.length === 0) {
    return <p className="py-8 text-center text-sm text-dim">조별리그 데이터가 없습니다.</p>;
  }

  const featured = featuredGroup && groups.includes(featuredGroup) ? featuredGroup : undefined;
  const rest = groups.filter((g) => g !== featured);

  return (
    <div className="flex flex-col gap-8">
      {featured && (
        <section aria-label={`${featured}조 순위 (대한민국)`} className="flex flex-col gap-3">
          <h3 className="eyebrow text-dim">대한민국이 속한 조</h3>
          {/* 3열 그리드 한 칸보다 두 배 넓게 잡아 팀 이름이 잘리지 않고 행 높이도
              여유가 생긴다. 전체 폭까지 늘리면 숫자 열만 멀어져 읽기 어려워진다. */}
          <Reveal className="lg:max-w-2xl">
            <GroupTable group={featured} rows={standings[featured]} featured />
          </Reveal>
        </section>
      )}

      <section aria-label={featured ? "나머지 조 순위" : "조별 순위"} className="flex flex-col gap-3">
        {featured && <h3 className="eyebrow text-dim">나머지 조</h3>}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {/* 조가 세로로 길게 이어지므로 스크롤에 맞춰 순서대로 들어오게 한다.
              한 화면에 3개씩 보이므로 계단 간격은 행 단위로만 의미가 있다. */}
          {rest.map((g, i) => (
            <Reveal key={g} index={i % 3}>
              <GroupTable group={g} rows={standings[g]} />
            </Reveal>
          ))}
        </div>
      </section>
    </div>
  );
}

function GroupTable({
  group,
  rows,
  featured = false,
}: {
  group: string;
  rows: GroupRow[];
  featured?: boolean;
}) {
  return (
    <div className="panel overflow-hidden rounded-panel">
      <div className="panel-head">
        <h4 className={`font-black text-ink ${featured ? "text-base" : "text-sm"}`}>{group}조</h4>
        <span className="text-[13px] font-bold uppercase tracking-wider text-dim">진출 2팀</span>
      </div>
      {/* 열이 9개(팀 + 8지표)라 카드 폭이 빠듯하다. 팀 이름 칸만 줄어들게 하고 숫자 칸은
          고정 폭으로 잡아, 글자를 키운 뒤에도 "승점"이 잘려 나가지 않게 한다. */}
      <div className="overflow-x-auto">
        {/* featured의 확대는 sm 이상에서만 건다. 모바일은 카드 폭이 좁아 숫자 8열
            고정 폭을 조금만 키워도 "승점"이 화면 밖으로 밀려나므로, 좁은 화면에서는
            일반 카드와 완전히 동일한 폭 처리를 유지한다(위계는 순서와 라벨이 준다). */}
        <table
          className={`w-full table-fixed text-[13px] ${featured ? "sm:text-sm" : ""}`}
        >
          <colgroup>
            <col />
            {/* 숫자 8열 고정 + 팀 이름 열만 가변. 이 조합이 "승점"이 잘리지 않게
                맞춰 둔 폭 처리다. featured는 카드가 넓어지는 sm 이상에서만 열도 함께
                넓힌다 - 모바일에서 38px×8을 쓰면 팀 이름 열이 0에 수렴해 이름이 사라진다. */}
            {COLUMNS.map((c) => (
              <col key={c.key} className={featured ? "w-[30px] sm:w-[38px]" : "w-[30px]"} />
            ))}
          </colgroup>
          <caption className="sr-only">{group}조 순위표</caption>
          <thead>
            {/* .data-head — 본문보다 한 단계 어두운 열 머리. 12개 조가 세로로 이어질 때
                머리와 몸통이 눌러붙어 보이던 문제를 없앤다. */}
            <tr className="data-head">
              <th scope="col" className="px-2 py-1.5 text-left">
                팀
              </th>
              {COLUMNS.map((col) => (
                <th key={col.key} scope="col" className="px-0.5 py-1.5 text-center">
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
                    className={`px-2.5 text-left font-normal ${featured ? "py-1.5 sm:py-2.5" : "py-1.5"} ${isKor ? "font-black text-accent" : "text-ink"}`}
                  >
                    <div className="flex min-w-0 items-center gap-1.5">
                      {/* 크기는 18 고정 - featured라고 키우면 좁은 화면에서 이름 열이
                          그만큼 줄어 팀 이름이 더 잘린다. */}
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
                    <td
                      key={col.key}
                      className={`tnum px-0.5 text-center text-ink ${featured ? "py-1.5 sm:py-2.5" : "py-1.5"}`}
                    >
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
