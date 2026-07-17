import type { Metadata } from "next";
import "./globals.css";

const DESCRIPTION =
  "국가대표 전술 시뮬레이터. 대표팀을 골라 포메이션과 지시를 짜고 90분을 직접 지휘하세요. 모든 능력치는 가상 데이터입니다.";

export const metadata: Metadata = {
  // TODO(Task 19): 실제 배포 도메인이 확정되면 아래 metadataBase를 교체한다.
  // 상대 경로 OG 이미지(/og.png)를 절대 URL로 해석하기 위한 기준값이며, 미설정 시
  // Next.js가 localhost로 폴백하며 콘솔 경고를 남기므로 배포 예정 URL을 임시 지정한다.
  metadataBase: new URL("https://dugout.vercel.app"),
  title: "더그아웃 — 당신이 감독이라면",
  description: DESCRIPTION,
  openGraph: {
    title: "더그아웃 — 당신이 감독이라면",
    description: DESCRIPTION,
    images: ["/og.png"],
    locale: "ko_KR",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "더그아웃 — 당신이 감독이라면",
    description: DESCRIPTION,
    images: ["/og.png"],
  },
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
