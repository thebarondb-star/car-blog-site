"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { ArrowLeft, Save, Upload, Loader2, Image as ImageIcon, Code, Type, Zap, Lock, Wand2, FileEdit } from "lucide-react";
import Link from "next/link";

const CATEGORIES = ["닥터렌트는?", "호갱탈출", "장기렌트정보", "특가차량리스트"];

export default function AdminWrite() {
  const router = useRouter();
  
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [passwordInput, setPasswordInput] = useState("");
  const [authError, setAuthError] = useState("");

  const [mode, setMode] = useState<"visual" | "html">("visual");
  const editorRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const savedRange = useRef<Range | null>(null);

  const [loading, setLoading] = useState(false);
  const [uploadingThumbnail, setUploadingThumbnail] = useState(false);
  const [uploadingBody, setUploadingBody] = useState(false);

  const [formData, setFormData] = useState({
    title: "",
    slug: "",
    category: CATEGORIES[0],
    desc_text: "",
    priority: "", 
    content: "",
    image_url: "",
  });

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordInput === "dlrns6632!") {
      setIsAuthenticated(true);
    } else {
      setAuthError("비밀번호가 일치하지 않습니다.");
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleAutoSlug = () => {
    if (!formData.title) return alert("제목을 먼저 입력해주세요.");
    const isKorean = /[ㄱ-ㅎ|ㅏ-ㅣ|가-힣]/.test(formData.title);
    if (isKorean) {
      const timestampSlug = `post-${new Date().toISOString().slice(0,10).replace(/-/g,"")}-${Math.floor(Math.random() * 1000)}`;
      setFormData(prev => ({ ...prev, slug: timestampSlug }));
      alert("⚠️ 한글 제목은 자동 번역이 안 돼요!\n일단 '임시 주소'를 만들어뒀으니, 의미에 맞는 '영어 키워드'로 직접 수정해주세요.\n\n(예: post-2024... -> genesis-price)");
    } else {
      const cleanSlug = formData.title.toLowerCase().replace(/[^a-z0-9\s-]/g, '').trim().replace(/\s+/g, '-');
      setFormData(prev => ({ ...prev, slug: cleanSlug }));
    }
  };

  const handleVisualInput = () => {
    if (editorRef.current) setFormData(prev => ({ ...prev, content: editorRef.current?.innerHTML || "" }));
  };

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
          if (editorRef.current) { editorRef.current.innerHTML += imgTag; handleVisualInput(); }
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

  // ✨ [수정됨] e.preventDefault 대신 isPublished 상태를 받아 처리
  const handleSubmit = async (isPublish: boolean) => {
    if (!formData.title || !formData.content) { alert("제목과 내용은 필수입니다."); return; }
    if (!formData.slug) { alert("주소(Slug)를 입력해주세요. 자동 생성 버튼을 눌러보세요!"); return; }

    const confirmMsg = isPublish ? "바로 발행하시겠습니까?" : "임시저장 하시겠습니까?";
    if (!confirm(confirmMsg)) return;

    try {
      setLoading(true);
      const today = new Date();
      const dateText = `${today.getFullYear()}.${String(today.getMonth() + 1).padStart(2, '0')}.${String(today.getDate()).padStart(2, '0')}`;
      
      const priorityNum = formData.priority ? Number(formData.priority) : 9999;

      const { data, error } = await supabase.from("posts").insert([{
        title: formData.title, 
        slug: formData.slug, 
        category: formData.category, 
        desc_text: formData.desc_text, 
        priority: priorityNum, 
        content: formData.content, 
        image_url: formData.image_url, 
        date_text: dateText, 
        color_class: "bg-slate-800",
        is_published: isPublish // 👈 상태에 맞게 저장
      }]).select().single(); // 👈 생성된 ID를 가져오기 위해 추가
      
      if (error) throw error;
      
      if (isPublish) {
        alert("발행 성공!"); 
        router.push("/"); 
        router.refresh();
      } else {
        alert("임시저장 완료! 수정 모드에서 계속 작성할 수 있습니다.");
        // 임시저장 후 Edit 페이지로 이동하여 계속 수정할 수 있게 함
        if (data && data.id) {
          router.push(`/admin/edit/${data.id}`);
        } else {
          router.push("/admin/imsi");
        }
      }
    } catch (error: any) { 
      if (error.code === '23505') {
        alert("이미 존재하는 주소(Slug)입니다. 다른 주소를 입력해주세요!");
      } else {
        alert("오류: " + error.message); 
      }
    } finally { 
      setLoading(false); 
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white max-w-sm w-full p-8 rounded-2xl shadow-xl border border-slate-100 text-center">
          <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-6 text-slate-500"><Lock className="w-8 h-8" /></div>
          <h1 className="text-xl font-bold text-slate-900 mb-2">관리자 글쓰기</h1>
          <p className="text-slate-500 text-sm mb-6">글을 작성하려면 관리자 확인이 필요합니다.</p>
          <form onSubmit={handleLogin} className="space-y-4">
            <input type="password" value={passwordInput} onChange={(e) => setPasswordInput(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-slate-900 focus:ring-1 focus:ring-slate-900 outline-none text-center font-bold text-lg" autoFocus autoComplete="new-password" />
            {authError && <p className="text-red-500 text-xs font-bold">{authError}</p>}
            <div className="flex gap-2">
              <button type="button" onClick={() => router.push('/')} className="flex-1 py-3 text-sm font-bold text-slate-500 hover:bg-slate-50 rounded-xl border border-slate-200 transition">취소</button>
              <button type="submit" className="flex-[2] bg-slate-900 text-white font-bold py-3 rounded-xl hover:bg-slate-800 transition">확인</button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-10">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <Link href="/" className="flex items-center text-slate-500 hover:text-slate-900 transition font-medium"><ArrowLeft className="w-5 h-5 mr-2" /> 메인으로 돌아가기</Link>
          <h1 className="text-2xl font-bold text-slate-900">관리자 글쓰기</h1>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 space-y-8">
          <div className="space-y-6">
            <div className="flex flex-col md:flex-row gap-6">
                <div className="flex-1">
                    <label className="block text-sm font-bold text-slate-700 mb-2">카테고리</label>
                    <div className="flex flex-wrap gap-2">{CATEGORIES.map((cat) => (<button key={cat} type="button" onClick={() => setFormData((prev) => ({ ...prev, category: cat }))} className={`px-4 py-2 rounded-lg text-sm font-bold border ${formData.category === cat ? "bg-slate-900 text-white" : "bg-white text-slate-500"}`}>{cat}</button>))}</div>
                </div>
                <div className="w-full md:w-32">
                    <label className="block text-sm font-bold text-slate-700 mb-2">노출 순서</label>
                    <input type="number" name="priority" value={formData.priority} onChange={handleChange} placeholder="예: 1" className="w-full px-4 py-2 rounded-xl border font-bold text-center" />
                </div>
            </div>
            
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">제목</label>
              <input type="text" name="title" value={formData.title} onChange={handleChange} className="w-full px-4 py-3 rounded-xl border font-bold text-lg" placeholder="글 제목을 입력하세요" />
            </div>

            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
              <label className="block text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">URL 주소 (영어/숫자) <span className="text-red-500 text-xs">* 필수</span></label>
              <div className="flex gap-2">
                <div className="flex-1 relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-bold">dr-rent.net/posts/</span>
                  <input type="text" name="slug" value={formData.slug} onChange={handleChange} className="w-full pl-36 px-4 py-3 rounded-xl border border-slate-200 font-bold text-blue-600 focus:outline-none focus:border-blue-500" placeholder="english-title-here" />
                </div>
                <button type="button" onClick={handleAutoSlug} className="bg-slate-900 text-white px-4 py-2 rounded-xl font-bold text-sm hover:bg-slate-800 transition flex items-center gap-2 whitespace-nowrap"><Wand2 className="w-4 h-4" /> 자동 완성</button>
              </div>
              <p className="text-xs text-slate-400 mt-2 ml-1">💡 <b>팁:</b> 영문 제목을 넣고 '자동 완성'을 누르면 띄어쓰기를 하이픈(-)으로 바꿔줍니다.</p>
            </div>
            
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
                <a href="https://www.iloveimg.com/ko/compress-image" target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold bg-green-50 text-green-600 hover:bg-green-100 border border-green-200 transition"><Zap className="w-3 h-3" /> ⚡ 용량 줄이기</a>
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
              <div ref={editorRef} contentEditable onClick={handleEditorClick} onKeyUp={updateCursorPosition} onBlur={updateCursorPosition} onInput={handleVisualInput} className="w-full min-h-[500px] p-6 rounded-xl border border-slate-200 prose prose-slate max-w-none bg-white focus:outline-none focus:ring-2 focus:ring-blue-500" style={{ lineHeight: "1.8" }} />
              <p className="text-xs text-slate-400 mt-2 text-right">💡 이미지를 클릭하여 '화면 표시 크기'를 줄일 수 있습니다.</p>
            </div>
            <div className={mode === "html" ? "block" : "hidden"}>
              <textarea ref={textareaRef} name="content" value={formData.content} onChange={handleChange} className="w-full min-h-[500px] p-4 rounded-xl border border-slate-200 bg-slate-900 text-slate-200 font-mono text-sm leading-relaxed" />
            </div>
          </div>

          {/* ✨ [수정됨] 버튼 영역 2개로 분리 */}
          <div className="pt-4 border-t border-slate-100 flex justify-end gap-3">
            <button 
              type="button" 
              onClick={(e) => { e.preventDefault(); handleSubmit(false); }} 
              disabled={loading} 
              className="w-full md:w-auto bg-white hover:bg-slate-50 text-slate-600 border border-slate-200 font-bold px-8 py-4 rounded-xl transition flex items-center justify-center gap-2"
            >
              <FileEdit className="w-5 h-5" /> 임시저장
            </button>
            <button 
              type="button" 
              onClick={(e) => { e.preventDefault(); handleSubmit(true); }} 
              disabled={loading} 
              className="w-full md:w-auto bg-slate-900 hover:bg-slate-800 text-white font-bold px-10 py-4 rounded-xl shadow-lg transition flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />} 발행하기
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}