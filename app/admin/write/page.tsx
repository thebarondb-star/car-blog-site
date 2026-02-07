"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { ArrowLeft, Save, Upload, Loader2, Image as ImageIcon } from "lucide-react";
import Link from "next/link";
import Image from "next/image";

// ✅ 카테고리 목록 (버튼형 UI 유지)
const CATEGORIES = ["닥터렌트는?", "호갱탈출", "장기렌트정보"];

export default function AdminWrite() {
  const router = useRouter();
  const textareaRef = useRef<HTMLTextAreaElement>(null); // 커서 위치 파악용

  const [loading, setLoading] = useState(false);
  const [uploadingThumbnail, setUploadingThumbnail] = useState(false);
  const [uploadingBody, setUploadingBody] = useState(false);

  // 입력값 상태 관리
  const [formData, setFormData] = useState({
    password: "", // ✅ 비밀번호 필드 부활
    title: "",
    category: CATEGORIES[0],
    desc_text: "",
    content: "",
    image_url: "", // 썸네일용 이미지 주소
  });

  // 텍스트 입력 핸들러
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // ✅ 1. 썸네일 이미지 업로드 (따로 올리기)
  const handleThumbnailUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setUploadingThumbnail(true);
      if (!e.target.files || e.target.files.length === 0) return;

      const file = e.target.files[0];
      const fileExt = file.name.split(".").pop();
      const fileName = `thumb_${Date.now()}.${fileExt}`;
      const filePath = `consult_photos/${fileName}`; // 기존 버킷 경로 유지

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

  // ✅ 2. 본문 중간 삽입 이미지 업로드 (커서 위치에 삽입)
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
      
      // ✨ [핵심 수정] 커서 위치에 태그 삽입하기
      const imgTag = `\n<img src="${data.publicUrl}" alt="첨부이미지" class="w-full rounded-xl shadow-md my-4" />\n`;
      
      const textarea = textareaRef.current;
      if (textarea) {
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const text = formData.content;
        
        // 커서 앞 내용 + 이미지 태그 + 커서 뒤 내용 합치기
        const newContent = text.substring(0, start) + imgTag + text.substring(end);
        
        setFormData(prev => ({ ...prev, content: newContent }));
      } else {
        // 만약 에러로 커서를 못 찾으면 그냥 뒤에 붙임
        setFormData(prev => ({ ...prev, content: prev.content + imgTag }));
      }

    } catch (error: any) {
      alert("본문 이미지 업로드 실패: " + error.message);
    } finally {
      setUploadingBody(false);
      e.target.value = ""; // 같은 파일 재선택 가능하게 초기화
    }
  };

  // 저장 핸들러
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // ✅ 비밀번호 확인 로직 복구
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

      // 날짜 포맷 (YYYY.MM.DD)
      const today = new Date();
      const dateText = `${today.getFullYear()}.${String(today.getMonth() + 1).padStart(2, '0')}.${String(today.getDate()).padStart(2, '0')}`;

      const { error } = await supabase.from("posts").insert([
        {
          title: formData.title,
          category: formData.category,
          desc_text: formData.desc_text,
          content: formData.content,
          image_url: formData.image_url, // 썸네일
          date_text: dateText,
          color_class: "bg-slate-800" // 기본 배경색
        },
      ]);

      if (error) throw error;

      alert("글이 성공적으로 등록되었습니다!");
      router.push("/"); // 메인으로 이동
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
        {/* 상단 헤더 */}
        <div className="flex items-center justify-between mb-8">
          <Link href="/" className="flex items-center text-slate-500 hover:text-slate-900 transition font-medium">
            <ArrowLeft className="w-5 h-5 mr-2" />
            메인으로 돌아가기
          </Link>
          <h1 className="text-2xl font-bold text-slate-900">관리자 글쓰기</h1>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 space-y-8">
          
          {/* 0. 비밀번호 (최상단 배치) */}
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

          {/* 1. 카테고리 선택 (버튼형 UI 유지) */}
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
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 transition font-bold text-lg"
            />
          </div>

          {/* 3. 썸네일 이미지 (따로 업로드) */}
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">대표 썸네일 (목록에 보여질 이미지)</label>
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
            <p className="text-xs text-slate-400 mt-2">※ 여기에 올린 사진은 글 목록에서만 보입니다.</p>
          </div>

          {/* 4. 요약글 입력 */}
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

          {/* 5. 본문 입력 (중간 삽입 기능 포함) */}
          <div>
            <div className="flex justify-between items-end mb-2">
              <label className="block text-sm font-bold text-slate-700">본문 내용</label>
              
              {/* ✨ 본문 이미지 삽입 버튼 ✨ */}
              <label className={`
                cursor-pointer flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-bold transition
                ${uploadingBody ? "bg-slate-100 text-slate-400" : "bg-blue-50 text-blue-600 hover:bg-blue-100"}
              `}>
                {uploadingBody ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImageIcon className="w-4 h-4" />}
                {uploadingBody ? "업로드 중..." : "본문에 사진 넣기"}
                <input type="file" accept="image/*" onChange={handleBodyImageUpload} className="hidden" disabled={uploadingBody} />
              </label>
            </div>

            <textarea
              ref={textareaRef} // ✨ 커서 위치 파악을 위한 연결
              name="content"
              value={formData.content}
              onChange={handleChange}
              placeholder="내용을 입력하세요. (HTML 태그 사용 가능)"
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 transition h-96 font-mono text-sm leading-relaxed"
            />
            <p className="text-xs text-slate-400 mt-2 text-right">💡 Tip: 글을 쓰다가 '본문에 사진 넣기'를 누르면 커서 위치에 사진이 들어갑니다.</p>
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