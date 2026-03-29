"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import {
  ArrowLeft, Save, Upload, Loader2, Image as ImageIcon, Code, Type,
  Zap, Lock, Wand2, FileEdit, Sparkles, Tag, Link2, ChevronDown, ChevronUp, X
} from "lucide-react";
import Link from "next/link";

const CATEGORIES = ["닥터렌트는?", "호갱탈출", "장기렌트정보", "자동차시장", "특가차량리스트"];

function calcSeoScore(form: {
  title: string; desc_text: string; keywords: string[];
  image_url: string; content: string;
}) {
  const checks = [
    { label: "제목 길이 (10-30자)", pass: form.title.length >= 10 && form.title.length <= 30 },
    { label: "메타 설명 (50-120자)", pass: form.desc_text.length >= 50 && form.desc_text.length <= 120 },
    { label: "키워드 3개 이상", pass: form.keywords.length >= 3 },
    { label: "썸네일 이미지", pass: !!form.image_url },
    { label: "본문 500자 이상", pass: form.content.replace(/<[^>]*>/g, '').length >= 500 },
    { label: "H2 헤딩 포함", pass: form.content.includes('<h2') },
  ];
  const score = Math.round((checks.filter(c => c.pass).length / checks.length) * 100);
  return { score, checks };
}

export default function AdminWrite() {
  const router = useRouter();


  const [mode, setMode] = useState<"visual" | "html">("visual");
  const editorRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const savedRange = useRef<Range | null>(null);

  const [loading, setLoading] = useState(false);
  const [uploadingThumbnail, setUploadingThumbnail] = useState(false);
  const [uploadingBody, setUploadingBody] = useState(false);
  const [aiLoading, setAiLoading] = useState<string | null>(null);
  const [showSeo, setShowSeo] = useState(true);

  const [formData, setFormData] = useState({
    title: "",
    slug: "",
    category: CATEGORIES[0],
    desc_text: "",
    priority: "",
    content: "",
    image_url: "",
    keywords: [] as string[],
  });

  const [keywordInput, setKeywordInput] = useState("");
  const [titleSuggestions, setTitleSuggestions] = useState<string[]>([]);
  const [relatedPosts, setRelatedPosts] = useState<{ id: string; title: string; slug: string }[]>([]);
  const [selectedRelated, setSelectedRelated] = useState<string[]>([]);

  // 이미지 업로드 모달
  const [imgModal, setImgModal] = useState<{ file: File; preview: string } | null>(null);
  const [imgAlt, setImgAlt] = useState("");
  const [imgCaption, setImgCaption] = useState("");

  const seo = calcSeoScore(formData);


  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleAutoSlug = () => {
    if (!formData.title) return alert("제목을 먼저 입력해주세요.");
    const isKorean = /[ㄱ-ㅎ|ㅏ-ㅣ|가-힣]/.test(formData.title);
    if (isKorean) {
      const slug = `post-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${Math.floor(Math.random() * 1000)}`;
      setFormData(prev => ({ ...prev, slug }));
      alert("⚠️ 한글 제목은 자동 번역이 안 돼요!\n영어 키워드로 직접 수정해주세요.\n예: how-to-save-money");
    } else {
      const slug = formData.title.toLowerCase().replace(/[^a-z0-9\s-]/g, '').trim().replace(/\s+/g, '-');
      setFormData(prev => ({ ...prev, slug }));
    }
  };

  const handleVisualInput = () => {
    if (editorRef.current) setFormData(prev => ({ ...prev, content: editorRef.current?.innerHTML || "" }));
  };

  const handleEditorClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    if (target.tagName === "IMG") {
      const img = target as HTMLImageElement;
      const newWidth = prompt("표시 크기 입력 (예: 50%, 300px)", img.style.width || "100%");
      if (newWidth) { img.style.width = newWidth; handleVisualInput(); }
    }
    updateCursorPosition();
  };

  useEffect(() => {
    if (mode === "visual" && editorRef.current) editorRef.current.innerHTML = formData.content;
  }, [mode]);

  const updateCursorPosition = () => {
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0 && editorRef.current?.contains(sel.anchorNode)) {
      savedRange.current = sel.getRangeAt(0);
    }
  };

  const handleThumbnailUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setUploadingThumbnail(true);
      if (!e.target.files?.[0]) return;
      const file = e.target.files[0];
      const filePath = `consult_photos/thumb_${Date.now()}.${file.name.split(".").pop()}`;
      const { error } = await supabase.storage.from("consult_photos").upload(filePath, file);
      if (error) throw error;
      const { data } = supabase.storage.from("consult_photos").getPublicUrl(filePath);
      setFormData(prev => ({ ...prev, image_url: data.publicUrl }));
    } catch (err: any) { alert(err.message); } finally { setUploadingThumbnail(false); }
  };

  // 이미지 선택 시 모달 열기
  const handleBodyImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.[0]) return;
    const file = e.target.files[0];
    const preview = URL.createObjectURL(file);
    setImgAlt("");
    setImgCaption("");
    setImgModal({ file, preview });
    e.target.value = "";
  };

  // 모달 확인 → 실제 업로드
  const handleImgModalConfirm = async () => {
    if (!imgModal) return;
    if (!imgAlt.trim()) { alert("SEO 메타태그(alt)를 입력해주세요."); return; }
    setUploadingBody(true);
    setImgModal(null);
    try {
      const file = imgModal.file;
      const filePath = `consult_photos/body_${Date.now()}.${file.name.split(".").pop()}`;
      const { error } = await supabase.storage.from("consult_photos").upload(filePath, file);
      if (error) throw error;
      const { data } = supabase.storage.from("consult_photos").getPublicUrl(filePath);
      const caption = imgCaption.trim() || imgAlt.trim();
      const imgTag = `<figure class="my-8 text-center">
  <img src="${data.publicUrl}" alt="${imgAlt.trim()}" title="${imgAlt.trim()}" loading="lazy" style="width:100%;max-width:100%;" class="rounded-xl shadow-md inline-block" />
  <figcaption class="mt-2 text-sm text-slate-500 font-medium">▲ ${caption}</figcaption>
</figure>`;
      if (mode === "visual") {
        if (savedRange.current) {
          savedRange.current.deleteContents();
          const div = document.createElement("div");
          div.innerHTML = imgTag;
          savedRange.current.insertNode(div);
          savedRange.current.collapse(false);
          handleVisualInput();
        } else if (editorRef.current) {
          editorRef.current.innerHTML += imgTag;
          handleVisualInput();
        }
      } else if (textareaRef.current) {
        const { selectionStart: s, selectionEnd: en } = textareaRef.current;
        setFormData(prev => ({ ...prev, content: prev.content.slice(0, s) + "\n" + imgTag + "\n" + prev.content.slice(en) }));
      }
    } catch (err: any) { alert("업로드 실패: " + err.message); }
    finally { setUploadingBody(false); URL.revokeObjectURL(imgModal.preview); }
  };

  // ── 키워드 태그 (쉼표 구분 일괄 입력 지원) ──
  const addKeyword = () => {
    const items = keywordInput.split(',').map(k => k.trim()).filter(k => k && !formData.keywords.includes(k));
    if (items.length === 0) return;
    setFormData(prev => ({ ...prev, keywords: [...prev.keywords, ...items] }));
    setKeywordInput("");
  };
  const removeKeyword = (kw: string) => setFormData(prev => ({ ...prev, keywords: prev.keywords.filter(k => k !== kw) }));

  // ── AI 보조 ──
  const aiCall = useCallback(async (action: string, extra?: Record<string, unknown>) => {
    setAiLoading(action);
    try {
      const res = await fetch('/api/seo-assist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, title: formData.title, category: formData.category, desc_text: formData.desc_text, ...extra }),
      });
      return await res.json();
    } finally { setAiLoading(null); }
  }, [formData.title, formData.category, formData.desc_text]);

  const handleSuggestTitles = async () => {
    if (!formData.title) return alert("주제/제목을 먼저 입력해주세요.");
    const data = await aiCall('suggest_titles');
    setTitleSuggestions(data.titles || []);
  };

  const handleSuggestKeywords = async () => {
    if (!formData.title) return alert("제목을 먼저 입력해주세요.");
    const data = await aiCall('suggest_keywords');
    const newKws = (data.keywords || []).filter((k: string) => !formData.keywords.includes(k));
    setFormData(prev => ({ ...prev, keywords: [...prev.keywords, ...newKws] }));
  };

  const handleSuggestMeta = async () => {
    if (!formData.title) return alert("제목을 먼저 입력해주세요.");
    const data = await aiCall('suggest_meta');
    if (data.meta) setFormData(prev => ({ ...prev, desc_text: data.meta }));
  };

  const handleSuggestRelated = async () => {
    if (!formData.title) return alert("제목을 먼저 입력해주세요.");
    const data = await aiCall('suggest_related');
    setRelatedPosts(data.related || []);
  };

  // ── 저장 ──
  const handleSubmit = async (isPublish: boolean) => {
    if (!formData.title || !formData.content) return alert("제목과 내용은 필수입니다.");
    if (!formData.slug) return alert("URL 주소(Slug)를 입력해주세요.");
    if (!confirm(isPublish ? "바로 발행하시겠습니까?" : "임시저장 하시겠습니까?")) return;

    try {
      setLoading(true);
      const today = new Date();
      const dateText = `${today.getFullYear()}.${String(today.getMonth() + 1).padStart(2, '0')}.${String(today.getDate()).padStart(2, '0')}`;

      // 관련글 링크 생성
      // ※ JSON-LD 스키마는 PostDetail 페이지에서만 렌더링 (content에 넣으면 hydration 충돌)
      let relatedHtml = '';
      const chosenRelated = relatedPosts.filter(p => selectedRelated.includes(p.slug));
      if (chosenRelated.length > 0) {
        relatedHtml = `<div style="margin:2rem 0;padding:1.25rem;background:#f8fafc;border:1px solid #e2e8f0;border-radius:0.75rem;">
<p style="font-weight:700;color:#1e293b;margin-bottom:0.75rem;">📌 함께 읽으면 좋은 글</p>
<ul style="list-style:none;padding:0;margin:0;">
${chosenRelated.map(p => `<li style="margin-bottom:0.5rem;"><a href="/posts/${p.slug}" style="color:#2563eb;font-weight:500;text-decoration:none;">→ ${p.title}</a></li>`).join('\n')}
</ul></div>`;
      }

      // 본문 최종 조합: 본문 + 관련글
      let finalContent = formData.content;
      if (relatedHtml) {
        finalContent = finalContent.replace(/<p>닥터렌트와/i, relatedHtml + '<p>닥터렌트와');
        if (!finalContent.includes(relatedHtml)) finalContent += relatedHtml;
      }

      const { data, error } = await supabase.from("posts").insert([{
        title: formData.title,
        slug: formData.slug,
        category: formData.category,
        desc_text: formData.desc_text,
        priority: formData.priority ? Number(formData.priority) : 9999,
        content: finalContent,
        image_url: formData.image_url,
        date_text: dateText,
        color_class: "bg-slate-800",
        is_published: isPublish,
      }]).select().single();

      if (error) {
        if (error.code === '23505') return alert("이미 사용 중인 URL 주소입니다. 다른 주소를 입력해주세요.");
        throw error;
      }

      if (isPublish) { alert("발행 완료!"); router.push("/"); router.refresh(); }
      else { alert("임시저장 완료!"); router.push(data?.id ? `/admin/edit/${data.id}` : "/admin/imsi"); }
    } catch (err: any) { alert("오류: " + err.message); }
    finally { setLoading(false); }
  };


  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <Link href="/" className="flex items-center text-slate-500 hover:text-slate-900 transition font-medium"><ArrowLeft className="w-5 h-5 mr-2" /> 메인으로</Link>
          <h1 className="text-2xl font-bold text-slate-900">관리자 글쓰기</h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* ── 왼쪽: 글 작성 폼 ── */}
          <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-6">

            {/* 카테고리 + 우선순위 */}
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <label className="block text-sm font-bold text-slate-700 mb-2">카테고리</label>
                <div className="flex flex-wrap gap-2">
                  {CATEGORIES.map(cat => (
                    <button key={cat} type="button" onClick={() => setFormData(p => ({ ...p, category: cat }))}
                      className={`px-3 py-1.5 rounded-lg text-sm font-bold border transition ${formData.category === cat ? "bg-slate-900 text-white" : "bg-white text-slate-500 hover:bg-slate-50"}`}>
                      {cat}
                    </button>
                  ))}
                </div>
              </div>
              <div className="w-28">
                <label className="block text-sm font-bold text-slate-700 mb-2">노출 순서</label>
                <input type="number" name="priority" value={formData.priority} onChange={handleChange} placeholder="9999" className="w-full px-3 py-2 rounded-xl border font-bold text-center" />
              </div>
            </div>

            {/* 제목 + AI 추천 */}
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">제목 <span className="text-slate-400 font-normal">({formData.title.length}/30자)</span></label>
              <div className="flex gap-2">
                <input type="text" name="title" value={formData.title} onChange={handleChange} maxLength={35}
                  className="flex-1 px-4 py-3 rounded-xl border font-bold text-lg" placeholder="글 제목을 입력하세요" />
                <button type="button" onClick={handleSuggestTitles} disabled={!!aiLoading}
                  className="bg-violet-600 text-white px-3 py-2 rounded-xl font-bold text-sm hover:bg-violet-700 transition flex items-center gap-1 whitespace-nowrap">
                  {aiLoading === 'suggest_titles' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />} AI 추천
                </button>
              </div>
              {/* 제목 추천 목록 */}
              {titleSuggestions.length > 0 && (
                <div className="mt-2 p-3 bg-violet-50 rounded-xl border border-violet-100 space-y-1">
                  <p className="text-xs font-bold text-violet-600 mb-2">추천 제목 (클릭하면 적용)</p>
                  {titleSuggestions.map((t, i) => (
                    <button key={i} type="button" onClick={() => { setFormData(p => ({ ...p, title: t })); setTitleSuggestions([]); }}
                      className="w-full text-left text-sm px-3 py-2 bg-white rounded-lg border border-violet-100 hover:bg-violet-50 transition font-medium">
                      {t}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* URL Slug */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
              <label className="block text-sm font-bold text-slate-700 mb-2">URL 주소 <span className="text-red-500 text-xs">* 필수</span></label>
              <div className="flex gap-2">
                <div className="flex-1 relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-bold pointer-events-none">dr-rent.net/posts/</span>
                  <input type="text" name="slug" value={formData.slug} onChange={handleChange}
                    className="w-full pl-36 pr-4 py-3 rounded-xl border border-slate-200 font-bold text-blue-600 focus:outline-none focus:border-blue-500" placeholder="english-slug-here" />
                </div>
                <button type="button" onClick={handleAutoSlug} className="bg-slate-900 text-white px-3 py-2 rounded-xl font-bold text-sm flex items-center gap-1 whitespace-nowrap">
                  <Wand2 className="w-4 h-4" /> 자동
                </button>
              </div>
            </div>

            {/* 메타 설명 */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-bold text-slate-700">메타 설명 (검색 결과 노출 문구)</label>
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-bold ${formData.desc_text.length > 120 ? 'text-red-500' : formData.desc_text.length >= 50 ? 'text-green-600' : 'text-slate-400'}`}>
                    {formData.desc_text.length}/120자
                  </span>
                  <button type="button" onClick={handleSuggestMeta} disabled={!!aiLoading}
                    className="text-xs bg-blue-50 text-blue-600 px-2 py-1 rounded-lg font-bold hover:bg-blue-100 transition flex items-center gap-1">
                    {aiLoading === 'suggest_meta' ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />} AI 생성
                  </button>
                </div>
              </div>
              <textarea name="desc_text" value={formData.desc_text} onChange={handleChange} maxLength={130}
                className="w-full px-4 py-3 rounded-xl border resize-none h-20 text-sm" placeholder="검색 결과에 보이는 글 요약 (50-120자)" />
            </div>

            {/* 썸네일 */}
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">대표 썸네일</label>
                <div className="flex items-center gap-3">
                  <label className="cursor-pointer bg-slate-100 hover:bg-slate-200 px-4 py-2.5 rounded-xl flex items-center gap-2 text-sm font-bold transition">
                    {uploadingThumbnail ? <Loader2 className="animate-spin w-4 h-4" /> : <Upload className="w-4 h-4" />} 이미지 업로드
                    <input type="file" accept="image/*" onChange={handleThumbnailUpload} className="hidden" />
                  </label>
                  {formData.image_url && <img src={formData.image_url} alt="썸네일 미리보기" className="w-14 h-14 rounded-lg object-cover border" />}
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-bold text-slate-700">SEO 키워드</label>
                  <button type="button" onClick={handleSuggestKeywords} disabled={!!aiLoading}
                    className="text-xs bg-green-50 text-green-600 px-2 py-1 rounded-lg font-bold hover:bg-green-100 transition flex items-center gap-1">
                    {aiLoading === 'suggest_keywords' ? <Loader2 className="w-3 h-3 animate-spin" /> : <Tag className="w-3 h-3" />} AI 키워드
                  </button>
                </div>
                <div className="flex gap-2 mb-2">
                  <input type="text" value={keywordInput} onChange={e => setKeywordInput(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addKeyword(); } }}
                    className="flex-1 px-3 py-2 rounded-lg border text-sm" placeholder="장기렌트, 렌트카 비용, 월 렌탈료" />
                  <button type="button" onClick={addKeyword} className="bg-slate-800 text-white px-3 py-2 rounded-lg text-sm font-bold">추가</button>
                </div>
                <div className="flex flex-wrap gap-1.5 min-h-8">
                  {formData.keywords.map(kw => (
                    <span key={kw} className="inline-flex items-center gap-1 bg-slate-100 text-slate-700 text-xs font-bold px-2.5 py-1 rounded-full">
                      {kw}
                      <button type="button" onClick={() => removeKeyword(kw)} className="text-slate-400 hover:text-red-500 transition"><X className="w-3 h-3" /></button>
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* 관련글 추천 */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-bold text-slate-700">관련글 내부 링크</label>
                <button type="button" onClick={handleSuggestRelated} disabled={!!aiLoading}
                  className="text-xs bg-orange-50 text-orange-600 px-2 py-1 rounded-lg font-bold hover:bg-orange-100 transition flex items-center gap-1">
                  {aiLoading === 'suggest_related' ? <Loader2 className="w-3 h-3 animate-spin" /> : <Link2 className="w-3 h-3" />} AI 추천
                </button>
              </div>
              {relatedPosts.length === 0 ? (
                <p className="text-xs text-slate-400 px-1">AI 추천 버튼을 눌러 관련글을 불러오세요.</p>
              ) : (
                <div className="space-y-2">
                  {relatedPosts.map(p => (
                    <label key={p.slug} className="flex items-center gap-2 cursor-pointer p-2.5 rounded-lg border border-slate-100 hover:bg-slate-50 transition">
                      <input type="checkbox" checked={selectedRelated.includes(p.slug)}
                        onChange={e => setSelectedRelated(prev => e.target.checked ? [...prev, p.slug] : prev.filter(s => s !== p.slug))}
                        className="w-4 h-4 rounded" />
                      <span className="text-sm font-medium text-slate-700">{p.title}</span>
                      <span className="text-xs text-slate-400 ml-auto">/posts/{p.slug}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>

            <hr className="border-slate-100" />

            {/* 본문 에디터 */}
            <div>
              <div className="sticky top-0 z-50 bg-white/95 backdrop-blur border-b border-slate-100 py-3 flex flex-col md:flex-row justify-between items-center mb-4 gap-2">
                <label className="block text-sm font-bold text-slate-700">본문 작성</label>
                <div className="flex items-center gap-2">
                  <a href="https://www.iloveimg.com/ko/compress-image" target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold bg-green-50 text-green-600 hover:bg-green-100 border border-green-200 transition">
                    <Zap className="w-3 h-3" /> 이미지 압축
                  </a>
                  <label className={`cursor-pointer flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition border border-blue-200 ${uploadingBody ? "bg-slate-100 text-slate-400" : "bg-blue-50 text-blue-600 hover:bg-blue-100"}`}>
                    {uploadingBody ? <Loader2 className="w-3 h-3 animate-spin" /> : <ImageIcon className="w-3 h-3" />} 본문 사진
                    <input type="file" accept="image/*" onChange={handleBodyImageUpload} className="hidden" disabled={uploadingBody} />
                  </label>
                  <div className="flex bg-slate-100 p-1 rounded-lg">
                    <button type="button" onClick={() => setMode("visual")} className={`flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-bold transition ${mode === 'visual' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500'}`}>
                      <Type className="w-3 h-3" /> 비주얼
                    </button>
                    <button type="button" onClick={() => setMode("html")} className={`flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-bold transition ${mode === 'html' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}>
                      <Code className="w-3 h-3" /> HTML
                    </button>
                  </div>
                </div>
              </div>
              <div className={mode === "visual" ? "block" : "hidden"}>
                <div ref={editorRef} contentEditable onClick={handleEditorClick} onKeyUp={updateCursorPosition}
                  onBlur={updateCursorPosition} onInput={handleVisualInput}
                  className="w-full min-h-[500px] p-6 rounded-xl border border-slate-200 prose prose-slate max-w-none bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  style={{ lineHeight: "1.8" }} />
              </div>
              <div className={mode === "html" ? "block" : "hidden"}>
                <textarea ref={textareaRef} name="content" value={formData.content} onChange={handleChange}
                  className="w-full min-h-[500px] p-4 rounded-xl border bg-slate-900 text-slate-200 font-mono text-sm leading-relaxed" />
              </div>
            </div>

            {/* 저장 버튼 */}
            <div className="pt-4 border-t border-slate-100 flex justify-end gap-3">
              <button type="button" onClick={() => handleSubmit(false)} disabled={loading}
                className="bg-white hover:bg-slate-50 text-slate-600 border border-slate-200 font-bold px-8 py-4 rounded-xl transition flex items-center gap-2">
                <FileEdit className="w-5 h-5" /> 임시저장
              </button>
              <button type="button" onClick={() => handleSubmit(true)} disabled={loading}
                className="bg-slate-900 hover:bg-slate-800 text-white font-bold px-10 py-4 rounded-xl shadow-lg transition flex items-center gap-2">
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />} 발행하기
              </button>
            </div>
          </div>

          {/* ── 오른쪽: SEO 점수 패널 ── */}
          <div className="lg:col-span-1 space-y-4">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 sticky top-6">
              <button type="button" onClick={() => setShowSeo(p => !p)} className="w-full flex items-center justify-between mb-4">
                <span className="font-bold text-slate-900">SEO 점수</span>
                {showSeo ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
              </button>

              {showSeo && (
                <>
                  {/* 점수 원형 */}
                  <div className="flex items-center justify-center mb-5">
                    <div className={`relative w-24 h-24 rounded-full flex items-center justify-center border-4 ${seo.score >= 80 ? 'border-green-400' : seo.score >= 50 ? 'border-yellow-400' : 'border-red-400'}`}>
                      <div className="text-center">
                        <div className={`text-3xl font-black ${seo.score >= 80 ? 'text-green-600' : seo.score >= 50 ? 'text-yellow-600' : 'text-red-500'}`}>{seo.score}</div>
                        <div className="text-xs text-slate-400">/ 100</div>
                      </div>
                    </div>
                  </div>

                  {/* 체크리스트 */}
                  <div className="space-y-2">
                    {seo.checks.map((c, i) => (
                      <div key={i} className="flex items-center gap-2 text-sm">
                        <span className={`flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${c.pass ? 'bg-green-100 text-green-600' : 'bg-red-50 text-red-400'}`}>
                          {c.pass ? '✓' : '✗'}
                        </span>
                        <span className={c.pass ? 'text-slate-700' : 'text-slate-400'}>{c.label}</span>
                      </div>
                    ))}
                  </div>

                  {/* 가이드 */}
                  <div className="mt-5 p-3 bg-blue-50 rounded-xl">
                    <p className="text-xs font-bold text-blue-700 mb-1">SEO 가이드</p>
                    <ul className="text-xs text-blue-600 space-y-1">
                      <li>• H2 태그로 섹션 구분</li>
                      <li>• 첫 문단에 키워드 포함</li>
                      <li>• 이미지 alt 텍스트 필수</li>
                      <li>• 내부 링크 2-3개 권장</li>
                    </ul>
                  </div>
                </>
              )}
            </div>
          </div>

        </div>
      </div>

      {/* 이미지 업로드 모달 */}
      {imgModal && (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <h3 className="font-bold text-slate-900 text-lg mb-4">이미지 정보 입력</h3>

            {/* 미리보기 */}
            <img src={imgModal.preview} alt="미리보기" className="w-full h-40 object-cover rounded-xl mb-4 border border-slate-100" />

            {/* SEO 메타태그 (alt) */}
            <div className="mb-4">
              <label className="block text-sm font-bold text-slate-700 mb-1">
                SEO 메타태그 (alt) <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={imgAlt}
                onChange={e => setImgAlt(e.target.value)}
                placeholder="예: 2026년 장기렌트 계약서 작성 장면"
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:border-blue-500 outline-none"
                autoFocus
              />
              <p className="text-xs text-slate-400 mt-1">구글 이미지 검색·스크린리더용. 이미지 내용을 정확히 설명해주세요.</p>
            </div>

            {/* 사진 설명 (caption) */}
            <div className="mb-5">
              <label className="block text-sm font-bold text-slate-700 mb-1">
                사진 설명 (캡션)
                <span className="text-slate-400 font-normal ml-1">선택 — 비우면 alt 텍스트 사용</span>
              </label>
              <input
                type="text"
                value={imgCaption}
                onChange={e => setImgCaption(e.target.value)}
                placeholder="예: ▲ 계약 전 반드시 확인해야 할 서류 체크리스트"
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:border-blue-500 outline-none"
              />
              <p className="text-xs text-slate-400 mt-1">이미지 아래 독자에게 보이는 텍스트입니다.</p>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => { setImgModal(null); URL.revokeObjectURL(imgModal.preview); }}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold text-sm hover:bg-slate-50 transition"
              >
                취소
              </button>
              <button
                type="button"
                onClick={handleImgModalConfirm}
                className="flex-[2] py-2.5 rounded-xl bg-slate-900 text-white font-bold text-sm hover:bg-slate-800 transition"
              >
                업로드
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
