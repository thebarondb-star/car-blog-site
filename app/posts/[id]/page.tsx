import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { Calendar, User } from "lucide-react"; 
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import AdminPostControls from "@/components/AdminPostControls";
import PostContent from "@/components/PostContent"; // ✅ [추가됨] 새로 만든 뷰어 가져오기

export const revalidate = 0;

type Props = {
  params: Promise<{ id: string }>;
};

// SEO 메타데이터 생성
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  
  const { data: post } = await supabase
    .from('posts')
    .select('title, desc_text')
    .eq('id', id)
    .single();

  if (!post) {
    return {
      title: "글을 찾을 수 없습니다",
    };
  }

  return {
    title: `${post.title} | Dr.Rent`, 
    description: post.desc_text,
    openGraph: {
      title: post.title,
      description: post.desc_text,
      type: "article",
    },
  };
}

export default async function PostDetail({ params }: Props) {
  const { id } = await params;

  // 1. 현재 보고 있는 글 가져오기
  const { data: post, error } = await supabase
    .from('posts')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !post) {
    notFound();
  }

  // 2. 다른 추천 글 3개 가져오기
  const { data: recentPosts } = await supabase
    .from('posts')
    .select('*')
    .neq('id', id) 
    .order('id', { ascending: false })
    .limit(3);

  return (
    <div className="min-h-screen bg-white font-sans text-slate-800">
      
      {/* 본문 영역 */}
      <article className="max-w-4xl mx-auto px-4 py-10">
        
        {/* 카테고리 + 관리자 버튼 영역 */}
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
           {/* 카테고리 */}
           <span className="inline-block bg-blue-100 text-blue-700 font-bold px-4 py-1.5 rounded-full text-sm hover:bg-blue-200 transition cursor-pointer self-start">
            {post.category}
          </span>

          {/* 관리자용 수정/삭제 버튼 */}
          <AdminPostControls postId={post.id} />
        </div>

        {/* 제목 */}
        <h1 className="text-3xl md:text-5xl font-extrabold mb-6 leading-tight text-slate-900">
          {post.title}
        </h1>

        {/* 작성일 / 정보 */}
        <div className="flex items-center gap-4 text-slate-400 text-sm mb-10 border-b border-slate-100 pb-8">
          <div className="flex items-center gap-1">
            <Calendar className="w-4 h-4" />
            {post.date_text}
          </div>
          <div className="flex items-center gap-1">
            <User className="w-4 h-4" />
            에디터 닥터리 
          </div>
        </div>

        {/* 메인 이미지 */}
        {post.image_url && (
          <div className="rounded-2xl overflow-hidden mb-12 shadow-lg">
            <img src={post.image_url} alt={post.title} className="w-full h-auto object-cover max-h-[500px]"/>
          </div>
        )}

        {/* 본문 내용 (HTML 적용 + 이미지 클릭 확대 기능) */}
        {/* ✅ [수정됨] 기존 dangerouslySetInnerHTML div를 삭제하고 PostContent 컴포넌트로 교체 */}
        {post.content ? (
          <PostContent content={post.content} />
        ) : (
          <p className="text-center py-10 text-slate-400">본문 내용을 불러오는 중입니다.</p>
        )}

      </article>

      {/* 다른 글 목록 */}
      <section className="bg-slate-50 py-16 mt-10 border-t border-slate-200">
        <div className="max-w-4xl mx-auto px-4">
          <h3 className="text-2xl font-bold mb-8 text-slate-900">함께 읽으면 좋은 글</h3>
          <div className="grid md:grid-cols-3 gap-6">
            {recentPosts?.map((item: any) => (
              <Link href={`/posts/${item.id}`} key={item.id} className="bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-md transition group">
                <div className="h-40 relative bg-slate-200">
                  {item.image_url && <img src={item.image_url} className="w-full h-full object-cover" />}
                  <span className="absolute top-2 left-2 bg-white/90 text-xs font-bold px-2 py-1 rounded">{item.category}</span>
                </div>
                <div className="p-4">
                  <h4 className="font-bold text-slate-900 line-clamp-2 group-hover:text-blue-600 transition">{item.title}</h4>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* 하단 CTA */}
      <section className="bg-slate-900 text-white py-16">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h3 className="text-2xl font-bold mb-4">이 정보가 도움이 되셨나요?</h3>
          <p className="text-slate-400 mb-8">내 견적서도 안전한지 무료로 확인해보세요.</p>
          <Link href="/consult" className="inline-block bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 px-10 rounded-xl transition shadow-lg shadow-blue-900/50">
            전문가 무료 진단 신청
          </Link>
        </div>
      </section>
    </div>
  );
}