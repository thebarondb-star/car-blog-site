import { supabase } from "@/lib/supabase";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Calendar } from "lucide-react";

export const revalidate = 0;

// ✅ 1. 영어 주소(slug)와 실제 DB의 한글 카테고리 이름 매칭 사전
const categoryMap: Record<string, string> = {
  'special-price': '특가차량리스트',
  'hogaeng-escape': '호갱탈출',
  'rent-info': '장기렌트 정보', 
  'about-drrent':'닥터렌트는?',
  // 💡 대표님이 사용 중인 다른 카테고리가 있다면 여기에 추가해 주세요!
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

  // DB에서 해당 카테고리의 글만 최신순으로 가져오기
  const { data: posts } = await supabase
    .from('posts')
    .select('*')
    .eq('category', categoryName)
    .order('created_at', { ascending: false });

  return (
    <div className="max-w-4xl mx-auto px-4 py-16 min-h-screen bg-white">
      {/* 헤더 부분 */}
      <div className="mb-12 text-center border-b border-slate-100 pb-8">
        <h1 className="text-4xl font-extrabold text-slate-900 mb-3">{categoryName}</h1>
        <p className="text-slate-500">이 카테고리의 최신 글을 확인해 보세요.</p>
      </div>

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
        ) : (
          <div className="col-span-2 text-center py-20 text-slate-400 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
            아직 작성된 글이 없습니다.
          </div>
        )}
      </div>
    </div>
  );
}