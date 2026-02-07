"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { ArrowLeft, Save, Upload, Loader2, Image as ImageIcon, Eye, PenTool } from "lucide-react";
import Link from "next/link";
import Image from "next/image";

// ✅ 카테고리 목록
const CATEGORIES = ["닥터렌트는?", "호갱탈출", "장기렌트정보"];

export default function AdminWrite() {
  const router = useRouter();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const [loading, setLoading] = useState(false);
  const [uploadingThumbnail, setUploadingThumbnail] = useState(false);
  const [uploadingBody, setUploadingBody] = useState(false);
  
  // ✨ [추가됨] 작성모드 vs 미리보기 모드 상태 관리
  const [viewMode, setViewMode] = useState<"write" | "preview">("write");

  const [formData, setFormData] = useState({
    password: "",
    title: "",
    category: CATEGORIES[0],
    desc_text: "",
    content: "",
    image_url: "",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // 1. 썸네일 이미지 업로드
  const handleThumbnailUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setUploadingThumbnail(true);
      if (!e.target.files || e.target.files.length === 0) return;

      const file = e.target.files[0];
      const fileExt = file.name.split(".").pop();
      const fileName = `thumb_${Date.now()}.${fileExt}`;
      const filePath = `consult_photos/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("consult_photos")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from("consult_photos").getPublicUrl(filePath);
      
      setFormData((prev) => ({ ...prev, image_url: data.publicUrl }));
    } catch (error: any) {
      alert("썸네일 업로드 실패: " + error.message);
    } finally {
      setUploadingThumbnail(false);
    }
  };

  // 2. 본문 중간 삽입 이미지 업로드
  const handleBodyImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      if (!e.target.files || e.target.files.length === 0) return;
      setUploadingBody(true);

      const file = e.target.files[0];
      const fileExt = file.name.split(".").pop();
      const fileName = `body_${Date.now()}.${fileExt}`;
      const filePath = `consult_photos/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("consult_photos")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from("consult_photos").getPublicUrl(filePath);
      
      const imgTag = `\n<img src="${data.publicUrl}" alt="첨부이미지" class="w-full rounded-xl shadow-md my-4" />\n`;
      
      const textarea = textareaRef.current;
      if (textarea) {
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const text = formData.content;
        const newContent = text.substring(0, start) + imgTag + text.substring(end);
        setFormData(prev => ({ ...prev, content: newContent }));
      } else {
        setFormData(prev => ({ ...prev, content: prev.content + imgTag }));
      }

    } catch (error: any) {
      alert("본문 이미지 업로드 실패: " + error.message);
    } finally {
      setUploadingBody(false);
      e.target.value = ""; 
    }
  };

  // 저장 핸들러
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.password !== "dlrns6632!") {
      alert("관리자 비밀번호가 틀렸습니다.");
      return;
    }

    if (!formData.title || !formData.content) {
      alert("제목과 내용은 필수입니다.");
      return;
    }

    if (!confirm("이대로 발행하시겠습니까?")) return;

    try {
      setLoading(true);

      const today = new Date();
      const dateText = `${today.getFullYear()}.${String(today.getMonth() + 1).padStart(2, '0')}.${String(today.getDate()).padStart(2, '0')}`;

      const { error } = await supabase.from("posts").insert([
        {
          title: formData.title,
          category: formData.category,
          desc_text: formData.desc_text,
          content: formData.content,
          image_url: formData.image_url,
          date_text: dateText,
          color_class: "bg-slate-800"
        },
      ]);

      if (error) throw error;

      alert("글이 성공적으로 등록되었습니다!");
      router.push("/");
      router.refresh();
    } catch (error: any) {
      console.error(error);
      alert("저장 중 오류가 발생했습니다: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-10">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <Link href="/" className="flex items-center text-slate-500 hover:text-slate-900 transition font-medium">
            <ArrowLeft className="w-5 h-5 mr-2" />
            메인으로 돌아가기
          </Link>
          <h1 className="text-2xl font-bold text-slate-900">관리자 글쓰기</h1>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 space-y-8">
          
          {/* 0. 비밀번호 */}
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">관리자 비밀번호 🔒</label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="비밀번호를 입력하세요"
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
            />
          </div>

          <hr className="border-slate-100" />

          {/* 1. 카테고리 */}
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

          {/* 2. 제목 */}
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">제목</label>
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleChange}
              placeholder="제목을 입력하세요"
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 transition font-bold text-lg"
            />
          </div>

          {/* 3. 썸네일 */}
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">대표 썸네일 (목록용)</label>
            <div className="flex items-center gap-4">
              <label className="cursor-pointer bg-slate-100 hover:bg-slate-200 text-slate-600 px-4 py-3 rounded-xl flex items-center gap-2 transition font-medium text-sm">
                {uploadingThumbnail ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                썸네일 업로드
                <input type="file" accept="image/*" onChange={handleThumbnailUpload} className="hidden" />
              </label>
              {formData.image_url && (
                <div className="relative w-24 h-24 rounded-lg overflow-hidden border border-slate-200 shadow-sm">
                  <Image src={formData.image_url} alt="Thumbnail Preview" fill className="object-cover" />
                </div>
              )}
            </div>
          </div>

          {/* 4. 요약글 */}
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">요약글 (리스트 노출용)</label>
            <textarea
              name="desc_text"
              value={formData.desc_text}
              onChange={handleChange}
              placeholder="이 글의 핵심 내용을 1-2줄로 요약해주세요."
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 transition h-20 resize-none"
            />
          </div>

          {/* 5. 본문 입력 (미리보기 기능 추가됨) */}
          <div>
            <div className="flex justify-between items-end mb-3">
              <label className="block text-sm font-bold text-slate-700">본문 내용</label>

              {/* ✨ 뷰 모드 전환 버튼 (작성 / 미리보기) */}
              <div className="flex bg-slate-100 p-1 rounded-lg">
                <button
                  type="button"
                  onClick={() => setViewMode("write")}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-bold transition ${viewMode === 'write' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  <PenTool className="w-4 h-4" /> 작성하기
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("preview")}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-bold transition ${viewMode === 'preview' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  <Eye className="w-4 h-4" /> 미리보기
                </button>
              </div>
            </div>

            {/* 작성 모드일 때 */}
            {viewMode === "write" && (
              <div className="relative">
                {/* 본문 사진 추가 버튼 */}
                <div className="absolute top-2 right-2 z-10">
                  <label className={`
                    cursor-pointer flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition shadow-sm border border-blue-200
                    ${uploadingBody ? "bg-slate-100 text-slate-400" : "bg-blue-50 text-blue-600 hover:bg-blue-100"}
                  `}>
                    {uploadingBody ? <Loader2 className="w-3 h-3 animate-spin" /> : <ImageIcon className="w-3 h-3" />}
                    {uploadingBody ? "업로드 중..." : "본문에 사진 넣기"}
                    <input type="file" accept="image/*" onChange={handleBodyImageUpload} className="hidden" disabled={uploadingBody} />
                  </label>
                </div>

                <textarea
                  ref={textareaRef}
                  name="content"
                  value={formData.content}
                  onChange={handleChange}
                  placeholder="내용을 입력하세요. (HTML 태그 사용 가능)"
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 transition h-96 font-mono text-sm leading-relaxed"
                />
                <p className="text-xs text-slate-400 mt-2 text-right">💡 작성 중 [미리보기] 버튼을 누르면 실제 화면을 볼 수 있습니다.</p>
              </div>
            )}

            {/* ✨ 미리보기 모드일 때 (HTML 렌더링) */}
            {viewMode === "preview" && (
              <div className="w-full min-h-[384px] max-h-[600px] overflow-y-auto px-6 py-6 rounded-xl border border-slate-200 bg-white prose prose-slate max-w-none">
                {formData.content ? (
                  <div dangerouslySetInnerHTML={{ __html: formData.content }} />
                ) : (
                  <p className="text-slate-400 text-center py-20">작성된 내용이 없습니다.</p>
                )}
              </div>
            )}
          </div>

          {/* 저장 버튼 */}
          <div className="pt-4 border-t border-slate-100 flex justify-end">
            <button
              type="submit"
              disabled={loading}
              className="w-full md:w-auto bg-slate-900 hover:bg-slate-800 text-white font-bold px-10 py-4 rounded-xl shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2 text-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
              발행하기
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}