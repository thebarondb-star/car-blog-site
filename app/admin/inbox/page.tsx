'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase'; 
import * as XLSX from 'xlsx';

export default function AdminInbox() {
  const [list, setList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // 1. 데이터 가져오기 (테이블 이름 수정됨: customer_consults)
  useEffect(() => {
    const fetchData = async () => {
      const { data, error } = await supabase
        .from('customer_consults') // ★ 여기가 핵심! 아까 만든 테이블로 변경
        .select('*')
        .order('created_at', { ascending: false }); // 최신순

      if (error) {
        console.error('데이터 에러:', error);
      } else {
        setList(data || []);
      }
      setLoading(false);
    };

    fetchData();
  }, []);

  // 2. 엑셀 다운로드
  const downloadExcel = () => {
    const worksheet = XLSX.utils.json_to_sheet(list);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "상담내역");
    XLSX.writeFile(workbook, `상담리스트_${new Date().toLocaleDateString()}.xlsx`);
  };

  if (loading) return <div className="p-10 text-center">데이터를 불러오는 중...</div>;

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">관리자 상담 접수함 ({list.length}건)</h1>
        <button 
          onClick={downloadExcel}
          className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-bold transition flex items-center gap-2"
        >
          📥 엑셀 다운로드
        </button>
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
              <th className="p-3">첨부사진</th>
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
                      className="inline-flex items-center gap-1 text-xs bg-gray-100 px-2 py-1 rounded border hover:bg-gray-200 hover:text-blue-600 transition"
                    >
                      📷 사진보기
                    </a>
                  ) : (
                    <span className="text-gray-300 text-xs">-</span>
                  )}
                </td>
              </tr>
            ))}
            {list.length === 0 && (
              <tr>
                <td colSpan={7} className="p-10 text-center text-gray-400">
                  아직 접수된 상담 내역이 없습니다.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}