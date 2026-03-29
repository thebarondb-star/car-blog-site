import Link from "next/link";
import { FileText, ChevronRight, ShieldCheck, Zap, Calculator, Siren, Car } from "lucide-react";
import { supabase } from "@/lib/supabase";
import type { Metadata } from "next";

export const revalidate = 0;

export const metadata: Metadata = {
  title: "닥터렌트 | 딜러 수당 없는 장기렌트 원가 견적",
  description: "장기렌트 딜러 수당·수수료 없이 투명한 원가 견적을 제공합니다. 허위 견적서 진단, 최저가 장기렌트, 전국 24개 렌트사 비교. 지금 무료 견적 신청하세요.",
  keywords: ["장기렌트", "장기렌트 견적", "장기렌트 최저가", "허위견적 진단", "렌트카 비교", "닥터렌트"],
  openGraph: {
    title: "닥터렌트 | 딜러 수당 없는 장기렌트 원가 견적",
    description: "장기렌트 딜러 수당·수수료 없이 투명한 원가 견적을 제공합니다. 허위 견적서 진단, 최저가 장기렌트 비교.",
    url: "https://www.dr-rent.net",
    siteName: "닥터렌트",
    locale: "ko_KR",
    type: "website",
    images: [{ url: "https://www.dr-rent.net/og-image.png", width: 1200, height: 630, alt: "닥터렌트 장기렌트 원가 견적" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "닥터렌트 | 딜러 수당 없는 장기렌트 원가 견적",
    description: "투명한 원가 견적, 허위 견적서 진단. 지금 무료 견적 신청하세요.",
    images: ["https://www.dr-rent.net/og-image.png"],
  },
  alternates: { canonical: "https://www.dr-rent.net" },
}; 

// ✅ 1. 카테고리 목록 수정: 이름과 slug(영어주소)를 매칭한 객체 배열로 변경
async function getCategories() {
  return [
    { name: "전체", slug: "" },
    { name: "닥터렌트는?", slug: "about" },
    { name: "호갱탈출", slug: "hogaeng-escape" },
    { name: "장기렌트정보", slug: "rent-info" },
    { name: "자동차시장", slug: "car-market" },
    { name: "특가차량리스트", slug: "special-price" }
  ];
}

// 2. 글 목록 가져오기 (정렬 로직 유지)
async function getPosts(category?: string) {
  let query = supabase
    .from('posts')
    .select('*') // 여기서 slug도 같이 가져옵니다
    .eq('is_published', true) // ✨ [추가됨] 임시저장 글 제외, 발행된 글만 메인에 노출
    .order('priority', { ascending: true }) 
    .order('id', { ascending: false });

  if (category && category !== "전체") {
    query = query.eq('category', category);
  } else {
    query = query.neq('category', '특가차량리스트');
  }

  const { data: posts, error } = await query;

  if (error) {
    console.error("글 불러오기 실패:", error);
    return [];
  }
  return posts;
}

function fmt(n: number) {
  return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

async function getCarListings() {
  const { data } = await supabase
    .from('car_listings')
    .select('id, car_name, total_price, monthly_rent, monthly_rent_30, duration, mileage, image_url, image_alt, image_caption, options, is_sold, created_at')
    .eq('is_active', true)
    .order('created_at', { ascending: false })
    .limit(3);
  return data || [];
}

export default async function Home({ searchParams }: { searchParams: Promise<{ category?: string }> }) {
  const params = await searchParams;
  const selectedCategory = params.category || "전체";

  const [categories, posts, carListings] = await Promise.all([
    getCategories(),
    getPosts(selectedCategory),
    getCarListings(),
  ]);

  const homeLd = [
    {
      "@context": "https://schema.org",
      "@type": "Organization",
      "name": "닥터렌트",
      "url": "https://www.dr-rent.net",
      "description": "딜러 수당 없는 투명한 장기렌트 원가 견적 서비스",
      "contactPoint": { "@type": "ContactPoint", "contactType": "customer service", "areaServed": "KR", "availableLanguage": "Korean" },
    },
    {
      "@context": "https://schema.org",
      "@type": "WebSite",
      "name": "닥터렌트",
      "url": "https://www.dr-rent.net",
      "potentialAction": { "@type": "SearchAction", "target": "https://www.dr-rent.net/?q={search_term_string}", "query-input": "required name=search_term_string" },
    },
  ];

  return (
    <div className="font-sans text-slate-800" suppressHydrationWarning>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(homeLd) }} />
      {/* 1. 히어로 섹션 */}
      <section className="relative pt-16 pb-14 px-4 overflow-hidden bg-slate-900 text-white">
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0">
          <div className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] bg-blue-600/30 rounded-full blur-[120px]"></div>
          <div className="absolute bottom-[-10%] left-[-10%] w-[400px] h-[400px] bg-purple-600/20 rounded-full blur-[100px]"></div>
        </div>

        <div className="max-w-6xl mx-auto relative z-10">
          {/* 배지 */}
          <div className="flex justify-center mb-5">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-800 border border-slate-700 text-blue-400 text-xs font-bold">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
              </span>
              2026년형 장기렌트 특판 리스트 업데이트
            </div>
          </div>

          {/* 제목 + 설명 가로 배치 */}
          <div className="flex flex-col md:flex-row md:items-center md:gap-10 mb-8">
            <div className="md:flex-1 text-center md:text-left mb-4 md:mb-0">
              <h1 className="text-3xl md:text-5xl font-extrabold leading-tight tracking-tight">
                딜러 수당 거품 뺀<br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">진짜 원가 견적</span>을 공개합니다
              </h1>
            </div>
            <div className="md:flex-1 text-center md:text-left">
              <p className="text-slate-400 text-base md:text-lg font-light leading-relaxed">
                아직도 월 렌탈료만 보고 계약하시나요?<br />
                현직 전문가가 분석한 <span className="text-white font-medium">투명한 견적 리포트</span>를 무료로 받아보세요.<br />
                <span className="text-slate-400">견적 의뢰 한 번만 해도 고객님의 지갑을 지킬 수 있습니다.</span>
              </p>
            </div>
          </div>

          {/* 버튼 가운데 */}
          <div className="flex justify-center">
            <Link href="/consult" className="bg-blue-600 text-white px-8 py-4 rounded-xl font-bold text-lg hover:bg-blue-700 transition shadow-lg shadow-blue-900/50 flex items-center gap-2">
              <Calculator className="w-5 h-5" />
              무료 견적 분석 신청
            </Link>
          </div>
        </div>
      </section>

      {/* 2. 특가 차량 리스트 or 신뢰 포인트 */}
      <section className="py-16 px-4 -mt-10 relative z-20">
        <div className="max-w-6xl mx-auto">
          {carListings.length > 0 ? (
            <>
              <div className="flex items-center justify-between mb-8">
                <div>
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-50 border border-red-200 text-red-600 text-xs font-bold mb-3">
                    <Siren className="w-3 h-3" /> 이번 달 특가 차량
                  </div>
                  <h2 className="text-2xl font-bold text-slate-900">지금 바로 탈 수 있는 특가 리스트</h2>
                </div>
                <Link href="/cars" className="flex-shrink-0 flex items-center gap-1 text-sm text-blue-600 font-bold hover:underline">
                  전체보기 <ChevronRight className="w-4 h-4" />
                </Link>
              </div>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {carListings.map((car: any) => (
                  <Link key={car.id} href={`/consult?car=${encodeURIComponent(car.car_name)}&car_id=${car.id}`}
                    className={`group bg-white rounded-2xl overflow-hidden shadow-xl shadow-slate-200/50 border border-slate-100 hover:-translate-y-1 transition duration-300 flex flex-col ${car.is_sold ? 'opacity-70' : ''}`}>
                    <div className="h-48 relative overflow-hidden bg-slate-100">
                      {car.image_url ? (
                        <img src={car.image_url} alt={car.image_alt || car.car_name}
                          title={car.image_alt || car.car_name} loading="lazy"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-slate-200 to-slate-300">
                          <Car className="w-16 h-16 text-slate-400" />
                        </div>
                      )}
                      {car.is_sold ? (
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                          <span className="bg-red-600 text-white font-black text-base px-4 py-1.5 rounded-xl">판매완료</span>
                        </div>
                      ) : (
                        <div className="absolute top-3 left-3">
                          <span className="bg-red-600 text-white text-[10px] font-black px-2 py-1 rounded-md shadow-sm">SPECIAL</span>
                        </div>
                      )}
                    </div>
                    <div className="p-5 flex flex-col flex-1">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <h3 className="font-black text-lg text-slate-900 group-hover:text-blue-600 transition leading-snug">{car.car_name}</h3>
                        {car.is_sold && <span className="flex-shrink-0 bg-red-600 text-white text-[10px] font-black px-2 py-0.5 rounded">판매완료</span>}
                      </div>
                      {car.options && <p className="text-xs text-slate-400 mb-3 line-clamp-1">{car.options}</p>}
                      <div className="mb-3">
                        {car.monthly_rent_30 ? (
                          <div>
                            <p className="text-[10px] text-blue-500 font-bold mb-0.5">선수금 30% 기준</p>
                            <p className="text-3xl font-black text-blue-600">{fmt(car.monthly_rent_30)}<span className="text-base font-bold text-slate-500">원/월</span></p>
                            <p className="text-sm text-slate-500 font-medium mt-1">선수금 0원 시 {fmt(car.monthly_rent)}원/월</p>
                          </div>
                        ) : (
                          <>
                            <p className="text-xs text-slate-500 mb-0.5">월 렌트료</p>
                            <p className="text-3xl font-black text-blue-600">{fmt(car.monthly_rent)}<span className="text-base font-bold text-slate-500">원/월</span></p>
                          </>
                        )}
                      </div>
                      <div className="flex gap-2 flex-wrap mb-3">
                        <span className="text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded-md font-bold">{car.duration}개월</span>
                        <span className="text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded-md font-bold">연 {(car.mileage / 10000).toFixed(0)}만km</span>
                      </div>
                      <div className="mt-auto pt-3 border-t border-slate-100 flex items-center justify-between">
                        <div>
                          <span className="text-xs text-slate-400">차량가 </span>
                          <span className="text-sm font-bold text-slate-700">{fmt(car.total_price)}원</span>
                        </div>
                        <div className="flex flex-col items-end gap-0.5">
                          <span className="text-[10px] text-slate-400">{new Date(car.created_at).toLocaleDateString('ko-KR')}</span>
                          {!car.is_sold && (
                            <span className="text-xs text-blue-600 font-bold flex items-center gap-1 group-hover:translate-x-1 transition">
                              견적 받기 <ChevronRight className="w-3 h-3" />
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </>
          ) : (
            <div className="grid md:grid-cols-3 gap-6">
              {[
                { icon: <Zap className="w-6 h-6 text-yellow-500" />, title: "즉시 출고 시스템", desc: "전국 24개 렌트사 재고 통합 조회로 7일 내 인도 가능합니다." },
                { icon: <ShieldCheck className="w-6 h-6 text-green-500" />, title: "허위견적서 진단", desc: "허위견적 진단 및 최적견적 제공." },
                { icon: <Calculator className="w-6 h-6 text-blue-500" />, title: "영업 수수료 0원", desc: "불필요한 딜러 마진 ZERO 최저견적을 드립니다." },
              ].map((item, idx) => (
                <div key={idx} className="bg-white p-8 rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-100 hover:-translate-y-1 transition duration-300">
                  <div className="bg-slate-50 w-12 h-12 rounded-lg flex items-center justify-center mb-4">{item.icon}</div>
                  <h3 className="font-bold text-lg mb-2 text-slate-900">{item.title}</h3>
                  <p className="text-sm text-slate-500 leading-relaxed">{item.desc}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* 3. 블로그 리스트 */}
      <section className="py-16 px-4 bg-slate-50">
        <div className="max-w-6xl mx-auto">
          
          <div className="mb-10">
            <h2 className="text-3xl font-bold text-slate-900 mb-2">Dr.Rent INSIGHT</h2>
            <p className="text-slate-500 mb-8">호갱 탈출을 위한 필수 지식과 노하우</p>

            {/* ✅ 카테고리 렌더링 수정: 객체 배열을 매핑하고 slug를 기반으로 URL 생성 */}
            <div className="flex gap-2 overflow-x-auto pb-4 scrollbar-hide">
              {categories.map((category) => (
                <Link
                  key={category.name}
                  href={category.slug === "" ? "/" : `/category/${category.slug}`}
                  scroll={false}
                  className={`
                    whitespace-nowrap px-4 py-2 rounded-full text-sm font-bold transition-all duration-300 border flex items-center gap-1
                    ${selectedCategory === category.name 
                      ? "bg-slate-900 text-white border-slate-900 shadow-lg scale-105" 
                      : category.name === "특가차량리스트" 
                        ? "bg-red-50 text-red-600 border-red-200 hover:bg-red-100"
                        : "bg-white text-slate-500 border-slate-200 hover:bg-slate-100 hover:border-slate-300"
                    }
                  `}
                >
                  {category.name === "특가차량리스트" && <Siren className="w-4 h-4" />}
                  {category.name}
                </Link>
              ))}
            </div>
          </div>

          {!posts || posts.length === 0 ? (
            <div className="text-center py-32 bg-white rounded-2xl border border-slate-100 shadow-sm">
              <p className="text-2xl mb-2">텅 비었습니다 😅</p>
              <p className="text-slate-400">"{selectedCategory}" 카테고리에는 아직 글이 없네요.</p>
              <Link href="/" className="inline-block mt-4 text-blue-600 font-bold hover:underline">
                전체 글로 돌아가기
              </Link>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {posts.map((post: any) => (
                // ⚡️ 기존 수정사항 유지: 글 클릭 시 영어 주소로 이동
                <Link href={`/posts/${post.slug}`} key={post.id} className="group bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-2xl transition-all duration-300 border border-slate-100 flex flex-col h-full">
                  <div className="h-48 relative overflow-hidden bg-slate-200">
                    {post.image_url ? (
                      <img src={post.image_url} alt={post.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"/>
                    ) : (
                      <div className={`w-full h-full ${post.color_class || 'bg-slate-800'}`} />
                    )}
                    <div className="absolute inset-0 bg-black/20 group-hover:bg-transparent transition"></div>
                    <div className="absolute bottom-4 left-4">
                      <span className={`
                        backdrop-blur text-[10px] font-bold px-2 py-1 rounded shadow-sm
                        ${post.category === '특가차량리스트' ? 'bg-red-600 text-white' : 'bg-white/90 text-slate-900'}
                      `}>
                        {post.category}
                      </span>
                    </div>
                  </div>
                  <div className="p-6 flex flex-col flex-1">
                    <h3 className="font-bold text-lg mb-3 leading-snug text-slate-800 group-hover:text-blue-600 transition">
                      {post.title}
                    </h3>
                    <p className="text-slate-500 text-sm line-clamp-2 mb-4 flex-1 font-light">
                      {post.desc_text}
                    </p>
                    <div className="flex items-center justify-between text-xs text-slate-400 pt-4 border-t border-slate-50">
                      <span>{post.date_text}</span>
                      <span className="flex items-center gap-1 group-hover:translate-x-1 transition text-blue-600 font-bold">
                        Read More <ChevronRight className="w-3 h-3" />
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* 4. 하단 CTA (디자인 유지) */}
      <section className="py-24 px-4 bg-white">
        <div className="max-w-4xl mx-auto bg-gradient-to-br from-slate-900 to-blue-900 rounded-3xl p-10 md:p-16 text-center text-white shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-16 -mt-16"></div>
          <div className="relative z-10">
            <h2 className="text-3xl md:text-4xl font-bold mb-6">내 견적서는 안전할까요?</h2>
            <p className="text-blue-200 mb-8 text-lg">
              지금 보고 계신 견적서가 적정한지 무료로 분석해 드립니다.
            </p>
            <Link href="/consult" className="inline-flex items-center gap-2 bg-white text-blue-900 font-bold px-10 py-4 rounded-xl hover:bg-blue-50 transition shadow-lg text-lg">
              <FileText className="w-5 h-5" />
              전문가 무료 진단 신청
            </Link>
          </div>
        </div>
      </section>

      {/* 5. 푸터 (디자인 유지) */}
      <footer className="bg-slate-50 border-t border-slate-200 py-12 px-4 text-sm">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between gap-8 text-slate-500">
          <div>
            <div className="flex items-center gap-2 font-bold text-xl text-slate-900 mb-4">
              <span className="font-bold text-blue-900">Dr.Rent</span>
            </div>
            <p className="font-light">투명하고 합리적인 자동차 생활의 기준</p>
          </div>
          <div className="flex flex-col gap-1 text-right">
            <span className="font-bold text-slate-900">Contact Us</span>
            <span>dr.rent.go@gmail.com</span>
          </div>
        </div>
      </footer>
    </div>
  );
}