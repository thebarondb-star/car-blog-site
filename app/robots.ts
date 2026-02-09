import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: '/admin/', // 관리자 페이지는 검색 수집 제외 (보안상 좋음)
    },
    // ✅ [수정됨] 사이트맵과 RSS를 배열로 묶어서 둘 다 제공
    sitemap: [
      'https://www.dr-rent.net/sitemap.xml',
      'https://www.dr-rent.net/rss.xml',
    ],
  };
}