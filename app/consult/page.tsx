// app/page.tsx (DB 연동 버전)
import Link from "next/link";
import { Car, FileText, ChevronRight, ArrowRight, ShieldCheck, Zap, Calculator } from "lucide-react";
import { supabase } from "@/lib/supabase"; // DB 연결

// 1. DB에서 글 목록 가져오기 (이 코드가 핵심!)
async function getPosts() {
  const { data: posts, error } = await supabase
    .from('posts')
    .select('*')
    .order('id', { ascending: false }); // 최신글 순서로

  if (error) {
    console.error("글 불러오기 실패:", error);
    return [];
  }
  return posts;
}

export default async function Home() {
  const posts = await getPosts(); // 데이터 가져오기

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800">
      {/* 1. 헤더 */}
      <header className="fixed top-0 w-full z-50 bg-white/80 backdrop-blur-md border-b border-slate-200 shadow-sm transition-all duration-300">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="bg-blue-600 text-white p-1.5 rounded-lg group-hover:bg-blue-700 transition">
              <Car className="w-5 h-5" />
            </div>
            <span className="font-bold text-xl text-slate-900 tracking-tight">CARENS</span>
          </Link>
          <Link href="/consult" className="bg-slate-900 text-white px-5 py-2.5 rounded-full text-sm font-bold hover:bg-blue-600 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 flex items-center gap-2">
            내 견적 진단하기 <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </header>

      {/* 2. 히어로 섹션 */}
      <section className="relative pt-32 pb-20 px-4 overflow-hidden bg-slate-900 text-white">
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
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/consult" className="bg-blue-600 text-white px-8 py-4 rounded-xl font-bold text-lg hover:bg-blue-500 transition shadow-lg shadow-blue-900/50 flex items-center justify-center gap-2">
              <Calculator className="w-5 h-5" />
              무료 견적 분석 신청
            </Link>
          </div>
        </div>
      </section>

      {/* 3. 신뢰 포인트 */}
      <section className="py-16 px-4 -mt-10 relative z-20">
        <div className="max-w-6xl mx-auto grid md:grid-cols-3 gap-6">
          {[
            { icon: <Zap className="w-6 h-6 text-yellow-500" />, title: "즉시 출고 시스템", desc: "전국 24개 렌트사 재고 통합 조회로 7일 내 인도 가능합니다." },
            { icon: <ShieldCheck className="w-6 h-6 text-green-500" />, title: "무심사/예외 승인", desc: "저신용자, 무소득자도 승인 가능한 자체 심사 노하우 보유." },
            { icon: <Calculator className="w-6 h-6 text-blue-500" />, title: "영업 수수료 0원", desc: "불필요한 딜러 마진을 제거하여 월 납입료를 낮췄습니다." },
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

      {/* 4. 블로그 리스트 (DB 연동됨) */}
      <section className="py-16 px-4 bg-slate-50">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-end mb-10 gap-4">
            <div>
              <h2 className="text-3xl font-bold text-slate-900 mb-2">CARENS INSIGHT</h2>
              <p className="text-slate-500">호갱 탈출을 위한 필수 지식과 노하우</p>
            </div>
          </div>

          {/* 게시글이 없을 경우 처리 */}
          {posts.length === 0 ? (
            <div className="text-center py-20 text-slate-400">
              아직 등록된 글이 없습니다. Supabase에서 글을 추가해주세요.
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {posts.map((post: any) => (
                <Link href={`/posts/${post.id}`} key={post.id} className="group bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-2xl transition-all duration-300 border border-slate-100 flex flex-col h-full">
                  {/* 썸네일 영역 */}
                  <div className={`h-48 relative overflow-hidden ${post.color_class || 'bg-blue-600'}`}>
                    <div className="absolute inset-0 bg-black/10 group-hover:bg-transparent transition"></div>
                    <div className="absolute bottom-4 left-4">
                      <span className="bg-white/90 backdrop-blur text-slate-900 text-[10px] font-bold px-2 py-1 rounded shadow-sm">
                        {post.category}
                      </span>
                    </div>
                  </div>
                  {/* 텍스트 영역 */}
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

      {/* 5. 하단 CTA */}
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

      {/* 6. 푸터 */}
      <footer className="bg-slate-50 border-t border-slate-200 py-12 px-4 text-sm">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between gap-8 text-slate-500">
          <div>
            <div className="flex items-center gap-2 font-bold text-xl text-slate-900 mb-4">
              <Car className="w-5 h-5" />
              <span>CARENS</span>
            </div>
            <p className="font-light">투명하고 합리적인 자동차 생활의 기준</p>
          </div>
          <div className="flex flex-col gap-1 text-right">
            <span className="font-bold text-slate-900">Contact Us</span>
            <span>대표: 더바론 | 사업자번호: 000-00-00000</span>
            <span>contact@carens.com</span>
          </div>
        </div>
      </footer>
    </div>
  );
}