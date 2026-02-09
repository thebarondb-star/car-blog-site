import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*', // 모든 검색 엔진 봇에게
      allow: '/',     // 모든 페이지 접속 허용
      disallow: '/admin/', // ⛔ 단, 관리자 페이지(admin) 하위는 절대 출입 금지!
    },
    sitemap: 'https://www.dr-rent.net/sitemap.xml', // 아까 만든 사이트맵 위치도 여기서 알려줌
  };
}