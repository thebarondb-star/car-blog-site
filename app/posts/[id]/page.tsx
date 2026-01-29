import Link from "next/link";
import { ChevronLeft, Calendar, User, FileText } from "lucide-react";
import { supabase } from "@/lib/supabase"; // DB 연결
import type { Metadata } from "next";

// DB에서 글 하나 가져오는 함수
async function getPost(id: string) {
  const { data: post } = await supabase.from('posts').select('*').eq('id', id).single();
  return post;
}

// 1. SEO 최적화 (DB 데이터 사용)
export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const post = await getPost(id);

  if (!post) {
    return { title: "존재하지 않는 글" };
  }

  // 본문에서 HTML 태그 제거하고 설명 만들기
  const plainText = post.content ? post.content.replace(/<[^>]*>?/gm, '') : "";

  return {
    title: `${post.title} | CARENS 장기렌트 인사이트`,
    description: plainText.slice(0, 140) + "...",
    openGraph: {
      title: post.title,
      description: plainText.slice(0, 100),
      type: "article",
    }
  };
}

// 2. 상세 페이지 화면
export default async function PostDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const post = await getPost(id);

  if (!post) {
    return (
      <div className="min-h-screen flex items-center justify-center flex-col gap-4">
        <h1 className="text-2xl font-bold">존재하지 않는 글입니다.</h1>
        <Link href="/" className="text-blue-600 hover:underline">홈으로 돌아가기</Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans">
      {/* 상단 네비게이션 */}
      <header className="border-b border-slate-200 sticky top-0 bg-white/90 backdrop-blur z-50">
        <div className="max-w-3xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-1 text-slate-500 hover:text-blue-600 transition font-medium text-sm">
            <ChevronLeft className="w-4 h-4" /> 목록으로
          </Link>
          <Link href="/consult" className="text-blue-600 font-bold text-sm bg-blue-50 px-3 py-1.5 rounded-full hover:bg-blue-100 transition border border-blue-100">
            내 견적 무료 진단
          </Link>
        </div>
      </header>

      {/* 본문 영역 */}
      <main className="max-w-3xl mx-auto px-4 py-12 bg-white shadow-sm min-h-screen">
        <div className="mb-10 border-b border-slate-100 pb-8">
          <div className="flex gap-2 mb-4">
            <span className="inline-block bg-blue-600 text-white text-[11px] font-bold px-2 py-1 rounded shadow-sm">{post.category}</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold mb-6 leading-tight text-slate-900 break-keep tracking-tight">{post.title}</h1>
          <div className="flex items-center gap-4 text-xs md:text-sm text-slate-400">
            <div className="flex items-center gap-1"><User className="w-4 h-4 text-slate-400" /><span className="font-bold text-slate-700">에디터 카렌스</span></div>
            <div className="flex items-center gap-1"><Calendar className="w-4 h-4 text-slate-400" /><span>{post.date_text}</span></div>
          </div>
        </div>

        {/* 본문 (HTML 적용) */}
        <article className="prose prose-lg prose-slate max-w-none text-slate-700 leading-relaxed space-y-8 break-keep" dangerouslySetInnerHTML={{ __html: post.content }} />
          
        <hr className="border-slate-200 my-16" />

        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-3xl p-8 text-center border border-blue-100 shadow-inner">
          <h3 className="text-2xl font-bold mb-3 text-slate-900">내 견적서는 안전할까요?</h3>
          <p className="text-slate-600 mb-8">전문가가 무료로 분석해 드립니다.</p>
          <Link href="/consult" className="inline-flex items-center gap-2 bg-blue-600 text-white font-bold px-8 py-4 rounded-xl hover:bg-blue-700 transition shadow-lg hover:-translate-y-1">
            <FileText className="w-5 h-5" /> 무료 견적 진단 신청하기
          </Link>
        </div>
      </main>
    </div>
  );
}