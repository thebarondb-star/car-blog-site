"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { ArrowLeft, Save, Upload, Loader2, Image as ImageIcon, Code, Type, Zap } from "lucide-react";
import Link from "next/link";
import Image from "next/image";

const CATEGORIES = ["닥터렌트는?", "호갱탈출", "장기렌트정보", "특가차량리스트"];

export default function AdminWrite() {
  const router = useRouter();
  
  const [mode, setMode] = useState<"visual" | "html">("visual");
  const editorRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const savedRange = useRef<Range | null>(null);

  const [loading, setLoading] = useState(false);
  const [uploadingThumbnail, setUploadingThumbnail] = useState(false);
  const [uploadingBody, setUploadingBody] = useState(false);

  const [formData, setFormData] = useState({
    password: "",
    title: "",
    category: CATEGORIES[0],
    desc_text: "",
    priority: "", // ✨ 순서 필드 추가 (문자열로 받아서 숫자로 변환)
    content: "",
    image_url: "",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleVisualInput = () => {
    if (editorRef.current) {
      setFormData(prev => ({ ...prev, content: editorRef.current?.innerHTML || "" }));
    }
  };

  // 이미지 사이즈 조절 로직 (유지)
  const handleEditorClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    if (target.tagName === "IMG") {
      const img = target as HTMLImageElement;
      const currentWidth = img.style.width || "100%";
      const newWidth = prompt("화면에 보여질 크기를 입력하세요 (원본은 유지됨)\n예: 50%, 80%, 300px", currentWidth);
      if (newWidth) {
        img.style.width = newWidth;
        handleVisualInput(); 
      }
    }
    updateCursorPosition();
  };

  useEffect(() => {
    if (mode === "visual" && editorRef.current) {
      editorRef.current.innerHTML = formData.content;
    }
  }, [mode]);

  const updateCursorPosition = () => {
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      if (editorRef.current && editorRef.current.contains(selection.anchorNode)) {
        savedRange.current = selection.getRangeAt(0);
      }
    }
  };

  const handleThumbnailUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setUploadingThumbnail(true);
      if (!e.target.files || e.target.files.length === 0) return;
      const file = e.target.files[0];
      const fileName = `thumb_${Date.now()}.${file.name.split(".").pop()}`;
      const filePath = `consult_photos/${fileName}`;
      const { error } = await supabase.storage.from("consult_photos").upload(filePath, file);
      if (error) throw error;
      const { data } = supabase.storage.from("consult_photos").getPublicUrl(filePath);
      setFormData((prev) => ({ ...prev, image_url: data.publicUrl }));
    } catch (error: any) { alert(error.message); } finally { setUploadingThumbnail(false); }
  };

  const handleBodyImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      if (!e.target.files || e.target.files.length === 0) return;
      
      const altText = prompt("이미지 설명을 입력하세요 (SEO용):", "사진 설명");
      if (altText === null) return;

      setUploadingBody(true);

      const file = e.target.files[0];
      const fileName = `body_${Date.now()}.${file.name.split(".").pop()}`;
      const filePath = `consult_photos/${fileName}`;
      const { error } = await supabase.storage.from("consult_photos").upload(filePath, file);
      if (error) throw error;
      const { data } = supabase.storage.from("consult_photos").getPublicUrl(filePath);
      
      const imgTag = `
        <figure class="my-8 text-center">
          <img src="${data.publicUrl}" alt="${altText}" style="width: 100%; max-width: 100%;" class="rounded-xl shadow-md inline-block transition-all cursor-pointer" />
          <figcaption class="mt-2 text-sm text-slate-500 font-medium">▲ ${altText}</figcaption>
        </figure>
        <div class="my-4"><br></div> 
      `;

      if (mode === "visual") {
        if (savedRange.current) {
          savedRange.current.deleteContents();
          const div = document.createElement("div");
          div.innerHTML = imgTag;
          savedRange.current.insertNode(div);
          savedRange.current.collapse(false);
          handleVisualInput();
        } else {
          if (editorRef.current) {
            editorRef.current.innerHTML += imgTag;
            handleVisualInput();
          }
        }
      } else {
        const textarea = textareaRef.current;
        if (textarea) {
          const start = textarea.selectionStart;
          const end = textarea.selectionEnd;
          setFormData(prev => ({ ...prev, content: prev.content.substring(0, start) + "\n" + imgTag + "\n" + prev.content.substring(end) }));
        }
      }
    } catch (error: any) { alert("업로드 실패: " + error.message); } finally { setUploadingBody(false); e.target.value = ""; }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.password !== "dlrns6632!") { alert("관리자 비밀번호가 틀렸습니다."); return; }
    if (!formData.title || !formData.content) { alert("제목과 내용은 필수입니다."); return; }
    if (!confirm("발행하시겠습니까?")) return;

    try {
      setLoading(true);
      const today = new Date();
      const dateText = `${today.getFullYear()}.${String(today.getMonth() + 1).padStart(2, '0')}.${String(today.getDate()).padStart(2, '0')}`;
      
      // ✨ 순서 저장 로직 (입력 없으면 9999)
      const priorityValue = formData.priority ? parseInt(formData.priority) : 9999;

      const { error } = await supabase.from("posts").insert([{
        title: formData.title, 
        category: formData.category, 
        desc_text: formData.desc_text, 
        priority: priorityValue, // DB에 저장
        content: formData.content, 
        image_url: formData.image_url, 
        date_text: dateText, 
        color_class: "bg-slate-800"
      }]);
      if (error) throw error;
      alert("등록 성공!"); router.push("/"); router.refresh();
    } catch (error: any) { alert("오류: " + error.message); } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-10">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <Link href="/" className="flex items-center text-slate-500 hover:text-slate-900 transition font-medium"><ArrowLeft className="w-5 h-5 mr-2" /> 메인으로 돌아가기</Link>
          <h1 className="text-2xl font-bold text-slate-900">관리자 글쓰기</h1>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 space-y-8">
          
          <div><label className="block text-sm font-bold text-slate-700 mb-2">관리자 비밀번호 🔒</label><input type="password" name="password" value={formData.password} onChange={handleChange} placeholder="직접 입력하세요" autoComplete="new-password" className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500" /></div>
          <hr className="border-slate-100" />

          <div className="space-y-6">
            <div className="flex flex-col md:flex-row gap-6">
                <div className="flex-1">
                    <label className="block text-sm font-bold text-slate-700 mb-2">카테고리</label>
                    <div className="flex flex-wrap gap-2">{CATEGORIES.map((cat) => (<button key={cat} type="button" onClick={() => setFormData((prev) => ({ ...prev, category: cat }))} className={`px-4 py-2 rounded-lg text-sm font-bold border ${formData.category === cat ? "bg-slate-900 text-white" : "bg-white text-slate-500"}`}>{cat}</button>))}</div>
                </div>
                {/* ✨ 순서 입력칸 추가 */}
                <div className="w-full md:w-32">
                    <label className="block text-sm font-bold text-slate-700 mb-2">노출 순서</label>
                    <input type="number" name="priority" value={formData.priority} onChange={handleChange} placeholder="예: 1" className="w-full px-4 py-2 rounded-xl border font-bold text-center" />
                </div>
            </div>
            
            <div><label className="block text-sm font-bold text-slate-700 mb-2">제목</label><input type="text" name="title" value={formData.title} onChange={handleChange} className="w-full px-4 py-3 rounded-xl border font-bold text-lg" /></div>
            
            <div className="grid md:grid-cols-2 gap-6">
               <div><label className="block text-sm font-bold text-slate-700 mb-2">대표 썸네일</label><div className="flex items-center gap-4"><label className="cursor-pointer bg-slate-100 px-4 py-3 rounded-xl flex items-center gap-2 text-sm font-bold">{uploadingThumbnail ? <Loader2 className="animate-spin w-4 h-4"/> : <Upload className="w-4 h-4"/>} 썸네일 업로드<input type="file" accept="image/*" onChange={handleThumbnailUpload} className="hidden" /></label>{formData.image_url && <img src={formData.image_url} className="w-16 h-16 rounded-lg object-cover border" />}</div></div>
               <div><label className="block text-sm font-bold text-slate-700 mb-2">요약글</label><textarea name="desc_text" value={formData.desc_text} onChange={handleChange} className="w-full px-4 py-2 rounded-xl border h-16 resize-none" /></div>
            </div>
          </div>
          <hr className="border-slate-100" />

          <div className="relative">
            <div className="sticky top-0 z-50 bg-white/95 backdrop-blur border-b border-slate-100 py-4 flex flex-col md:flex-row justify-between items-center mb-4 gap-2">
              <label className="block text-sm font-bold text-slate-700">본문 작성</label>
              
              <div className="flex items-center gap-3">
                <a 
                  href="https://www.iloveimg.com/ko/compress-image" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold bg-green-50 text-green-600 hover:bg-green-100 border border-green-200 transition"
                >
                  <Zap className="w-3 h-3" /> ⚡ 용량 줄이기
                </a>

                <label className={`cursor-pointer flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition shadow-sm border border-blue-200 ${uploadingBody ? "bg-slate-100" : "bg-blue-50 text-blue-600 hover:bg-blue-100"}`}>
                  {uploadingBody ? <Loader2 className="w-3 h-3 animate-spin" /> : <ImageIcon className="w-3 h-3" />} 본문 사진+설명
                  <input type="file" accept="image/*" onChange={handleBodyImageUpload} className="hidden" disabled={uploadingBody} />
                </label>
                <div className="flex bg-slate-100 p-1 rounded-lg">
                  <button type="button" onClick={() => setMode("visual")} className={`flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-bold transition ${mode === 'visual' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500'}`}><Type className="w-3 h-3" /> 비주얼</button>
                  <button type="button" onClick={() => setMode("html")} className={`flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-bold transition ${mode === 'html' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}><Code className="w-3 h-3" /> HTML</button>
                </div>
              </div>
            </div>

            <div className={mode === "visual" ? "block" : "hidden"}>
              <div 
                ref={editorRef} 
                contentEditable 
                onClick={handleEditorClick} 
                onKeyUp={updateCursorPosition}
                onBlur={updateCursorPosition}
                onInput={handleVisualInput} 
                className="w-full min-h-[500px] p-6 rounded-xl border border-slate-200 prose prose-slate max-w-none bg-white focus:outline-none focus:ring-2 focus:ring-blue-500" 
                style={{ lineHeight: "1.8" }} 
              />
              <p className="text-xs text-slate-400 mt-2 text-right">💡 이미지를 클릭하여 '화면 표시 크기'를 줄일 수 있습니다.</p>
            </div>

            <div className={mode === "html" ? "block" : "hidden"}>
              <textarea ref={textareaRef} name="content" value={formData.content} onChange={handleChange} className="w-full min-h-[500px] p-4 rounded-xl border border-slate-200 bg-slate-900 text-slate-200 font-mono text-sm leading-relaxed" />
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 flex justify-end"><button type="submit" disabled={loading} className="w-full md:w-auto bg-slate-900 hover:bg-slate-800 text-white font-bold px-10 py-4 rounded-xl shadow-lg transition flex items-center justify-center gap-2">{loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />} 발행하기</button></div>
        </form>
      </div>
    </div>
  );
}