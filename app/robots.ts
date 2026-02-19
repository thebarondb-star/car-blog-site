import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const baseUrl = 'https://www.dr-rent.net';

  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/admin/', '/api/'], // 관리자 및 API 페이지 검색 수집 제외 (보안/최적화)
    },
    // ✅ 사이트맵과 RSS를 모두 제공하여 구글/네이버 수집 완벽 지원
    sitemap: [
      `${baseUrl}/sitemap.xml`,
      `${baseUrl}/rss.xml`,
    ],
  };
}