import { supabase } from '@/lib/supabase';

export async function GET() {
  const baseUrl = 'https://www.dr-rent.net';
  
  const { data: posts } = await supabase
    .from('posts')
    .select('*')
    .order('created_at', { ascending: false }) // 최신순 정렬 (created_at 기준)
    .limit(20);

  // XML 아이템 생성 (post.id -> post.slug 로 변경!)
  const itemsXml = (posts || [])
    .map((post) => `
    <item>
      <title><![CDATA[${post.title}]]></title>
      <link>${baseUrl}/posts/${post.slug}</link> 
      <description><![CDATA[${post.desc_text || post.content?.substring(0, 100)}...]]></description>
      <pubDate>${new Date(post.created_at || new Date()).toUTCString()}</pubDate>
      <guid>${baseUrl}/posts/${post.slug}</guid>
    </item>`)
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
      'Content-Type': 'text/xml',
    },
  });
}