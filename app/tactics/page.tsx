import Link from "next/link";
import { Disclaimer } from "@/components/ui/Disclaimer";

// Task 13에서 실제 작전실로 교체될 임시 플레이스홀더 — 네비게이션 404 방지.
export default function TacticsPage() {
  return (
    <main className="flex flex-1 flex-col">
      <section
        aria-label="작전실"
        className="pitch-stripes flex flex-1 flex-col items-center justify-center px-5 py-24 text-center"
      >
        <p className="eyebrow text-accent">DUGOUT</p>
        <h1 className="display mt-4 text-5xl text-ink sm:text-7xl">작전실 준비 중</h1>
        <p className="mt-5 max-w-md text-base text-dim">
          라인업과 지시를 짜는 감독석은 곧 열립니다. 조금만 기다려 주세요.
        </p>
        <Link
          href="/"
          className="mt-9 rounded-full bg-accent px-6 py-3 text-sm font-black text-accent-ink transition-transform hover:-translate-y-0.5"
        >
          ← 홈으로 돌아가기
        </Link>
      </section>
      <footer className="mx-auto w-full max-w-5xl px-5 pb-6">
        <Disclaimer />
      </footer>
    </main>
  );
}
