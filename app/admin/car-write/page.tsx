"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase-browser";
import {
  ArrowLeft, Upload, Loader2, Search, X, Sparkles, Tag, Car, Save, ImagePlus, CheckCircle
} from "lucide-react";
import Link from "next/link";

const DURATIONS = [36, 48, 60];
const MILEAGES = [10000, 20000, 30000, 40000, 50000];

type CarImageMeta = {
  id: number;
  filename: string;
  display_name: string | null;
  alt: string | null;
  caption: string | null;
};

function fmt(n: number) {
  return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

export default function CarWrite() {
  const router = useRouter();
  const supabase = createClient();

  // ── 차량 등록 폼 ──
  const [form, setForm] = useState({
    car_name: "", color_exterior: "", color_interior: "",
    options: "", total_price: "", monthly_rent: "", monthly_rent_30: "",
    duration: 48, mileage: 20000,
    image_url: "", image_alt: "", image_caption: "",
    keywords: [] as string[], is_active: true,
  });

  const [keywordInput, setKeywordInput] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // ── 이미지 라이브러리 (car_image_meta) ──
  const [imageMetas, setImageMetas] = useState<CarImageMeta[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<CarImageMeta[]>([]);

  // 선택된 이미지에서 alt/caption 수정 모달
  const [selectModal, setSelectModal] = useState<{ meta: CarImageMeta; url: string } | null>(null);
  const [selectAlt, setSelectAlt] = useState("");
  const [selectCaption, setSelectCaption] = useState("");

  // ── 서버에 이미지 올리기 ──
  const [uploadFiles, setUploadFiles] = useState<Array<{
    file: File; preview: string; displayName: string; alt: string; caption: string; status: 'pending' | 'uploading' | 'done' | 'error';
  }>>([]);
  const [bulkUploading, setBulkUploading] = useState(false);

  // 메타 테이블 로드
  const loadMetas = async () => {
    const { data } = await supabase.from("car_image_meta").select("*").order("created_at", { ascending: false });
    const list = data || [];
    setImageMetas(list);
    setSearchResults(list);
  };

  useEffect(() => { loadMetas(); }, []);

  // 검색 (한글 display_name + 영문 filename)
  const handleSearch = () => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) { setSearchResults(imageMetas); return; }
    setSearchResults(imageMetas.filter(m =>
      (m.display_name || '').toLowerCase().includes(q) ||
      m.filename.toLowerCase().includes(q)
    ));
  };

  // 이미지 선택 → 저장된 alt/caption 자동 채워짐
  const handleSelectImage = (meta: CarImageMeta) => {
    const { data } = supabase.storage.from("car-imgae").getPublicUrl(meta.filename);
    setSelectAlt(meta.alt || "");
    setSelectCaption(meta.caption || "");
    setSelectModal({ meta, url: data.publicUrl });
  };

  // 선택 모달 확인 → alt/caption DB 저장 + 폼 반영
  const handleSelectConfirm = async () => {
    if (!selectModal) return;
    if (!selectAlt.trim()) { alert("SEO 메타태그(alt)를 입력해주세요."); return; }

    // alt/caption이 변경됐으면 DB 업데이트
    if (selectAlt !== selectModal.meta.alt || selectCaption !== selectModal.meta.caption) {
      await supabase.from("car_image_meta").update({
        alt: selectAlt.trim(),
        caption: selectCaption.trim() || selectAlt.trim(),
      }).eq("id", selectModal.meta.id);
      loadMetas();
    }

    setForm(prev => ({
      ...prev,
      image_url: selectModal.url,
      image_alt: selectAlt.trim(),
      image_caption: selectCaption.trim() || selectAlt.trim(),
    }));
    setSelectModal(null);
  };

  // ── 서버에 이미지 올리기: 파일 선택 ──
  const handleBulkFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const newItems = files.map(file => ({
      file,
      preview: URL.createObjectURL(file),
      displayName: file.name.replace(/\.[^/.]+$/, ""),
      alt: "",
      caption: "",
      status: 'pending' as const,
    }));
    setUploadFiles(prev => [...prev, ...newItems]);
    e.target.value = "";
  };

  const removeBulkFile = (idx: number) => {
    URL.revokeObjectURL(uploadFiles[idx].preview);
    setUploadFiles(prev => prev.filter((_, i) => i !== idx));
  };

  // 서버에 이미지 올리기: 업로드 실행
  const handleBulkUpload = async () => {
    const pending = uploadFiles.filter(f => f.status === 'pending');
    if (!pending.length) { alert("업로드할 파일이 없습니다."); return; }

    setBulkUploading(true);
    for (let i = 0; i < uploadFiles.length; i++) {
      const item = uploadFiles[i];
      if (item.status !== 'pending') continue;

      setUploadFiles(prev => prev.map((f, idx) => idx === i ? { ...f, status: 'uploading' } : f));

      try {
        // 파일명: 타임스탬프_원본명 (영어/숫자만)
        const safeName = item.file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
        const fname = `${Date.now()}_${safeName}`;

        const { error } = await supabase.storage
          .from("car-imgae")
          .upload(fname, item.file, { upsert: false });

        if (error) throw new Error(error.message);

        // car_image_meta 저장
        await supabase.from("car_image_meta").insert([{
          filename: fname,
          display_name: item.displayName || null,
          alt: item.alt || null,
          caption: item.caption || item.alt || null,
        }]);

        setUploadFiles(prev => prev.map((f, idx) => idx === i ? { ...f, status: 'done' } : f));
      } catch {
        setUploadFiles(prev => prev.map((f, idx) => idx === i ? { ...f, status: 'error' } : f));
      }
    }

    setBulkUploading(false);
    loadMetas(); // 목록 갱신
  };

  // ── 키워드 ──
  const addKeyword = () => {
    const items = keywordInput.split(',').map(k => k.trim()).filter(k => k && !form.keywords.includes(k));
    if (!items.length) return;
    setForm(prev => ({ ...prev, keywords: [...prev.keywords, ...items] }));
    setKeywordInput("");
  };
  const removeKeyword = (kw: string) =>
    setForm(prev => ({ ...prev, keywords: prev.keywords.filter(k => k !== kw) }));

  const handleAiKeywords = async () => {
    if (!form.car_name) { alert("차량명을 먼저 입력해주세요."); return; }
    setAiLoading(true);
    try {
      const res = await fetch("/api/car-keywords", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          car_name: form.car_name, color_exterior: form.color_exterior,
          options: form.options, total_price: Number(form.total_price.replace(/,/g, '')) || 0,
          monthly_rent: Number(form.monthly_rent.replace(/,/g, '')) || 0,
          duration: form.duration, mileage: form.mileage,
        }),
      });
      const result = await res.json();
      const newKws = (result.keywords || []).filter((k: string) => !form.keywords.includes(k));
      setForm(prev => ({ ...prev, keywords: [...prev.keywords, ...newKws] }));
    } finally { setAiLoading(false); }
  };

  // ── 저장 ──
  const handleSave = async () => {
    if (!form.car_name || !form.total_price || !form.monthly_rent) {
      alert("차량명, 총가격, 월렌트료는 필수입니다."); return;
    }
    setSaving(true);

    // 키워드 비어있으면 자동생성
    let finalKeywords = form.keywords;
    if (finalKeywords.length === 0) {
      try {
        const res = await fetch("/api/car-keywords", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            car_name: form.car_name, color_exterior: form.color_exterior,
            options: form.options, total_price: Number(form.total_price.replace(/,/g, '')) || 0,
            monthly_rent: Number(form.monthly_rent.replace(/,/g, '')) || 0,
            duration: form.duration, mileage: form.mileage,
          }),
        });
        const result = await res.json();
        finalKeywords = result.keywords || [];
      } catch { /* 실패해도 빈 배열로 진행 */ }
    }

    const { error } = await supabase.from("car_listings").insert([{
      car_name: form.car_name,
      color_exterior: form.color_exterior || null,
      color_interior: form.color_interior || null,
      options: form.options || null,
      total_price: Number(form.total_price.replace(/,/g, '')),
      monthly_rent: Number(form.monthly_rent.replace(/,/g, '')),
      monthly_rent_30: form.monthly_rent_30 ? Number(form.monthly_rent_30.replace(/,/g, '')) : null,
      duration: form.duration, mileage: form.mileage,
      image_url: form.image_url || null,
      image_alt: form.image_alt || null,
      image_caption: form.image_caption || null,
      keywords: finalKeywords, is_active: form.is_active,
    }]);
    setSaving(false);
    if (error) { alert("저장 실패: " + error.message); return; }
    alert("특가차량 등록 완료!");
    router.push("/admin");
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <Link href="/admin" className="flex items-center text-slate-500 hover:text-slate-900 transition font-medium">
            <ArrowLeft className="w-5 h-5 mr-2" /> 관리자로
          </Link>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Car className="w-6 h-6 text-rose-600" /> 특가차량 등록
          </h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* ── 왼쪽: 차량 정보 ── */}
          <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-5">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">차량명 <span className="text-red-500">*</span></label>
              <input type="text" value={form.car_name}
                onChange={e => setForm(p => ({ ...p, car_name: e.target.value }))}
                placeholder="예: 현대 그랜저 3.5 가솔린 캘리그래피"
                className="w-full px-4 py-3 rounded-xl border font-bold text-lg focus:outline-none focus:border-blue-500" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">외장색</label>
                <input type="text" value={form.color_exterior}
                  onChange={e => setForm(p => ({ ...p, color_exterior: e.target.value }))}
                  placeholder="예: 문라이트 클라우드"
                  className="w-full px-3 py-2.5 rounded-xl border text-sm focus:outline-none focus:border-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">내장색</label>
                <input type="text" value={form.color_interior}
                  onChange={e => setForm(p => ({ ...p, color_interior: e.target.value }))}
                  placeholder="예: 블랙"
                  className="w-full px-3 py-2.5 rounded-xl border text-sm focus:outline-none focus:border-blue-500" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">옵션</label>
              <textarea value={form.options}
                onChange={e => setForm(p => ({ ...p, options: e.target.value }))}
                placeholder="예: 파노라마 선루프, HUD, 빌트인캠"
                className="w-full px-3 py-2.5 rounded-xl border text-sm resize-none h-20 focus:outline-none focus:border-blue-500" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">차량 총가격 <span className="text-red-500">*</span></label>
                <div className="relative">
                  <input type="text" value={form.total_price}
                    onChange={e => {
                      const raw = e.target.value.replace(/[^0-9]/g, '');
                      setForm(p => ({ ...p, total_price: raw ? Number(raw).toLocaleString('ko-KR') : '' }));
                    }}
                    placeholder="55,000,000"
                    className="w-full px-3 py-2.5 rounded-xl border text-sm pr-6 focus:outline-none focus:border-blue-500" />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">원</span>
                </div>
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">월 렌트료 (선수금 0원) <span className="text-red-500">*</span></label>
                <div className="relative">
                  <input type="text" value={form.monthly_rent}
                    onChange={e => {
                      const raw = e.target.value.replace(/[^0-9]/g, '');
                      setForm(p => ({ ...p, monthly_rent: raw ? Number(raw).toLocaleString('ko-KR') : '' }));
                    }}
                    placeholder="650,000"
                    className="w-full px-3 py-2.5 rounded-xl border text-sm pr-6 focus:outline-none focus:border-blue-500" />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">원</span>
                </div>
              </div>
            </div>

            {/* 선수금 30% 렌트료 */}
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">
                월 렌트료 (선수금 30%)
                <span className="text-slate-400 font-normal ml-2 text-xs">선택 — 입력 시 카드에 함께 노출</span>
              </label>
              <div className="flex gap-3 items-center p-3 bg-blue-50 rounded-xl border border-blue-100">
                <div className="flex-shrink-0 text-xs font-bold text-blue-700 bg-blue-100 px-2 py-1 rounded-md">선수금 30%</div>
                <div className="relative flex-1">
                  <input type="text" value={form.monthly_rent_30}
                    onChange={e => {
                      const raw = e.target.value.replace(/[^0-9]/g, '');
                      setForm(p => ({ ...p, monthly_rent_30: raw ? Number(raw).toLocaleString('ko-KR') : '' }));
                    }}
                    placeholder="490,000"
                    className="w-full px-3 py-2.5 rounded-xl border border-blue-200 text-sm pr-6 focus:outline-none focus:border-blue-500 bg-white" />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">원/월</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">계약기간</label>
                <select value={form.duration} onChange={e => setForm(p => ({ ...p, duration: Number(e.target.value) }))}
                  className="w-full px-3 py-2.5 rounded-xl border text-sm focus:outline-none focus:border-blue-500">
                  {DURATIONS.map(d => <option key={d} value={d}>{d}개월</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">연간 주행거리</label>
                <select value={form.mileage} onChange={e => setForm(p => ({ ...p, mileage: Number(e.target.value) }))}
                  className="w-full px-3 py-2.5 rounded-xl border text-sm focus:outline-none focus:border-blue-500">
                  {MILEAGES.map(m => <option key={m} value={m}>연 {fmt(m)}km</option>)}
                </select>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-bold text-slate-700">SEO 키워드</label>
                <button type="button" onClick={handleAiKeywords} disabled={aiLoading}
                  className="flex items-center gap-1 text-xs bg-violet-50 text-violet-600 px-3 py-1.5 rounded-lg font-bold hover:bg-violet-100 transition">
                  {aiLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />} AI 자동생성
                </button>
              </div>
              <div className="flex gap-2 mb-2">
                <input type="text" value={keywordInput}
                  onChange={e => setKeywordInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addKeyword(); } }}
                  placeholder="그랜저 장기렌트, 그랜저 특가 (쉼표로 구분)"
                  className="flex-1 px-3 py-2 rounded-lg border text-sm focus:outline-none focus:border-blue-500" />
                <button type="button" onClick={addKeyword}
                  className="bg-slate-800 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-1">
                  <Tag className="w-3 h-3" /> 추가
                </button>
              </div>
              <div className="flex flex-wrap gap-1.5 min-h-8">
                {form.keywords.map(kw => (
                  <span key={kw} className="inline-flex items-center gap-1 bg-slate-100 text-slate-700 text-xs font-bold px-2.5 py-1 rounded-full">
                    {kw}
                    <button type="button" onClick={() => removeKeyword(kw)} className="text-slate-400 hover:text-red-500 transition"><X className="w-3 h-3" /></button>
                  </span>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <input type="checkbox" id="is_active" checked={form.is_active}
                onChange={e => setForm(p => ({ ...p, is_active: e.target.checked }))} className="w-4 h-4 rounded" />
              <label htmlFor="is_active" className="text-sm font-bold text-slate-700">메인에 노출 (활성화)</label>
            </div>

            <div className="pt-2 border-t border-slate-100">
              <button type="button" onClick={handleSave} disabled={saving}
                className="w-full bg-rose-600 hover:bg-rose-700 text-white font-bold py-4 rounded-xl transition flex items-center justify-center gap-2 shadow-lg">
                {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />} 특가차량 등록
              </button>
            </div>
          </div>

          {/* ── 오른쪽: 이미지 선택 ── */}
          <div className="lg:col-span-1 space-y-4">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
              <h3 className="font-bold text-slate-900 mb-4">차량 이미지 선택</h3>

              {/* 선택된 이미지 미리보기 */}
              {form.image_url ? (
                <div className="mb-4 relative">
                  <img src={form.image_url} alt={form.image_alt || "차량 이미지"}
                    className="w-full h-40 object-cover rounded-xl border border-slate-100" />
                  <button onClick={() => setForm(p => ({ ...p, image_url: "", image_alt: "", image_caption: "" }))}
                    className="absolute top-2 right-2 bg-white/90 hover:bg-white rounded-full p-1 shadow transition">
                    <X className="w-4 h-4 text-slate-600" />
                  </button>
                  <div className="mt-2 space-y-1">
                    <p className="text-xs text-slate-500"><span className="font-bold">alt:</span> {form.image_alt}</p>
                    <p className="text-xs text-slate-500"><span className="font-bold">설명:</span> {form.image_caption}</p>
                  </div>
                </div>
              ) : (
                <div className="h-36 bg-slate-100 rounded-xl flex items-center justify-center mb-4 border-2 border-dashed border-slate-200">
                  <div className="text-center text-slate-400">
                    <Car className="w-8 h-8 mx-auto mb-1" />
                    <p className="text-xs">이미지 없음</p>
                  </div>
                </div>
              )}

              {/* 이미지 검색 */}
              <div className="flex gap-2 mb-3">
                <input type="text" value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handleSearch(); }}
                  placeholder="차량명 검색 (예: 아반떼, 그랜저)"
                  className="flex-1 px-3 py-2 rounded-lg border text-xs focus:outline-none focus:border-blue-500" />
                <button type="button" onClick={handleSearch}
                  className="bg-slate-800 text-white px-3 py-2 rounded-lg">
                  <Search className="w-3 h-3" />
                </button>
              </div>

              {/* 검색 결과 */}
              <div className="grid grid-cols-3 gap-1.5 max-h-56 overflow-y-auto">
                {searchResults.map(meta => {
                  const { data } = supabase.storage.from("car-imgae").getPublicUrl(meta.filename);
                  return (
                    <button key={meta.id} type="button" onClick={() => handleSelectImage(meta)}
                      className="relative aspect-square rounded-lg overflow-hidden border-2 border-transparent hover:border-blue-500 transition group">
                      <img src={data.publicUrl} alt={meta.alt || meta.display_name || meta.filename}
                        className="w-full h-full object-cover group-hover:scale-105 transition" />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition" />
                      {meta.alt && (
                        <div className="absolute bottom-0 inset-x-0 bg-blue-500/80 text-white text-[8px] text-center py-0.5 truncate px-1">
                          ✓
                        </div>
                      )}
                    </button>
                  );
                })}
                {searchResults.length === 0 && (
                  <p className="col-span-3 text-xs text-slate-400 text-center py-6">
                    {imageMetas.length === 0 ? "서버에 이미지가 없습니다" : "검색 결과 없음"}
                  </p>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-2">파란 체크(✓) = alt태그 저장됨</p>
            </div>
          </div>
        </div>

        {/* ── 하단: 서버에 이미지 올리기 ── */}
        <div className="mt-6 bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-slate-900 flex items-center gap-2">
              <ImagePlus className="w-5 h-5 text-blue-600" /> 서버에 이미지 올리기
            </h3>
            <label className="cursor-pointer flex items-center gap-2 bg-blue-50 text-blue-600 hover:bg-blue-100 border border-blue-200 font-bold px-4 py-2 rounded-xl text-sm transition">
              <Upload className="w-4 h-4" /> 파일 선택 (여러 장 가능)
              <input type="file" accept="image/*" multiple onChange={handleBulkFileSelect} className="hidden" />
            </label>
          </div>

          {uploadFiles.length === 0 ? (
            <div className="border-2 border-dashed border-slate-200 rounded-xl py-10 text-center text-slate-400">
              <ImagePlus className="w-10 h-10 mx-auto mb-2 opacity-40" />
              <p className="text-sm">파일 선택 버튼으로 차량 이미지를 추가하세요</p>
              <p className="text-xs mt-1">여러 장을 한 번에 선택할 수 있습니다</p>
            </div>
          ) : (
            <>
              <div className="space-y-3 mb-4 max-h-96 overflow-y-auto">
                {uploadFiles.map((item, idx) => (
                  <div key={idx} className={`flex gap-3 p-3 rounded-xl border ${
                    item.status === 'done' ? 'bg-green-50 border-green-200' :
                    item.status === 'error' ? 'bg-red-50 border-red-200' :
                    item.status === 'uploading' ? 'bg-blue-50 border-blue-200' :
                    'bg-slate-50 border-slate-200'
                  }`}>
                    {/* 미리보기 */}
                    <div className="flex-shrink-0 relative">
                      <img src={item.preview} alt="미리보기" className="w-20 h-20 object-cover rounded-lg" />
                      {item.status === 'done' && (
                        <div className="absolute inset-0 bg-green-500/20 rounded-lg flex items-center justify-center">
                          <CheckCircle className="w-6 h-6 text-green-600" />
                        </div>
                      )}
                      {item.status === 'uploading' && (
                        <div className="absolute inset-0 bg-blue-500/20 rounded-lg flex items-center justify-center">
                          <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
                        </div>
                      )}
                    </div>

                    {/* 입력 필드 */}
                    <div className="flex-1 space-y-2">
                      <input type="text" value={item.displayName}
                        onChange={e => setUploadFiles(prev => prev.map((f, i) => i === idx ? { ...f, displayName: e.target.value } : f))}
                        placeholder="차량 표시명 (예: 아반떼)"
                        disabled={item.status === 'done'}
                        className="w-full px-3 py-1.5 rounded-lg border text-sm font-bold focus:outline-none focus:border-blue-500 disabled:bg-slate-100" />
                      <input type="text" value={item.alt}
                        onChange={e => setUploadFiles(prev => prev.map((f, i) => i === idx ? { ...f, alt: e.target.value } : f))}
                        placeholder="SEO alt 태그 (예: 2026 현대 아반떼 흰색 측면)"
                        disabled={item.status === 'done'}
                        className="w-full px-3 py-1.5 rounded-lg border text-sm focus:outline-none focus:border-blue-500 disabled:bg-slate-100" />
                      <input type="text" value={item.caption}
                        onChange={e => setUploadFiles(prev => prev.map((f, i) => i === idx ? { ...f, caption: e.target.value } : f))}
                        placeholder="사진 설명 캡션 (선택)"
                        disabled={item.status === 'done'}
                        className="w-full px-3 py-1.5 rounded-lg border text-sm focus:outline-none focus:border-blue-500 disabled:bg-slate-100" />
                    </div>

                    {/* 삭제 */}
                    {item.status !== 'done' && item.status !== 'uploading' && (
                      <button type="button" onClick={() => removeBulkFile(idx)}
                        className="flex-shrink-0 text-slate-400 hover:text-red-500 transition p-1 self-start">
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              <div className="flex gap-3">
                <button type="button"
                  onClick={() => setUploadFiles(prev => prev.filter(f => f.status !== 'done'))}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 text-sm font-bold hover:bg-slate-50 transition">
                  완료된 항목 제거
                </button>
                <button type="button" onClick={handleBulkUpload} disabled={bulkUploading}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 rounded-xl transition flex items-center justify-center gap-2">
                  {bulkUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                  서버에 업로드
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* 이미지 선택 모달 (alt/caption 입력) */}
      {selectModal && (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <h3 className="font-bold text-slate-900 text-lg mb-4">이미지 정보 확인</h3>
            <img src={selectModal.url} alt="미리보기" className="w-full h-44 object-cover rounded-xl mb-4 border" />
            <p className="text-xs text-slate-500 mb-3">입력한 alt/사진설명은 저장되어 다음에도 자동으로 불러옵니다.</p>

            <div className="mb-4">
              <label className="block text-sm font-bold text-slate-700 mb-1">SEO 메타태그 (alt) <span className="text-red-500">*</span></label>
              <input type="text" value={selectAlt} onChange={e => setSelectAlt(e.target.value)}
                placeholder="예: 2026 현대 그랜저 캘리그래피 흰색 측면"
                className="w-full px-3 py-2.5 rounded-xl border text-sm focus:border-blue-500 outline-none" autoFocus />
              <p className="text-xs text-slate-400 mt-1">구글 이미지 검색·접근성용</p>
            </div>
            <div className="mb-5">
              <label className="block text-sm font-bold text-slate-700 mb-1">사진 설명 (캡션) <span className="text-slate-400 font-normal">선택</span></label>
              <input type="text" value={selectCaption} onChange={e => setSelectCaption(e.target.value)}
                placeholder="예: 그랜저 캘리그래피 특가 장기렌트 월 65만원"
                className="w-full px-3 py-2.5 rounded-xl border text-sm focus:border-blue-500 outline-none" />
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={() => setSelectModal(null)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold text-sm hover:bg-slate-50 transition">취소</button>
              <button type="button" onClick={handleSelectConfirm}
                className="flex-[2] py-2.5 rounded-xl bg-slate-900 text-white font-bold text-sm hover:bg-slate-800 transition">
                이 이미지 사용
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
