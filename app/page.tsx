import Link from "next/link";
import { FileText, ChevronRight, ShieldCheck, Zap, Calculator, Siren } from "lucide-react";
import { supabase } from "@/lib/supabase";

export const revalidate = 0; 

// 1. 카테고리 목록 수정 (특가차량리스트를 맨 뒤로 이동)
async function getCategories() {
  return ["전체", "닥터렌트는?", "호갱탈출", "장기렌트정보", "특가차량리스트"];
}

// 2. 글 목록 가져오기 (필터 로직 유지)
async function getPosts(category?: string) {
  let query = supabase
    .from('posts')
    .select('*')
    .order('id', { ascending: false });

  if (category && category !== "전체") {
    // 특정 카테고리를 눌렀을 때: 그 카테고리만 보여줌
    query = query.eq('category', category);
  } else {
    // "전체" 보기일 때: '특가차량리스트'는 숨김 (neq: not equal)
    query = query.neq('category', '특가차량리스트');
  }

  const { data: posts, error } = await query;

  if (error) {
    console.error("글 불러오기 실패:", error);
    return [];
  }
  return posts;
}

export default async function Home({ searchParams }: { searchParams: Promise<{ category?: string }> }) {
  const params = await searchParams;
  const selectedCategory = params.category || "전체";

  const categories = await getCategories();
  const posts = await getPosts(selectedCategory);

  return (
    <div className="font-sans text-slate-800">
      {/* 1. 히어로 섹션 */}
      <section className="relative pt-20 pb-20 px-4 overflow-hidden bg-slate-900 text-white">
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0">
          <div className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] bg-blue-600/30 rounded-full blur-[120px]"></div>
          <div className="absolute bottom-[-10%] left-[-10%] w-[400px] h-[400px] bg-purple-600/20 rounded-full blur-[100px]"></div>
        </div>

        <div className="max-w-4xl mx-auto text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-800 border border-slate-700 text-blue-400 text-xs font-bold mb-6">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
            </span>
            2026년형 장기렌트 특판 리스트 업데이트
          </div>
          <h1 className="text-4xl md:text-6xl font-extrabold mb-6 leading-tight tracking-tight">
            딜러 수당 거품 뺀<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">진짜 원가 견적</span>을 공개합니다
          </h1>
          
          <p className="text-slate-400 mb-10 text-lg md:text-xl max-w-2xl mx-auto font-light">
            아직도 월 렌탈료만 보고 계약하시나요?<br />
            현직 전문가가 분석한 <span className="text-white font-medium">투명한 견적 리포트</span>를 무료로 받아보세요.
            <br className="my-2 block" />
            <span className="block mt-2">견적 의뢰 한 번만 해도 고객님의 지갑을 지킬 수 있습니다.</span>
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/consult" className="bg-blue-600 text-white px-8 py-4 rounded-xl font-bold text-lg hover:bg-blue-50 transition shadow-lg shadow-blue-900/50 flex items-center justify-center gap-2">
              <Calculator className="w-5 h-5" />
              무료 견적 분석 신청
            </Link>
          </div>
        </div>
      </section>

      {/* 2. 신뢰 포인트 */}
      <section className="py-16 px-4 -mt-10 relative z-20">
        <div className="max-w-6xl mx-auto grid md:grid-cols-3 gap-6">
          {[
            { icon: <Zap className="w-6 h-6 text-yellow-500" />, title: "즉시 출고 시스템", desc: "전국 24개 렌트사 재고 통합 조회로 7일 내 인도 가능합니다." },
            { icon: <ShieldCheck className="w-6 h-6 text-green-500" />, title: "허위견적서 진단", desc: "허위견적 진단 및 최적견적 제공." },
            { icon: <Calculator className="w-6 h-6 text-blue-500" />, title: "영업 수수료 0원", desc: "불필요한 딜러 마진 ZERO 최저견적을 드립니다." },
          ].map((item, idx) => (
            <div key={idx} className="bg-white p-8 rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-100 hover:-translate-y-1 transition duration-300">
              <div className="bg-slate-50 w-12 h-12 rounded-lg flex items-center justify-center mb-4">
                {item.icon}
              </div>
              <h3 className="font-bold text-lg mb-2 text-slate-900">{item.title}</h3>
              <p className="text-sm text-slate-500 leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 3. 블로그 리스트 */}
      <section className="py-16 px-4 bg-slate-50">
        <div className="max-w-6xl mx-auto">
          
          <div className="mb-10">
            <h2 className="text-3xl font-bold text-slate-900 mb-2">Dr.Rent INSIGHT</h2>
            <p className="text-slate-500 mb-8">호갱 탈출을 위한 필수 지식과 노하우</p>

            <div className="flex gap-2 overflow-x-auto pb-4 scrollbar-hide">
              {categories.map((category) => (
                <Link
                  key={category}
                  href={category === "전체" ? "/" : `/?category=${category}`}
                  scroll={false}
                  className={`
                    whitespace-nowrap px-4 py-2 rounded-full text-sm font-bold transition-all duration-300 border flex items-center gap-1
                    ${selectedCategory === category 
                      ? "bg-slate-900 text-white border-slate-900 shadow-lg scale-105" 
                      : category === "특가차량리스트" // 특가 리스트 디자인 (빨간색 강조)
                        ? "bg-red-50 text-red-600 border-red-200 hover:bg-red-100"
                        : "bg-white text-slate-500 border-slate-200 hover:bg-slate-100 hover:border-slate-300"
                    }
                  `}
                >
                  {/* 특가차량리스트일 때만 사이렌 아이콘 표시 */}
                  {category === "특가차량리스트" && <Siren className="w-4 h-4" />}
                  {category}
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
                <Link href={`/posts/${post.id}`} key={post.id} className="group bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-2xl transition-all duration-300 border border-slate-100 flex flex-col h-full">
                  <div className="h-48 relative overflow-hidden bg-slate-200">
                    {post.image_url ? (
                      <img src={post.image_url} alt={post.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"/>
                    ) : (
                      <div className={`w-full h-full ${post.color_class || 'bg-slate-800'}`} />
                    )}
                    <div className="absolute inset-0 bg-black/20 group-hover:bg-transparent transition"></div>
                    <div className="absolute bottom-4 left-4">
                      {/* 특가차량리스트일 때 배지 색상 변경 */}
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

      {/* 4. 하단 CTA */}
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

      {/* 5. 푸터 */}
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