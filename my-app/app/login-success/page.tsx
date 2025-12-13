"use client";

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/authContext';

function GoogleCallbackComponent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { handleGoogleCallback } = useAuth();
  const [error, setError] = useState<string | null>(null);
  // === THÊM STATE NÀY ===
  const [isProcessing, setIsProcessing] = useState(true); // Bắt đầu là đang xử lý

  useEffect(() => {
    console.log("Day la trang login-success")
    // === THÊM KIỂM TRA NÀY ===
    // Nếu không còn đang xử lý nữa thì không làm gì cả
    if (!isProcessing) return;

    const token = searchParams.get('token');
    const queryError = searchParams.get('error');

    if (queryError) {
      setError('Đăng nhập Google thất bại. Vui lòng thử lại.');
      setIsProcessing(false); // <= Đánh dấu đã xử lý xong
      setTimeout(() => router.push('/login'), 3000);
      return;
    }

    if (token) {
      handleGoogleCallback(token)
        .then(() => {
          // Thành công!
          setIsProcessing(false); // <= Đánh dấu đã xử lý xong
          router.push('/');
        })
        .catch((err) => {
          setError(err.message || 'Lỗi xác thực token');
          setIsProcessing(false); // <= Đánh dấu đã xử lý xong
          setTimeout(() => router.push('/login'), 3000);
        });
    } else {
      setError('Không tìm thấy token. Đang chuyển hướng...');
      setIsProcessing(false); // <= Đánh dấu đã xử lý xong
      setTimeout(() => router.push('/login'), 3000);
    }

  // Bỏ 'router' và 'handleGoogleCallback' ra khỏi dependencies
  // Vì chúng thường không thay đổi và có thể gây loop nếu không ổn định
  }, [searchParams, isProcessing]); // Chỉ phụ thuộc vào searchParams và isProcessing

  // (Phần JSX hiển thị lỗi hoặc loading giữ nguyên)
  // ...
  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-red-500">
          <h2>Đã xảy ra lỗi</h2>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div>
        <h2>Đang xử lý đăng nhập...</h2>
        <p>Vui lòng chờ...</p>
      </div>
    </div>
  );
}

// (Phần export default với Suspense giữ nguyên)
export default function GoogleCallbackPage() {
  return (
    <Suspense>
      <GoogleCallbackComponent />
    </Suspense>
  );
}