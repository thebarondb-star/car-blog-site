"use client";

import { useState, useEffect, useRef } from "react";
import { X, ZoomIn } from "lucide-react";

export default function PostContent({ content }: { content: string }) {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  // 본문 내의 이미지들에 클릭 이벤트 자동 연결
  useEffect(() => {
    const images = contentRef.current?.getElementsByTagName("img");
    
    if (images) {
      Array.from(images).forEach((img) => {
        // 커서를 돋보기 모양으로 변경
        img.style.cursor = "zoom-in";
        img.style.transition = "transform 0.2s";
        
        // 클릭 이벤트 리스너 추가
        img.onclick = () => {
          setSelectedImage(img.src);
        };
      });
    }
  }, [content]);

  // 모달 닫기 함수
  const closeModal = () => setSelectedImage(null);

  return (
    <>
      {/* 본문 내용 표시 (HTML 렌더링) */}
      <div 
        ref={contentRef}
        className="prose prose-lg max-w-none text-slate-700 leading-8 prose-img:rounded-xl prose-img:shadow-md hover:prose-img:opacity-95 transition-opacity"
        dangerouslySetInnerHTML={{ __html: content }} 
      />

      {/* 이미지 확대 모달 (라이트박스) */}
      {selectedImage && (
        <div 
          className="fixed inset-0 z-[9999] bg-black/90 flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={closeModal} // 배경 클릭 시 닫기
        >
          {/* 닫기 버튼 */}
          <button 
            onClick={closeModal}
            className="absolute top-6 right-6 text-white/70 hover:text-white transition bg-black/50 rounded-full p-2"
          >
            <X className="w-8 h-8" />
          </button>

          {/* 확대된 이미지 */}
          <img 
            src={selectedImage} 
            alt="원본 이미지" 
            className="max-w-full max-h-[90vh] object-contain rounded-md shadow-2xl scale-100 animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()} // 이미지 클릭 시에는 닫히지 않음
          />
        </div>
      )}
    </>
  );
}