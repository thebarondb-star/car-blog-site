import { MetadataRoute } from 'next';
import { supabase } from '@/lib/supabase';

export const revalidate = 0; // 항상 최신 데이터 반영

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = 'https://www.dr-rent.net';

  // 1. DB에서 블로그 글 가져오기
  const { data: posts } = await supabase
    .from('posts')
    .select('slug, created_at') 
    .order('created_at', { ascending: false });

  // 2. 블로그 글 동적 사이트맵 생성
  const postUrls = (posts || []).map((post) => ({
    url: `${baseUrl}/posts/${post.slug}`,
    lastModified: new Date(post.created_at), 
    changeFrequency: 'weekly' as const,
    priority: 0.8,
  }));

  // ✅ 3. 카테고리 영문 주소 목록 (새로 추가된 부분!)
  const categories = ['special-price', 'hogaeng-escape', 'rent-info'];
  
  const categoryUrls = categories.map((slug) => ({
    url: `${baseUrl}/category/${slug}`,
    lastModified: new Date(), 
    changeFrequency: 'weekly' as const,
    priority: 0.8,
  }));

  return [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1,
    },
    {
      url: `${baseUrl}/consult`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.9,
    },
    ...categoryUrls, // ✅ 사이트맵에 카테고리 주소 병합
    ...postUrls,
  ];
}