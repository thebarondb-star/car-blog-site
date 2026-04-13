import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import * as fs from 'fs/promises';
import * as path from 'path';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const TODAY = new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' });
const YEAR_MONTH = `${new Date().getFullYear()}년 ${new Date().getMonth() + 1}월`;

/**
 * Gemini Google Search로 자동차 시장 최신 뉴스 검색
 * 신차 여부도 감지
 */
async function searchCarMarketNews(): Promise<{
  isNewCar: boolean;
  topic: string;
  newsContext: string;
}> {
  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [{ text: `${TODAY} 기준 한국 자동차 시장에서 가장 화제가 되는 뉴스를 검색해줘.

다음 순서로 주제를 선택해:
1. 최근 1주일 내 신차 출시/공개/예약 소식이 있으면 → 신차 뉴스
2. 신차 소식이 없으면 → 자동차 시장 동향 (보조금 변경, 가격 인상/인하, 인기 차종 트렌드, EV 시장, 중고차 시장 등) 중 가장 화제인 것

응답 형식:
[유형]
신차 또는 시장동향

[주제]
(블로그 글 제목으로 쓸 30자 이내 주제. 차종명/수치 포함)

[핵심 정보]
(관련 최신 기사 3-5개의 핵심 내용 요약. 구체적 수치, 날짜, 가격, 차종명 포함. 600자 이내)` }]
          }],
          tools: [{ google_search: {} }],
        }),
      }
    );

    if (!res.ok) throw new Error(`Gemini Search 실패: ${res.status}`);
    const data = await res.json() as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

    const typeMatch = text.match(/\[유형\]\s*([\s\S]*?)(?=\[주제\])/);
    const topicMatch = text.match(/\[주제\]\s*([\s\S]*?)(?=\[핵심 정보\])/);
    const infoMatch = text.match(/\[핵심 정보\]\s*([\s\S]*?)$/);

    const isNewCar = (typeMatch?.[1]?.trim() || '').includes('신차');
    const topic = topicMatch?.[1]?.trim().replace(/\n/g, ' ') || `${YEAR_MONTH} 자동차 시장 동향`;
    const newsContext = infoMatch?.[1]?.trim() || '';

    console.log(`[CAR-MARKET] 유형: ${isNewCar ? '신차' : '시장동향'} | 주제: ${topic}`);
    return { isNewCar, topic, newsContext };
  } catch (err) {
    console.error('[CAR-MARKET] 뉴스 검색 실패:', err instanceof Error ? err.message : err);
    return { isNewCar: false, topic: `${YEAR_MONTH} 자동차 시장 주요 이슈`, newsContext: '' };
  }
}

/**
 * Unsplash 이미지 다운로드 + Supabase 업로드
 */
async function downloadAndSave(imageUrl: string, filename: string, mimeType = 'image/jpeg'): Promise<string> {
  try {
    const res = await fetch(imageUrl);
    if (!res.ok) throw new Error(`fetch 실패: ${res.status}`);
    const buffer = Buffer.from(await res.arrayBuffer());
    const ext = mimeType.includes('png') ? 'png' : 'jpg';
    const fname = `${filename}.${ext}`;

    const localDir = path.join(process.cwd(), 'public', 'picture');
    await fs.mkdir(localDir, { recursive: true });
    await fs.writeFile(path.join(localDir, fname), buffer);

    const storagePath = `pictures/${fname}`;
    const { error } = await supabase.storage.from('consult_photos').upload(storagePath, buffer, { contentType: mimeType, upsert: true });
    if (error) throw new Error(error.message);

    const { data } = supabase.storage.from('consult_photos').getPublicUrl(storagePath);
    return data.publicUrl;
  } catch (err) {
    console.error('[IMG] downloadAndSave 실패:', err instanceof Error ? err.message : err);
    return imageUrl;
  }
}

type ImageSlot = { query: string; alt: string; caption: string };

/**
 * 이미지 슬롯 3개 Unsplash 검색 + 저장
 */
async function getImages(slots: ImageSlot[]): Promise<Array<{ url: string; alt: string; caption: string; credit: string }>> {
  const results = [];
  for (const slot of slots) {
    try {
      const res = await fetch(
        `https://api.unsplash.com/search/photos?query=${encodeURIComponent(slot.query)}&per_page=3&orientation=landscape&client_id=${process.env.UNSPLASH_ACCESS_KEY}`
      );
      if (!res.ok) { results.push({ url: '', alt: slot.alt, caption: slot.caption, credit: '' }); continue; }
      const d = await res.json() as { results?: Array<{ urls?: { regular?: string }; user?: { name?: string } }> };
      const img = d.results?.[0];
      if (!img?.urls?.regular) { results.push({ url: '', alt: slot.alt, caption: slot.caption, credit: '' }); continue; }
      const savedUrl = await downloadAndSave(img.urls.regular, `car_market_${Date.now()}_${results.length}`, 'image/jpeg');
      results.push({ url: savedUrl, alt: slot.alt, caption: slot.caption, credit: `Photo by ${img.user?.name || 'Unsplash'} on Unsplash` });
    } catch {
      results.push({ url: '', alt: slot.alt, caption: slot.caption, credit: '' });
    }
  }
  return results;
}

/**
 * Claude로 자동차시장 글 생성
 */
async function generateCarMarketPost(topic: string, isNewCar: boolean, newsContext: string): Promise<{
  title: string; slug: string; desc_text: string; content: string;
  keywords: string[]; image_query: string;
  image_slots: ImageSlot[];
}> {
  const TODAY_KR = TODAY;

  // Step1: 메타 JSON
  const metaPrompt = `You are a Korean automotive news blog expert.
Date: ${TODAY_KR}
Topic: ${topic}
Type: ${isNewCar ? '신차 출시/공개' : '자동차 시장 동향'}

image_slots 3개 규칙:
※ 이미지는 Unsplash stock photo임. 수치·표·그래프는 이미지가 아닌 본문 HTML 표로 처리할 것.
※ 이미지는 반드시 "실제 사진에 찍힐 수 있는 장면"만 묘사할 것.
- query: 실제 사진 장면 기준 영어 검색어 (2-4단어)
- alt: 주제 키워드 + 사진에 실제로 보이는 장면 묘사 (15-40자 한글). 데이터·수치 설명 금지.
  ✅ 좋은 예: "신형 현대 아이오닉9 측면 외관 디자인", "자동차 전시장에서 신차를 살펴보는 고객"
  ❌ 나쁜 예: "전기차 보조금 비교표", "신차 가격 인상 현황" (사진에 없는 데이터 설명 금지)
- caption: 이 사진이 본문 어느 맥락에서 등장하는지 독자에게 한 줄 설명 (15-35자). 데이터 설명 금지.
  ✅ 좋은 예: "전시장에서 실차를 직접 확인하는 것이 중요하다"
  ❌ 나쁜 예: "모델별 가격 비교" (금지)

Return ONLY this JSON:
{"title":"제목(30자이내)","slug":"english-slug","desc_text":"메타설명(100-120자)","image_query":"english 2-3 words for Unsplash","keywords":["키워드1","키워드2","키워드3","키워드4","키워드5"],"image_slots":[{"query":"english query 1","alt":"SEO alt 한글 (실제 장면 묘사)","caption":"독자 설명 한글 (장면 맥락)"},{"query":"english query 2","alt":"SEO alt 한글","caption":"독자 설명 한글"},{"query":"english query 3","alt":"SEO alt 한글","caption":"독자 설명 한글"}]}`;

  let meta: Record<string, unknown> = {};
  try {
    const msg = await anthropic.messages.create({
      model: 'claude-sonnet-4-6', max_tokens: 600, temperature: 0.7,
      messages: [{ role: 'user', content: metaPrompt }],
    });
    const text = msg.content[0].type === 'text' ? msg.content[0].text : '';
    const cleaned = text.replace(/```json/g, '').replace(/```/g, '').trim();
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (match) meta = JSON.parse(match[0]);
  } catch (err) {
    console.error('[CAR-MARKET] 메타 생성 실패:', err instanceof Error ? err.message : err);
  }

  // Step2: 본문
  const newsSection = newsContext ? `\n━━ 검색된 최신 뉴스 (반드시 참고하되 표현 방식은 독창적으로) ━━\n${newsContext}\n` : '';
  const typeGuide = isNewCar
    ? `- 신차 정보 글: 차종명, 출시일, 가격, 주요 사양, 장기렌트로 탈 경우 예상 월납입금 포함`
    : `- 시장 동향 글: 업계 트렌드, 소비자 관점, 장기렌트 연관성, 실제 구매/렌트 시 참고 포인트`;

  const contentPrompt = `당신은 자동차 업계를 잘 아는 현장 전문가입니다.
오늘 날짜: ${TODAY_KR}

【절대 규칙】
1. 기사를 단순 복사하지 말 것. 전문가 시각으로 재해석해서 쓸 것.
2. 독자에게 실질적으로 도움이 되는 정보 위주로.
3. 어미는 '요'체와 '다'체를 자연스럽게 섞을 것.
4. 글을 끝까지 완성할 것 (마지막 태그까지).
5. 순수 HTML만 반환.
${newsSection}
주제: ${topic}
${typeGuide}

━━ 반드시 포함할 요소 ━━
① 비교표 (회색 헤더):
<table style="width:100%;border-collapse:collapse;margin:1.5rem 0;font-size:0.95rem;"><thead><tr style="background:#f1f5f9;"><th style="padding:12px;text-align:left;font-weight:700;color:#1e293b;border-bottom:2px solid #cbd5e1;">항목</th><th style="padding:12px;text-align:center;font-weight:700;color:#1e293b;border-bottom:2px solid #cbd5e1;">내용</th></tr></thead><tbody><tr style="border-bottom:1px solid #e2e8f0;background:white;"><td style="padding:12px;color:#334155;">항목</td><td style="padding:12px;text-align:center;color:#334155;">값</td></tr></tbody></table>

② 핵심 포인트 박스:
<div style="background:#eff6ff;border-left:4px solid #2563eb;padding:1rem 1.25rem;border-radius:0 0.5rem 0.5rem 0;margin:1.5rem 0;"><p style="font-weight:700;color:#1d4ed8;margin:0 0 0.5rem;">💡 핵심</p><p style="margin:0;color:#1e40af;">내용</p></div>

③ 이미지 마커: <!-- IMAGE_SLOT -->

━━ 글 구성 ━━
- 도입: 독자 공감 or 오늘 날짜 언급
- H2 섹션 3-4개, 각 H3 2개
- 실제 수치/날짜/가격 포함
- 2000-2500자

마지막 줄:
<p class="post-end">이 글이 차량 선택에 도움이 되셨으면 합니다.</p>`;

  let content = '';
  try {
    const msg = await anthropic.messages.create({
      model: 'claude-sonnet-4-6', max_tokens: 8000, temperature: 0.7,
      messages: [{ role: 'user', content: contentPrompt }],
    });
    content = msg.content[0].type === 'text' ? msg.content[0].text : '';
    content = content.replace(/```html/g, '').replace(/```/g, '').trim();
    if (content.includes('<!DOCTYPE') || content.includes('<html')) {
      const bodyMatch = content.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
      content = bodyMatch ? bodyMatch[1].trim() : content.replace(/<!DOCTYPE[^>]*>/gi, '').replace(/<html[^>]*>/gi, '').replace(/<\/html>/gi, '').replace(/<head[\s\S]*?<\/head>/gi, '').replace(/<\/?body[^>]*>/gi, '').trim();
    }
  } catch (err) {
    throw new Error(`Claude 글 생성 실패: ${err instanceof Error ? err.message : err}`);
  }

  const rawSlots = Array.isArray(meta.image_slots) ? meta.image_slots as ImageSlot[] : [];
  const image_slots: ImageSlot[] = rawSlots.slice(0, 3);
  while (image_slots.length < 3) {
    const fallbacks = ['korea car market news', 'automobile new release', 'car dealership showroom'];
    image_slots.push({ query: fallbacks[image_slots.length], alt: String(meta.title || topic), caption: String(meta.title || topic) });
  }

  return {
    title: String(meta.title || topic),
    slug: String(meta.slug || `car-market-${Date.now()}`),
    desc_text: String(meta.desc_text || ''),
    keywords: Array.isArray(meta.keywords) ? meta.keywords as string[] : [],
    image_query: String(meta.image_query || 'korea car market'),
    image_slots,
    content,
  };
}

/**
 * POST /api/car-market-publish
 */
function isAuthorized(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization');
  if (authHeader === `Bearer ${process.env.CRON_SECRET}`) return true;
  const legacySecret = request.headers.get('x-cron-secret');
  if (legacySecret === process.env.CRON_SECRET) return true;
  return false;
}

async function runCarMarketPublish(): Promise<NextResponse> {
  try {

    console.log('[CAR-MARKET] 🚀 자동차시장 글 발행 시작...');

    // 1. 뉴스 검색 + 신차 감지
    const { isNewCar, topic, newsContext } = await searchCarMarketNews();
    console.log(`[CAR-MARKET] 📰 ${isNewCar ? '신차' : '시장동향'} | ${topic}`);

    // 2. 글 생성
    const postData = await generateCarMarketPost(topic, isNewCar, newsContext);

    // 3. 썸네일
    const thumbRes = await fetch(
      `https://api.unsplash.com/search/photos?query=${encodeURIComponent(postData.image_query)}&per_page=3&orientation=landscape&client_id=${process.env.UNSPLASH_ACCESS_KEY}`
    );
    let thumbUrl = 'https://images.unsplash.com/photo-1552820728-8ac41f1ce891?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixlib=rb-4.1.0&q=80&w=1080';
    if (thumbRes.ok) {
      const d = await thumbRes.json() as { results?: Array<{ urls?: { regular?: string } }> };
      const img = d.results?.[0];
      if (img?.urls?.regular) thumbUrl = await downloadAndSave(img.urls.regular, `car_market_thumb_${Date.now()}`, 'image/jpeg');
    }

    // 4. 본문 이미지
    const bodyImages = await getImages(postData.image_slots);

    const makeImgHtml = (img: { url: string; alt: string; caption: string; credit: string }) => {
      const creditText = img.credit ? ` (${img.credit})` : '';
      return `<figure style="margin:2rem 0;text-align:center;"><img src="${img.url}" alt="${img.alt}" title="${img.alt}" loading="lazy" width="1080" height="720" style="width:100%;max-width:100%;border-radius:0.75rem;box-shadow:0 4px 20px rgba(0,0,0,0.1);" /><figcaption style="margin-top:0.5rem;font-size:0.875rem;color:#64748b;font-style:italic;">▲ ${img.caption}${creditText}</figcaption></figure>`;
    };

    let slotIdx = 0;
    let finalContent = postData.content.replace(/<!--\s*IMAGE_SLOT\s*-->/g, () => {
      const img = bodyImages[slotIdx++];
      return img?.url ? makeImgHtml(img) : '';
    });

    const remaining = bodyImages.slice(slotIdx);
    if (remaining.length > 0) {
      let insertCount = 0;
      finalContent = finalContent.replace(/<h2/g, (match) => {
        const img = remaining[insertCount++];
        return img?.url ? makeImgHtml(img) + match : match;
      });
    }

    // 5. CTA + 마커 제거
    const FIXED_CTA = `<div class="text-center">
    <h3 class="text-2xl font-bold text-gray-900 mb-4">📢 "솔직한 견적서가 고객님의 돈을 아껴줍니다"</h3>
    <p class="mb-6 leading-relaxed text-gray-600">
        서비스인 척 생색내며 영업사원이 챙길 건 다 챙기는 견적서,<br>
        투명하게 가격을 공개하고 원가 그대로 진행하는 견적서.<br>
        <strong>어떤 것이 진짜 고객님을 위한 견적일까요?</strong></p>
</div>
<center>
   <div class="mt-6">
      <a href="/consult" class="inline-block bg-blue-600 text-white font-bold py-3 px-8 rounded-lg hover:bg-blue-700 transition">
        전문가에게 무료 견적 진단받기 →
      </a>
    </div>
</center>`;

    finalContent = finalContent
      .replace(/<p class="post-end">[\s\S]*?<\/p>/gi, '')
      .trimEnd();
    finalContent = '<!-- author:탁터김 -->\n' + finalContent + '\n' + FIXED_CTA;

    // 6. Supabase 저장
    const today = new Date();
    const dateText = `${today.getFullYear()}.${String(today.getMonth() + 1).padStart(2, '0')}.${String(today.getDate()).padStart(2, '0')}`;

    const { data, error } = await supabase.from('posts').insert([{
      title: postData.title,
      slug: postData.slug,
      desc_text: postData.desc_text,
      content: finalContent,
      category: '자동차시장',
      image_url: thumbUrl,
      date_text: dateText,
      color_class: 'bg-slate-800',
      is_published: true,
      priority: 9999,
    }]).select().single();

    if (error) throw new Error(`Supabase 저장 실패: ${error.message}`);

    console.log(`[CAR-MARKET] ✅ 발행 완료 | ID: ${data.id} | ${isNewCar ? '신차' : '시장동향'} | ${postData.title}`);
    return NextResponse.json({ success: true, postId: data.id, topic: postData.title, type: isNewCar ? '신차' : '시장동향' });

  } catch (err) {
    const msg = err instanceof Error ? err.message : '알 수 없는 오류';
    console.error('[CAR-MARKET] ❌', msg);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

/**
 * GET /api/car-market-publish - Vercel Cron 진입점
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  if (!isAuthorized(request)) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }
  return runCarMarketPublish();
}

/**
 * POST /api/car-market-publish - 수동 호출용
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  if (!isAuthorized(request)) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }
  return runCarMarketPublish();
}
