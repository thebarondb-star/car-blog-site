"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Edit, Trash2, Lock, X } from "lucide-react";

export default function AdminPostControls({ postId }: { postId: string }) {
  const router = useRouter();
  
  // 모달 상태 관리 (열림/닫힘, 비밀번호, 에러메시지)
  const [showModal, setShowModal] = useState(false);
  const [password, setPassword] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [actionType, setActionType] = useState<"edit" | "delete" | null>(null);

  // 수정 버튼 클릭 -> 모달 열기
  const onEditClick = () => {
    setActionType("edit");
    setPassword("");
    setErrorMsg("");
    setShowModal(true);
  };

  // 삭제 버튼 클릭 -> 모달 열기
  const onDeleteClick = () => {
    setActionType("delete");
    setPassword("");
    setErrorMsg("");
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setPassword("");
  };

  // 비밀번호 확인 로직
  const handleConfirm = async () => {
    if (password === "dlrns6632!") {
      // ✅ 비밀번호 일치!
      if (actionType === "edit") {
        router.push(`/admin/edit/${postId}`); // 수정 페이지로 이동
      } else if (actionType === "delete") {
        if (confirm("정말 삭제하시겠습니까? 복구할 수 없습니다.")) {
          try {
            const { error } = await supabase.from("posts").delete().eq("id", postId);
            if (error) throw error;
            alert("삭제되었습니다.");
            router.push("/");
            router.refresh();
          } catch (e) {
            alert("삭제 중 오류가 발생했습니다.");
          }
        }
      }
      closeModal();
    } else {
      // ❌ 비밀번호 불일치
      setErrorMsg("비밀번호가 올바르지 않습니다.");
    }
  };

  // 엔터키 지원
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleConfirm();
  };

  return (
    <>
      {/* 1. 버튼 UI (화면에 보이는 수정/삭제 버튼) */}
      <div className="flex gap-2 mt-4 md:mt-0">
        <button 
          onClick={onEditClick} 
          className="flex items-center gap-1 px-3 py-2 text-sm font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition"
        >
          <Edit className="w-4 h-4" /> 수정
        </button>
        <button 
          onClick={onDeleteClick} 
          className="flex items-center gap-1 px-3 py-2 text-sm font-bold text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition"
        >
          <Trash2 className="w-4 h-4" /> 삭제
        </button>
      </div>

      {/* 2. 관리자 인증 모달창 (자물쇠 아이콘 포함) */}
      {showModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden transform transition-all scale-100">
            
            {/* 모달 헤더 (닫기 버튼) */}
            <div className="flex justify-end p-2">
              <button onClick={closeModal} className="p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="px-8 pb-8 text-center">
              {/* 자물쇠 아이콘 */}
              <div className="mx-auto w-14 h-14 bg-slate-100 rounded-full flex items-center justify-center mb-4 text-slate-500 shadow-inner">
                <Lock className="w-7 h-7" />
              </div>

              <h3 className="text-xl font-bold text-slate-900 mb-2">관리자 확인</h3>
              <p className="text-sm text-slate-500 mb-6 leading-relaxed">
                {actionType === 'edit' ? '글을 수정하려면' : '글을 삭제하려면'}<br/>
                비밀번호를 입력해주세요.
              </p>

              {/* 입력창 */}
              <div className="space-y-3">
                <input 
                  type="password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="관리자 비밀번호"
                  className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:border-slate-900 focus:ring-2 focus:ring-slate-900/20 outline-none transition text-center font-bold text-lg tracking-widest"
                  autoFocus
                />
                {errorMsg ? (
                  <p className="text-red-500 text-xs font-bold animate-pulse">{errorMsg}</p>
                ) : (
                  <p className="h-4"></p> // 레이아웃 밀림 방지용 빈 공간
                )}
              </div>

              {/* 확인 버튼 */}
              <button 
                onClick={handleConfirm}
                className="w-full mt-2 py-3.5 text-sm font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-xl transition shadow-lg shadow-slate-900/20 active:scale-[0.98]"
              >
                확인
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}