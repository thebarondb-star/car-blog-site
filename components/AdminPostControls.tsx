"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { createClient } from "@/lib/supabase-browser";
import { Edit, Trash2, Loader2 } from "lucide-react";
import Link from "next/link";

export default function AdminPostControls({ postId }: { postId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    // 세션 확인
    const authClient = createClient();
    const { data: { user } } = await authClient.auth.getUser();
    if (!user) {
      alert('관리자 로그인이 필요합니다.');
      router.push('/admin/login');
      return;
    }

    if (!confirm('정말 삭제하시겠습니까? 복구할 수 없습니다.')) return;

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
    <div className="flex gap-2">
      <Link
        href={`/admin/edit/${postId}`}
        className="flex items-center gap-1 text-slate-400 hover:text-blue-600 font-medium transition text-sm"
      >
        <Edit className="w-4 h-4" /> 수정
      </Link>
      <button
        onClick={handleDelete}
        disabled={loading}
        className="flex items-center gap-1 text-slate-400 hover:text-red-600 font-medium transition text-sm"
      >
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />} 삭제
      </button>
    </div>
  );
}
