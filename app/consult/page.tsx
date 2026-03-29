import { Metadata } from "next";
import { Suspense } from "react";
import ConsultForm from "./ConsultForm";

export const metadata: Metadata = {
  title: "장기렌트·리스 무료 견적 상담 신청 | 닥터렌트",
  description: "복잡한 장기렌트 견적, 닥터렌트가 거품 없이 투명하게 분석해 드립니다. 1:1 맞춤 상담 신청하고 최적의 견적을 확인하세요.",
  openGraph: {
    title: "장기렌트 무료 견적 상담 신청 | 닥터렌트",
    description: "숨어있는 수수료를 찾아드립니다. 지금 바로 무료 분석을 신청하세요.",
  }
};

export default function ConsultPage() {
  const businessSchema = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    "name": "닥터렌트",
    "image": "https://www.dr-rent.net/logo.png", // 실제 로고 URL로 수정 권장
    "@id": "https://www.dr-rent.net",
    "url": "https://www.dr-rent.net",
    "telephone": "010-XXXX-XXXX", // 실제 상담 번호로 수정
    "address": {
      "@type": "PostalAddress",
      "streetAddress": "상세 주소 입력", // 실제 사업자 주소
      "addressLocality": "서울",
      "addressRegion": "서울특별시",
      "postalCode": "XXXXX",
      "addressCountry": "KR"
    },
    "openingHoursSpecification": {
      "@type": "OpeningHoursSpecification",
      "dayOfWeek": [
        "Monday",
        "Tuesday",
        "Wednesday",
        "Thursday",
        "Friday"
      ],
      "opens": "09:00",
      "closes": "18:00"
    }
  };

  return (
    <main>
      {/* 구조화 데이터 삽입 */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(businessSchema) }}
      />
      <Suspense fallback={null}>
        <ConsultForm />
      </Suspense>
    </main>
  );
}