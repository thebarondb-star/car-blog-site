"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { CheckCircle2, Loader2, Upload, X, ShieldCheck, ExternalLink } from "lucide-react";

export default function ConsultForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string>("");
  const [agreed, setAgreed] = useState(false);
  const [showModal, setShowModal] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    car_model: "",
    memo: ""
  });

  const handleChange = (e: any) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e: any) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setPreview(URL.createObjectURL(selectedFile));
    }
  };

  const clearFile = () => {
    setFile(null);
    setPreview("");
  };

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    if (!agreed) {
      alert("개인정보 수집 및 이용에 동의해주세요.");
      return;
    }
    if (!formData.name || !formData.phone) {
      alert("이름과 연락처는 필수입니다.");
      return;
    }

    setLoading(true);

    try {
      let imageUrl = "";
      if (file) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}_${Math.random().toString(36).substring(2)}.${fileExt}`;
        const filePath = `${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('consult_photos')
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('consult_photos')
          .getPublicUrl(filePath);
          
        imageUrl = publicUrl;
      }

      const { error } = await supabase
        .from('customer_consults')
        .insert([
          { 
            name: formData.name, 
            phone: formData.phone, 
            car_model: formData.car_model, 
            memo: formData.memo,
            image_url: imageUrl, 
            status: '신규',
            agreed_at: new Date().toISOString()
          }
        ]);

      if (error) throw error;

      alert("상담 신청이 완료되었습니다! 담당자가 곧 연락드립니다.");
      router.push("/"); 

    } catch (error: any) {
      console.error("에러 발생:", error);
      alert("전송 중 오류: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto py-12 px-4">
      {/* 헤더 섹션 (수정됨) */}
      <div className="text-center mb-10">
        <h1 className="text-3xl font-bold mb-4 text-slate-900">견적 상담 및 견적 상세 분석</h1>
        
        <div className="bg-blue-50/50 p-6 rounded-2xl mb-6">
          <p className="text-slate-700 font-medium mb-2">
            "같은 차, 다른 렌탈료. 비밀은 <span className="font-bold text-blue-600">'숨은 딜러 수당'</span>에 있습니다."
          </p>
          <p className="text-slate-600 mb-2 leading-relaxed">
            닥터렌트는 수수료 0원을 넘어,<br className="md:hidden" />
            영업사원이 남기는 유통 마진까지 전액<br className="md:hidden" />
            <span className="font-bold text-slate-900"> 돌려드립니다.</span>
          </p>
          <p className="text-blue-600 font-bold mt-4">
            지금 바로 상담신청 남겨보시고 닥터렌트만의 압도적인 차이를 확인하세요.
          </p>
        </div>

        <p className="text-red-500 text-sm font-bold bg-red-50 py-2 px-4 rounded-full inline-block">
          *타사견적서는 필수 업로드 항목이 아닙니다! 단순 견적 문의도 편하게 해주세요~!
        </p>
      </div>

      {/* 폼 섹션 */}
      <div className="bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden">
        <div className="p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* 파일 업로드 */}
            <div>
              <label className="block text-sm font-bold mb-2 text-slate-700">견적서 사진 첨부</label>
              <div className="border-2 border-dashed border-slate-300 rounded-xl p-6 text-center hover:bg-slate-50 transition relative">
                {!preview ? (
                  <>
                    <input type="file" accept="image/*" onChange={handleFileChange} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                    <div className="flex flex-col items-center gap-2 text-slate-400">
                      <Upload className="w-8 h-8" />
                      <span className="text-sm">클릭해서 사진을 선택하세요</span>
                    </div>
                  </>
                ) : (
                  <div className="relative">
                    <img src={preview} alt="견적서 미리보기" className="max-h-48 mx-auto rounded-lg shadow-sm" />
                    <button type="button" onClick={clearFile} className="absolute -top-2 -right-2 bg-red-500 text-white p-1 rounded-full hover:bg-red-600 shadow-md">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* 입력 필드들 */}
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold mb-2 text-slate-700">이름 <span className="text-red-500">*</span></label>
                <input name="name" value={formData.name} onChange={handleChange} className="w-full border border-slate-300 p-3 rounded-xl outline-none focus:border-blue-500" placeholder="홍길동" required />
              </div>
              <div>
                <label className="block text-sm font-bold mb-2 text-slate-700">연락처 <span className="text-red-500">*</span></label>
                <input name="phone" value={formData.phone} onChange={handleChange} className="w-full border border-slate-300 p-3 rounded-xl outline-none focus:border-blue-500" placeholder="010-0000-0000" required />
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold mb-2 text-slate-700">관심 차종</label>
              <input name="car_model" value={formData.car_model} onChange={handleChange} className="w-full border border-slate-300 p-3 rounded-xl outline-none focus:border-blue-500" placeholder="예: 그랜저, 쏘렌토" />
            </div>

            <div>
              <label className="block text-sm font-bold mb-2 text-slate-700">문의 사항</label>
              <textarea name="memo" value={formData.memo} onChange={handleChange} className="w-full border border-slate-300 p-3 rounded-xl h-24 resize-none outline-none focus:border-blue-500" placeholder="궁금한 점을 적어주세요." />
            </div>

            {/* 체크박스 */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
              <div className="flex items-start gap-3">
                <input type="checkbox" id="agree" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} className="mt-1 w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer" required />
                <label htmlFor="agree" className="text-sm text-slate-600 flex-1">
                  <span className="font-bold text-slate-800">[필수]</span> 개인정보 수집 및 이용에 동의합니다.
                  <button type="button" onClick={() => setShowModal(true)} className="ml-2 text-blue-600 hover:text-blue-800 underline inline-flex items-center gap-1 font-medium">
                    약관 보기 <ExternalLink className="w-3 h-3" />
                  </button>
                </label>
              </div>
            </div>

            <button type="submit" disabled={loading || !agreed} className="w-full bg-blue-600 text-white font-bold text-lg py-4 rounded-xl hover:bg-blue-700 transition shadow-lg shadow-blue-500/30 flex items-center justify-center gap-2 disabled:bg-slate-300 disabled:shadow-none disabled:cursor-not-allowed">
              {loading ? <><Loader2 className="animate-spin w-5 h-5" /> 전송 중...</> : <><CheckCircle2 className="w-5 h-5" /> 상담 및 무료 견적 분석 신청하기</>}
            </button>
          </form>
        </div>
      </div>
      
      <div className="mt-8 flex items-center justify-center gap-2 text-slate-400 text-xs">
        <ShieldCheck className="w-4 h-4" /> 입력하신 정보는 상담 목적으로만 안전하게 사용됩니다.
      </div>

      {/* 약관 모달 */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={() => setShowModal(false)}>
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="bg-blue-600 text-white p-6 flex justify-between items-center">
              <h2 className="text-xl font-bold">개인정보 수집 및 이용 동의</h2>
              <button onClick={() => setShowModal(false)} className="hover:bg-blue-700 p-2 rounded-full transition">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto max-h-[calc(80vh-180px)] text-slate-700 leading-relaxed space-y-6">
              <section>
                <h3 className="font-bold text-lg mb-3 text-slate-900">1. 개인정보의 수집 및 이용 목적</h3>
                <p className="text-sm">회사는 수집한 개인정보를 다음의 목적을 위해 활용합니다:</p>
                <ul className="list-disc list-inside text-sm mt-2 space-y-1 ml-2">
                  <li>차량 장기렌트 상담 서비스 제공</li>
                  <li>견적서 분석 및 비교 상담</li>
                  <li>고객 문의사항 응대 및 서비스 개선</li>
                  <li>상담 결과 안내 및 관련 정보 제공</li>
                  <li>서비스 이용에 따른 본인 식별 및 상담 이력 관리</li>
                </ul>
              </section>

              <section>
                <h3 className="font-bold text-lg mb-3 text-slate-900">2. 수집하는 개인정보의 항목</h3>
                <div className="text-sm space-y-2">
                  <div>
                    <span className="font-semibold text-slate-800">필수 항목:</span>
                    <ul className="list-disc list-inside ml-2 mt-1">
                      <li>성명 (이름)</li>
                      <li>연락처 (휴대전화번호)</li>
                    </ul>
                  </div>
                  <div>
                    <span className="font-semibold text-slate-800">선택 항목:</span>
                    <ul className="list-disc list-inside ml-2 mt-1">
                      <li>관심 차종</li>
                      <li>문의 내용 (메모)</li>
                      <li>견적서 사진 (이미지 파일)</li>
                    </ul>
                  </div>
                </div>
              </section>

              <section>
                <h3 className="font-bold text-lg mb-3 text-slate-900">3. 개인정보의 보유 및 이용 기간</h3>
                <p className="text-sm">상담 이력 관리 및 분쟁 해결을 위해 상담 완료 후 1년 동안 보존합니다.</p>
              </section>

              <section>
                <h3 className="font-bold text-lg mb-3 text-slate-900">4. 개인정보의 파기 절차 및 방법</h3>
                <p className="text-sm">목적 달성 후 내부 방침 및 관련 법령에 따라 지체 없이 파기합니다. 전자적 파일은 영구 삭제하며 종이 문서는 분쇄하거나 소각합니다.</p>
              </section>

              <section>
                <h3 className="font-bold text-lg mb-3 text-slate-900">5. 정보주체의 권리 및 행사 방법</h3>
                <p className="text-sm">이용자는 언제든지 개인정보 열람, 정정, 삭제, 처리정지 요구 및 동의 철회를 할 수 있습니다.</p>
              </section>

              <section>
                <h3 className="font-bold text-lg mb-3 text-slate-900">6. 개인정보의 제3자 제공</h3>
                <p className="text-sm">회사는 원칙적으로 개인정보를 제3자에게 제공하지 않습니다. 단, 정보주체의 사전 동의나 법령의 규정이 있는 경우 예외로 합니다.</p>
              </section>

              <section>
                <h3 className="font-bold text-lg mb-3 text-slate-900">7. 개인정보의 안전성 확보 조치</h3>
                <p className="text-sm">직원의 최소화 교육, 접근 제한 시스템 운영, 암호화 등 보안 조치를 취하고 있습니다.</p>
              </section>

              <section>
                <h3 className="font-bold text-lg mb-3 text-slate-900">8. 동의 거부 권리 및 불이익</h3>
                <p className="text-sm">동의를 거부할 권리가 있으나, 필수 항목 동의 거부 시 상담 서비스 이용이 제한될 수 있습니다.</p>
              </section>

              <section>
                <h3 className="font-bold text-lg mb-3 text-slate-900">9. 개인정보 보호책임자</h3>
                <div className="text-sm bg-slate-50 p-4 rounded-lg">
                  <ul className="space-y-1">
                    <li><strong>성명:</strong> [이윤희]</li>
                    <li><strong>연락처:</strong> [010-2139-1256]</li>
                  </ul>
                </div>
              </section>

              <section>
                <h3 className="font-bold text-lg mb-3 text-slate-900">10. 개인정보 처리방침 변경</h3>
                <p className="text-sm">본 방침은 2026년 1월 29일부터 적용됩니다.</p>
              </section>

              <section>
                <h3 className="font-bold text-lg mb-3 text-slate-900">11. 개인정보 침해 관련 상담 및 신고</h3>
                <p className="text-sm">개인정보침해신고센터 (privacy.kisa.or.kr / 118) 등을 통해 신고하실 수 있습니다.</p>
              </section>
            </div>

            <div className="p-4 bg-slate-50 border-t flex justify-end gap-3">
              <button onClick={() => setShowModal(false)} className="px-6 py-2.5 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition font-medium">
                닫기
              </button>
              <button onClick={() => { setAgreed(true); setShowModal(false); }} className="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium">
                동의하고 닫기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}