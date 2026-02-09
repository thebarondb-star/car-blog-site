import { supabase } from '@/lib/supabase';

export async function GET() {
  // 실제 도메인으로 수정 (배포 후에는 실제 주소로 작동)
  const baseUrl = 'https://www.dr-rent.net';
  
  // DB에서 최신 글 20개 가져오기
  const { data: posts } = await supabase
    .from('posts')
    .select('*')
    .order('id', { ascending: false }) // 최신순 정렬
    .limit(20);

  // XML 아이템 생성
  const itemsXml = (posts || [])
    .map((post) => `
    <item>
      <title><![CDATA[${post.title}]]></title>
      <link>${baseUrl}/posts/${post.id}</link>
      <description><![CDATA[${post.desc_text || post.content?.substring(0, 100)}...]]></description>
      <pubDate>${new Date(post.created_at || new Date()).toUTCString()}</pubDate>
      <guid>${baseUrl}/posts/${post.id}</guid>
    </item>`)
    .join('');

  // 전체 RSS 구조
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
      'Content-Type': 'text/xml',
    },
  });
}