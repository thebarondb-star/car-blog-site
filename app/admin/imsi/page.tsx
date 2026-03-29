"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Lock, Loader2, ArrowLeft, FileEdit, Trash2 } from "lucide-react";
import Link from "next/link";

export default function AdminImsi() {
  const router = useRouter();
  
  const [drafts, setDrafts] = useState<any[]>([]);
  const [fetching, setFetching] = useState(true);

  const fetchDrafts = async () => {
    try {
      const { data, error } = await supabase
        .from("posts")
        .select("id, title, date_text, category, slug") // ✨ slug 필드 추가
        .eq("is_published", false)
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      setDrafts(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setFetching(false);
    }
  };

  useEffect(() => { fetchDrafts(); }, []);


  const handleDelete = async (id: string) => {
    if (!confirm("이 임시저장 글을 영구 삭제하시겠습니까?")) return;
    try {
      const { error } = await supabase.from("posts").delete().eq("id", id);
      if (error) throw error;
      setDrafts(drafts.filter(d => d.id !== id));
      alert("삭제되었습니다.");
    } catch (err) { alert("삭제 실패"); }
  };


  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-10">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <Link href="/" className="flex items-center text-slate-500 hover:text-slate-900 transition font-medium"><ArrowLeft className="w-5 h-5 mr-2" /> 메인으로 돌아가기</Link>
          <h1 className="text-2xl font-bold text-slate-900">임시저장 보관함 📝</h1>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
          {fetching ? (
            <div className="flex justify-center py-10"><Loader2 className="w-8 h-8 animate-spin text-slate-400" /></div>
          ) : drafts.length === 0 ? (
            <div className="text-center py-10 text-slate-500 font-medium">임시저장된 글이 없습니다.</div>
          ) : (
            <div className="space-y-3">
              {drafts.map((post) => (
                <div key={post.id} className="flex flex-col md:flex-row items-center justify-between p-4 border border-slate-100 rounded-xl hover:bg-slate-50 transition">
                  <div className="flex flex-col w-full md:w-auto mb-3 md:mb-0">
                    <span className="text-xs font-bold text-blue-600 mb-1">{post.category}</span>
                    
                    {/* ✨ 제목에 Link 컴포넌트를 감싸서 새 창 열기 적용 */}
                    <Link href={`/posts/${post.slug}`} target="_blank" className="hover:underline">
                      <h2 className="text-lg font-bold text-slate-900 truncate max-w-md group-hover:text-blue-600 transition">
                        {post.title || "(제목 없음)"} 🔗
                      </h2>
                    </Link>
                    
                    <span className="text-xs text-slate-400 mt-1">{post.date_text} 작성</span>
                  </div>
                  <div className="flex gap-2 w-full md:w-auto">
                    <button onClick={() => router.push(`/admin/edit/${post.id}`)} className="flex-1 md:flex-none flex items-center justify-center gap-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-4 py-2 rounded-lg text-sm transition"><FileEdit className="w-4 h-4"/> 이어서 쓰기</button>
                    <button onClick={() => handleDelete(post.id)} className="flex-none flex items-center justify-center p-2 bg-red-50 hover:bg-red-100 text-red-500 rounded-lg transition"><Trash2 className="w-4 h-4"/></button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}