import type { Metadata } from "next";
import { Noto_Sans_KR } from "next/font/google";
import "./globals.css"; // 👈 이 부분이 스타일을 연결하는 핵심 코드입니다.

const notoSansKr = Noto_Sans_KR({
  subsets: ["latin"],
  weight: ["100", "300", "400", "500", "700", "900"],
});

export const metadata: Metadata = {
  title: "카렌스 - 투명한 장기렌트 견적 분석",
  description: "딜러 수당 거품을 뺀 진짜 장기렌트 원가를 공개합니다.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body className={notoSansKr.className}>
        {children}
      </body>
    </html>
  );
}