"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { Car, CheckCircle2, AlertCircle, Loader2, Upload, X } from "lucide-react";

export default function ConsultPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [file, setFile] = useState<File | null>(null); // 파일 저장용
  const [preview, setPreview] = useState<string>("");  // 미리보기

  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    car_model: "", // 차종 부활
    memo: ""       // 문의사항 부활
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
    if (!formData.name || !formData.phone) {
      alert("이름과 연락처는 필수입니다.");
      return;
    }

    setLoading(true);

    try {
      let imageUrl = "";

      // 1. 파일 업로드
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

      // 2. DB 저장
      const { error } = await supabase
        .from('customer_consults')
        .insert([
          { 
            name: formData.name, 
            phone: formData.phone, 
            car_model: formData.car_model, 
            memo: formData.memo,
            image_url: imageUrl, 
            status: '신규'
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
      <div className="text-center mb-10">
        <div className="inline-flex items-center justify-center p-3 bg-blue-100 rounded-full mb-4">
          <Car className="w-8 h-8 text-blue-600" />
        </div>
        <h1 className="text-3xl font-bold mb-2 text-slate-900">무료 견적 상세 분석</h1>
        <p className="text-slate-500">
          받으신 견적서 사진을 올려주시면<br />
          숨어있는 수수료와 거품을 찾아드립니다.
        </p>
      </div>

      <div className="bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden">
        <div className="p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            
            {/* 파일 업로드 (부활) */}
            <div className="mb-8">
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
                    <img src={preview} alt="미리보기" className="max-h-48 mx-auto rounded-lg shadow-sm" />
                    <button type="button" onClick={clearFile} className="absolute -top-2 -right-2 bg-red-500 text-white p-1 rounded-full hover:bg-red-600 shadow-md">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* 기본 정보 */}
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold mb-2 text-slate-700">이름 <span className="text-red-500">*</span></label>
                <input name="name" value={formData.name} onChange={handleChange} className="w-full border border-slate-300 p-3 rounded-xl outline-none focus:border-blue-500" placeholder="홍길동" />
              </div>
              <div>
                <label className="block text-sm font-bold mb-2 text-slate-700">연락처 <span className="text-red-500">*</span></label>
                <input name="phone" value={formData.phone} onChange={handleChange} className="w-full border border-slate-300 p-3 rounded-xl outline-none focus:border-blue-500" placeholder="010-0000-0000" />
              </div>
            </div>

            {/* 차종 (부활) */}
            <div>
              <label className="block text-sm font-bold mb-2 text-slate-700">관심 차종</label>
              <input name="car_model" value={formData.car_model} onChange={handleChange} className="w-full border border-slate-300 p-3 rounded-xl outline-none focus:border-blue-500" placeholder="예: 그랜저, 쏘렌토" />
            </div>

            {/* 문의사항 (부활) */}
            <div>
              <label className="block text-sm font-bold mb-2 text-slate-700">문의 사항</label>
              <textarea name="memo" value={formData.memo} onChange={handleChange} className="w-full border border-slate-300 p-3 rounded-xl h-24 resize-none outline-none focus:border-blue-500" placeholder="궁금한 점을 적어주세요." />
            </div>

            <button type="submit" disabled={loading} className="w-full bg-blue-600 text-white font-bold text-lg py-4 rounded-xl hover:bg-blue-700 transition shadow-lg shadow-blue-500/30 flex items-center justify-center gap-2">
              {loading ? <Loader2 className="animate-spin" /> : <><CheckCircle2 /> 무료 분석 신청하기</>}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}