import type { Metadata, Viewport } from "next";
import { Gothic_A1, Barlow_Semi_Condensed } from "next/font/google";
import "./globals.css";
import { AppHeader } from "@/components/ui/AppHeader";

// 타입 시스템 2종.
// - Gothic A1: 한글 UI 본문. 900까지 있어 중계 자막톤 헤드라인을 한글에서도 버틴다.
// - Barlow Semi Condensed: 라틴/숫자 전용 컨덴스드. 스코어·분·능력치처럼 자릿수가
//   중요한 값에서 폭을 아끼면서 스포츠 그래픽 톤을 낸다. 한글은 자동으로 Gothic A1로
//   폴백되므로 "숫자는 컨덴스드, 한글은 고딕"이라는 중계 화면 조합이 그대로 나온다.
const gothic = Gothic_A1({
  subsets: ["latin"],
  weight: ["400", "500", "700", "900"],
  variable: "--font-gothic",
  display: "swap",
});

const barlow = Barlow_Semi_Condensed({
  subsets: ["latin"],
  weight: ["600", "700", "900"],
  variable: "--font-barlow",
  display: "swap",
});

const DESCRIPTION =
  "국가대표 전술 시뮬레이터. 대표팀을 골라 포메이션과 지시를 짜고 90분을 직접 지휘하세요. 모든 능력치는 가상 데이터입니다.";

// 페이지 배경(--color-pitch)과 맞춘 브라우저 크롬 색상(주소창 등).
// 주의: globals.css의 --color-pitch를 바꾸면 여기도 같이 바꿔야 한다. 토큰을 참조할 수
// 없는 자리라(메타 태그) 값이 갈리면 모바일에서 주소창만 옛 색으로 남는다.
export const viewport: Viewport = {
  themeColor: "#070C0A",
};

export const metadata: Metadata = {
  // 상대 경로 OG 이미지(/og.png)를 절대 URL로 해석하기 위한 기준값.
  metadataBase: new URL("https://touchline-fc.vercel.app"),
  title: "터치라인, 당신이 감독이라면",
  description: DESCRIPTION,
  openGraph: {
    title: "터치라인, 당신이 감독이라면",
    description: DESCRIPTION,
    images: ["/og.png"],
    locale: "ko_KR",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "터치라인, 당신이 감독이라면",
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
    <html lang="ko" className={`${gothic.variable} ${barlow.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <a
          href="#main"
          className="sr-only focus-visible:not-sr-only focus-visible:fixed focus-visible:left-3 focus-visible:top-3 focus-visible:z-50 focus-visible:rounded-full focus-visible:bg-accent focus-visible:px-4 focus-visible:py-2 focus-visible:text-sm focus-visible:font-bold focus-visible:text-accent-ink"
        >
          본문으로 건너뛰기
        </a>
        <AppHeader />
        {children}
      </body>
    </html>
  );
}
