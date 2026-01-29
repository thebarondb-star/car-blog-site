import Link from "next/link";
import { Car, CheckCircle2, FileText, ChevronRight, ArrowRight, ShieldCheck, Zap, Calculator } from "lucide-react";

export default function Home() {
  const posts = [
    { id: 1, category: "필독", title: "계약서 도장 찍기 전 확인해야 할 특약 3가지", desc: "월 렌탈료가 싸다고 덜컥 계약하면 나중에 위약금 폭탄 맞습니다. 독소 조항 체크리스트.", date: "2026.01.30", color: "bg-rose-500" },
    { id: 2, category: "사업자", title: "법인/개인사업자 세금 1,000만 원 아끼는 법", desc: "단순 비용 처리가 아닙니다. 건보료 절감부터 부가세 환급까지 완벽 정리.", date: "2026.01.29", color: "bg-blue-600" },
    { id: 3, category: "신용", title: "장기렌트 vs 리스, 신용점수 하락 없는 선택은?", desc: "대출 계획이 있다면 절대 리스를 쓰면 안 됩니다. 금융권 대출 한도를 지키는 전략.", date: "2026.01.28", color: "bg-indigo-500" },
    { id: 4, category: "꿀팁", title: "대기 없이 일주일 만에 받는 '선발주' 리스트", desc: "인기 차종 1년 대기? 렌트사 선구매 물량을 선점하면 즉시 출고 가능합니다.", date: "2026.01.27", color: "bg-emerald-500" },
    { id: 5, category: "사고", title: "사고 나도 보험료 할증 0원? 면책금의 진실", desc: "초보 운전자가 장기렌트를 타야 하는 진짜 이유. 사고 처리 비용 완전 분석.", date: "2026.01.26", color: "bg-orange-500" },
    { id: 6, category: "분석", title: "4년 뒤 인수 vs 반납, 무엇이 이득일까?", desc: "잔존가치 설정에 따른 유불리 분석. 중고차 시세를 예측해 드립니다.", date: "2026.01.25", color: "bg-slate-500" },
    { id: 7, category: "승인", title: "신용 600점대 저신용자 승인 성공 전략", desc: "무심사 렌트의 함정에 빠지지 마세요. 메이저 렌트사 예외 승인 노하우.", date: "2026.01.24", color: "bg-teal-600" },
    { id: 8, category: "전기차", title: "전기차 보조금, 렌트사가 먹나요 내가 받나요?", desc: "복잡한 보조금 신청 없이 차값 할인받는 법. 배터리 보증 이슈 정리.", date: "2026.01.23", color: "bg-cyan-600" },
    { id: 9, category: "비교", title: "쏘렌토 하이브리드, 할부 vs 렌트 5년 총비용", desc: "취등록세, 이자, 보험료까지 싹 다 더해서 엑셀로 비교했습니다. 충격적 결과.", date: "2026.01.22", color: "bg-violet-600" },
    { id: 10, category: "경고", title: "무보증 0원 광고의 함정, 낚시 견적 구별법", desc: "세상에 공짜는 없습니다. 미끼 상품에 속지 않고 '진짜 원가' 찾는 법.", date: "2026.01.21", color: "bg-red-600" },
  ];

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800">
      {/* 1. 헤더 (Glassmorphism 적용) */}
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

      {/* 2. 히어로 섹션 (임팩트 강조) */}
      <section className="relative pt-32 pb-20 px-4 overflow-hidden bg-slate-900 text-white">
        {/* 배경 효과 */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0">
          <div className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] bg-blue-600/30 rounded-full blur-[120px]"></div>
          <div className="absolute bottom-[-10%] left-[-10%] w-[400px] h-[400px] bg-purple-600/20 rounded-full blur-[100px]"></div>
        </div>

        <div className="max-w-4xl mx-auto text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-800 border border-slate-700 text-blue-400 text-xs font-bold mb-6 animate-fade-in-up">
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
            <div className="flex items-center justify-center gap-2 text-slate-400 text-sm sm:hidden">
              <ShieldCheck className="w-4 h-4" /> 개인정보 100% 안전
            </div>
          </div>
        </div>
      </section>

      {/* 3. 신뢰 포인트 (카드 디자인) */}
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

      {/* 4. 블로그 리스트 (매거진 스타일) */}
      <section className="py-16 px-4 bg-slate-50">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-end mb-10 gap-4">
            <div>
              <h2 className="text-3xl font-bold text-slate-900 mb-2">CARENS INSIGHT</h2>
              <p className="text-slate-500">호갱 탈출을 위한 필수 지식과 노하우</p>
            </div>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {posts.map((post) => (
              <Link href={`/posts/${post.id}`} key={post.id} className="group bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-2xl transition-all duration-300 border border-slate-100 flex flex-col h-full">
                {/* 썸네일 영역 */}
                <div className={`h-48 relative overflow-hidden ${post.color}`}>
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
                    {post.desc}
                  </p>
                  <div className="flex items-center justify-between text-xs text-slate-400 pt-4 border-t border-slate-50">
                    <span>{post.date}</span>
                    <span className="flex items-center gap-1 group-hover:translate-x-1 transition text-blue-600 font-bold">
                      Read More <ChevronRight className="w-3 h-3" />
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* 5. 하단 CTA */}
      <section className="py-24 px-4 bg-white">
        <div className="max-w-4xl mx-auto bg-gradient-to-br from-slate-900 to-blue-900 rounded-3xl p-10 md:p-16 text-center text-white shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-16 -mt-16"></div>
          <div className="relative z-10">
            <h2 className="text-3xl md:text-4xl font-bold mb-6">내 견적서는 안전할까요?</h2>
            <p className="text-blue-200 mb-8 text-lg">
              지금 보고 계신 견적서가 적정한지 무료로 분석해 드립니다.<br className="hidden md:block" />
              상담 목적 외에는 절대 사용하지 않으니 안심하세요.
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