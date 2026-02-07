"use client";

import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Trash2, Edit } from "lucide-react";

export default function AdminPostControls({ postId }: { postId: string }) {
  const router = useRouter();

  const handleEdit = () => {
    router.push(`/admin/edit/${postId}`);
  };

  const handleDelete = async () => {
    const password = prompt("글을 삭제하려면 관리자 비밀번호를 입력하세요.");
    
    if (password !== "dlrns6632!") {
      alert("비밀번호가 틀렸습니다.");
      return;
    }

    if (!confirm("정말 삭제하시겠습니까? 복구할 수 없습니다.")) return;

    try {
      const { error } = await supabase
        .from("posts")
        .delete()
        .eq("id", postId);

      if (error) throw error;

      alert("삭제되었습니다.");
      router.push("/"); 
      router.refresh(); 
    } catch (error) {
      console.error(error);
      alert("삭제 중 오류가 발생했습니다.");
    }
  };

  return (
    <div className="flex gap-2 mt-4 md:mt-0">
      <button
        onClick={handleEdit}
        className="flex items-center gap-1 px-3 py-2 text-sm font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition"
      >
        <Edit className="w-4 h-4" /> 수정
      </button>
      <button
        onClick={handleDelete}
        className="flex items-center gap-1 px-3 py-2 text-sm font-bold text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition"
      >
        <Trash2 className="w-4 h-4" /> 삭제
      </button>
    </div>
  );
}