import { MetadataRoute } from 'next';
import { supabase } from '@/lib/supabase';

export const revalidate = 0; // 항상 최신 데이터 반영

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = 'https://www.dr-rent.net';

  // 1. DB에서 블로그 글 가져오기 (updated_at 추가)
  const { data: posts } = await supabase
    .from('posts')
    .select('slug, created_at, updated_at') // 🎯 updated_at 컬럼 추가 조회
    .eq('is_published', true) // ✨ [추가됨] 임시저장 글 제외, 발행된 글만 가져오기
    .order('created_at', { ascending: false });

  // 2. 블로그 글 동적 사이트맵 생성
  const postUrls = (posts || []).map((post) => ({
    url: `${baseUrl}/posts/${post.slug}`,
    // 🎯 수정일(updated_at)이 있으면 그걸 쓰고, 없으면 작성일(created_at)을 쓰도록 똑똑하게 분기 처리
    lastModified: new Date(post.updated_at ?? post.created_at), 
    changeFrequency: 'weekly' as const,
    priority: 0.8,
  }));

  // 3. 카테고리 영문 주소 목록
  const categories = ['special-price', 'hogaeng-escape', 'rent-info'];
  
  const categoryUrls = categories.map((slug) => ({
    url: `${baseUrl}/category/${slug}`,
    changeFrequency: 'weekly' as const,
    priority: 0.9, 
  }));

  return [
    {
      url: baseUrl,
      changeFrequency: 'weekly',
      priority: 1,
    },
    {
      url: `${baseUrl}/consult`,
      changeFrequency: 'monthly',
      priority: 0.9,
    },
    ...categoryUrls,
    ...postUrls,
  ];
}