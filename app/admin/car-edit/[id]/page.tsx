"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase-browser";
import { ArrowLeft, Save, Loader2, Sparkles, Tag, X, Car } from "lucide-react";
import Link from "next/link";

const DURATIONS = [36, 48, 60];
const MILEAGES = [10000, 20000, 30000, 40000, 50000];

function fmt(n: number) {
  return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

export default function CarEdit({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [keywordInput, setKeywordInput] = useState("");

  const [form, setForm] = useState({
    car_name: "", color_exterior: "", color_interior: "",
    options: "", total_price: "", monthly_rent: "", monthly_rent_30: "",
    duration: 48, mileage: 20000,
    image_url: "", image_alt: "", image_caption: "",
    keywords: [] as string[], is_active: true, is_sold: false,
  });

  useEffect(() => {
    const fetch = async () => {
      const { data, error } = await supabase.from("car_listings").select("*").eq("id", id).single();
      if (error || !data) { alert("차량 정보를 불러올 수 없습니다."); router.push("/admin"); return; }
      setForm({
        car_name: data.car_name || "",
        color_exterior: data.color_exterior || "",
        color_interior: data.color_interior || "",
        options: data.options || "",
        total_price: data.total_price ? fmt(data.total_price) : "",
        monthly_rent: data.monthly_rent ? fmt(data.monthly_rent) : "",
        monthly_rent_30: data.monthly_rent_30 ? fmt(data.monthly_rent_30) : "",
        duration: data.duration || 48,
        mileage: data.mileage || 20000,
        image_url: data.image_url || "",
        image_alt: data.image_alt || "",
        image_caption: data.image_caption || "",
        keywords: data.keywords || [],
        is_active: data.is_active ?? true,
        is_sold: data.is_sold ?? false,
      });
      setLoading(false);
    };
    fetch();
  }, [id]);

  const addKeyword = () => {
    const items = keywordInput.split(',').map(k => k.trim()).filter(k => k && !form.keywords.includes(k));
    if (!items.length) return;
    setForm(p => ({ ...p, keywords: [...p.keywords, ...items] }));
    setKeywordInput("");
  };
  const removeKeyword = (kw: string) => setForm(p => ({ ...p, keywords: p.keywords.filter(k => k !== kw) }));

  const handleAiKeywords = async () => {
    if (!form.car_name) { alert("차량명이 필요합니다."); return; }
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
      setForm(p => ({ ...p, keywords: [...p.keywords, ...newKws] }));
    } finally { setAiLoading(false); }
  };

  const handleSave = async () => {
    if (!form.car_name || !form.total_price || !form.monthly_rent) {
      alert("차량명, 총가격, 월렌트료는 필수입니다."); return;
    }
    setSaving(true);
    const { error } = await supabase.from("car_listings").update({
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
      keywords: form.keywords,
      is_active: form.is_active,
      is_sold: form.is_sold,
    }).eq("id", id);
    setSaving(false);
    if (error) { alert("저장 실패: " + error.message); return; }
    alert("수정 완료!");
    router.push("/admin");
  };

  const handleDelete = async () => {
    if (!confirm("정말 삭제하시겠습니까?")) return;
    await supabase.from("car_listings").delete().eq("id", id);
    router.push("/admin");
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-slate-50"><Loader2 className="w-8 h-8 animate-spin text-slate-400" /></div>;

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <Link href="/admin" className="flex items-center text-slate-500 hover:text-slate-900 font-medium">
            <ArrowLeft className="w-5 h-5 mr-2" /> 관리자로
          </Link>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Car className="w-6 h-6 text-rose-600" /> 특가차량 수정
          </h1>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-5">

          {/* 판매완료 + 활성화 */}
          <div className="flex gap-6 p-4 bg-slate-50 rounded-xl">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.is_sold}
                onChange={e => setForm(p => ({ ...p, is_sold: e.target.checked }))}
                className="w-4 h-4 rounded accent-red-600" />
              <span className={`text-sm font-bold ${form.is_sold ? 'text-red-600' : 'text-slate-500'}`}>판매완료</span>
              {form.is_sold && <span className="bg-red-600 text-white text-xs font-black px-2 py-0.5 rounded">SOLD</span>}
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.is_active}
                onChange={e => setForm(p => ({ ...p, is_active: e.target.checked }))}
                className="w-4 h-4 rounded" />
              <span className={`text-sm font-bold ${form.is_active ? 'text-green-600' : 'text-slate-400'}`}>메인 노출</span>
            </label>
          </div>

          {/* 이미지 미리보기 */}
          {form.image_url && (
            <div className="relative rounded-xl overflow-hidden h-48">
              <img src={form.image_url} alt={form.image_alt || form.car_name} className="w-full h-full object-cover" />
              {form.is_sold && (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                  <span className="bg-red-600 text-white text-xl font-black px-6 py-2 rounded-xl">판매완료</span>
                </div>
              )}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-sm font-bold text-slate-700 mb-1">차량명</label>
              <input type="text" value={form.car_name} onChange={e => setForm(p => ({ ...p, car_name: e.target.value }))}
                className="w-full px-4 py-3 rounded-xl border font-bold text-lg focus:outline-none focus:border-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">외장색</label>
              <input type="text" value={form.color_exterior} onChange={e => setForm(p => ({ ...p, color_exterior: e.target.value }))}
                className="w-full px-3 py-2.5 rounded-xl border text-sm focus:outline-none focus:border-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">내장색</label>
              <input type="text" value={form.color_interior} onChange={e => setForm(p => ({ ...p, color_interior: e.target.value }))}
                className="w-full px-3 py-2.5 rounded-xl border text-sm focus:outline-none focus:border-blue-500" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">옵션</label>
            <textarea value={form.options} onChange={e => setForm(p => ({ ...p, options: e.target.value }))}
              className="w-full px-3 py-2.5 rounded-xl border text-sm resize-none h-20 focus:outline-none focus:border-blue-500" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">차량 총가격</label>
              <div className="relative">
                <input type="text" value={form.total_price}
                  onChange={e => { const raw = e.target.value.replace(/[^0-9]/g, ''); setForm(p => ({ ...p, total_price: raw ? Number(raw).toLocaleString('ko-KR') : '' })); }}
                  className="w-full px-3 py-2.5 rounded-xl border text-sm pr-6 focus:outline-none focus:border-blue-500" />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">원</span>
              </div>
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">월 렌트료 (선수금 0원)</label>
              <div className="relative">
                <input type="text" value={form.monthly_rent}
                  onChange={e => { const raw = e.target.value.replace(/[^0-9]/g, ''); setForm(p => ({ ...p, monthly_rent: raw ? Number(raw).toLocaleString('ko-KR') : '' })); }}
                  className="w-full px-3 py-2.5 rounded-xl border text-sm pr-6 focus:outline-none focus:border-blue-500" />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">원</span>
              </div>
            </div>
          </div>

          {/* 선수금 30% */}
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">
              월 렌트료 (선수금 30%)
              <span className="text-slate-400 font-normal ml-2 text-xs">선택</span>
            </label>
            <div className="flex gap-3 items-center p-3 bg-blue-50 rounded-xl border border-blue-100">
              <div className="flex-shrink-0 text-xs font-bold text-blue-700 bg-blue-100 px-2 py-1 rounded-md">선수금 30%</div>
              <div className="relative flex-1">
                <input type="text" value={form.monthly_rent_30}
                  onChange={e => { const raw = e.target.value.replace(/[^0-9]/g, ''); setForm(p => ({ ...p, monthly_rent_30: raw ? Number(raw).toLocaleString('ko-KR') : '' })); }}
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

          {/* SEO 키워드 */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-bold text-slate-700">SEO 키워드</label>
              <button type="button" onClick={handleAiKeywords} disabled={aiLoading}
                className="flex items-center gap-1 text-xs bg-violet-50 text-violet-600 px-3 py-1.5 rounded-lg font-bold hover:bg-violet-100 transition">
                {aiLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />} AI 자동생성
              </button>
            </div>
            <div className="flex gap-2 mb-2">
              <input type="text" value={keywordInput} onChange={e => setKeywordInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addKeyword(); } }}
                placeholder="키워드 입력 (쉼표로 구분)"
                className="flex-1 px-3 py-2 rounded-lg border text-sm focus:outline-none focus:border-blue-500" />
              <button type="button" onClick={addKeyword} className="bg-slate-800 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-1">
                <Tag className="w-3 h-3" /> 추가
              </button>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {form.keywords.map(kw => (
                <span key={kw} className="inline-flex items-center gap-1 bg-slate-100 text-slate-700 text-xs font-bold px-2.5 py-1 rounded-full">
                  {kw}
                  <button type="button" onClick={() => removeKeyword(kw)} className="text-slate-400 hover:text-red-500"><X className="w-3 h-3" /></button>
                </span>
              ))}
            </div>
          </div>

          {/* 버튼 */}
          <div className="pt-2 border-t border-slate-100 flex gap-3">
            <button type="button" onClick={handleDelete}
              className="px-6 py-3 rounded-xl border border-red-200 text-red-500 font-bold text-sm hover:bg-red-50 transition">
              삭제
            </button>
            <button type="button" onClick={handleSave} disabled={saving}
              className="flex-1 bg-rose-600 hover:bg-rose-700 text-white font-bold py-3 rounded-xl transition flex items-center justify-center gap-2">
              {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />} 수정 저장
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
