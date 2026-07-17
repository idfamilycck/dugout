import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "더그아웃 — 당신이 감독이라면",
  description:
    "국가대표 전술 시뮬레이터. 대표팀을 골라 포메이션과 지시를 짜고 90분을 직접 지휘하세요. 모든 능력치는 가상 데이터입니다.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className="h-full antialiased">
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
