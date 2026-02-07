"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { ArrowLeft, Save, Upload, Loader2 } from "lucide-react";
import Link from "next/link";
import Image from "next/image";

// ✅ [수정됨] 카테고리 목록을 새 이름과 순서로 고정!
const CATEGORIES = ["닥터렌트는?", "호갱탈출", "장기렌트정보"];

export default function WritePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  // 입력값 상태 관리
  const [formData, setFormData] = useState({
    title: "",
    category: CATEGORIES[0], // 기본값: 첫 번째 카테고리
    desc_text: "",
    content: "",
    image_url: "",
  });

  // 텍스트 입력 핸들러
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // 이미지 업로드 핸들러
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setUploading(true);
      if (!e.target.files || e.target.files.length === 0) return;

      const file = e.target.files[0];
      const fileExt = file.name.split(".").pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `posts/${fileName}`;

      // Supabase 스토리지에 업로드
      const { error: uploadError } = await supabase.storage
        .from("images")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // 이미지 주소 가져오기
      const { data } = supabase.storage.from("images").getPublicUrl(filePath);
      
      setFormData((prev) => ({ ...prev, image_url: data.publicUrl }));
    } catch (error) {
      alert("이미지 업로드 실패!");
      console.error(error);
    } finally {
      setUploading(false);
    }
  };

  // 저장 핸들러
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.content) {
      alert("제목과 내용을 입력해주세요.");
      return;
    }

    try {
      setLoading(true);

      // 날짜 포맷 (YYYY-MM-DD)
      const dateText = new Date().toISOString().split("T")[0];

      const { error } = await supabase.from("posts").insert([
        {
          title: formData.title,
          category: formData.category, // 선택된 카테고리 저장
          desc_text: formData.desc_text,
          content: formData.content, // HTML 내용 (줄바꿈 포함)
          image_url: formData.image_url,
          date_text: dateText,
        },
      ]);

      if (error) throw error;

      alert("글이 성공적으로 등록되었습니다!");
      router.push("/admin"); // 목록으로 이동
      router.refresh();
    } catch (error) {
      console.error(error);
      alert("저장 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-10">
      <div className="max-w-4xl mx-auto">
        {/* 상단 헤더 */}
        <div className="flex items-center justify-between mb-8">
          <Link href="/admin" className="flex items-center text-slate-500 hover:text-slate-900 transition font-medium">
            <ArrowLeft className="w-5 h-5 mr-2" />
            목록으로 돌아가기
          </Link>
          <h1 className="text-2xl font-bold text-slate-900">새 글 작성하기</h1>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 space-y-8">
          
          {/* 1. 카테고리 선택 (버튼형) */}
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-3">카테고리 선택</label>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setFormData((prev) => ({ ...prev, category: cat }))}
                  className={`
                    px-4 py-2 rounded-lg text-sm font-bold transition-all border
                    ${formData.category === cat
                      ? "bg-slate-900 text-white border-slate-900 shadow-md transform scale-105"
                      : "bg-white text-slate-500 border-slate-200 hover:bg-slate-50"
                    }
                  `}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* 2. 제목 입력 */}
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">제목</label>
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleChange}
              placeholder="제목을 입력하세요"
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
            />
          </div>

          {/* 3. 대표 이미지 업로드 */}
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">대표 이미지</label>
            <div className="flex items-center gap-4">
              <label className="cursor-pointer bg-slate-100 hover:bg-slate-200 text-slate-600 px-4 py-3 rounded-xl flex items-center gap-2 transition font-medium text-sm">
                {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                이미지 업로드
                <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
              </label>
              {formData.image_url && (
                <div className="relative w-20 h-20 rounded-lg overflow-hidden border border-slate-200">
                  <Image src={formData.image_url} alt="Preview" fill className="object-cover" />
                </div>
              )}
            </div>
          </div>

          {/* 4. 요약글 입력 */}
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">요약글 (리스트에 노출됨)</label>
            <textarea
              name="desc_text"
              value={formData.desc_text}
              onChange={handleChange}
              placeholder="이 글의 핵심 내용을 1-2줄로 요약해주세요."
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 transition h-24 resize-none"
            />
          </div>

          {/* 5. 본문 입력 */}
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">본문 내용 (HTML 가능)</label>
            <textarea
              name="content"
              value={formData.content}
              onChange={handleChange}
              placeholder="내용을 입력하세요. (HTML 태그 사용 가능)"
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 transition h-96 font-mono text-sm leading-relaxed"
            />
            <p className="text-xs text-slate-400 mt-2 text-right">💡 Tip: &lt;br&gt; 태그로 줄바꿈을 할 수 있습니다.</p>
          </div>

          {/* 저장 버튼 */}
          <div className="pt-4 border-t border-slate-100 flex justify-end">
            <button
              type="submit"
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-8 py-4 rounded-xl shadow-lg hover:shadow-xl transition-all flex items-center gap-2 text-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
              글 발행하기
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}