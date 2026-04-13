import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import * as fs from 'fs/promises';
import * as path from 'path';

// Supabase 클라이언트 초기화
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

// Claude API 초기화 - 최신 모델 사용
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// API 재시도 설정
const MAX_RETRIES = 3;
const RETRY_DELAY = 2000; // 2초

// 카테고리별 토픽 풀 (30개+)
// ※ 자동차시장은 고정 토픽 없음 — 매번 실시간 뉴스 검색으로 토픽 결정
const topicPool = {
  '호갱탈출': [
    '장기렌트 계약 시 딜러가 숨기는 5가지 수수료',
    '월렌탈료만 보면 안 되는 이유 (총비용 계산법)',
    '중도 해지 위약금 폭탄 피하는 방법',
    '허위 견적서 구별하는 체크리스트 7가지',
    '선수금 없는 장기렌트 진짜 가능할까',
    '보험료 포함 vs 미포함 어떤 게 이득일까',
    '장기렌트 계약 전 반드시 확인해야 할 특약 조항',
    '탁송비·등록비·취급수수료 숨겨진 비용 총정리',
    '계약 갱신 시 딜러가 노리는 수수료 함정',
    '장기렌트 만기 후 차량 반납 vs 인수 어떤 게 나을까',
    '렌탈료 인하 협상하는 현실적인 방법',
    '사고 시 렌트사 보험 처리 절차 완전 정리',
    '중고 장기렌트 계약 이전받을 때 주의할 점',
    '최저가 견적서 함정 — 이렇게 속인다',
    '블랙박스·썬팅 서비스 포함 vs 제외 실제 비용 비교',
    '계약 해지 위약금 합법적으로 줄이는 방법',
    '장기렌트 차량 사고 났을 때 내 돈 얼마 나오나',
    '딜러 수수료 0원이라는 말, 진짜일까 가짜일까',
  ],
  '장기렌트정보': [
    '장기렌트 vs 할부 vs 리스 2026년 완전 비교',
    '장기렌트 보험 구조 완전 분석',
    '번호판 색깔별 장기렌트 차이 (흰색 vs 노란색)',
    '신용등급별 장기렌트 조건 차이',
    '법인 vs 개인 장기렌트 어떤 게 싼가',
    '장기렌트 중도해지 가능할까 조건은',
    '장기렌트 선수금 10% vs 30% vs 0원 총납입 비교',
    '사업자 장기렌트 세금 혜택 완전 정리 (부가세·소득세)',
    '장기렌트 계약 기간 36개월 vs 48개월 vs 60개월 비교',
    '전기차 장기렌트 보조금 받는 방법과 조건',
    '하이브리드 vs 전기차 장기렌트 비용 5년 비교',
    '장기렌트 차량 연간 주행거리 초과 시 추가 비용',
    '개인사업자 장기렌트 100% 비용처리 하는 방법',
    '장기렌트 만기 반납 전 점검사항과 수리비 기준',
    '장기렌트 신청부터 출고까지 전체 프로세스',
    '외제차 장기렌트 vs 국산차 장기렌트 비용 비교',
    '무사고 할인 vs 보험 포함 렌탈 어떤 게 유리할까',
    '장기렌트로 테슬라 타는 법 — 조건과 비용 정리',
  ],
};

interface AutoPublishResponse {
  success: boolean;
  message: string;
  postId?: number;
  error?: string;
}

/**
 * 다음 카테고리를 순서대로 결정
 * 호갱탈출 → 장기렌트정보 → 자동차시장 → (반복)
 */
async function getNextCategory(): Promise<string> {
  const { data: lastPosts } = await supabase
    .from('posts')
    .select('category')
    .eq('is_published', true)
    .order('id', { ascending: false })
    .limit(1);

  const lastCategory = lastPosts?.[0]?.category;
  const categories = ['호갱탈출', '장기렌트정보', '자동차시장'];

  if (!lastCategory) return categories[0]; // 첫 글이면 호갱탈출

  const currentIndex = categories.indexOf(lastCategory);
  const nextIndex = (currentIndex + 1) % categories.length;
  return categories[nextIndex];
}

/**
 * 자동차시장 전용: 실시간 뉴스 검색으로 이번 달 가장 핫한 토픽 선정
 * 미리 정해진 토픽 없이, 실제 기사에서 주제를 가져옴
 */
async function selectCarMarketTopicFromNews(): Promise<{ topic: string; newsContext: string; officialImages: Array<{ url: string; alt: string; caption: string; credit: string }> }> {
  const now = new Date();
  const yearMonth = `${now.getFullYear()}년 ${now.getMonth() + 1}월`;

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [{ text: `${yearMonth} 현재 한국 자동차 시장에서 가장 화제가 되고 있는 뉴스나 이슈를 검색해줘.

다음 중 하나를 선택해서 블로그 포스팅 주제로 추천해줘:
- 이번 달 신차 출시 (구체적 차종명 포함)
- 전기차/하이브리드 보조금 변화
- 인기 차종 가격 인상/인하 소식
- 장기렌트 시장 주요 이슈
- 자동차 업계 이슈

응답 형식:
[추천 주제]
(블로그 글 제목으로 쓸 수 있는 구체적인 주제 - 차종명/수치 포함, 30자 이내)

[핵심 정보]
(해당 주제 관련 최신 뉴스 요약, 수치/날짜/가격 포함, 500자 이내)

[공식 이미지]
(해당 차종/브랜드 공식 보도사진 URL 최대 2개, 없으면 생략)
형식: URL|차종명|이미지설명` }]
          }],
          tools: [{ google_search: {} }],
        }),
      }
    );

    if (!res.ok) throw new Error(`Gemini Search 실패: ${res.status}`);
    const data = await res.json() as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

    // 주제 추출
    const topicMatch = text.match(/\[추천 주제\]\s*([\s\S]*?)(?=\[핵심 정보\])/);
    const topic = topicMatch?.[1]?.trim().replace(/\n/g, ' ') || `${yearMonth} 자동차 시장 주요 이슈`;

    // 핵심 정보 추출
    const infoMatch = text.match(/\[핵심 정보\]\s*([\s\S]*?)(?=\[공식 이미지\]|$)/);
    const newsContext = infoMatch?.[1]?.trim() || '';

    // 공식 이미지 URL 추출
    const imgSection = text.match(/\[공식 이미지\]\s*([\s\S]*?)$/)?.[1] || '';
    const officialImages: Array<{ url: string; alt: string; caption: string; credit: string }> = [];
    for (const line of imgSection.trim().split('\n').filter(l => l.includes('http')).slice(0, 2)) {
      const parts = line.trim().split('|');
      const url = parts[0]?.trim();
      const carName = parts[1]?.trim() || topic;
      const desc = parts[2]?.trim() || `${carName} 공식 보도사진`;
      if (url?.startsWith('http')) {
        officialImages.push({ url, alt: `${carName} 공식 보도사진`, caption: desc, credit: '공식 보도사진' });
      }
    }

    console.log(`[AUTO-PUBLISH] 📰 실시간 토픽 선정: "${topic}"`);
    console.log(`[AUTO-PUBLISH] 📋 뉴스 컨텍스트 ${newsContext.length}자, 공식이미지 ${officialImages.length}개`);

    return { topic, newsContext, officialImages };
  } catch (err) {
    console.warn('[AUTO-PUBLISH] 실시간 토픽 선정 실패, 기본 토픽 사용:', err instanceof Error ? err.message : err);
    return {
      topic: `${yearMonth} 국내 자동차 시장 동향 분석`,
      newsContext: '',
      officialImages: [],
    };
  }
}

/**
 * 사용하지 않은 토픽을 선택
 */
async function selectTopic(category: string): Promise<string> {
  const topics = topicPool[category as keyof typeof topicPool] || [];

  // 이미 작성된 글 제목 조회
  const { data: existingPosts } = await supabase
    .from('posts')
    .select('title')
    .eq('category', category);

  const existingTitles = existingPosts?.map((p) => p.title.toLowerCase()) || [];

  // 핵심 키워드 추출 (2글자 이상 한글 단어)
  const extractKeywords = (text: string): string[] =>
    text.match(/[가-힣]{2,}/g) ?? [];

  // 유사도 체크: 기존 글과 핵심 키워드 2개 이상 겹치면 중복으로 간주
  const isSimilar = (topic: string) => {
    const topicKws = extractKeywords(topic);
    return existingTitles.some(title => {
      const titleKws = extractKeywords(title);
      const overlap = topicKws.filter(kw => titleKws.includes(kw));
      return overlap.length >= 2;
    });
  };

  // 유사하지 않은 토픽만 선택
  const availableTopics = topics.filter(topic => !isSimilar(topic));

  if (availableTopics.length === 0) {
    // 모두 유사하면 기존 제목과 완전 일치하지 않는 것 중 랜덤
    const usedTitles = new Set(existingTitles);
    const notExact = topics.filter(t => !usedTitles.has(t.toLowerCase()));
    return notExact.length > 0
      ? notExact[Math.floor(Math.random() * notExact.length)]
      : topics[Math.floor(Math.random() * topics.length)];
  }

  return availableTopics[Math.floor(Math.random() * availableTopics.length)];
}

/**
 * 재시도 로직이 있는 API 호출
 */
async function callAnthropicWithRetry(prompt: string, retries = 0): Promise<string> {
  try {
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 8000,
      temperature: 0.7,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    const responseText = message.content[0].type === 'text' ? message.content[0].text : '';
    return responseText;
  } catch (error) {
    if (retries < MAX_RETRIES) {
      console.warn(`[AUTO-PUBLISH] API 재시도 (${retries + 1}/${MAX_RETRIES})...`);
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY * (retries + 1)));
      return callAnthropicWithRetry(prompt, retries + 1);
    }
    throw error;
  }
}

/**
 * Gemini Google Search 그라운딩으로 최신 정보 검색
 */
async function searchLatestInfo(topic: string): Promise<string> {
  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [{ text: `2026년 3월 현재 한국 자동차 시장에서 "${topic}"에 대한 최신 뉴스와 정보를 검색해줘. 구체적인 차종명, 가격, 출시일, 보조금 금액 등 수치 정보를 포함해서 핵심 내용만 한국어로 요약해줘. 최대 500자.` }]
          }],
          tools: [{ google_search: {} }],
        }),
      }
    );
    if (!res.ok) { console.warn('[SEARCH] Gemini Search 실패:', res.status); return ''; }
    const data = await res.json() as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };
    return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
  } catch (err) {
    console.warn('[SEARCH] 검색 오류:', err instanceof Error ? err.message : err);
    return '';
  }
}

/**
 * 신차 뉴스 전용: 기사 3-5개 검색 + 공식 이미지 URL 추출
 */
async function searchNewCarNews(topic: string): Promise<{
  summary: string;
  officialImages: Array<{ url: string; alt: string; caption: string }>;
}> {
  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [{ text: `2026년 3월 현재 "${topic}"에 관한 최신 자동차 뉴스 기사를 3-5개 검색해줘.

다음 형식으로 답해줘:

[기사 요약]
각 기사의 핵심 내용 (차종명, 가격, 출시일, 특징 등 구체적 수치 포함). 총 600자 이내.

[공식 이미지]
각 브랜드/차종의 공식 보도자료 이미지 URL을 최대 3개 찾아줘.
형식: URL|차종명|이미지설명
예: https://xxx.com/car.jpg|2026 제네시스 GV80|2026 제네시스 GV80 공식 보도사진 측면뷰

이미지 URL은 현대/기아/제네시스 공식 뉴스룸, 자동차 브랜드 공식 사이트에서 찾아줘.
이미지 URL이 없으면 생략해도 됨.` }]
          }],
          tools: [{ google_search: {} }],
        }),
      }
    );

    if (!res.ok) { console.warn('[NEWS] Gemini News Search 실패:', res.status); return { summary: '', officialImages: [] }; }

    const data = await res.json() as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

    // 기사 요약 추출
    const summaryMatch = text.match(/\[기사 요약\]([\s\S]*?)(?=\[공식 이미지\]|$)/);
    const summary = summaryMatch?.[1]?.trim() || text.slice(0, 600);

    // 공식 이미지 URL 파싱
    const officialImages: Array<{ url: string; alt: string; caption: string }> = [];
    const imgSection = text.match(/\[공식 이미지\]([\s\S]*?)$/)?.[1] || '';
    const imgLines = imgSection.trim().split('\n').filter(l => l.includes('http'));

    for (const line of imgLines.slice(0, 3)) {
      const parts = line.trim().split('|');
      const url = parts[0]?.trim();
      const carName = parts[1]?.trim() || topic;
      const desc = parts[2]?.trim() || `${carName} 공식 보도사진`;
      if (url && url.startsWith('http')) {
        officialImages.push({
          url,
          alt: `${carName} 2026 공식 보도사진`,
          caption: desc,
        });
      }
    }

    console.log(`[NEWS] 기사 요약 ${summary.length}자, 공식이미지 ${officialImages.length}개`);
    return { summary, officialImages };
  } catch (err) {
    console.warn('[NEWS] 신차 뉴스 검색 오류:', err instanceof Error ? err.message : err);
    return { summary: '', officialImages: [] };
  }
}

/**
 * 공식 이미지 다운로드 시도 (실패 시 Unsplash 폴백)
 */
/**
 * Google Custom Search로 공식 이미지 검색
 */
async function searchGoogleImage(query: string): Promise<{ url: string; source: string } | null> {
  try {
    const apiKey = process.env.GOOGLE_CSE_API_KEY;
    const cseId = process.env.GOOGLE_CSE_ID;
    if (!apiKey || !cseId) return null;

    const url = `https://www.googleapis.com/customsearch/v1?key=${apiKey}&cx=${cseId}&q=${encodeURIComponent(query)}&searchType=image&imgType=photo&imgSize=large&num=3`;
    const res = await fetch(url);
    if (!res.ok) {
      console.warn(`[GOOGLE_CSE] 검색 실패 (${res.status})`);
      return null;
    }
    const data = await res.json() as {
      items?: Array<{ link?: string; displayLink?: string; image?: { contextLink?: string } }>;
    };
    const item = data.items?.[0];
    if (!item?.link) return null;
    return { url: item.link, source: item.displayLink || 'Google Images' };
  } catch (err) {
    console.warn('[GOOGLE_CSE] 오류:', err instanceof Error ? err.message : err);
    return null;
  }
}

async function getOfficialOrUnsplash(
  officialUrl: string,
  fallbackQuery: string,
  alt: string,
  caption: string
): Promise<{ url: string; alt: string; caption: string; credit: string }> {
  // 1순위: Gemini가 찾아준 공식 URL 직접 다운로드
  if (officialUrl) {
    try {
      const savedUrl = await downloadAndSave(officialUrl, `official_${Date.now()}`, 'image/jpeg');
      if (savedUrl !== officialUrl) {
        return { url: savedUrl, alt, caption, credit: '공식 보도사진' };
      }
    } catch {
      console.warn('[NEWS] 공식 URL 다운로드 실패');
    }
  }

  // 2순위: Google CSE로 공식 이미지 검색
  const googleResult = await searchGoogleImage(fallbackQuery + ' official press photo');
  if (googleResult) {
    try {
      const saved = await downloadAndSave(googleResult.url, `google_${Date.now()}`, 'image/jpeg');
      if (saved !== googleResult.url) {
        return { url: saved, alt, caption, credit: `출처: ${googleResult.source}` };
      }
    } catch {
      console.warn('[NEWS] Google CSE 이미지 다운로드 실패');
    }
  }

  // 3순위: Unsplash 폴백
  try {
    const res = await fetch(`https://api.unsplash.com/search/photos?query=${encodeURIComponent(fallbackQuery)}&per_page=1&orientation=landscape&client_id=${process.env.UNSPLASH_ACCESS_KEY}`);
    if (res.ok) {
      const d = await res.json() as { results?: Array<{ urls?: { regular?: string }; user?: { name?: string } }> };
      const img = d.results?.[0];
      if (img?.urls?.regular) {
        const saved = await downloadAndSave(img.urls.regular, `newcar_${Date.now()}`, 'image/jpeg');
        const photographer = img.user?.name || 'Unsplash';
        return { url: saved, alt, caption, credit: `Photo by ${photographer} on Unsplash` };
      }
    }
  } catch { /* 무시 */ }
  return { url: '', alt, caption, credit: '' };
}

/**
 * Unsplash에서 본문용 이미지 여러 장 가져오기
 */
/**
 * 이미지 슬롯 타입 (각 슬롯마다 다른 검색어 + 한글 설명)
 */
// alt: SEO용 (구글 이미지 검색, 키워드 포함, 이미지 실제 내용 묘사)
// caption: 독자용 (figcaption, 본문 맥락 설명, "▲" 없이)
type ImageSlot = { query: string; alt: string; caption: string };

/**
 * 이미지 슬롯 배열을 받아 각각 다른 검색어로 Unsplash 검색 후 저장
 */
async function getBodyImages(slots: ImageSlot[]): Promise<Array<{ url: string; alt: string; caption: string; credit: string }>> {
  const results: Array<{ url: string; alt: string; caption: string; credit: string }> = [];

  for (const slot of slots) {
    let result: { url: string; alt: string; caption: string; credit: string } | null = null;

    // 1순위: Gemini AI 이미지 생성
    try {
      const prompt = `Professional photorealistic image for Korean car rental blog: "${slot.query}". Modern car or related business scene, clean background, no text, 16:9 ratio, high quality.`;
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent?key=${process.env.GEMINI_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { responseModalities: ['IMAGE'] },
          }),
        }
      );
      if (res.ok) {
        const data = await res.json() as { candidates?: Array<{ content?: { parts?: Array<{ inlineData?: { mimeType?: string; data?: string } }> } }> };
        const inlineData = data.candidates?.[0]?.content?.parts?.[0]?.inlineData;
        if (inlineData?.data) {
          const buffer = Buffer.from(inlineData.data, 'base64');
          const mimeType = inlineData.mimeType || 'image/png';
          const ext = mimeType.includes('jpeg') ? 'jpg' : 'png';
          const fname = `gemini_${Date.now()}_${results.length}`;
          const localDir = path.join(process.cwd(), 'public', 'picture');
          await fs.mkdir(localDir, { recursive: true });
          await fs.writeFile(path.join(localDir, `${fname}.${ext}`), buffer);
          await supabase.storage.from('consult_photos').upload(`pictures/${fname}.${ext}`, buffer, { contentType: mimeType, upsert: true });
          const { data: pub } = supabase.storage.from('consult_photos').getPublicUrl(`pictures/${fname}.${ext}`);
          result = { url: pub.publicUrl, alt: slot.alt, caption: slot.caption, credit: 'AI 생성 이미지' };
          console.log(`[IMAGES] ✅ Gemini 이미지 생성 완료 (슬롯 ${results.length + 1})`);
        }
      }
    } catch (err) {
      console.warn(`[IMAGES] Gemini 실패, Unsplash 폴백:`, err instanceof Error ? err.message : err);
    }

    // 2순위: Unsplash
    if (!result?.url) {
      try {
        const response = await fetch(
          `https://api.unsplash.com/search/photos?query=${encodeURIComponent(slot.query)}&per_page=3&orientation=landscape&client_id=${process.env.UNSPLASH_ACCESS_KEY}`
        );
        if (response.ok) {
          const data = await response.json() as { results?: Array<{ urls?: { regular?: string }; user?: { name?: string } }> };
          const img = data.results?.[0];
          if (img?.urls?.regular) {
            const savedUrl = await downloadAndSave(img.urls.regular, `body_${Date.now()}_${results.length}`, 'image/jpeg');
            const photographer = img.user?.name || 'Unsplash';
            result = { url: savedUrl, alt: slot.alt, caption: slot.caption, credit: `Photo by ${photographer} on Unsplash` };
          }
        }
      } catch (err) {
        console.warn(`[IMAGES] Unsplash 슬롯 "${slot.query}" 오류:`, err instanceof Error ? err.message : err);
      }
    }

    results.push(result || { url: '', alt: slot.alt, caption: slot.caption, credit: '' });
  }
  return results;
}

/**
 * Claude로 SEO 최적화된 글 생성 (메타데이터/본문 분리 2-step 방식)
 */
async function generateBlogPost(topic: string, category: string, preloadedContext = ''): Promise<{
  title: string;
  slug: string;
  desc_text: string;
  content: string;
  keywords: string[];
  internal_links: string[];
  image_query: string;
  image_slots: ImageSlot[];
  newsOfficialImages: Array<{ url: string; alt: string; caption: string }>;
}> {
  const TODAY = '2026년 3월 29일';

  let latestInfo = '';
  const newsOfficialImages: Array<{ url: string; alt: string; caption: string }> = [];

  if (preloadedContext) {
    // 메인 핸들러에서 이미 실시간 검색한 결과 사용 (자동차시장 전용)
    latestInfo = preloadedContext;
    console.log('[AUTO-PUBLISH] ✅ 사전 검색된 뉴스 컨텍스트 사용');
  } else if (category === '자동차시장') {
    // 직접 호출 시 일반 검색
    latestInfo = await searchLatestInfo(topic);
    if (latestInfo) console.log('[AUTO-PUBLISH] ✅ 추가 검색 완료');
  }

  // ── Step 1: 메타데이터 + 이미지 슬롯 JSON 생성 ──
  const metaPrompt = `You are a Korean SEO blog expert for car long-term rental.
Current date: ${TODAY}

Topic: ${topic}
Category: ${category}

이 주제로 블로그 글을 쓸 때 사용할 메타정보와 본문 이미지 정보를 생성해줘.

image_slots 규칙 (3개, 서로 다른 장면):
- query: Unsplash 영어 검색어 2-4단어 (구체적)
- alt: SEO 메타태그 — 구글 이미지 검색용. 주제 키워드 포함 + 이미지가 실제로 보여주는 내용 (15-40자 한글). 예: "2026년 선수금 없는 장기렌트 월 납입금 비교표"
- caption: 독자 설명 — 이미지가 본문 내용과 어떻게 연결되는지 독자 관점으로 (15-35자 한글). 예: "선수금 조건별 48개월 총비용 차이"
※ alt과 caption은 반드시 다른 내용이어야 함

예시:
  슬롯1 query:"car contract signing" alt:"2026년 장기렌트 계약서 서명 전 확인 항목" caption:"계약 전 반드시 챙겨야 할 서류 체크리스트"
  슬롯2 query:"car insurance cost comparison" alt:"장기렌트 보험 포함 미포함 조건별 비용 비교" caption:"보험 조건에 따라 월 3~8만원 차이 발생"
  슬롯3 query:"automobile finance calculator" alt:"선수금 30% 기준 장기렌트 총비용 계산 예시" caption:"총납입액은 선수금 없을 때가 항상 비싸지 않다"

keywords 선정 기준:
- 주제와 직접 관련된 핵심 키워드 (주제어 포함)
- 실제 사람들이 네이버/구글에서 검색하는 롱테일 키워드
- 경쟁이 적고 검색량이 있는 키워드 우선
- 글 주제와 관계없는 광범위한 키워드 금지 (예: "자동차" 단독은 너무 광범위)
- 5개: 핵심1, 핵심2, 롱테일1, 롱테일2, 연관질문형1

Return ONLY this JSON (no markdown, no explanation):
{"title":"제목(30자이내,2026년기준)","slug":"english-slug","desc_text":"메타설명(100-120자,CTA포함)","image_query":"thumbnail용 영어 검색어","keywords":["키워드1","키워드2","키워드3","키워드4","키워드5"],"image_slots":[{"query":"english query 1","alt":"SEO 메타태그 한글","caption":"독자 설명 한글"},{"query":"english query 2","alt":"SEO 메타태그 한글","caption":"독자 설명 한글"},{"query":"english query 3","alt":"SEO 메타태그 한글","caption":"독자 설명 한글"}]}`;

  const metaText = await callAnthropicWithRetry(metaPrompt);
  const metaCleaned = metaText.replace(/```json/g, '').replace(/```/g, '').trim();
  // 가장 바깥쪽 {} 전체를 추출 (greedy)
  const metaMatch = metaCleaned.match(/\{[\s\S]*\}/);
  if (!metaMatch) throw new Error(`메타 JSON 추출 실패: ${metaText.substring(0, 200)}`);

  let meta: Record<string, unknown>;
  try {
    meta = JSON.parse(metaMatch[0]);
  } catch {
    throw new Error(`메타 JSON 파싱 실패: ${metaMatch[0].substring(0, 200)}`);
  }

  // ── Step 2: 본문 HTML만 생성 ──
  const latestInfoSection = latestInfo
    ? `\n━━ 검색된 최신 정보 (반드시 활용) ━━\n${latestInfo}\n`
    : '';

  const keywordList = Array.isArray(meta.keywords) ? (meta.keywords as string[]).join(', ') : '';

  const contentPrompt = `당신은 장기렌트 현장에서 10년 넘게 일한 업계 전문가입니다.
블로그에 직접 경험담과 실무 노하우를 솔직하게 써내려가는 스타일입니다.

【 현재 날짜: ${TODAY} 】
【 절대 규칙 】
1. ${TODAY} 기준 최신 정보만. 2024년 이전 연도 사용 금지.
2. 글을 중간에 끊지 말 것. 마지막 태그까지 반드시 완성.
3. 순수 HTML만 반환 (마크다운·JSON·설명·CTA 금지)
4. 보조금·가격 등 수치는 추정 금지 — 확실하지 않으면 "약 ~원 수준" 또는 "정부 공시 기준"으로 표현
5. img 태그에 title/loading/width/height 속성 직접 작성 금지 (자동 추가됨)
${latestInfoSection}
━━ SEO 키워드 자연 삽입 규칙 ━━
다음 키워드를 본문에 자연스럽게 녹여 써야 합니다: ${keywordList}

키워드 삽입 방법:
- 도입부 첫 단락에 핵심 키워드 1-2개 자연스럽게 포함 (억지로 끼워넣기 금지)
- 각 H2 섹션 제목이나 첫 문장에 관련 키워드 포함
- 키워드를 <strong> 태그로 한 번씩 강조 (과도한 반복 금지, 키워드당 최대 2회)
- 같은 키워드 3회 이상 반복 절대 금지 (구글 페널티 대상)
- 키워드가 문장 흐름을 방해하면 넣지 말 것
주제: ${topic}
카테고리: ${category}

━━ 사람이 쓴 것처럼 느껴지게 하는 핵심 규칙 ━━

✍️ 문체와 톤:
- "~입니다" 또는 "~해요" 한 가지만 쓰는 것 절대 금지.
- 문장 어미를 '요'체와 '다'체를 자연스럽게 섞을 것. 실제 예시:
  "이 부분이 핵심입니다. 많은 분들이 그냥 지나치는데, 사실 여기서 수십만 원 차이가 나요."
  "계약서 꼭 받으세요. 구두 약속은 나중에 아무 소용이 없습니다."
  "딜러가 이걸 먼저 알려주진 않아요. 업계 관행이 그렇거든요."
  "결론부터 말하면, 선수금 30%가 항상 유리한 건 아닙니다. 상황마다 달라요."
- 설명할 땐 '다'체, 독자에게 말 걸 땐 '요'체로 리듬감 있게 전환
- 구어체 표현 자연스럽게: "솔직히", "저도 처음엔", "이게 함정이에요", "근데 사실"
- 숫자에 맥락 부여: "월 45만원, 처음엔 나쁘지 않아 보이죠. 근데 48개월이면 총 2,160만원입니다."
- 단락 첫 문장은 짧고 강하게. 나머지는 풀어서.

📝 구조 요소 (반드시 포함):
① 비교표 (회색 헤더 + 볼드 검은 글씨):
<table style="width:100%;border-collapse:collapse;margin:1.5rem 0;font-size:0.95rem;">
<thead><tr style="background:#f1f5f9;"><th style="padding:12px;text-align:left;font-weight:700;color:#1e293b;border-bottom:2px solid #cbd5e1;">항목</th><th style="padding:12px;text-align:center;font-weight:700;color:#1e293b;border-bottom:2px solid #cbd5e1;">구분A</th><th style="padding:12px;text-align:center;font-weight:700;color:#1e293b;border-bottom:2px solid #cbd5e1;">구분B</th></tr></thead>
<tbody><tr style="border-bottom:1px solid #e2e8f0;background:white;"><td style="padding:12px;color:#334155;">항목명</td><td style="padding:12px;text-align:center;color:#334155;">값</td><td style="padding:12px;text-align:center;color:#334155;">값</td></tr></tbody>
</table>

② 핵심 포인트 박스 (전문가 코멘트처럼):
<div style="background:#eff6ff;border-left:4px solid #2563eb;padding:1rem 1.25rem;border-radius:0 0.5rem 0.5rem 0;margin:1.5rem 0;"><p style="font-weight:700;color:#1d4ed8;margin:0 0 0.5rem;">💡 현장에서 배운 것</p><p style="margin:0;color:#1e40af;">내용</p></div>

③ 경고 박스 (실제 겪은 사례 언급하듯):
<div style="background:#fff7ed;border-left:4px solid #f97316;padding:1rem 1.25rem;border-radius:0 0.5rem 0.5rem 0;margin:1.5rem 0;"><p style="font-weight:700;color:#c2410c;margin:0 0 0.5rem;">⚠️ 실제로 이런 분 봤어요</p><p style="margin:0;color:#9a3412;">내용</p></div>

④ 이미지 마커 (H2 섹션 2번째, 3번째):
<!-- IMAGE_SLOT -->

━━ 정보 기준 ━━
- 2026년 3월 실제 시장 수치 사용
- 업계 관행, 숨겨진 비용, 딜러가 안 알려주는 것 솔직하게

━━ 글 구성 ━━
- 도입: 독자 공감 유발 (질문 or 경험담으로 시작)
- H2 섹션 3-4개, 각 H3 2개 이상
- 마무리: "결국 이게 핵심이에요" 식 요약
- 총 2000-2500자

반드시 마지막 줄:
<p class="post-end">이 글이 도움이 되셨다면, 아래에서 무료로 견적을 확인해보세요.</p>`;

  const contentText = await callAnthropicWithRetry(contentPrompt);
  // 마크다운 코드블록 제거, HTML만 추출
  let content = contentText
    .replace(/```html/g, '')
    .replace(/```/g, '')
    .trim();

  // Claude가 완전한 HTML 문서로 반환한 경우 body 내용만 추출
  if (content.includes('<!DOCTYPE') || content.includes('<html')) {
    const bodyMatch = content.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
    if (bodyMatch) {
      content = bodyMatch[1].trim();
    } else {
      // body 태그 없으면 head/html 태그만 제거
      content = content
        .replace(/<!DOCTYPE[^>]*>/gi, '')
        .replace(/<html[^>]*>/gi, '')
        .replace(/<\/html>/gi, '')
        .replace(/<head[\s\S]*?<\/head>/gi, '')
        .replace(/<\/?body[^>]*>/gi, '')
        .trim();
    }
  }

  // image_slots 파싱 및 검증
  const rawSlots = Array.isArray(meta.image_slots) ? meta.image_slots : [];
  const image_slots: ImageSlot[] = rawSlots
    .filter((s: unknown) => s && typeof s === 'object' && (s as Record<string, unknown>).query)
    .map((s: unknown) => {
      const slot = s as Record<string, unknown>;
      const alt = String(slot.alt || slot.caption || meta.title || topic);
      const caption = String(slot.caption || slot.alt || meta.title || topic);
      return { query: String(slot.query), alt, caption };
    })
    .slice(0, 3);

  const fallbackSlots: ImageSlot[] = [
    { query: 'car rental contract Korea', alt: `${String(meta.title || topic)} 관련 계약 안내`, caption: '장기렌트 계약 시 확인 사항' },
    { query: 'automobile financing comparison', alt: `${String(meta.title || topic)} 비용 비교`, caption: '차량 구매 방식별 월 납입금 차이' },
    { query: 'car dealership showroom Korea', alt: `${String(meta.title || topic)} 실제 사례`, caption: '렌트사 상담 전 알아야 할 핵심 정보' },
  ];
  while (image_slots.length < 3) {
    image_slots.push(fallbackSlots[image_slots.length]);
  }

  return {
    title: String(meta.title || topic),
    slug: String(meta.slug || `post-${Date.now()}`),
    desc_text: String(meta.desc_text || ''),
    keywords: Array.isArray(meta.keywords) ? meta.keywords : [],
    internal_links: [],
    image_query: String(meta.image_query || 'car rental korea'),
    image_slots,
    newsOfficialImages,
    content,
  };
}

/**
 * 이미지 URL → public/picture 저장 + Supabase 업로드 → 공개 URL 반환
 */
async function downloadAndSave(imageUrl: string, filename: string, mimeType = 'image/jpeg'): Promise<string> {
  try {
    const res = await fetch(imageUrl);
    if (!res.ok) throw new Error(`fetch 실패: ${res.status}`);
    const buffer = Buffer.from(await res.arrayBuffer());
    const ext = mimeType.includes('png') ? 'png' : 'jpg';
    const fname = `${filename}.${ext}`;

    // 1) public/picture 폴더에 저장 (로컬 개발용)
    const localDir = path.join(process.cwd(), 'public', 'picture');
    await fs.mkdir(localDir, { recursive: true });
    await fs.writeFile(path.join(localDir, fname), buffer);

    // 2) Supabase Storage 업로드 (배포 환경용)
    const storagePath = `pictures/${fname}`;
    const { error } = await supabase.storage
      .from('consult_photos')
      .upload(storagePath, buffer, { contentType: mimeType, upsert: true });
    if (error) throw new Error(error.message);

    const { data } = supabase.storage.from('consult_photos').getPublicUrl(storagePath);
    return data.publicUrl;
  } catch (err) {
    console.error('downloadAndSave 실패:', err instanceof Error ? err.message : err);
    return imageUrl; // 실패 시 원본 URL 반환
  }
}

/**
 * Unsplash에서 썸네일 이미지 URL 가져오기 (영어 검색어 사용)
 */
async function getUnsplashImage(imageQuery: string, title: string): Promise<{ url: string; alt: string; credit: string }> {
  // fallback: ixlib 포함 안정적 URL 형식
  const fallback = {
    url: 'https://images.unsplash.com/photo-1552820728-8ac41f1ce891?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixlib=rb-4.1.0&q=80&w=1080',
    alt: `${title} - 장기렌트 정보`,
    credit: 'Unsplash',
  };
  try {
    // 영어 검색어로 Unsplash 검색 (per_page=5로 여러 장 받아 첫 번째 사용)
    const response = await fetch(
      `https://api.unsplash.com/search/photos?query=${encodeURIComponent(imageQuery)}&per_page=5&orientation=landscape&client_id=${process.env.UNSPLASH_ACCESS_KEY}`
    );

    if (!response.ok) {
      console.warn(`Unsplash API 실패 (${response.status}), 기본 이미지 사용`);
      return fallback;
    }

    const data = await response.json() as {
      results?: Array<{
        urls?: { regular?: string };
        user?: { name?: string };
        alt_description?: string;
      }>;
    };

    const image = data.results?.[0];
    if (!image?.urls?.regular) {
      console.warn(`Unsplash 검색 결과 없음 (query: "${imageQuery}"), 기본 이미지 사용`);
      return fallback;
    }

    const rawUrl = image.urls.regular;
    const fname = `thumb_${Date.now()}`;
    const savedUrl = await downloadAndSave(rawUrl, fname, 'image/jpeg');

    return {
      url: savedUrl,
      alt: `${title} - ${image.alt_description || '장기렌트 관련 이미지'}`,
      credit: image.user?.name || 'Unsplash',
    };
  } catch (error) {
    console.error('Unsplash 이미지 조회 오류:', error);
    return fallback;
  }
}

/**
 * Gemini Flash Image로 본문 대표 이미지 생성 후 다운로드 저장
 */
async function getBodyImage(imageQuery: string, title: string): Promise<{ url: string; alt: string }> {
  // 1차: Gemini 이미지 생성 시도
  try {
    const prompt = `Professional photorealistic image for Korean car rental blog article: "${imageQuery}". Modern luxury car, clean background, no text overlay, 16:9 ratio, high quality.`;

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { responseModalities: ['IMAGE'] },
        }),
      }
    );

    if (res.ok) {
      const data = await res.json() as {
        candidates?: Array<{ content?: { parts?: Array<{ inlineData?: { mimeType?: string; data?: string } }> } }>;
      };
      const inlineData = data.candidates?.[0]?.content?.parts?.[0]?.inlineData;
      if (inlineData?.data) {
        const buffer = Buffer.from(inlineData.data, 'base64');
        const mimeType = inlineData.mimeType || 'image/png';
        const ext = mimeType.includes('jpeg') ? 'jpg' : 'png';
        const fname = `gemini_${Date.now()}`;
        const localDir = path.join(process.cwd(), 'public', 'picture');
        await fs.mkdir(localDir, { recursive: true });
        await fs.writeFile(path.join(localDir, `${fname}.${ext}`), buffer);
        const storagePath = `pictures/${fname}.${ext}`;
        await supabase.storage.from('consult_photos').upload(storagePath, buffer, { contentType: mimeType, upsert: true });
        const { data: pub } = supabase.storage.from('consult_photos').getPublicUrl(storagePath);
        console.log('[AUTO-PUBLISH] ✅ Gemini 이미지 생성 완료');
        return { url: pub.publicUrl, alt: title };
      }
    }
  } catch (err) {
    console.warn('[AUTO-PUBLISH] Gemini 이미지 실패, Unsplash 폴백:', err instanceof Error ? err.message : err);
  }

  // 2차 폴백: Unsplash 두 번째 이미지
  try {
    const response = await fetch(
      `https://api.unsplash.com/search/photos?query=${encodeURIComponent(imageQuery)}&per_page=5&orientation=landscape&client_id=${process.env.UNSPLASH_ACCESS_KEY}`
    );
    if (!response.ok) return { url: '', alt: '' };
    const data = await response.json() as { results?: Array<{ urls?: { regular?: string }; alt_description?: string }> };
    const image = data.results?.[1] || data.results?.[0];
    if (!image?.urls?.regular) return { url: '', alt: '' };

    const savedUrl = await downloadAndSave(image.urls.regular, `body_${Date.now()}`, 'image/jpeg');
    return { url: savedUrl, alt: image.alt_description || title };
  } catch {
    return { url: '', alt: '' };
  }
}

/**
 * JSON-LD 스키마 생성 (Google SEO 최적화)
 */
function generateSchema(post: {
  title: string;
  slug: string;
  desc_text: string;
  image_url: string;
  date_text: string;
  keywords: string[];
}): string {
  const now = new Date().toISOString();
  const datePublished = post.date_text.replace(/\./g, '-');

  const schema = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.title,
    description: post.desc_text,
    image: {
      '@type': 'ImageObject',
      url: post.image_url,
      width: 1200,
      height: 630,
      alt: `${post.title} 썸네일`,
    },
    datePublished: `${datePublished}T00:00:00Z`,
    dateModified: now,
    author: {
      '@type': 'Organization',
      name: 'Dr.Rent',
      url: 'https://www.dr-rent.net',
    },
    publisher: {
      '@type': 'Organization',
      name: 'Dr.Rent',
      logo: {
        '@type': 'ImageObject',
        url: 'https://www.dr-rent.net/logo.png',
      },
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': `https://www.dr-rent.net/posts/${post.slug}`,
    },
    keywords: post.keywords.join(', '),
    inLanguage: 'ko-KR',
  };

  return `<script type="application/ld+json">${JSON.stringify(schema)}</script>`;
}

/**
 * 관련글 내부 링크 추가
 */
async function addRelatedLinks(content: string, internalLinks: string[], currentSlug: string): Promise<string> {
  if (!internalLinks || internalLinks.length === 0) {
    return content;
  }

  // 유효한 링크만 필터링 (현재 글 제외)
  const validLinks = internalLinks.filter(slug => slug !== currentSlug && slug && typeof slug === 'string');

  if (validLinks.length === 0) {
    return content;
  }

  // 관련글 섹션 추가
  let relatedLinksHtml = '<h3 style="margin-top: 2rem; color: #1e293b;">📌 관련글</h3><ul style="list-style: none; padding: 0;">';

  for (const slug of validLinks.slice(0, 2)) {
    relatedLinksHtml += `<li style="margin-bottom: 0.5rem;"><a href="/posts/${slug}" style="color: #2563eb; text-decoration: none; font-weight: 500;">→ 관련 글 더보기</a></li>`;
  }

  relatedLinksHtml += '</ul>';

  // CTA 직전에 관련글 삽입
  return content.replace(/<p>닥터렌트와/i, relatedLinksHtml + '<p>닥터렌트와');
}

/**
 * Supabase에 글 저장 (SEO 최적화)
 */
async function savePost(postData: {
  title: string;
  slug: string;
  desc_text: string;
  content: string;
  category: string;
  image_url: string;
  keywords: string[];
  internal_links: string[];
  image_credit: string;
}): Promise<number> {
  const today = new Date();
  const dateText = `${today.getFullYear()}.${String(today.getMonth() + 1).padStart(2, '0')}.${String(today.getDate()).padStart(2, '0')}`;

  // 기존 CTA 제거 후 고정 CTA 삽입 (사용자 지정 템플릿)
  const FIXED_CTA = `<div class="text-center my-10">
    <h3 class="text-2xl font-bold text-gray-900 mb-4">📢 "솔직한 견적서가 고객님의 돈을 아껴줍니다"</h3>
    <p class="mb-6 leading-relaxed text-gray-600">
        서비스인 척 생색내며 영업사원이 챙길 건 다 챙기는 견적서,<br>
        투명하게 가격을 공개하고 원가 그대로 진행하는 견적서.<br>
        <strong>어떤 것이 진짜 고객님을 위한 견적일까요?</strong>
    </p>
    <div class="flex justify-center mt-6">
      <a href="/consult" class="inline-block bg-blue-600 text-white font-bold py-3 px-8 rounded-lg hover:bg-blue-700 transition">
        전문가에게 무료 견적 진단받기 →
      </a>
    </div>
</div>`;

  // 기존 모든 CTA 패턴 제거 후 고정 CTA 하나만 삽입
  let contentWithCta = postData.content
    // 어두운 배경 div CTA 제거
    .replace(/<div style="background:#1e293b[\s\S]*?<\/center>/gi, '')
    .replace(/<div style="background:#1e293b[\s\S]*?<\/div>\s*(<\/div>)?/gi, '')
    // 닥터렌트 관련 기존 CTA 제거
    .replace(/닥터렌트와 함께[\s\S]*?(<\/div>|<\/p>|<\/center>)/gi, '')
    // post-end 이후 내용 제거 (중복 방지)
    .replace(/<p class="post-end">[\s\S]*$/gi, '')
    .trimEnd();
  // AI 작성 마커 + 고정 CTA
  contentWithCta = '<!-- author:탁터김 -->\n' + contentWithCta + '\n' + FIXED_CTA;

  // 관련글 링크 추가
  let finalContent = await addRelatedLinks(contentWithCta, postData.internal_links, postData.slug);

  // 이미지 메타 정보 추가 (alt, title, loading)
  // 이미지 태그 정리 - title/loading/width 없는 img에만 추가 (중복 방지)
  finalContent = finalContent.replace(
    /<img\s+src="([^"]*)"\s+alt="([^"]*)"(?!\s+title)/g,
    `<img src="$1" alt="$2" title="$2" loading="lazy" width="1080" height="720"`
  );

  const { data, error } = await supabase
    .from('posts')
    .insert([
      {
        title: postData.title,
        slug: postData.slug,
        desc_text: postData.desc_text,
        content: finalContent,
        category: postData.category,
        image_url: postData.image_url,
        date_text: dateText,
        color_class: 'bg-slate-800',
        is_published: true,
        priority: 9999,
      },
    ])
    .select()
    .single();

  if (error) {
    throw new Error(`Supabase 저장 오류: ${error.message}`);
  }

  return data.id;
}

/**
 * 인증 검증 (Vercel Cron: Authorization: Bearer, 수동: x-cron-secret)
 */
function isAuthorized(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization');
  if (authHeader === `Bearer ${process.env.CRON_SECRET}`) return true;
  const legacySecret = request.headers.get('x-cron-secret');
  if (legacySecret === process.env.CRON_SECRET) return true;
  return false;
}

/**
 * 자동 발행 핵심 로직
 */
async function runAutoPublish(): Promise<NextResponse<AutoPublishResponse>> {
  try {

    console.log('[AUTO-PUBLISH] 🚀 자동 글 발행 시작...');

    // 2. 다음 카테고리 결정
    const category = await getNextCategory();
    console.log(`[AUTO-PUBLISH] 📁 카테고리: ${category}`);

    // 3. 토픽 선택 — 자동차시장은 실시간 뉴스에서 토픽 선정
    let topic: string;
    let preloadedNewsContext = '';
    let preloadedOfficialImages: Array<{ url: string; alt: string; caption: string; credit: string }> = [];

    if (category === '자동차시장') {
      console.log('[AUTO-PUBLISH] 📰 실시간 뉴스에서 이번 달 토픽 선정 중...');
      const newsResult = await selectCarMarketTopicFromNews();
      topic = newsResult.topic;
      preloadedNewsContext = newsResult.newsContext;
      preloadedOfficialImages = newsResult.officialImages;
    } else {
      topic = await selectTopic(category);
    }
    console.log(`[AUTO-PUBLISH] 📌 토픽: ${topic}`);

    // 4. Claude로 SEO 최적화된 글 생성
    console.log('[AUTO-PUBLISH] ✍️ Claude로 글 생성 중... (재시도 포함)');
    const postData = await generateBlogPost(topic, category, preloadedNewsContext);
    console.log(`[AUTO-PUBLISH] ✅ 글 생성 완료`);
    console.log(`   - 제목: ${postData.title}`);
    console.log(`   - 키워드: ${postData.keywords.join(', ')}`);

    // 5. Unsplash에서 썸네일 이미지 가져오기 (영어 검색어 사용)
    console.log(`[AUTO-PUBLISH] 🖼️ Unsplash 썸네일 조회 중... (query: "${postData.image_query}")`);
    const imageData = await getUnsplashImage(postData.image_query, postData.title);
    console.log(`[AUTO-PUBLISH] ✅ 썸네일 조회 완료 (${imageData.credit}): ${imageData.url.slice(0, 60)}...`);

    // 6. 본문 이미지 3장 — 신차 뉴스면 공식사진 우선, 아니면 슬롯별 Unsplash
    console.log('[AUTO-PUBLISH] 🖼️ 본문 이미지 3장 조회 중...');
    let bodyImages: Array<{ url: string; alt: string; caption: string }>;

    // preloadedOfficialImages 우선, 없으면 postData.newsOfficialImages
    const officialImgsToUse = preloadedOfficialImages.length > 0 ? preloadedOfficialImages : postData.newsOfficialImages;

    if (officialImgsToUse.length > 0) {
      bodyImages = [];
      for (let i = 0; i < 3; i++) {
        const slot = postData.image_slots[i];
        const official = officialImgsToUse[i];
        if (official) {
          const result = await getOfficialOrUnsplash(official.url, slot.query, official.alt, official.caption);
          bodyImages.push(result);
        } else {
          const unsplashResults = await getBodyImages([slot]);
          bodyImages.push(unsplashResults[0] || { url: '', alt: slot.alt, caption: slot.caption });
        }
      }
    } else {
      postData.image_slots.forEach((s, i) => console.log(`   슬롯${i + 1}: "${s.query}" | alt:"${s.alt}" | cap:"${s.caption}"`));
      bodyImages = await getBodyImages(postData.image_slots);
    }
    console.log(`[AUTO-PUBLISH] ✅ 본문 이미지 ${bodyImages.filter(i => i.url).length}장 준비 완료`);

    // 7. 본문에 이미지 삽입
    let finalContent = postData.content;

    // 7-1. IMAGE_SLOT 마커를 실제 이미지로 교체
    let slotIndex = 0;
    const makeImgHtml = (img: { url: string; alt: string; caption: string; credit?: string }) => {
      const creditText = img.credit && img.credit !== 'AI 생성 이미지' ? ` (${img.credit})` : '';
      // 중복 속성 없이 깔끔하게 단일 img 태그 생성
      return `<figure class="my-8 text-center">
  <img src="${img.url}" alt="${img.alt}" title="${img.alt}" loading="lazy" width="1080" height="720" class="w-full rounded-xl shadow-md inline-block" />
  <figcaption class="mt-2 text-sm text-slate-500 italic">▲ ${img.caption}${creditText}</figcaption>
</figure>`;
    };

    finalContent = finalContent.replace(/<!--\s*IMAGE_SLOT\s*-->/g, () => {
      const img = bodyImages[slotIndex++];
      return img ? makeImgHtml(img) : '';
    });

    const remainingImages = bodyImages.slice(slotIndex);
    if (remainingImages.length > 0) {
      let insertCount = 0;
      finalContent = finalContent.replace(/<h2/g, (match) => {
        const img = remainingImages[insertCount++];
        if (!img) return match;
        return makeImgHtml(img) + match;
      });
    }

    // 8. Supabase에 저장
    console.log('[AUTO-PUBLISH] 💾 Supabase에 저장 중...');
    const postId = await savePost({
      ...postData,
      category,
      content: finalContent,
      image_url: imageData.url,
      image_credit: imageData.credit,
    });

    console.log(`\n[AUTO-PUBLISH] ✨ 성공! 글이 발행되었습니다!`);
    console.log(`   - PostID: ${postId}`);
    console.log(`   - 카테고리: ${category}`);
    console.log(`   - URL: https://www.dr-rent.net/posts/${postData.slug}`);

    return NextResponse.json(
      {
        success: true,
        message: `✨ 글이 자동으로 발행되었습니다. (ID: ${postId}, 카테고리: ${category})`,
        postId,
      },
      { status: 200 }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류';
    console.error('[AUTO-PUBLISH] ❌ 오류 발생!');
    console.error(`   - 에러: ${errorMessage}`);
    console.error(`   - 스택: ${error instanceof Error ? error.stack : ''}`);

    return NextResponse.json(
      {
        success: false,
        message: '자동 발행 중 오류가 발생했습니다.',
        error: errorMessage,
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/auto-publish - Vercel Cron 진입점
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  if (!isAuthorized(request)) {
    return NextResponse.json(
      { success: false, message: '인증 실패', error: 'Unauthorized' },
      { status: 401 }
    );
  }
  return runAutoPublish();
}

/**
 * POST /api/auto-publish - 수동 호출용
 */
export async function POST(request: NextRequest): Promise<NextResponse<AutoPublishResponse>> {
  if (!isAuthorized(request)) {
    return NextResponse.json(
      { success: false, message: '인증 실패', error: 'Unauthorized' },
      { status: 401 }
    );
  }
  return runAutoPublish();
}
