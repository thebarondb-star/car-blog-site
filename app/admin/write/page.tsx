"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { Save, Loader2, Image as ImageIcon, PlusCircle } from "lucide-react";

// 자주 쓰는 카테고리 추천 목록
const SUGGESTED_CATEGORIES = ["필독", "사업자", "신용", "꿀팁", "사고", "분석", "승인", "전기차", "비교", "경고"];

export default function AdminWrite() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [uploadingBodyParams, setUploadingBody] = useState(false); // 본문 이미지 업로드 중 상태
  
  // 썸네일용 상태
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  
  const [formData, setFormData] = useState({
    password: "",
    title: "",
    category: "",
    desc_text: "",
    content: ""
  });

  const handleChange = (e: any) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // 1. 썸네일 선택
  const handleFileChange = (e: any) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setPreview(URL.createObjectURL(selectedFile));
    }
  };

  // 2. [핵심] 본문 중간에 사진 넣기 (자동 태그 삽입)
  const handleBodyImageUpload = async (e: any) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setUploadingBody(true);

    try {
      const fileExt = selectedFile.name.split('.').pop();
      const fileName = `body_${Date.now()}.${fileExt}`;

      // 업로드
      const { error: uploadError } = await supabase.storage
        .from('consult_photos') 
        .upload(fileName, selectedFile);

      if (uploadError) throw uploadError;

      // 주소 가져오기
      const { data: { publicUrl } } = supabase.storage
        .from('consult_photos')
        .getPublicUrl(fileName);

      // 본문에 HTML 태그 자동으로 추가 (줄바꿈 + 이미지 + 줄바꿈)
      const imgTag = `\n<br>\n<img src="${publicUrl}" alt="본문이미지" class="w-full rounded-xl shadow-md my-4" />\n<br>\n`;
      
      setFormData(prev => ({
        ...prev,
        content: prev.content + imgTag
      }));

      alert("본문에 사진이 추가되었습니다!");

    } catch (error: any) {
      alert("사진 추가 실패: " + error.message);
    } finally {
      setUploadingBody(false);
      // 같은 파일 다시 선택 가능하게 초기화
      e.target.value = null;
    }
  };

  // 3. 최종 발행
  const handleSubmit = async (e: any) => {
    e.preventDefault();

    if (formData.password !== "dlrns6632!") {
      alert("비밀번호가 틀렸습니다.");
      return;
    }

    if (!formData.title || !formData.content || !formData.category) {
      alert("제목, 카테고리, 내용은 필수입니다.");
      return;
    }

    if (!confirm("발행하시겠습니까?")) return;

    setLoading(true);

    try {
      let imageUrl = "";

      // 썸네일 업로드
      if (file) {
        const fileExt = file.name.split('.').pop();
        const fileName = `thumb_${Date.now()}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from('consult_photos') 
          .upload(fileName, file);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('consult_photos')
          .getPublicUrl(fileName);
          
        imageUrl = publicUrl;
      }

      const today = new Date();
      const dateText = `${today.getFullYear()}.${String(today.getMonth() + 1).padStart(2, '0')}.${String(today.getDate()).padStart(2, '0')}`;

      // DB 저장
      const { error } = await supabase
        .from('posts')
        .insert([
          {
            title: formData.title,
            category: formData.category,
            desc_text: formData.desc_text,
            content: formData.content,
            date_text: dateText,
            image_url: imageUrl,
            color_class: "bg-slate-800"
          }
        ]);

      if (error) throw error;

      alert("발행 성공!");
      router.push("/");

    } catch (error: any) {
      console.error("에러:", error);
      alert("실패: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto py-12 px-4 bg-slate-50 min-h-screen">
      <h1 className="text-3xl font-bold mb-8">🔐 관리자 글쓰기 v2</h1>
      
      <form onSubmit={handleSubmit} className="space-y-6 bg-white p-8 rounded-2xl shadow-sm border border-slate-200">
        
        {/* 비밀번호 */}
        <div>
          <label className="block font-bold mb-2">관리자 비밀번호</label>
          <input type="password" name="password" value={formData.password} onChange={handleChange} className="w-full border p-3 rounded-lg" placeholder="1234" />
        </div>

        <div className="border-t my-6"></div>

        {/* 카테고리 */}
        <div>
          <label className="block font-bold mb-2">카테고리 (직접 입력 가능)</label>
          <input 
            list="category-options" 
            name="category"
            value={formData.category} 
            onChange={handleChange}
            className="w-full border p-3 rounded-lg"
            placeholder="예: 전기차 (직접 입력하거나 목록 선택)" 
          />
          <datalist id="category-options">
            {SUGGESTED_CATEGORIES.map(cat => <option key={cat} value={cat} />)}
          </datalist>
        </div>

        {/* 제목 */}
        <div>
          <label className="block font-bold mb-2">제목</label>
          <input type="text" name="title" value={formData.title} onChange={handleChange} className="w-full border p-3 rounded-lg font-bold" placeholder="제목 입력" />
        </div>

        {/* 요약문 */}
        <div>
          <label className="block font-bold mb-2">요약문</label>
          <input type="text" name="desc_text" value={formData.desc_text} onChange={handleChange} className="w-full border p-3 rounded-lg" placeholder="리스트용 요약 (1~2줄)" />
        </div>

        {/* 썸네일 */}
        <div>
          <label className="block font-bold mb-2">썸네일 사진 (대표 이미지)</label>
          <div className="flex items-center gap-4">
            <input type="file" onChange={handleFileChange} accept="image/*" />
            {preview && <img src={preview} className="h-20 w-20 object-cover rounded-lg border" />}
          </div>
        </div>

        <div className="border-t my-6"></div>

        {/* 본문 (이미지 추가 기능 포함) */}
        <div>
          <div className="flex justify-between items-center mb-2">
            <label className="block font-bold">본문 내용</label>
            
            {/* ✨ 본문 사진 추가 버튼 ✨ */}
            <div className="relative">
              <input 
                type="file" 
                id="body-image-upload" 
                className="hidden" 
                accept="image/*"
                onChange={handleBodyImageUpload}
                disabled={uploadingBodyParams}
              />
              <label 
                htmlFor="body-image-upload"
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-bold cursor-pointer transition
                  ${uploadingBodyParams ? "bg-slate-200 text-slate-400" : "bg-blue-100 text-blue-700 hover:bg-blue-200"}`}
              >
                {uploadingBodyParams ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImageIcon className="w-4 h-4" />}
                {uploadingBodyParams ? "업로드 중..." : "본문에 사진 넣기"}
              </label>
            </div>
          </div>
          
          <p className="text-xs text-slate-500 mb-2">
            * '본문에 사진 넣기'를 누르면 자동으로 HTML 코드가 추가됩니다.
          </p>

          <textarea 
            name="content"
            value={formData.content}
            onChange={handleChange}
            className="w-full border p-3 rounded-lg h-96 font-mono text-sm leading-relaxed"
            placeholder="<p>내용을 입력하세요...</p>"
          />
        </div>

        <button type="submit" disabled={loading} className="w-full bg-slate-900 text-white font-bold py-4 rounded-xl hover:bg-slate-800 transition flex items-center justify-center gap-2">
          {loading ? <Loader2 className="animate-spin" /> : <><Save /> 발행하기</>}
        </button>

      </form>
    </div>
  );
}