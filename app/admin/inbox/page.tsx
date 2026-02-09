'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase'; 
import * as XLSX from 'xlsx';
import { useRouter } from 'next/navigation';
// ✨ [추가] 쓰레기통 아이콘 추가
import { Trash2 } from 'lucide-react';

export default function AdminInbox() {
  const router = useRouter();
  const [list, setList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // ★ [검문소] 관리자 권한 확인
  useEffect(() => {
    const checkAuth = () => {
      const isAdmin = localStorage.getItem('admin_session');
      if (!isAdmin) {
        router.push('/admin/login');
      }
    };
    checkAuth();
  }, [router]);

  // 데이터 불러오기
  useEffect(() => {
    const fetchData = async () => {
      if (!localStorage.getItem('admin_session')) return;

      const { data, error } = await supabase
        .from('customer_consults') 
        .select('*')
        .order('created_at', { ascending: false });

      if (error) console.error(error);
      else setList(data || []);
      
      setLoading(false);
    };

    fetchData();
  }, []);

  // 로그아웃 기능
  const handleLogout = () => {
    localStorage.removeItem('admin_session');
    router.push('/admin/login');
  };

  // 엑셀 저장
  const downloadExcel = () => {
    const worksheet = XLSX.utils.json_to_sheet(list);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "상담내역");
    XLSX.writeFile(workbook, `상담리스트_${new Date().toLocaleDateString()}.xlsx`);
  };

  // ✨ [추가] 삭제 기능 함수
  const handleDelete = async (id: number) => {
    if (!confirm("정말 이 상담 내역을 삭제하시겠습니까?\n(복구할 수 없습니다)")) return;

    try {
      const { error } = await supabase
        .from('customer_consults')
        .delete()
        .eq('id', id);

      if (error) throw error;

      // 삭제 성공 시 화면에서도 즉시 제거 (새로고침 없이)
      setList((prev) => prev.filter((item) => item.id !== id));
      alert("삭제되었습니다.");
    } catch (error: any) {
      alert("삭제 실패: " + error.message);
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center">보안 확인 중...</div>;

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">🔐 관리자 상담 접수함 ({list.length}건)</h1>
        <div className="flex gap-3">
           <button 
            onClick={handleLogout}
            className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg font-bold text-sm transition"
          >
            로그아웃
          </button>
          <button 
            onClick={downloadExcel}
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-bold transition flex items-center gap-2"
          >
            📥 엑셀 저장
          </button>
        </div>
      </div>

      <div className="bg-white shadow rounded-lg overflow-hidden border">
        <table className="w-full text-left text-sm text-gray-700">
          <thead className="bg-gray-100 border-b uppercase font-medium text-gray-500">
            <tr>
              <th className="p-3">상태</th>
              <th className="p-3">날짜</th>
              <th className="p-3">고객명</th>
              <th className="p-3">연락처</th>
              <th className="p-3">차종</th>
              <th className="p-3 w-1/3">문의내용</th>
              <th className="p-3">첨부</th>
              {/* ✨ [추가] 관리 컬럼 */}
              <th className="p-3 text-center">관리</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {list.map((item) => (
              <tr key={item.id} className="hover:bg-gray-50 transition">
                <td className="p-3">
                  <span className={`px-2 py-1 rounded text-xs font-bold ${item.status === '완료' ? 'bg-gray-200 text-gray-600' : 'bg-blue-100 text-blue-600'}`}>
                    {item.status || '신규'}
                  </span>
                </td>
                <td className="p-3 text-gray-500 text-xs">
                  {new Date(item.created_at).toLocaleString()}
                </td>
                <td className="p-3 font-bold text-gray-900">{item.name}</td>
                <td className="p-3">{item.phone}</td>
                <td className="p-3 text-blue-600 font-medium">{item.car_model}</td>
                <td className="p-3 truncate max-w-xs text-gray-600" title={item.memo}>
                  {item.memo}
                </td>
                <td className="p-3">
                  {item.image_url ? (
                    <a 
                      href={item.image_url} 
                      target="_blank" 
                      className="text-xs bg-gray-100 px-2 py-1 rounded border hover:bg-gray-200"
                    >
                      📷 보기
                    </a>
                  ) : (
                    <span className="text-gray-300 text-xs">-</span>
                  )}
                </td>
                {/* ✨ [추가] 삭제 버튼 */}
                <td className="p-3 text-center">
                  <button 
                    onClick={() => handleDelete(item.id)}
                    className="text-red-400 hover:text-red-600 transition p-1 rounded hover:bg-red-50"
                    title="삭제"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}