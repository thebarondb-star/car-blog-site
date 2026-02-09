import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import Script from "next/script";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Dr.Rent - 투명한 장기렌트 가격비교",
  description: "닥터렌트와 함께 딜러 수수료 없는 진짜 원가 견적을 확인하세요.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <head>
        {/* ✅ [유지] 구글 태그 매니저 (삭제되지 않도록 복구함) */}
        <Script
          id="gtm-script"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
              new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
              j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
              'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
              })(window,document,'script','dataLayer','GTM-TZ7J7B5T');
            `,
          }}
        />
      </head>
      <body className={inter.className}>
        {/* ✅ [유지] 구글 태그 매니저 NoScript */}
        <noscript>
          <iframe
            src="https://www.googletagmanager.com/ns.html?id=GTM-TZ7J7B5T"
            height="0"
            width="0"
            style={{ display: "none", visibility: "hidden" }}
          />
        </noscript>

        <header className="fixed top-0 w-full z-50 bg-white/90 backdrop-blur-md border-b border-slate-200 shadow-sm transition-all duration-300">
          <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
            
            {/* ✅ [수정됨] 이미지 로고 삭제 -> 텍스트 로고로 변경 */}
            <Link 
              href="/" 
              className="text-3xl font-black tracking-tighter text-slate-900 hover:text-blue-600 transition-colors"
            >
              Dr.Rent
            </Link>

            {/* ✅ [유지] 기존 버튼 디자인 (화살표 아이콘 포함) */}
            <Link href="/consult" className="bg-slate-900 text-white px-5 py-2.5 rounded-full text-sm font-bold hover:bg-blue-600 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 flex items-center gap-2">
              내 견적 진단하기 <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </header>

        <main className="pt-16 min-h-screen bg-slate-50">
          {children}
        </main>
      </body>
    </html>
  );
}