"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Edit, Trash2, Lock, Loader2 } from "lucide-react";
import Link from "next/link";

export default function AdminPostControls({ postId }: { postId: string }) {
  const router = useRouter();
  
  // 삭제 관련 상태
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  // 삭제 처리 함수
  const handleDelete = async () => {
    if (password !== "dlrns6632!") {
      alert("비밀번호가 일치하지 않습니다.");
      return;
    }

    if (!confirm("정말 삭제하시겠습니까?")) return;

    setLoading(true);
    const { error } = await supabase.from("posts").delete().eq("id", postId);
    
    if (error) {
      alert("삭제 실패: " + error.message);
    } else {
      alert("삭제되었습니다.");
      router.push("/");
      router.refresh();
    }
    setLoading(false);
  };

  return (
    <>
      <div className="flex gap-2">
        {/* ✅ 수정 버튼: 비밀번호 묻지 않고 바로 이동 (AdminEdit 페이지에서 물어봄) */}
        <Link
          href={`/admin/edit/${postId}`}
          className="flex items-center gap-1 text-slate-400 hover:text-blue-600 font-medium transition text-sm"
        >
          <Edit className="w-4 h-4" /> 수정
        </Link>

        {/* 삭제 버튼: 기존처럼 비밀번호 물어봄 */}
        <button
          onClick={() => setShowDeleteModal(true)}
          className="flex items-center gap-1 text-slate-400 hover:text-red-600 font-medium transition text-sm"
        >
          <Trash2 className="w-4 h-4" /> 삭제
        </button>
      </div>

      {/* 🗑️ 삭제 전용 비밀번호 모달 (첫 번째 모양 - 삭제할 때만 뜸) */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-sm text-center">
            <div className="w-12 h-12 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <Lock className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-2">관리자 삭제 확인</h3>
            <p className="text-slate-500 text-sm mb-6">글을 삭제하려면 비밀번호를 입력하세요.</p>
            
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="비밀번호"
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-red-500 outline-none text-center font-bold mb-4"
              autoFocus
            />
            
            <div className="flex gap-2">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="flex-1 py-3 rounded-xl border border-slate-200 text-slate-500 font-bold hover:bg-slate-50"
              >
                취소
              </button>
              <button
                onClick={handleDelete}
                disabled={loading}
                className="flex-1 py-3 rounded-xl bg-red-500 text-white font-bold hover:bg-red-600 flex items-center justify-center gap-2"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "삭제 확인"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}