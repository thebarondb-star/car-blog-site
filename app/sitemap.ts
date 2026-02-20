import { MetadataRoute } from 'next';
import { supabase } from '@/lib/supabase';

export const revalidate = 0; // 항상 최신 데이터 반영

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = 'https://www.dr-rent.net';

  // 1. DB에서 블로그 글 가져오기 
  // (💡 잼민이 팁: 나중에 DB에 updated_at 컬럼을 만들면 select('slug, created_at, updated_at')으로 수정하세요!)
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

  // 3. 카테고리 영문 주소 목록
  const categories = ['special-price', 'hogaeng-escape', 'rent-info'];
  
  const categoryUrls = categories.map((slug) => ({
    url: `${baseUrl}/category/${slug}`,
    // 🗑️ 퍼플렉시티 피드백 수용: 불필요한 현재시간(new Date) 할당 삭제
    changeFrequency: 'weekly' as const,
    priority: 0.8,
  }));

  return [
    {
      url: baseUrl,
      // 🗑️ 퍼플렉시티 피드백 수용: 불필요한 현재시간(new Date) 할당 삭제
      changeFrequency: 'weekly', // 📉 daily -> weekly로 현실성 있게 조정
      priority: 1,
    },
    {
      url: `${baseUrl}/consult`,
      // 🗑️ 퍼플렉시티 피드백 수용: 불필요한 현재시간(new Date) 할당 삭제
      changeFrequency: 'monthly',
      priority: 0.9,
    },
    ...categoryUrls,
    ...postUrls,
  ];
}