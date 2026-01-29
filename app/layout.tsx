import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Link from "next/link";
import { Car, ArrowRight } from "lucide-react";
import Script from "next/script"; // ✅ 추가

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "CARENS - 투명한 장기렌트 가격비교",
  description: "딜러 수수료 없는 진짜 원가 견적을 확인하세요.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <head>
        {/* ✅ [추가] Google Tag Manager - Script 태그 */}
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
        {/* ✅ [추가] Google Tag Manager (noscript) - JS가 꺼진 환경용 */}
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
            <Link href="/" className="flex items-center gap-2 group">
              <div className="bg-blue-600 text-white p-1.5 rounded-lg group-hover:bg-blue-700 transition">
                <Car className="w-5 h-5" />
              </div>
              <span className="font-bold text-xl text-slate-900 tracking-tight">CARENS</span>
            </Link>
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