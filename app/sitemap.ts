import { MetadataRoute } from 'next';
import { supabase } from '@/lib/supabase';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = 'https://www.dr-rent.net';

  // 1. [고정 페이지] 비즈니스 중요도에 따른 수동 세팅
  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'daily', // 메인은 글이 자주 올라오니 매일 수집 권장
      priority: 1.0, // 가장 중요
    },
    {
      url: `${baseUrl}/consult`,
      lastModified: new Date(),
      changeFrequency: 'monthly', // 폼 페이지는 거의 안 바뀌니 한 달에 한 번
      priority: 0.9, // 핵심 전환(CVR) 페이지이므로 우선순위 매우 높음
    },
  ];

  // 2. [동적 페이지] Supabase DB에서 실제 글(Slug)과 작성일 실시간 연동
  const { data: posts } = await supabase
    .from('posts')
    .select('slug, created_at') // 우리가 새로 만든 영어 주소 가져오기
    .order('created_at', { ascending: false });

  const dynamicRoutes: MetadataRoute.Sitemap = (posts || []).map((post) => ({
    url: `${baseUrl}/posts/${post.slug}`, // 숫자 ID 대신 영문 슬러그 적용
    lastModified: new Date(post.created_at), // 🎯 퍼플렉시티 지적 반영: 실제 작성일 적용
    changeFrequency: 'weekly', // 정보성 포스트는 주 단위 수집 권장
    priority: 0.8, // 블로그 글의 우선순위
  }));

  // 고정 페이지 + DB에서 가져온 포스트 페이지 합체해서 반환!
  return [...staticRoutes, ...dynamicRoutes];
}