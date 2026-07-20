"use client";

// 승부차기 화면 — 무승부로 끝난 경기에서만 진입한다.
// 1) KickerOrder: 온피치 11명 중 5명 + 순서 지정 → 2) ShootoutStage: 킥 1개씩 재생.
// 결과(shootout)는 store.runShootout으로 확정되고, "결과 보기"로 /result 이동.

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAppStore } from "@/lib/store";

import { KickerOrder } from "@/components/shootout/KickerOrder";
import { ShootoutStage } from "@/components/shootout/ShootoutStage";
import { Disclaimer } from "@/components/ui/Disclaimer";

export default function ShootoutPage() {
  const router = useRouter();
  const match = useAppStore((s) => s.match);
  const shootout = useAppStore((s) => s.shootout);
  const runShootout = useAppStore((s) => s.runShootout);

  const [phase, setPhase] = useState<"order" | "stage">("order");

  // persist(sessionStorage) 재수화 대기 — match 페이지와 동일한 가드 패턴.
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    const p = useAppStore.persist;
    if (!p || p.hasHydrated()) {
      // zustand persist(sessionStorage) 재수화 여부를 확인하는 외부 시스템 동기화라 setState가 맞다.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setHydrated(true);
      return;
    }
    return p.onFinishHydration(() => setHydrated(true));
  }, []);

  // 무승부로 종료된 경기가 아니면 홈으로. (직접 URL 진입/비정상 상태 방지)
  const validDraw = Boolean(match?.finished && match.scoreMe === match.scoreOpp);
  useEffect(() => {
    if (hydrated && !validDraw) router.replace("/");
  }, [hydrated, validDraw, router]);

  if (!hydrated || !match) {
    return (
      <main id="main" className="flex flex-1 scroll-mt-14 items-center justify-center px-5 py-24 text-center">
        <p className="text-sm text-dim">승부차기를 준비하는 중…</p>
      </main>
    );
  }
  if (!validDraw) {
    return (
      <main id="main" className="flex flex-1 scroll-mt-14 items-center justify-center px-5 py-24 text-center">
        <p className="text-sm text-dim">홈으로 이동합니다…</p>
      </main>
    );
  }

  const confirmKickers = (kickers: string[]) => {
    runShootout(kickers);
    setPhase("stage");
  };

  // 스토어에 이미 확정된 shootout이 있으면(예: /result에서 뒤로가기로 재진입)
  // phase state(항상 "order"로 시작)를 무시하고 결과 재생 화면을 보여준다.
  // 그래야 재수화 후 마운트마다 킥커 선택으로 되돌아가 runShootout이 결과를
  // 덮어쓰는 것을 막을 수 있다. (hydrated 가드 이후에만 렌더되므로 shootout 값은
  // 이미 재수화가 끝난 상태다.)
  const effectivePhase = shootout ? "stage" : phase;

  return (
    <main id="main" className="mx-auto flex w-full max-w-md flex-1 scroll-mt-14 flex-col gap-4 px-4 py-6 sm:px-5">
      <h1 className="sr-only">승부차기</h1>
      <div className="flex items-center justify-between">
        <p className="stat-num text-sm text-dim">
          정규시간 {match.scoreMe} : {match.scoreOpp} 무승부
        </p>
        <Link href="/" className="text-[13px] text-dim hover:text-ink">
          홈으로 나가기
        </Link>
      </div>

      {effectivePhase === "stage" && shootout ? (
        <ShootoutStage
          result={shootout}
          meSetup={match.me}
          oppSetup={match.opp}
          onFinish={() => router.push("/result")}
        />
      ) : (
        <KickerOrder meSetup={match.me} stamina={match.stamina} onConfirm={confirmKickers} />
      )}

      <footer className="mx-auto mt-2 w-full">
        <Disclaimer />
      </footer>
    </main>
  );
}
