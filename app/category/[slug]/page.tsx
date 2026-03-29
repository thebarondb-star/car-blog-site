import { supabase } from "@/lib/supabase";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Calendar, ChevronRight } from "lucide-react";

function fmt(n: number) {
  return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

export const revalidate = 0;

// ✅ 1. 영어 주소(slug)와 실제 DB의 한글 카테고리 이름 매칭 사전
const categoryMap: Record<string, string> = {
  'special-price': '특가차량리스트',
  'hogaeng-escape': '호갱탈출',
  'rent-info': '장기렌트정보',
  'car-market': '자동차시장',
  'about': '닥터렌트는?',
  'about-drrent': '닥터렌트는?',
};

type Props = {
  params: Promise<{ slug: string }>;
};

// ✅ 2. 카테고리별 맞춤 SEO 설정
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const categoryName = categoryMap[slug];

  if (!categoryName) {
    return { title: "카테고리를 찾을 수 없습니다" };
  }

  return {
    title: `${categoryName} 모아보기 | 닥터렌트`,
    description: `닥터렌트의 ${categoryName} 관련 글들을 모아보세요. 투명한 장기렌트 가격비교와 꿀팁을 제공합니다.`,
    openGraph: {
      title: `${categoryName} | 닥터렌트`,
      description: `닥터렌트의 ${categoryName} 관련 글들을 모아보세요.`,
      url: `https://www.dr-rent.net/category/${slug}`,
    }
  };
}

// ✅ 3. 카테고리 페이지 화면 그리기
export default async function CategoryPage({ params }: Props) {
  const { slug } = await params;
  const categoryName = categoryMap[slug];

  // 사전에 없는 이상한 주소로 들어오면 404 에러 띄우기
  if (!categoryName) {
    notFound(); 
  }

  // DB에서 해당 카테고리의 발행된 글만 최신순으로 가져오기
  const { data: posts } = await supabase
    .from('posts')
    .select('*')
    .eq('category', categoryName)
    .eq('is_published', true)
    .order('priority', { ascending: true })
    .order('id', { ascending: false });

  // 특가차량리스트면 car_listings도 가져오기
  const isSpecial = categoryName === '특가차량리스트';
  const { data: carListings } = isSpecial
    ? await supabase.from('car_listings').select('*').eq('is_active', true).order('created_at', { ascending: false })
    : { data: [] };

  return (
    <div className="max-w-4xl mx-auto px-4 py-16 min-h-screen bg-white">
      {/* 헤더 부분 */}
      <div className="mb-12 text-center border-b border-slate-100 pb-8">
        <Link href="/" className="inline-flex items-center text-sm text-slate-400 hover:text-slate-600 mb-4 transition">
          ← 전체 글 보기
        </Link>
        <h1 className="text-4xl font-extrabold text-slate-900 mb-3">{categoryName}</h1>
        <p className="text-slate-500">
          {isSpecial ? `특가차량 ${carListings?.length ?? 0}대` : `총 ${posts?.length ?? 0}개의 글`}
        </p>
      </div>

      {/* 특가차량리스트: car_listings 카드 */}
      {isSpecial && carListings && carListings.length > 0 && (
        <div className="mb-10">
          <h2 className="text-xl font-bold text-slate-900 mb-4">이번 달 특가 차량</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-10">
            {carListings.map((car: any) => (
              <Link key={car.id} href={`/consult?car=${encodeURIComponent(car.car_name)}&car_id=${car.id}`}
                className="group bg-white rounded-2xl overflow-hidden shadow-sm border border-slate-100 hover:shadow-xl hover:-translate-y-1 transition duration-300 flex flex-col">
                <div className="h-48 relative overflow-hidden bg-slate-100">
                  {car.image_url ? (
                    <img src={car.image_url} alt={car.image_alt || car.car_name}
                      title={car.image_alt || car.car_name}
                      loading="lazy" className="w-full h-full object-cover group-hover:scale-105 transition duration-500" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-slate-200 to-slate-300">
                      <span className="text-slate-400 text-sm">이미지 없음</span>
                    </div>
                  )}
                  <span className="absolute top-3 left-3 bg-red-600 text-white text-[10px] font-black px-2 py-1 rounded-md shadow-sm">SPECIAL</span>
                </div>
                <div className="p-5 flex flex-col flex-1">
                  <h3 className="font-black text-lg text-slate-900 group-hover:text-blue-600 transition mb-1">{car.car_name}</h3>
                  {/* SEO 설명 한 줄 */}
                  <p className="text-xs text-slate-500 mb-2">
                    {car.car_name} 장기렌트 월 {fmt(car.monthly_rent_30 || car.monthly_rent)}원 | {car.duration}개월 | 연 {(car.mileage/10000).toFixed(0)}만km
                    {car.monthly_rent_30 ? ' | 선수금 0원 가능' : ''}
                  </p>

                  {car.options && <p className="text-xs text-slate-400 mb-3 line-clamp-1">{car.options}</p>}
                  <div className="mb-3">
                    {car.monthly_rent_30 ? (
                      <div>
                        <p className="text-[10px] text-blue-500 font-bold mb-0.5">선수금 30% 기준</p>
                        <p className="text-3xl font-black text-blue-600">{fmt(car.monthly_rent_30)}<span className="text-base font-bold text-slate-500">원/월</span></p>
                        <p className="text-[11px] text-slate-400 mt-1">선수금 0원 시 {fmt(car.monthly_rent)}원/월</p>
                      </div>
                    ) : (
                      <>
                        <p className="text-xs text-slate-500 mb-0.5">월 렌트료</p>
                        <p className="text-3xl font-black text-blue-600">{fmt(car.monthly_rent)}<span className="text-base font-bold text-slate-500">원/월</span></p>
                      </>
                    )}
                  </div>
                  {car.image_caption && <p className="text-xs text-slate-400 italic mb-2">▲ {car.image_caption}</p>}
                  <div className="flex gap-2 flex-wrap mb-3">
                    <span className="text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded-md font-bold">{car.duration}개월</span>
                    <span className="text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded-md font-bold">연 {(car.mileage / 10000).toFixed(0)}만km</span>
                  </div>
                  <div className="mt-auto pt-3 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-xs text-slate-400">차량가 <span className="font-bold text-slate-600">{fmt(car.total_price)}원</span></span>
                    <span className="text-xs text-blue-600 font-bold flex items-center gap-1 group-hover:translate-x-1 transition">견적 받기 <ChevronRight className="w-3 h-3" /></span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* 글 목록 리스트 */}
      <div className="grid md:grid-cols-2 gap-8">
        {posts && posts.length > 0 ? (
          posts.map((post) => (
            <Link href={`/posts/${post.slug}`} key={post.id} className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden hover:shadow-lg transition group flex flex-col">
              <div className="h-56 bg-slate-200 relative overflow-hidden">
                {post.image_url ? (
                  <img src={post.image_url} alt={post.title} className="w-full h-full object-cover group-hover:scale-105 transition duration-500" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-400">이미지 없음</div>
                )}
                <span className="absolute top-3 left-3 bg-white/90 text-xs font-bold px-3 py-1.5 rounded-md text-slate-800 shadow-sm">
                  {post.category}
                </span>
              </div>
              <div className="p-6 flex-1 flex flex-col">
                <h2 className="text-xl font-bold text-slate-900 mb-3 line-clamp-2 group-hover:text-blue-600 transition leading-snug">{post.title}</h2>
                <p className="text-slate-500 text-sm mb-6 line-clamp-2 flex-1 leading-relaxed">{post.desc_text}</p>
                <div className="flex items-center text-xs text-slate-400 gap-2 mt-auto">
                  <Calendar className="w-4 h-4" />
                  {new Date(post.created_at).toLocaleDateString()}
                </div>
              </div>
            </Link>
          ))
        ) : isSpecial && carListings && carListings.length > 0 ? null : (
          <div className="col-span-2 text-center py-20 text-slate-400 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
            아직 작성된 글이 없습니다.
          </div>
        )}
      </div>
    </div>
  );
}