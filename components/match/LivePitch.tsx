"use client";

// 라이브 미니 피치: 가로형 SVG. 새 이벤트(chance/shot/goal/save/corner)가 들어오면
// 해당 진영에서 공·점이 골문 쪽으로 이동하는 1.4초 시퀀스를 재생하고, 골이면 플래시 +
// 셰이크. 이벤트가 없으면 중원 점유 루프. "me"는 오른쪽, "opp"는 왼쪽 골문을 공격한다.

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { MatchEvent } from "@/lib/engine/match";
import type { SideSetup } from "@/lib/types";
import { teamById } from "@/lib/data/teams";
import { PLAYERS } from "@/lib/data/players";
import { jerseyOf } from "@/components/tactics/tactics-labels";
import { playerDots, VB_W, VB_H } from "./livepitch-geometry";

const NAME_BY_ID = new Map(PLAYERS.map((p) => [p.id, p.name]));
const CX = VB_W / 2;
const CY = VB_H / 2;
const GOAL_R_X = 288; // me 공격(오른쪽) 목표
const GOAL_L_X = 12; // opp 공격(왼쪽) 목표

const HIGHLIGHT_TYPES = new Set(["chance", "shot", "goal", "save", "corner"]);

// 마운트 시점의 "가장 최근 하이라이트" 키. 새로고침으로 이미 지나간 이벤트를 다시
// 재생(골 플래시 등)하지 않도록, 마운트 이후 추가된 이벤트만 트리거하게 커서를 시드한다.
function latestHighlightKey(events: MatchEvent[]): string {
  for (let i = events.length - 1; i >= 0; i--) {
    if (HIGHLIGHT_TYPES.has(events[i].type)) {
      return `${i}-${events[i].minute}-${events[i].type}`;
    }
  }
  return "";
}

interface Highlight {
  id: string;
  side: "me" | "opp";
  isGoal: boolean;
}

interface LivePitchProps {
  events: MatchEvent[];
  meSetup: SideSetup;
  oppSetup: SideSetup;
  /** 장면 모드 주인공 — 해당 선수 점을 확대·펄스로 강조 */
  activePlayerId?: string;
  /** 진형 쏠림 -1(상대 공세)~+1(우리 공세): 양 팀이 공 방향으로 살짝 이동 */
  lean?: number;
}

export function LivePitch({ events, meSetup, oppSetup, activePlayerId, lean = 0 }: LivePitchProps) {
  const meColor = teamById(meSetup.teamId)?.color2 ?? "var(--color-accent)";
  const oppColor = teamById(oppSetup.teamId)?.color1 ?? "var(--color-danger)";

  const [highlight, setHighlight] = useState<Highlight | null>(null);
  // 마운트 시점의 최신 하이라이트로 커서를 시드 → 이후 추가분만 재생.
  const lastKeyRef = useRef<string>(latestHighlightKey(events));
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // 가장 최근의 하이라이트 대상 이벤트를 찾는다.
    let latest: MatchEvent | undefined;
    let latestIdx = -1;
    for (let i = events.length - 1; i >= 0; i--) {
      if (HIGHLIGHT_TYPES.has(events[i].type)) {
        latest = events[i];
        latestIdx = i;
        break;
      }
    }
    if (!latest) return;
    const key = `${latestIdx}-${latest.minute}-${latest.type}`;
    if (key === lastKeyRef.current) return;
    lastKeyRef.current = key;

    setHighlight({ id: key, side: latest.side, isGoal: latest.type === "goal" });
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setHighlight(null), 1500);
  }, [events]);

  useEffect(() => () => {
    if (timerRef.current) clearTimeout(timerRef.current);
  }, []);

  const attackRight = highlight?.side === "me";
  const goalX = attackRight ? GOAL_R_X : GOAL_L_X;
  const startX = attackRight ? CX - 40 : CX + 40;
  const attColor = attackRight ? meColor : oppColor;

  return (
    <motion.div
      className="panel relative overflow-hidden rounded-3xl"
      animate={highlight?.isGoal ? { x: [0, -5, 5, -4, 4, 0] } : { x: 0 }}
      transition={{ duration: 0.5 }}
    >
      <svg viewBox={`0 0 ${VB_W} ${VB_H}`} className="w-full" role="img" aria-label="라이브 경기 피치">
        {/* 잔디 이랑 */}
        {Array.from({ length: 8 }).map((_, i) => (
          <rect
            key={i}
            x={(VB_W / 8) * i}
            y={0}
            width={VB_W / 8}
            height={VB_H}
            fill={i % 2 === 0 ? "rgba(255,255,255,0.02)" : "transparent"}
          />
        ))}
        {/* 라인 */}
        <g fill="none" stroke="rgba(224,255,233,0.16)" strokeWidth={1}>
          <rect x={6} y={6} width={VB_W - 12} height={VB_H - 12} />
          <line x1={CX} y1={6} x2={CX} y2={VB_H - 6} />
          <circle cx={CX} cy={CY} r={26} />
          {/* 왼쪽(우리가 아닌 opp 목표) 박스 */}
          <rect x={6} y={CY - 34} width={30} height={68} />
          <rect x={6} y={CY - 16} width={12} height={32} />
          {/* 오른쪽 박스 */}
          <rect x={VB_W - 36} y={CY - 34} width={30} height={68} />
          <rect x={VB_W - 18} y={CY - 16} width={12} height={32} />
        </g>
        <circle cx={CX} cy={CY} r={1.6} fill="rgba(224,255,233,0.3)" />

        {/* 진영 방향 힌트 */}
        <text x={VB_W - 10} y={16} textAnchor="end" fontSize="9" fill="var(--color-dim)">
          → 우리 공격
        </text>

        {/* 양 팀 선수 22명: 포메이션 위치 + 이름 상시 표시. 교체·포메이션 변경 시 부드럽게
            이동하고, 진형 전체가 공 방향으로 살짝 쏠린다(lean). */}
        {([
          { setup: meSetup, side: "me" as const, color: meColor },
          { setup: oppSetup, side: "opp" as const, color: oppColor },
        ]).map(({ setup, side, color }) => (
          <motion.g
            key={side}
            initial={false}
            animate={{ x: lean * 6 }}
            transition={{ type: "spring", stiffness: 40, damping: 16 }}
          >
            {playerDots(setup, side).map((d) => {
              const isActive = activePlayerId !== undefined && d.playerId === activePlayerId;
              return (
                <motion.g
                  key={`${side}-${d.slotId}`}
                  initial={false}
                  animate={{ x: d.cx, y: d.cy }}
                  transition={{ type: "spring", stiffness: 120, damping: 18 }}
                >
                  <motion.circle
                    r={5.5}
                    initial={false}
                    fill={color}
                    stroke={isActive ? "var(--color-accent)" : "rgba(6,20,12,0.55)"}
                    strokeWidth={isActive ? 1.4 : 1}
                    animate={isActive ? { r: [5.5, 7.2, 5.5] } : { r: 5.5 }}
                    transition={isActive ? { duration: 0.9, repeat: Infinity, ease: "easeInOut" } : { duration: 0.2 }}
                  />
                  <text
                    textAnchor="middle"
                    dy={1.8}
                    fontSize="5"
                    fontWeight={700}
                    fill="#f2fff6"
                    stroke="rgba(0,0,0,0.45)"
                    strokeWidth={0.5}
                    paintOrder="stroke"
                  >
                    {jerseyOf(d.playerId)}
                  </text>
                  <text
                    textAnchor="middle"
                    dy={11.5}
                    fontSize="3.6"
                    fontWeight={isActive ? 800 : 600}
                    fill={isActive ? "var(--color-accent)" : "rgba(230,255,240,0.82)"}
                    stroke="rgba(0,0,0,0.55)"
                    strokeWidth={0.45}
                    paintOrder="stroke"
                  >
                    {NAME_BY_ID.get(d.playerId) ?? ""}
                  </text>
                </motion.g>
              );
            })}
          </motion.g>
        ))}

        <AnimatePresence mode="wait">
          {highlight ? (
            <motion.g key={highlight.id}>
              {/* 공격 점 3개 */}
              {[-14, 0, 16].map((off, i) => (
                <motion.circle
                  key={i}
                  r={5}
                  fill={attColor}
                  stroke="rgba(0,0,0,0.3)"
                  strokeWidth={0.8}
                  initial={{ cx: startX - (attackRight ? 20 : -20), cy: CY + off }}
                  animate={{ cx: goalX - (attackRight ? 24 : -24) + i * (attackRight ? 6 : -6), cy: CY + off * 0.5 }}
                  transition={{ duration: 1.2, ease: "easeOut" }}
                />
              ))}
              {/* 공 */}
              <motion.circle
                r={4}
                fill="#f6fff0"
                stroke="#0a1f13"
                strokeWidth={1}
                initial={{ cx: startX, cy: CY }}
                animate={{ cx: goalX, cy: CY }}
                transition={{ duration: 1.2, ease: "easeIn" }}
              />
            </motion.g>
          ) : (
            // 중원 점유 루프
            <motion.circle
              key="idle"
              r={4}
              fill="#f6fff0"
              stroke="#0a1f13"
              strokeWidth={1}
              initial={{ cx: CX - 30, cy: CY - 12 }}
              animate={{
                cx: [CX - 30, CX + 10, CX + 30, CX - 10, CX - 30],
                cy: [CY - 12, CY + 14, CY - 8, CY + 10, CY - 12],
              }}
              transition={{ duration: 6, ease: "easeInOut", repeat: Infinity }}
            />
          )}
        </AnimatePresence>
      </svg>

      {/* 골 플래시 */}
      <AnimatePresence>
        {highlight?.isGoal && (
          <motion.div
            key="flash"
            className="pointer-events-none absolute inset-0 flex items-center justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 0.9, 0] }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.2, times: [0, 0.2, 1] }}
            style={{ background: "radial-gradient(circle, rgba(200,255,60,0.5), transparent 70%)" }}
          >
            <span className="display text-4xl text-accent" style={{ textShadow: "0 2px 20px rgba(0,0,0,0.6)" }}>
              GOAL!
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
