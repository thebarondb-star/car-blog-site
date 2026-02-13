"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { Lock, FileText, Trash2, Download, LogOut, ExternalLink, Loader2 } from "lucide-react";
import * as XLSX from "xlsx-js-style"; // 엑셀 다운로드 라이브러리

export default function InboxPage() {
  const router = useRouter();
  
  // 🔐 보안 및 데이터 상태
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [passwordInput, setPasswordInput] = useState(""); // 처음엔 빈 값으로 시작
  const [authError, setAuthError] = useState("");
  const [consults, setConsults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // 1. 데이터 불러오기
  const fetchConsults = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('customer_consults')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) console.error(error);
    else setConsults(data || []);
    setLoading(false);
  };

  // 2. 로그인 처리
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordInput === "dlrns6632!") {
      setIsAuthenticated(true);
      fetchConsults();
    } else {
      setAuthError("비밀번호가 일치하지 않습니다.");
    }
  };

  // 3. 상태 변경 (드롭다운)
  const updateStatus = async (id: string, newStatus: string) => {
    // 낙관적 업데이트 (화면 먼저 반영)
    setConsults(prev => prev.map(item => item.id === id ? { ...item, status: newStatus } : item));

    const { error } = await supabase
      .from('customer_consults')
      .update({ status: newStatus })
      .eq('id', id);

    if (error) {
      alert("상태 변경 실패: " + error.message);
      fetchConsults(); // 실패 시 롤백을 위해 재조회
    }
  };

  // 4. 삭제 처리
  const deleteConsult = async (id: string) => {
    if (!confirm("정말 삭제하시겠습니까? (복구 불가)")) return;
    
    const { error } = await supabase.from('customer_consults').delete().eq('id', id);
    if (!error) {
      setConsults(prev => prev.filter(item => item.id !== id));
    }
  };

  // 5. 엑셀 다운로드 기능
  const downloadExcel = () => {
    const excelData = consults.map((item) => ({
      '상태': item.status,
      '접수일시': new Date(item.created_at).toLocaleString(),
      '고객명': item.name,
      '연락처': item.phone,
      '관심차종': item.car_model,
      '문의내용': item.memo,
      '첨부파일': item.image_url ? '있음' : '없음'
    }));

    const ws = XLSX.utils.json_to_sheet(excelData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "상담내역");
    
    // 컬럼 너비 설정
    ws['!cols'] = [{ wch: 10 }, { wch: 25 }, { wch: 10 }, { wch: 15 }, { wch: 20 }, { wch: 40 }, { wch: 10 }];

    XLSX.writeFile(wb, `닥터렌트_상담내역_${new Date().toISOString().slice(0,10)}.xlsx`);
  };

  // 🔒 화면 1: 잠금 화면 (비밀번호 입력)
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white max-w-sm w-full p-8 rounded-2xl shadow-xl border border-slate-100 text-center">
          <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-6 text-slate-500">
            <Lock className="w-8 h-8" />
          </div>
          <h1 className="text-xl font-bold text-slate-900 mb-2">관리자 확인</h1>
          <p className="text-slate-500 text-sm mb-6">이 페이지는 관리자만 접근할 수 있습니다.<br/>비밀번호를 입력해주세요.</p>
          
          <form onSubmit={handleLogin} className="space-y-4">
            <input 
              type="password" 
              value={passwordInput}
              onChange={(e) => setPasswordInput(e.target.value)}
              placeholder=""  // ✅ 플레이스홀더 비움
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-slate-900 focus:ring-1 focus:ring-slate-900 outline-none text-center font-bold text-lg"
              autoFocus
              autoComplete="new-password" // 자동완성 방지 시도
            />
            {authError && <p className="text-red-500 text-xs font-bold">{authError}</p>}
            
            <div className="flex gap-2">
              <button type="button" onClick={() => router.push('/')} className="flex-1 py-3 text-sm font-bold text-slate-500 hover:bg-slate-50 rounded-xl border border-slate-200 transition">
                돌아가기
              </button>
              <button type="submit" className="flex-[2] bg-slate-900 text-white font-bold py-3 rounded-xl hover:bg-slate-800 transition flex items-center justify-center gap-2">
                <Lock className="w-4 h-4" /> 확인
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  // 🔓 화면 2: 관리자 리스트 (표 형식)
  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        
        {/* 상단 헤더 */}
        <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            🔐 관리자 상담 접수함 
            <span className="text-slate-400 text-lg">({consults.length}건)</span>
          </h1>
          
          <div className="flex gap-2 w-full md:w-auto">
             <button 
              onClick={() => setIsAuthenticated(false)}
              className="px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700 text-sm font-bold transition flex items-center gap-1"
            >
              <LogOut className="w-4 h-4" /> 로그아웃
            </button>
            <button 
              onClick={downloadExcel}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-bold transition flex items-center gap-1 shadow-sm"
            >
              <Download className="w-4 h-4" /> 엑셀 저장
            </button>
          </div>
        </div>

        {/* 메인 테이블 */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3 w-28 text-center">상태</th>
                  <th className="px-4 py-3 w-40">날짜</th>
                  <th className="px-4 py-3 w-24">고객명</th>
                  <th className="px-4 py-3 w-32">연락처</th>
                  <th className="px-4 py-3 w-32">차종</th>
                  <th className="px-4 py-3 min-w-[200px]">문의내용</th>
                  <th className="px-4 py-3 w-24 text-center">첨부</th>
                  <th className="px-4 py-3 w-16 text-center">관리</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={8} className="py-20 text-center text-slate-400">
                      <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2"/>
                      데이터 불러오는 중...
                    </td>
                  </tr>
                ) : consults.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-20 text-center text-slate-400">
                      접수된 상담 내역이 없습니다.
                    </td>
                  </tr>
                ) : (
                  consults.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                      {/* 1. 상태 (드롭다운) */}
                      <td className="px-4 py-3 text-center">
                        <select
                          value={item.status || '신규'}
                          onChange={(e) => updateStatus(item.id, e.target.value)}
                          className={`
                            px-2 py-1 rounded-md text-xs font-bold border outline-none cursor-pointer appearance-none text-center
                            ${item.status === '다운완료' ? 'bg-slate-100 text-slate-500 border-slate-200' : 
                              item.status === '진행중체크' ? 'bg-blue-50 text-blue-600 border-blue-200' : 
                              'bg-red-50 text-red-600 border-red-200'}
                          `}
                        >
                          <option value="신규">신규</option>
                          <option value="진행중체크">진행중체크</option>
                          <option value="다운완료">다운완료</option>
                        </select>
                      </td>

                      {/* 2. 날짜 */}
                      <td className="px-4 py-3 text-slate-500 text-xs">
                        {new Date(item.created_at).toLocaleString()}
                      </td>

                      {/* 3. 고객명 */}
                      <td className="px-4 py-3 font-bold text-slate-900">
                        {item.name}
                      </td>

                      {/* 4. 연락처 */}
                      <td className="px-4 py-3 text-slate-600 font-mono">
                        <a href={`tel:${item.phone}`} className="hover:text-blue-600 hover:underline">
                          {item.phone}
                        </a>
                      </td>

                      {/* 5. 차종 */}
                      <td className="px-4 py-3 text-blue-600 font-medium">
                        {item.car_model || '-'}
                      </td>

                      {/* 6. 문의내용 (말줄임 처리) */}
                      <td className="px-4 py-3 text-slate-600 max-w-xs truncate" title={item.memo}>
                        {item.memo || '-'}
                      </td>

                      {/* 7. 첨부파일 */}
                      <td className="px-4 py-3 text-center">
                        {item.image_url ? (
                          <a 
                            href={item.image_url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs rounded border border-slate-200 transition"
                          >
                            <FileText className="w-3 h-3" /> 보기
                          </a>
                        ) : (
                          <span className="text-slate-300">-</span>
                        )}
                      </td>

                      {/* 8. 관리 (삭제) */}
                      <td className="px-4 py-3 text-center">
                        <button 
                          onClick={() => deleteConsult(item.id)}
                          className="text-slate-300 hover:text-red-500 transition p-1"
                          title="삭제"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}