"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Lock, Loader2, ArrowLeft, FileEdit, Trash2 } from "lucide-react";
import Link from "next/link";

export default function AdminImsi() {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [passwordInput, setPasswordInput] = useState("");
  const [authError, setAuthError] = useState("");
  
  const [drafts, setDrafts] = useState<any[]>([]);
  const [fetching, setFetching] = useState(true);

  const fetchDrafts = async () => {
    try {
      const { data, error } = await supabase
        .from("posts")
        .select("id, title, date_text, category")
        .eq("is_published", false) // 👈 임시저장 글만 호출
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      setDrafts(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setFetching(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) fetchDrafts();
  }, [isAuthenticated]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordInput === "dlrns6632!") setIsAuthenticated(true);
    else setAuthError("비밀번호가 일치하지 않습니다.");
  };

  const handleDelete = async (id: string) => {
    if (!confirm("이 임시저장 글을 영구 삭제하시겠습니까?")) return;
    try {
      const { error } = await supabase.from("posts").delete().eq("id", id);
      if (error) throw error;
      setDrafts(drafts.filter(d => d.id !== id));
      alert("삭제되었습니다.");
    } catch (err) { alert("삭제 실패"); }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white max-w-sm w-full p-8 rounded-2xl shadow-xl border border-slate-100 text-center">
          <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-6 text-slate-500"><Lock className="w-8 h-8" /></div>
          <h1 className="text-xl font-bold text-slate-900 mb-2">임시저장 보관함</h1>
          <p className="text-slate-500 text-sm mb-6">비밀번호를 입력해주세요.</p>
          <form onSubmit={handleLogin} className="space-y-4">
            <input type="password" value={passwordInput} onChange={(e) => setPasswordInput(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-slate-900 focus:ring-1 focus:ring-slate-900 outline-none text-center font-bold text-lg" autoFocus autoComplete="new-password" />
            {authError && <p className="text-red-500 text-xs font-bold">{authError}</p>}
            <button type="submit" className="w-full bg-slate-900 text-white font-bold py-3 rounded-xl hover:bg-slate-800 transition">확인</button>
          </form>
        </div>
      </div>
    );
  }

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
                    <h2 className="text-lg font-bold text-slate-900 truncate max-w-md">{post.title || "(제목 없음)"}</h2>
                    <span className="text-xs text-slate-400">{post.date_text} 작성</span>
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