"use client";

// 라이브 미니 피치: 실제 축구처럼 팀 전체가 국면 따라 하프라인을 넘나든다.
// - 동적 전형(tilt): 공세면 수비수까지 상대 진영 근처로 전진, 수세면 전원 수축.
// - 평상시: 점유 팀 선수 사이 패스 순환 + 전원이 공 방향으로 흐름(followBall) + 미세 흔들림.
// - 장면: livepitch-choreo가 만든 안무 — 2:1 월패스 슛, 코너킥 크로스+헤딩 경합(센터백 가담).
// 장면은 페이지(sceneSeenRef)가 단일 소스로 내려준다. "me"는 오른쪽 골문을 공격한다.
// (스펙 §6: docs/superpowers/specs/2026-07-18-match-highlight-jump-design.md)

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { MatchEventType } from "@/lib/engine/match";
import type { SideSetup } from "@/lib/types";
import { teamById } from "@/lib/data/teams";
import { playersOf } from "@/lib/data/players";
import { jerseyOf } from "@/components/tactics/tactics-labels";
import { dynamicDots, playerDots, VB_W, VB_H, type PlayerDot } from "./livepitch-geometry";
import { buildSceneChoreo } from "./livepitch-choreo";
import { layoutLabels, LABEL_FONT_SIZE, LABEL_PRIORITY, type LabelCandidate } from "./livepitch-labels";

// 피치 라벨용 짧은 이름: 서양식 이름은 성(마지막 토큰)만, 한글 등 단일 토큰은 그대로.
function shortName(full: string): string {
  const parts = full.trim().split(/\s+/);
  return parts.length > 1 ? parts[parts.length - 1] : full;
}

const CX = VB_W / 2;
const CY = VB_H / 2;

const PASS_MS = 1100; // 평상시 패스 순환 간격

/** 페이지가 내려주는 장면 요약 */
export interface ScenePlay {
  key: string; // 장면 식별자 (분+타입) — 키프레임 재시작용
  side: "me" | "opp";
  type: MatchEventType; // 헤드라인(골 플래시 판단)
  choreo: MatchEventType | null; // 안무 타입 (goal/corner/save/shot/chance, 없으면 null)
  playerId?: string;
}

// 선수별 유기적 방황(wander): 각 선수가 "제각기" 제자리 근처에서 실시간으로
// 자연스럽게 움직인다. 팀이 한꺼번에 같은 방향으로 미끄러지는 게 아니라, 개개인이
// 고유의 진폭·속도·경로로 끊임없이 위치를 미세 조정하는 실제 축구의 움직임을 낸다.
// 구조(수비/중원/공격 라인)는 앵커(dynamicDots)가 잡고, 이 방황이 개별 생동감을 준다.
type Role = "gk" | "def" | "mid" | "att";
function roleOf(slotId: string): Role {
  const p = slotId.replace(/[_0-9].*$/, "");
  if (p === "gk") return "gk";
  if (p === "cb" || p === "fb") return "def";
  if (p === "wg" || p === "st") return "att";
  return "mid";
}
// 활동 반경(px): 중원이 가장 넓게 돌아다니고, 수비는 좁게, GK는 거의 제자리.
const WANDER_AMP: Record<Role, number> = { gk: 3, def: 9, mid: 15, att: 13 };

function wanderOf(side: string, slotId: string): {
  xs: number[];
  ys: number[];
  times: number[];
  dur: number;
} {
  // 선수별 고유 시드(FNV-1a → xorshift)로 각자 다른 방황 경로·주기를 만든다.
  let h = 2166136261;
  for (const ch of `${side}:${slotId}`) {
    h ^= ch.charCodeAt(0);
    h = Math.imul(h, 16777619);
  }
  const rand = () => {
    h ^= h << 13;
    h ^= h >>> 17;
    h ^= h << 5;
    return (h >>> 0) / 4294967296;
  };
  const amp = WANDER_AMP[roleOf(slotId)];
  const n = 5;
  const xs: number[] = [];
  const ys: number[] = [];
  for (let i = 0; i < n; i++) {
    xs.push((rand() * 2 - 1) * amp);
    ys.push((rand() * 2 - 1) * amp);
  }
  xs.push(xs[0]); // 경로를 닫아 매끄럽게 순환
  ys.push(ys[0]);
  const times = Array.from({ length: n + 1 }, (_, i) => i / n);
  const dur = 4.5 + rand() * 4; // 4.5~8.5s, 선수마다 다른 주기 → 개별적으로 움직인다
  return { xs, ys, times, dur };
}

/** 렌더용 선수 목표 좌표 — 점 배치와 라벨 충돌 검사가 같은 값을 쓰도록 한 번만 계산한다. */
interface Target {
  key: string;
  side: "me" | "opp";
  dot: PlayerDot;
  tx: number;
  ty: number;
  /** 장면 안무에 가담 중인 선수 */
  involved: boolean;
}

interface LivePitchProps {
  meSetup: SideSetup;
  oppSetup: SideSetup;
  scene?: ScenePlay | null;
  /** 진형 쏠림 -1(상대 공세)~+1(우리 공세) — 국면(tilt) 산출에 쓴다 */
  lean?: number;
  /**
   * 킥오프 이후인가. false면 제자리 흔들림·볼홀더 확대를 모두 멈춘다.
   * 경기 시작 전인데 선수들이 계속 꿈틀대면 "이미 진행 중"으로 오독된다.
   */
  live?: boolean;
  /**
   * 골 장면에서 공이 골문에 닿았는가. 골 플래시와 화면 흔들림이 이 값에 반응한다.
   * 타이머를 페이지가 단일 소스로 들고 있어야 자막(SceneOverlay)과 어긋나지 않는다.
   */
  goalArrived?: boolean;
}

export function LivePitch({
  meSetup,
  oppSetup,
  scene = null,
  lean = 0,
  live = true,
  goalArrived = false,
}: LivePitchProps) {
  const meColor = teamById(meSetup.teamId)?.color2 ?? "var(--color-accent)";
  const oppColor = teamById(oppSetup.teamId)?.color1 ?? "var(--color-danger)";

  // 이름 라벨은 실제 온피치 두 팀의 선수 명단에서 조회한다 — 가상팀·월드컵팀 모두 대응.
  // (기존엔 정적 PLAYERS(16개국)만 봐서 월드컵 선수 이름이 비어 있었다.)
  const nameById = useMemo(() => {
    const m = new Map<string, string>();
    for (const p of playersOf(meSetup.teamId)) m.set(p.id, shortName(p.name));
    for (const p of playersOf(oppSetup.teamId)) m.set(p.id, shortName(p.name));
    return m;
  }, [meSetup.teamId, oppSetup.teamId]);

  const possession = lean >= 0 ? "me" : "opp";

  // 국면: 장면 중엔 공격 측으로 기울되, 과하게 밀면 양 팀이 한 진영에 뭉친다.
  // 0.72/0.28로 낮춰 공격 팀은 전진하되 수비 라인·상대 outlet이 세로로 남게 한다.
  const tilt = scene
    ? scene.side === "me"
      ? 0.72
      : 0.28
    : 0.5 + lean * 0.16 + (possession === "me" ? 0.06 : -0.06);

  // 킥오프 전에는 동적 전형(dynamicDots) 대신 포메이션 그대로의 정적 배치를 쓴다.
  // dynamicDots는 국면(tilt) 기준으로 최후방/최전방 라인을 잡는데, 중립(tilt=0.5)에서
  // 양 팀이 전부 중앙선 근처 좁은 띠에 몰려 "포메이션이 아니라 뭉쳐 있는" 그림이 됐다.
  // playerDots는 각 팀을 자기 진영에 포메이션 모양대로 세운다 = 킥오프 대형.
  const dotsMe = useMemo(
    () => (live ? dynamicDots(meSetup, "me", tilt) : playerDots(meSetup, "me")),
    [meSetup, tilt, live]
  );
  const dotsOpp = useMemo(
    () => (live ? dynamicDots(oppSetup, "opp", tilt) : playerDots(oppSetup, "opp")),
    [oppSetup, tilt, live]
  );

  // ── 장면 안무 ──
  const choreo = useMemo(() => {
    if (!scene || !scene.choreo) return null;
    const attackDots = scene.side === "me" ? dotsMe : dotsOpp;
    return buildSceneChoreo(scene.choreo, scene.side, attackDots, scene.playerId);
  }, [scene, dotsMe, dotsOpp]);

  // ── 평상시 패스 순환 ──
  const [passStep, setPassStep] = useState(0);
  useEffect(() => {
    if (choreo) return;
    const id = setInterval(() => setPassStep((s) => s + 1), PASS_MS);
    return () => clearInterval(id);
  }, [choreo]);

  const chain = (possession === "me" ? dotsMe : dotsOpp).filter((d) => d.slotId !== "gk");
  const holder = chain.length > 0 ? chain[passStep % chain.length] : undefined;

  // 전원이 따라갈 공의 관심 지점: 안무 중엔 마지막 키프레임(결과 지점), 평상시엔 볼홀더.
  // 킥오프 전에는 볼홀더가 아니라 센터 스팟에 둔다 — 아직 아무도 공을 잡지 않았는데
  // 골키퍼 앞에 공이 놓여 있으면 경기가 이미 진행 중인 것처럼 보인다.
  const ballCx = !live
    ? CX
    : choreo
      ? choreo.ball.xs[choreo.ball.xs.length - 1]
      : (holder?.cx ?? CX) + (possession === "me" ? 5 : -5);
  const ballCy = !live
    ? CY
    : choreo
      ? choreo.ball.ys[choreo.ball.ys.length - 1]
      : (holder?.cy ?? CY);

  const pulseSlot = choreo?.shooterSlot ?? choreo?.headerSlot;
  const holderSlot = holder?.slotId;

  // ── 렌더 목표 좌표(점) ──
  // 라벨 충돌 검사를 위해 각 선수의 최종 목표 좌표를 한 번만 계산해 둔다.
  // 점 좌표 자체는 기존과 동일 — 라벨 배치에만 쓰인다.
  // 앵커(선수 목표 좌표)는 전형(dynamicDots)이 잡는다 — 수비/중원/공격 라인 구조.
  // 팀 전체를 공 쪽으로 함께 미끄러뜨리지 않는다("다같이 한번에 움직인다"를 피함).
  // 개별 생동감은 아래 렌더의 선수별 wander가 담당한다. 주인공/동료만 choreo로 이동.
  const targets = useMemo<Target[]>(() => {
    const out: Target[] = [];
    for (const { dots, side } of [
      { dots: dotsMe, side: "me" as const },
      { dots: dotsOpp, side: "opp" as const },
    ]) {
      for (const d of dots) {
        const override = scene?.side === side ? choreo?.overrides[d.slotId] : undefined;
        out.push({
          key: `${side}-${d.slotId}`,
          side,
          dot: d,
          tx: override ? override.cx : d.cx,
          ty: override ? override.cy : d.cy,
          involved: !!override,
        });
      }
    }
    return out;
  }, [dotsMe, dotsOpp, scene?.side, choreo]);

  // ── 이름 라벨 배치 ──
  // 좌표가 바뀔 때만 O(n²) 충돌 검사를 돌린다(매 프레임 아님 — 애니메이션은 transform으로만 진행).
  const labels = useMemo(() => {
    const candidates: LabelCandidate[] = targets.map((t) => {
      const onSceneSide = scene?.side === t.side;
      const priority =
        onSceneSide && pulseSlot === t.dot.slotId
          ? LABEL_PRIORITY.star
          : t.involved || (!choreo && possession === t.side && t.dot.slotId === holderSlot)
            ? LABEL_PRIORITY.involved
            : t.dot.slotId === "gk"
              ? LABEL_PRIORITY.keeper
              : LABEL_PRIORITY.normal;
      return {
        key: t.key,
        text: nameById.get(t.dot.playerId) ?? "",
        cx: t.tx,
        cy: t.ty,
        priority,
      };
    });
    // 다른 선수의 점(마커)도 라벨이 덮으면 안 되는 장애물이다 — 뒤에 그려진 점이 앞 라벨을 가린다.
    const obstacles = targets.map((t) => ({ key: t.key, cx: t.tx, cy: t.ty }));
    return layoutLabels(candidates, { minY: 0, maxY: VB_H, obstacles });
  }, [targets, nameById, scene?.side, pulseSlot, choreo, possession, holderSlot]);

  return (
    <motion.div
      className="relative overflow-hidden rounded-panel border border-line"
      style={{ background: "linear-gradient(180deg, var(--color-turf), var(--color-turf-2))" }}
      // 화면 흔들림도 골이 "들어간 순간"에 맞춘다(장면 시작이 아니라).
      animate={goalArrived ? { x: [0, -5, 5, -4, 4, 0] } : { x: 0 }}
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
          <rect x={6} y={CY - 34} width={30} height={68} />
          <rect x={6} y={CY - 16} width={12} height={32} />
          <rect x={VB_W - 36} y={CY - 34} width={30} height={68} />
          <rect x={VB_W - 18} y={CY - 16} width={12} height={32} />
        </g>
        <circle cx={CX} cy={CY} r={1.6} fill="rgba(224,255,233,0.3)" />

        {/* 진영 방향 힌트 */}
        <text x={VB_W - 10} y={16} textAnchor="end" fontSize="9" fill="var(--color-dim)">
          → 우리 공격
        </text>

        {/* 양 팀 선수 22명 */}
        {targets.map((t) => {
          const { side, dot: d } = t;
          const color = side === "me" ? meColor : oppColor;
          const isPulse = scene?.side === side && pulseSlot === d.slotId;
          const isHolder = live && !choreo && possession === side && d.slotId === holderSlot;
          const wan = wanderOf(side, d.slotId);
          // 방황은 개별 생동감용 — 킥오프 전(정지)과 choreo에 가담 중인 주인공/동료
          // (의도된 동선)에는 끄고, 그 외 선수만 각자 자연스럽게 움직인다.
          const doWander = live && !t.involved;
          // 이름 라벨은 배치가 결정된 선수만 그린다(겹치면 숨기고 등번호로 식별).
          const label = labels.get(t.key);
          return (
            <motion.g
              key={t.key}
              initial={false}
              animate={{ x: t.tx, y: t.ty }}
              transition={{ type: "spring", stiffness: t.involved ? 70 : 120, damping: 18 }}
            >
              {/* 선수별 유기적 방황 — 각자 고유의 경로·주기로 제자리 근처에서 실시간
                  으로 자연스럽게 움직인다(팀이 한꺼번에가 아니라 개개인이). 킥오프 전
                  (live=false)·choreo 가담 선수는 멈춰 의도된 동선을 방해하지 않는다. */}
              <motion.g
                animate={
                  doWander ? { x: wan.xs, y: wan.ys } : { x: 0, y: 0 }
                }
                transition={
                  doWander
                    ? {
                        duration: wan.dur,
                        times: wan.times,
                        repeat: Infinity,
                        ease: "easeInOut",
                      }
                    : { duration: 0.3 }
                }
              >
                {/* 확대는 r 애니메이션 대신 transform scale — SVG 속성 r은 framer가
                    마운트 시점에 undefined로 읽어 콘솔 에러를 내는 문제가 있다. */}
                <motion.g
                  initial={false}
                  animate={isPulse ? { scale: [1, 1.35, 1] } : { scale: isHolder ? 1.15 : 1 }}
                  transition={
                    isPulse
                      ? { duration: 0.9, repeat: Infinity, ease: "easeInOut" }
                      : { duration: 0.25 }
                  }
                >
                  <circle
                    r={5.5}
                    fill={color}
                    stroke={isPulse ? "var(--color-accent)" : "rgba(11,16,14,0.55)"}
                    strokeWidth={isPulse ? 1.4 : 1}
                  />
                </motion.g>
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
              </motion.g>
              {/* 이름은 흔들림 그룹 밖에 둔다 — 충돌 계산과 실제 위치를 일치시키고 가독성을 지킨다. */}
              {label && (
                <text
                  textAnchor="middle"
                  dy={label.dy}
                  fontSize={LABEL_FONT_SIZE}
                  fontWeight={isPulse ? 800 : 600}
                  fill={isPulse ? "var(--color-accent)" : "rgba(230,255,240,0.82)"}
                  stroke="rgba(0,0,0,0.55)"
                  strokeWidth={0.45}
                  paintOrder="stroke"
                >
                  {nameById.get(d.playerId) ?? ""}
                </text>
              )}
            </motion.g>
          );
        })}

        {/* 공: 평상시엔 점유 팀 패스 순환, 장면엔 안무 키프레임(월패스/코너 크로스) */}
        {choreo ? (
          <motion.circle
            key={scene!.key}
            r={4}
            fill="#f6fff0"
            stroke="#101613"
            strokeWidth={1}
            initial={{ cx: choreo.ball.xs[0], cy: choreo.ball.ys[0] }}
            animate={{ cx: choreo.ball.xs, cy: choreo.ball.ys }}
            transition={{ duration: choreo.ball.dur, times: choreo.ball.times, ease: "easeInOut" }}
          />
        ) : (
          <motion.circle
            key="ball-idle"
            r={4}
            fill="#f6fff0"
            stroke="#101613"
            strokeWidth={1}
            initial={false}
            // 위에서 이미 계산한 ballCx/ballCy를 그대로 쓴다. 여기서 볼홀더 좌표를
            // 다시 계산하고 있어서, 킥오프 전 센터 스팟 처리가 선수 배치에만 먹고
            // 공에는 안 먹었다(공만 골키퍼 앞에 남았다).
            animate={{ cx: ballCx, cy: ballCy }}
            transition={{ duration: 0.75, ease: "easeInOut" }}
          />
        )}
      </svg>

      {/* 골 플래시 — 공이 골문에 닿은 뒤에 터진다. 장면 시작에 띄우면 공이 아직 중원에
          있는데 "GOAL!"이 먼저 뜨는 어긋남이 2초간 지속된다. */}
      <AnimatePresence>
        {goalArrived && scene && (
          <motion.div
            key={scene.key}
            className="pointer-events-none absolute inset-0 flex items-center justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 0.9, 0] }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.2, times: [0, 0.2, 1] }}
            style={{ background: "radial-gradient(circle, rgba(34,211,238,0.5), transparent 70%)" }}
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
