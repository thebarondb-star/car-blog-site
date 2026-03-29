import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(request: NextRequest) {
  try {
    const { car_name, color_exterior, options, total_price, monthly_rent, duration, mileage } = await request.json();

    if (!car_name) return NextResponse.json({ error: '차량명 필요' }, { status: 400 });

    const msg = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 400,
      messages: [{
        role: 'user',
        content: `당신은 자동차 장기렌트 SEO 전문가입니다.

다음 차량 정보를 보고, 실제 구매자가 네이버/구글에서 검색할 법한 SEO 키워드 7개를 생성해주세요.

차량명: ${car_name}
${color_exterior ? `외장색: ${color_exterior}` : ''}
${options ? `옵션: ${options}` : ''}
${total_price ? `총가격: ${total_price.toLocaleString()}원` : ''}
${monthly_rent ? `월렌트료: ${monthly_rent.toLocaleString()}원` : ''}
${duration ? `계약기간: ${duration}개월` : ''}
${mileage ? `연간키로수: ${(mileage/10000).toFixed(0)}만km` : ''}

키워드 선정 기준:
- 차량명 + "장기렌트" 조합
- 차량명 + "렌트 가격/비용/월납입금" 조합
- 차량명 + "최저가/특가/싸게" 조합
- 차량명 + "48개월/36개월" 등 기간 포함
- 차량명 + "선수금 없이/0원" 조합
- 실구매자 검색 의도 중심 롱테일 키워드

JSON만 반환: {"keywords": ["키워드1", "키워드2", "키워드3", "키워드4", "키워드5", "키워드6", "키워드7"]}`,
      }],
    });

    const text = msg.content[0].type === 'text' ? msg.content[0].text : '';
    const match = text.replace(/```json/g, '').replace(/```/g, '').match(/\{[\s\S]*\}/);
    if (!match) return NextResponse.json({ keywords: [] });
    const parsed = JSON.parse(match[0]);
    return NextResponse.json({ keywords: parsed.keywords || [] });
  } catch (err) {
    const msg = err instanceof Error ? err.message : '오류';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
