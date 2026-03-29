import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(request: NextRequest) {
  try {
    const { action, title, category, content, desc_text } = await request.json();

    if (action === 'suggest_titles') {
      const msg = await anthropic.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 500,
        messages: [{
          role: 'user',
          content: `장기렌트 블로그의 "${category}" 카테고리에 쓸 글 제목을 3개 추천해주세요.
주제: ${title}

조건:
- 30자 이내
- 구글 검색 최적화
- 클릭을 유도하는 숫자/의문형 포함
- 한국어

JSON으로만 반환: {"titles": ["제목1", "제목2", "제목3"]}`
        }]
      });
      const text = msg.content[0].type === 'text' ? msg.content[0].text : '';
      const match = text.match(/\{[\s\S]*\}/);
      return NextResponse.json(JSON.parse(match?.[0] || '{"titles":[]}'));
    }

    if (action === 'suggest_keywords') {
      const msg = await anthropic.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 300,
        messages: [{
          role: 'user',
          content: `다음 장기렌트 블로그 글의 SEO 키워드 5개를 추천해주세요.
제목: ${title}
카테고리: ${category}

조건:
- 한국어 검색 키워드
- 롱테일 키워드 포함
- 실제 사람들이 검색할 법한 표현

JSON으로만 반환: {"keywords": ["키워드1", "키워드2", "키워드3", "키워드4", "키워드5"]}`
        }]
      });
      const text = msg.content[0].type === 'text' ? msg.content[0].text : '';
      const match = text.match(/\{[\s\S]*\}/);
      return NextResponse.json(JSON.parse(match?.[0] || '{"keywords":[]}'));
    }

    if (action === 'suggest_meta') {
      const msg = await anthropic.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 200,
        messages: [{
          role: 'user',
          content: `다음 블로그 글의 메타 설명을 작성해주세요.
제목: ${title}
카테고리: ${category}
현재 설명: ${desc_text || '없음'}

조건:
- 120자 이내
- 클릭률 높이는 표현
- 핵심 정보 + CTA 포함

JSON으로만 반환: {"meta": "메타설명 텍스트"}`
        }]
      });
      const text = msg.content[0].type === 'text' ? msg.content[0].text : '';
      const match = text.match(/\{[\s\S]*\}/);
      return NextResponse.json(JSON.parse(match?.[0] || '{"meta":""}'));
    }

    if (action === 'suggest_related') {
      const { createClient } = await import('@supabase/supabase-js');
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );
      const { data: posts } = await supabase
        .from('posts')
        .select('id, title, slug, category')
        .eq('is_published', true)
        .eq('category', category)
        .order('id', { ascending: false })
        .limit(6);

      if (!posts || posts.length === 0) {
        return NextResponse.json({ related: [] });
      }

      const msg = await anthropic.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 200,
        messages: [{
          role: 'user',
          content: `현재 글: "${title}"

다음 글 목록 중 가장 연관성 높은 글 2개를 골라주세요:
${posts.map((p, i) => `${i + 1}. [${p.slug}] ${p.title}`).join('\n')}

JSON으로만 반환: {"slugs": ["slug1", "slug2"]}`
        }]
      });
      const text = msg.content[0].type === 'text' ? msg.content[0].text : '';
      const match = text.match(/\{[\s\S]*\}/);
      const result = JSON.parse(match?.[0] || '{"slugs":[]}');

      const related = result.slugs
        .map((slug: string) => posts.find(p => p.slug === slug))
        .filter(Boolean)
        .slice(0, 2);

      return NextResponse.json({ related });
    }

    return NextResponse.json({ error: '알 수 없는 action' }, { status: 400 });
  } catch (error) {
    const msg = error instanceof Error ? error.message : '오류 발생';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
