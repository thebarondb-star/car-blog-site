"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { Search, ChevronRight, Siren } from "lucide-react";

function fmt(n: number) {
  return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

export default function CarsPage() {
  const [cars, setCars] = useState<any[]>([]);
  const [filtered, setFiltered] = useState<any[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from("car_listings")
        .select("*")
        .order("created_at", { ascending: false });
      setCars(data || []);
      setFiltered(data || []);
      setLoading(false);
    };
    load();
  }, []);

  const handleSearch = (q: string) => {
    setQuery(q);
    if (!q.trim()) { setFiltered(cars); return; }
    const lower = q.toLowerCase();
    setFiltered(cars.filter(c =>
      c.car_name?.toLowerCase().includes(lower) ||
      c.options?.toLowerCase().includes(lower) ||
      c.color_exterior?.toLowerCase().includes(lower)
    ));
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* 헤더 */}
      <div className="bg-slate-900 text-white py-12 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center gap-2 mb-3">
            <Siren className="w-5 h-5 text-red-400" />
            <span className="text-red-400 text-sm font-bold">이번 달 특가</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-black mb-2">특가차량 전체보기</h1>
          <p className="text-slate-400">딜러 마진 없는 투명한 특가 장기렌트 차량 리스트</p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* 검색 */}
        <div className="relative mb-8 max-w-md">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={query}
            onChange={e => handleSearch(e.target.value)}
            placeholder="차량명 검색 (예: 그랜저, 쏘렌토)"
            className="w-full pl-11 pr-4 py-3 rounded-xl border border-slate-200 bg-white shadow-sm focus:outline-none focus:border-blue-500 text-sm"
          />
        </div>

        {loading ? (
          <div className="text-center py-20 text-slate-400">불러오는 중...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 text-slate-400">
            {query ? `"${query}" 검색 결과가 없습니다` : "등록된 특가차량이 없습니다"}
          </div>
        ) : (
          <>
            <p className="text-sm text-slate-500 mb-4">총 {filtered.length}대</p>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filtered.map((car) => (
                <Link key={car.id} href={`/consult?car=${encodeURIComponent(car.car_name)}&car_id=${car.id}`}
                  className={`group bg-white rounded-2xl overflow-hidden shadow-sm border hover:-translate-y-1 transition duration-300 flex flex-col ${
                    car.is_sold ? 'border-slate-200 opacity-70' : 'border-slate-100 hover:shadow-xl'
                  }`}>
                  {/* 이미지 */}
                  <div className="h-48 relative overflow-hidden bg-slate-100">
                    {car.image_url ? (
                      <img src={car.image_url} alt={car.image_alt || car.car_name}
                        title={car.image_alt || car.car_name} loading="lazy"
                        className={`w-full h-full object-cover transition duration-500 ${!car.is_sold ? 'group-hover:scale-105' : ''}`} />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-slate-200 to-slate-300">
                        <span className="text-slate-400 text-sm">이미지 없음</span>
                      </div>
                    )}
                    {/* 배지 */}
                    {car.is_sold ? (
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                        <span className="bg-red-600 text-white font-black text-lg px-5 py-2 rounded-xl">판매완료</span>
                      </div>
                    ) : (
                      <span className="absolute top-3 left-3 bg-red-600 text-white text-[10px] font-black px-2 py-1 rounded-md shadow-sm">SPECIAL</span>
                    )}
                  </div>

                  {/* 본문 */}
                  <div className="p-5 flex flex-col flex-1">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <h3 className={`font-black text-lg leading-snug ${car.is_sold ? 'text-slate-400' : 'text-slate-900 group-hover:text-blue-600 transition'}`}>
                        {car.car_name}
                      </h3>
                      {car.is_sold && (
                        <span className="flex-shrink-0 bg-red-600 text-white text-[10px] font-black px-2 py-0.5 rounded">판매완료</span>
                      )}
                    </div>
                    {/* SEO 설명 한 줄 */}
                    <p className="text-xs text-slate-500 mb-2">
                      {car.car_name} 장기렌트 월 {fmt(car.monthly_rent_30 || car.monthly_rent)}원 | {car.duration}개월 | 연 {(car.mileage/10000).toFixed(0)}만km
                      {car.monthly_rent_30 ? ' | 선수금 0원 가능' : ''}
                    </p>

                    {car.options && <p className="text-xs text-slate-400 mb-3 line-clamp-1">{car.options}</p>}

                    <div className="mb-3">
                      {car.monthly_rent_30 ? (
                        <div>
                          <p className="text-[10px] text-blue-500 font-bold mb-0.5">선수금 30% 기준</p>
                          <p className="text-3xl font-black text-blue-600">{fmt(car.monthly_rent_30)}<span className="text-base font-bold text-slate-500">원/월</span></p>
                          <p className="text-[11px] text-slate-400 mt-1">선수금 0원 시 {fmt(car.monthly_rent)}원/월</p>
                        </div>
                      ) : (
                        <>
                          <p className="text-xs text-slate-500 mb-0.5">월 렌트료</p>
                          <p className="text-3xl font-black text-blue-600">{fmt(car.monthly_rent)}<span className="text-base font-bold text-slate-500">원/월</span></p>
                        </>
                      )}
                    </div>

                    {car.image_caption && <p className="text-xs text-slate-400 italic mb-2">▲ {car.image_caption}</p>}

                    <div className="flex gap-2 flex-wrap mb-3">
                      <span className="text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded-md font-bold">{car.duration}개월</span>
                      <span className="text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded-md font-bold">연 {(car.mileage / 10000).toFixed(0)}만km</span>
                    </div>

                    <div className="mt-auto pt-3 border-t border-slate-100 flex items-center justify-between">
                      <div>
                        <span className="text-xs text-slate-400">차량가 </span>
                        <span className="text-sm font-bold text-slate-600">{fmt(car.total_price)}원</span>
                      </div>
                      <div className="flex flex-col items-end gap-0.5">
                        <span className="text-[10px] text-slate-400">{new Date(car.created_at).toLocaleDateString('ko-KR')}</span>
                        {!car.is_sold && (
                          <span className="text-xs text-blue-600 font-bold flex items-center gap-1 group-hover:translate-x-1 transition">
                            견적 받기 <ChevronRight className="w-3 h-3" />
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
