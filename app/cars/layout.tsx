import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "특가차량 전체보기 | 닥터렌트",
  description: "닥터렌트 이번 달 특가 장기렌트 차량 전체 리스트. 그랜저, 쏘렌토, 아반떼 등 선수금 0원부터 월 렌트료 비교. 판매완료 차량도 확인하세요.",
  keywords: ["특가차량", "장기렌트 특가", "장기렌트 최저가", "선수금 없는 장기렌트", "그랜저 장기렌트", "쏘렌토 장기렌트"],
  openGraph: {
    title: "특가차량 전체보기 | 닥터렌트",
    description: "이번 달 특가 장기렌트 차량 리스트. 선수금 0원부터 월 렌트료 투명하게 공개.",
    url: "https://www.dr-rent.net/cars",
    siteName: "닥터렌트",
    locale: "ko_KR",
    type: "website",
  },
  alternates: { canonical: "https://www.dr-rent.net/cars" },
};

export default function CarsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
