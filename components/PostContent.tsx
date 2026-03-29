"use client";

import { useState } from "react";
import { X } from "lucide-react";

export default function PostContent({ content }: { content: string }) {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  // content 안에 포함된 <script> 태그 제거 (hydration 충돌 방지)
  const safeContent = content.replace(/<script[\s\S]*?<\/script>/gi, '');

  // 본문 두 번째 H2 이후에 CTA 버튼 삽입
  const CTA_HTML = `<div style="margin:2.5rem 0;padding:1.5rem;background:linear-gradient(135deg,#eff6ff,#dbeafe);border:2px solid #bfdbfe;border-radius:1rem;text-align:center;">
  <p style="font-size:0.875rem;color:#1d4ed8;font-weight:600;margin:0 0 0.75rem;">지금 가지고 계신 견적서, 정말 최저가일까요?</p>
  <a href="/consult" style="display:inline-flex;align-items:center;gap:0.5rem;background:#2563eb;color:white;font-weight:800;padding:0.875rem 1.75rem;border-radius:0.75rem;text-decoration:none;font-size:0.95rem;box-shadow:0 4px 15px rgba(37,99,235,0.3);">
    지금 가지고 계신 견적서보다 무조건 싼 견적 받기 →
  </a>
</div>`;

  let h2Count = 0;
  const contentWithCta = safeContent.replace(/<\/h2>/gi, () => {
    h2Count++;
    return h2Count === 2 ? `</h2>${CTA_HTML}` : '</h2>';
  });

  // ✅ 개선된 클릭 감지 (이벤트 위임 방식)
  // 본문 어느 곳을 클릭하든, 그게 '이미지'라면 확대 기능을 실행합니다.
  const handleContentClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    if (target.tagName === "IMG") {
      const img = target as HTMLImageElement;
      setSelectedImage(img.src);
    }
  };

  return (
    <>
      {/* 본문 내용 */}
      <div 
        className="prose prose-lg max-w-none text-slate-700 leading-8 prose-img:cursor-zoom-in prose-img:rounded-xl prose-img:shadow-md hover:prose-img:opacity-95 transition-opacity"
        dangerouslySetInnerHTML={{ __html: contentWithCta }}
        onClick={handleContentClick} // ✅ 여기서 클릭 이벤트를 확실하게 잡습니다.
      />

      {/* 이미지 확대 모달 (라이트박스) */}
      {selectedImage && (
        <div 
          className="fixed inset-0 z-[9999] bg-black/95 flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setSelectedImage(null)} // 배경 클릭 시 닫기
        >
          {/* 닫기 버튼 */}
          <button 
            className="absolute top-6 right-6 text-white/80 hover:text-white bg-black/50 rounded-full p-2 transition"
          >
            <X className="w-8 h-8" />
          </button>

          {/* 확대된 이미지 */}
          <img 
            src={selectedImage} 
            alt="원본 이미지" 
            // ✅ 화면에 꽉 차게 보여주되(contain), 원본 비율은 유지합니다.
            className="max-w-[95vw] max-h-[95vh] object-contain shadow-2xl animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()} // 이미지 눌렀을 땐 안 닫힘
          />
        </div>
      )}
    </>
  );
}