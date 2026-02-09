import { MetadataRoute } from 'next';
import { supabase } from '@/lib/supabase';

export const revalidate = 0; // 항상 최신 데이터 반영 (캐싱 안 함)

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = 'https://www.dr-rent.net'; // 도메인 주소

  // 1. DB에서 모든 글(posts)의 ID 가져오기
  const { data: posts } = await supabase
    .from('posts')
    .select('id')
    .order('id', { ascending: false });

  // 2. 블로그 글 동적 사이트맵 생성
  const postUrls = (posts || []).map((post) => ({
    url: `${baseUrl}/posts/${post.id}`,
    lastModified: new Date(), // 혹은 글 수정 날짜 (여기선 현재 날짜로 설정)
    changeFrequency: 'weekly' as const,
    priority: 0.8,
  }));

  // 3. 고정 페이지(메인, 상담신청) + 동적 페이지 합치기
  return [
    {
      url: baseUrl, // 메인 페이지
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1, // 가장 중요
    },
    {
      url: `${baseUrl}/consult`, // 상담 신청 페이지
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.5,
    },
    ...postUrls, // 위에서 만든 블로그 글들 쫙 붙이기
  ];
}