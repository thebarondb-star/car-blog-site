"use client";

import { useState, useEffect, useRef, use } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { ArrowLeft, Save, Upload, Loader2, Image as ImageIcon, Code, Type } from "lucide-react";
import Link from "next/link";
import Image from "next/image";

const CATEGORIES = ["닥터렌트는?", "호갱탈출", "장기렌트정보"];

export default function AdminEdit({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();

  const [mode, setMode] = useState<"visual" | "html">("visual");
  const editorRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  // ✨ [핵심] 커서 위치를 기억할 저장소
  const savedRange = useRef<Range | null>(null);

  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [uploadingThumbnail, setUploadingThumbnail] = useState(false);
  const [uploadingBody, setUploadingBody] = useState(false);

  const [formData, setFormData] = useState({
    password: "",
    title: "",
    category: CATEGORIES[0],
    desc_text: "",
    content: "",
    image_url: "",
  });

  // 1. 기존 데이터 불러오기
  useEffect(() => {
    const fetchPost = async () => {
      try {
        const { data, error } = await supabase.from("posts").select("*").eq("id", id).single();
        if (error) throw error;
        
        if (data) {
          setFormData({
            password: "",
            title: data.title,
            category: data.category,
            desc_text: data.desc_text,
            content: data.content,
            image_url: data.image_url,
          });
          if (editorRef.current) {
            editorRef.current.innerHTML = data.content;
          }
        }
      } catch (err) {
        alert("글 정보를 불러오지 못했습니다.");
        router.push("/");
      } finally {
        setFetching(false);
      }
    };
    fetchPost();
  }, [id, router]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleVisualInput = () => {
    if (editorRef.current) {
      setFormData(prev => ({ ...prev, content: editorRef.current?.innerHTML || "" }));
    }
  };

  useEffect(() => {
    if (mode === "visual" && editorRef.current) {
      editorRef.current.innerHTML = formData.content;
    }
  }, [mode]);

  // ✨ [핵심 기능] 파일 선택 버튼 누를 때 현재 커서 위치 저장하기
  const saveCursorPosition = () => {
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
    } catch (err: any) {
      alert(err.message);
    } finally {
      setUploadingThumbnail(false);
    }
  };

  // ✅ 본문 이미지 업로드 (저장된 커서 위치 사용)
  const handleBodyImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      if (!e.target.files || e.target.files.length === 0) return;
      setUploadingBody(true);

      const file = e.target.files[0];
      const fileName = `body_${Date.now()}.${file.name.split(".").pop()}`;
      const filePath = `consult_photos/${fileName}`;

      const { error } = await supabase.storage.from("consult_photos").upload(filePath, file);
      if (error) throw error;

      const { data } = supabase.storage.from("consult_photos").getPublicUrl(filePath);
      
      // 캡션이 포함된 HTML 태그
      const imgTag = `
        <figure class="my-8 text-center">
          <img src="${data.publicUrl}" alt="첨부이미지" class="w-full rounded-xl shadow-md inline-block" />
          <figcaption class="mt-2 text-sm text-slate-500 font-medium">▲ 사진 설명을 입력하세요</figcaption>
        </figure>
        <div class="my-4"><br></div> 
      `;

      if (mode === "visual") {
         // ✨ 아까 저장해둔 커서 위치(savedRange)가 있으면 거기다 넣음
         if (savedRange.current) {
            savedRange.current.deleteContents();
            const div = document.createElement("div");
            div.innerHTML = imgTag;
            savedRange.current.insertNode(div);
            savedRange.current.collapse(false);
            savedRange.current = null; // 초기화
            handleVisualInput();
          } else {
             if (editorRef.current) {
                editorRef.current.innerHTML += imgTag;
                handleVisualInput();
              }
          }
      } else if (textareaRef.current) {
         const textarea = textareaRef.current;
         const start = textarea.selectionStart;
         const end = textarea.selectionEnd;
         setFormData(prev => ({ ...prev, content: prev.content.substring(0, start) + "\n" + imgTag + "\n" + prev.content.substring(end) }));
      }
    } catch (err: any) {
      alert("업로드 실패: " + err.message);
    } finally {
      setUploadingBody(false);
      e.target.value = "";
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.password !== "dlrns6632!") {
      alert("관리자 비밀번호가 틀렸습니다.");
      return;
    }
    if (!confirm("수정사항을 저장하시겠습니까?")) return;

    try {
      setLoading(true);
      const { error } = await supabase.from("posts").update({
          title: formData.title,
          category: formData.category,
          desc_text: formData.desc_text,
          content: formData.content,
          image_url: formData.image_url,
        }).eq("id", id);

      if (error) throw error;
      alert("글이 수정되었습니다!");
      router.push(`/posts/${id}`);
      router.refresh();
    } catch (error: any) {
      alert("수정 실패: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  if (fetching) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin w-8 h-8 text-blue-600"/></div>;

  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-10">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <Link href={`/posts/${id}`} className="flex items-center text-slate-500 hover:text-slate-900 transition font-medium">
            <ArrowLeft className="w-5 h-5 mr-2" />
            취소하고 돌아가기
          </Link>
          <h1 className="text-2xl font-bold text-slate-900">글 수정하기 ✏️</h1>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 space-y-8">
          
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">관리자 비밀번호 🔒</label>
            <input type="password" name="password" value={formData.password} onChange={handleChange} placeholder="수정하려면 비밀번호를 입력하세요" autoComplete="new-password" className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500" />
          </div>

          <hr className="border-slate-100" />

          <div className="space-y-6">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">카테고리</label>
              <div className="flex flex-wrap gap-2">
                {CATEGORIES.map((cat) => (
                  <button key={cat} type="button" onClick={() => setFormData((prev) => ({ ...prev, category: cat }))} className={`px-4 py-2 rounded-lg text-sm font-bold border ${formData.category === cat ? "bg-slate-900 text-white" : "bg-white text-slate-500"}`}>{cat}</button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">제목</label>
              <input type="text" name="title" value={formData.title} onChange={handleChange} className="w-full px-4 py-3 rounded-xl border font-bold text-lg" />
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
             <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">대표 썸네일</label>
              <div className="flex items-center gap-4">
                <label className="cursor-pointer bg-slate-100 px-4 py-3 rounded-xl flex items-center gap-2 text-sm font-bold hover:bg-slate-200 transition">
                  {uploadingThumbnail ? <Loader2 className="animate-spin w-4 h-4"/> : <Upload className="w-4 h-4"/>} 사진 변경
                  <input type="file" accept="image/*" onChange={handleThumbnailUpload} className="hidden" />
                </label>
                {formData.image_url && <img src={formData.image_url} className="w-16 h-16 rounded-lg object-cover border" />}
              </div>
            </div>
            <div>
               <label className="block text-sm font-bold text-slate-700 mb-2">요약글</label>
               <textarea name="desc_text" value={formData.desc_text} onChange={handleChange} className="w-full px-4 py-2 rounded-xl border h-16 resize-none" />
            </div>
          </div>

          <hr className="border-slate-100" />

          <div>
            <div className="flex justify-between items-end mb-3">
              <label className="block text-sm font-bold text-slate-700">본문 수정</label>
              
              <div className="flex items-center gap-3">
                {/* ✨ [핵심] 버튼 누를 때(onClick) 커서 위치를 저장 */}
                <label 
                  onClick={saveCursorPosition}
                  className={`cursor-pointer flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition shadow-sm border border-blue-200 ${uploadingBody ? "bg-slate-100" : "bg-blue-50 text-blue-600 hover:bg-blue-100"}`}
                >
                  {uploadingBody ? <Loader2 className="w-3 h-3 animate-spin" /> : <ImageIcon className="w-3 h-3" />} 
                  본문 사진+설명
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
                onInput={handleVisualInput} 
                className="w-full min-h-[400px] p-6 rounded-xl border border-slate-200 prose prose-slate max-w-none bg-white focus:outline-none focus:ring-2 focus:ring-blue-500" 
                style={{ lineHeight: "1.8" }} 
              />
            </div>

            <div className={mode === "html" ? "block" : "hidden"}>
              <textarea 
                ref={textareaRef} 
                name="content" 
                value={formData.content} 
                onChange={handleChange} 
                className="w-full min-h-[400px] p-4 rounded-xl border border-slate-200 bg-slate-900 text-slate-200 font-mono text-sm leading-relaxed" 
              />
            </div>
            <p className="text-xs text-slate-400 mt-2 text-right">💡 커서가 깜빡이는 곳에 사진이 들어갑니다.</p>
          </div>

          <div className="pt-4 border-t border-slate-100 flex justify-end">
            <button 
              type="submit" 
              disabled={loading} 
              className="w-full md:w-auto bg-slate-900 hover:bg-slate-800 text-white font-bold px-10 py-4 rounded-xl shadow-lg transition flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />} 
              수정 완료
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}