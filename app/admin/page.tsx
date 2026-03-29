"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase-browser";
import { supabase } from "@/lib/supabase";
import {
  PenLine, FileEdit, Archive, MessageSquare,
  LogOut, ChevronRight, Loader2, CheckCircle, Clock, Zap, Car
} from "lucide-react";

export default function AdminDashboard() {
  const router = useRouter();
  const [userEmail, setUserEmail] = useState("");
  const [stats, setStats] = useState({
    published: 0,
    drafts: 0,
    consults: 0,
    newConsults: 0,
  });
  const [recentPosts, setRecentPosts] = useState<any[]>([]);
  const [carListings, setCarListings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  function fmt(n: number) {
    return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  }

  useEffect(() => {
    const init = async () => {
      const auth = createClient();
      const { data: { user } } = await auth.auth.getUser();
      if (!user) { router.replace("/admin/login"); return; }
      setUserEmail(user.email || "");

      const [
        { count: published },
        { count: drafts },
        { count: consults },
        { count: newConsults },
        { data: recent },
        { data: cars },
      ] = await Promise.all([
        supabase.from("posts").select("*", { count: "exact", head: true }).eq("is_published", true),
        supabase.from("posts").select("*", { count: "exact", head: true }).eq("is_published", false),
        supabase.from("customer_consults").select("*", { count: "exact", head: true }),
        supabase.from("customer_consults").select("*", { count: "exact", head: true }).eq("status", "신규"),
        supabase.from("posts").select("id,title,category,is_published,date_text").order("id", { ascending: false }).limit(5),
        supabase.from("car_listings").select("id,car_name,monthly_rent,is_active,is_sold,created_at").order("id", { ascending: false }).limit(10),
      ]);

      setStats({ published: published || 0, drafts: drafts || 0, consults: consults || 0, newConsults: newConsults || 0 });
      setRecentPosts(recent || []);
      setCarListings(cars || []);
      setLoading(false);
    };
    init();
  }, [router]);

  const handleLogout = async () => {
    const auth = createClient();
    await auth.auth.signOut();
    router.push("/admin/login");
    router.refresh();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
      </div>
    );
  }

  const menuItems = [
    {
      href: "/admin/car-write",
      icon: <Car className="w-7 h-7" />,
      label: "특가차량 등록",
      desc: "월렌트 특가 차량을 등록합니다",
      color: "bg-rose-600 hover:bg-rose-700",
      badge: null,
    },
    {
      href: "/admin/write",
      icon: <PenLine className="w-7 h-7" />,
      label: "새 글 쓰기",
      desc: "블로그 글을 새로 작성합니다",
      color: "bg-blue-600 hover:bg-blue-700",
      badge: null,
    },
    {
      href: "/admin/imsi",
      icon: <Archive className="w-7 h-7" />,
      label: "임시저장함",
      desc: "작성 중인 글을 이어서 씁니다",
      color: "bg-amber-500 hover:bg-amber-600",
      badge: stats.drafts > 0 ? stats.drafts : null,
    },
    {
      href: "/admin/inbox",
      icon: <MessageSquare className="w-7 h-7" />,
      label: "상담 접수함",
      desc: "고객 견적 문의를 확인합니다",
      color: "bg-emerald-600 hover:bg-emerald-700",
      badge: stats.newConsults > 0 ? stats.newConsults : null,
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      {/* 헤더 */}
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-black text-slate-900">Dr.Rent 관리자</h1>
          <p className="text-xs text-slate-400 mt-0.5">{userEmail}</p>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/" className="text-sm text-slate-500 hover:text-slate-900 transition font-medium">
            블로그 보기
          </Link>
          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-red-600 transition font-medium"
          >
            <LogOut className="w-4 h-4" /> 로그아웃
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8">

        {/* 통계 카드 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: "발행된 글", value: stats.published, icon: <CheckCircle className="w-5 h-5 text-blue-500" />, sub: "전체 발행" },
            { label: "임시저장", value: stats.drafts, icon: <Clock className="w-5 h-5 text-amber-500" />, sub: "작성 중" },
            { label: "전체 상담", value: stats.consults, icon: <MessageSquare className="w-5 h-5 text-emerald-500" />, sub: "누적" },
            { label: "신규 상담", value: stats.newConsults, icon: <Zap className="w-5 h-5 text-red-500" />, sub: "미처리" },
          ].map((s) => (
            <div key={s.label} className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-500">{s.label}</span>
                {s.icon}
              </div>
              <p className="text-3xl font-black text-slate-900">{s.value}</p>
              <p className="text-xs text-slate-400 mt-1">{s.sub}</p>
            </div>
          ))}
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {menuItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`${item.color} text-white rounded-2xl p-6 flex flex-col gap-3 transition shadow-sm relative overflow-hidden group`}
            >
              {item.badge && (
                <span className="absolute top-4 right-4 bg-white/30 text-white text-xs font-black px-2 py-0.5 rounded-full">
                  {item.badge}
                </span>
              )}
              <div className="bg-white/20 w-12 h-12 rounded-xl flex items-center justify-center">
                {item.icon}
              </div>
              <div>
                <p className="font-black text-lg">{item.label}</p>
                <p className="text-white/70 text-sm mt-0.5">{item.desc}</p>
              </div>
              <ChevronRight className="w-5 h-5 text-white/50 mt-auto group-hover:translate-x-1 transition" />
            </Link>
          ))}
        </div>

        {/* 최근 발행 글 */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden mb-6">
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
            <h2 className="font-bold text-slate-900">최근 발행 글</h2>
            <Link href="/admin/write" className="text-xs text-blue-600 font-bold hover:underline flex items-center gap-1">
              <PenLine className="w-3 h-3" /> 새 글 쓰기
            </Link>
          </div>
          <div className="divide-y divide-slate-50">
            {recentPosts.map((post) => (
              <div key={post.id} className="flex items-center justify-between px-6 py-4 hover:bg-slate-50 transition">
                <div className="flex items-center gap-3 min-w-0">
                  <span className={`flex-shrink-0 text-xs font-bold px-2 py-0.5 rounded-full ${post.is_published ? "bg-green-50 text-green-700" : "bg-amber-50 text-amber-700"}`}>
                    {post.is_published ? "발행" : "임시"}
                  </span>
                  <span className="text-xs text-slate-400 flex-shrink-0">[{post.category}]</span>
                  <p className="text-sm font-medium text-slate-800 truncate">{post.title}</p>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0 ml-4">
                  <span className="text-xs text-slate-400">{post.date_text}</span>
                  <Link href={`/admin/edit/${post.id}`} className="flex items-center gap-1 text-xs text-slate-400 hover:text-blue-600 transition font-medium">
                    <FileEdit className="w-3.5 h-3.5" /> 수정
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 특가차량 목록 */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
            <h2 className="font-bold text-slate-900 flex items-center gap-2">
              <Car className="w-4 h-4 text-rose-600" /> 특가차량 목록
            </h2>
            <Link href="/admin/car-write" className="text-xs text-rose-600 font-bold hover:underline flex items-center gap-1">
              <Car className="w-3 h-3" /> 새 차량 등록
            </Link>
          </div>
          {carListings.length === 0 ? (
            <div className="px-6 py-10 text-center text-slate-400 text-sm">등록된 특가차량이 없습니다.</div>
          ) : (
            <div className="divide-y divide-slate-50">
              {carListings.map((car) => (
                <div key={car.id} className="flex items-center justify-between px-6 py-3 hover:bg-slate-50 transition">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className={`flex-shrink-0 text-xs font-bold px-2 py-0.5 rounded-full ${
                      car.is_sold ? "bg-red-100 text-red-700" :
                      car.is_active ? "bg-green-50 text-green-700" : "bg-slate-100 text-slate-500"
                    }`}>
                      {car.is_sold ? "판매완료" : car.is_active ? "노출중" : "비활성"}
                    </span>
                    <p className="text-sm font-medium text-slate-800 truncate">{car.car_name}</p>
                    <span className="text-xs text-blue-600 font-bold flex-shrink-0">월 {fmt(car.monthly_rent)}원</span>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0 ml-4">
                    <span className="text-xs text-slate-400">
                      {new Date(car.created_at).toLocaleDateString('ko-KR')}
                    </span>
                    <Link href={`/admin/car-edit/${car.id}`} className="flex items-center gap-1 text-xs text-slate-400 hover:text-rose-600 transition font-medium">
                      <FileEdit className="w-3.5 h-3.5" /> 수정
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
