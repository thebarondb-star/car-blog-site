'use client';



import { useState } from 'react';

import { useRouter } from 'next/navigation';

import { Lock } from 'lucide-react';



export default function AdminLogin() {

  const router = useRouter();

  const [password, setPassword] = useState('');



  const handleLogin = (e: React.FormEvent) => {

    e.preventDefault();



    // ★ 여기에 원하는 비밀번호를 설정하세요! (현재: "1234")

    if (password === 'dlrns6632!') { 

      // 비밀번호가 맞으면 '입장권'을 브라우저에 저장

      localStorage.setItem('admin_session', 'true');

      alert('관리자님 환영합니다.');

      router.push('/admin/inbox'); // 상담함으로 이동

    } else {

      alert('비밀번호가 틀렸습니다.');

    }

  };



  return (

    <div className="min-h-screen flex items-center justify-center bg-gray-100">

      <div className="bg-white p-8 rounded-xl shadow-lg w-full max-w-sm">

        <div className="flex justify-center mb-6">

          <div className="bg-blue-100 p-3 rounded-full">

            <Lock className="w-8 h-8 text-blue-600" />

          </div>

        </div>

        <h1 className="text-2xl font-bold text-center mb-6 text-gray-800">관리자 접속</h1>

        

        <form onSubmit={handleLogin} className="space-y-4">

          <div>

            <label className="block text-sm font-medium text-gray-700 mb-1">비밀번호</label>

            <input 

              type="password" 

              value={password}

              onChange={(e) => setPassword(e.target.value)}

              className="w-full border p-3 rounded-lg outline-none focus:border-blue-500"

              placeholder="비밀번호 입력"

            />

          </div>

          <button 

            type="submit" 

            className="w-full bg-blue-600 text-white font-bold py-3 rounded-lg hover:bg-blue-700 transition"

          >

            접속하기

          </button>

        </form>

      </div>

    </div>

  );

}