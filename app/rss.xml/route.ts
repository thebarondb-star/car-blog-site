import { supabase } from '@/lib/supabase';

// 캐시를 타지 않고 매번 새 글을 즉시 반영하도록 설정
export const revalidate = 0;

export async function GET() {
  const baseUrl = 'https://www.dr-rent.net';
  
  const { data: posts } = await supabase
    .from('posts')
    .select('title, slug, desc_text, content, created_at, updated_at') // 🎯 updated_at 추가 조회
    .order('created_at', { ascending: false })
    .limit(20);

  // XML 아이템 생성
  const itemsXml = (posts || [])
    .map((post) => {
      // 🎯 수정일(updated_at)이 있으면 그걸 쓰고, 없으면 작성일(created_at) 사용
      const targetDate = post.updated_at ?? post.created_at;
      const pubDate = new Date(targetDate || new Date()).toUTCString();

      return `
    <item>
      <title><![CDATA[${post.title}]]></title>
      <link>${baseUrl}/posts/${post.slug}</link> 
      <description><![CDATA[${post.desc_text || post.content?.substring(0, 150)}...]]></description>
      <pubDate>${pubDate}</pubDate>
      <guid>${baseUrl}/posts/${post.slug}</guid>
    </item>`;
    })
    .join('');

  const rssXml = `<?xml version="1.0" encoding="UTF-8" ?>
<rss version="2.0">
  <channel>
    <title>Dr.Rent - 닥터렌트</title>
    <link>${baseUrl}</link>
    <description>투명한 장기렌트 가격비교, 닥터렌트입니다.</description>
    <language>ko</language>
    ${itemsXml}
  </channel>
</rss>`;

  return new Response(rssXml, {
    headers: {
      // 🎯 브라우저가 XML로 정확히 인식하게 하고 utf-8 명시
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'no-store, max-age=0',
    },
  });
}