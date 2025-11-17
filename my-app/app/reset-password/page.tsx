"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useAuth } from "@/context/authContext"; // Import hook useAuth
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

// Component con để xử lý logic, vì useSearchParams cần Suspense
function ResetPasswordComponent() {
    console.log("!!! [ResetPasswordComponent] ĐÃ RENDER");
  const { resetPassword } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [token, setToken] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Lấy token từ URL khi component được tải
  useEffect(() => {
    console.log("DAY LAG GIIIIIIII");
    const tokenFromUrl = searchParams.get("token");
    if (tokenFromUrl) {
      setToken(tokenFromUrl);
    } else {
      setError("Token không hợp lệ hoặc bị thiếu. Vui lòng thử lại từ email.");
    }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    // 1. Kiểm tra mật khẩu khớp
    if (password !== confirmPassword) {
      setError("Mật khẩu không khớp.");
      return;
    }

    // 2. Kiểm tra token có tồn tại
    if (!token) {
      setError("Token không hợp lệ. Vui lòng thử lại từ email.");
      return;
    }

    setLoading(true);
    try {
   
      // 3. Gọi hàm từ AuthContext
      const data = await resetPassword(token, password);
      setSuccessMessage(data.message || "Mật khẩu đã được đặt lại thành công!");
    } catch (err: any) {
      setError(err.message || "Đã xảy ra lỗi. Vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100 dark:bg-gray-900">
      <div className="w-full max-w-md mx-auto bg-white dark:bg-gray-800 p-8 rounded-lg shadow-md">
        <h2 className="text-2xl font-semibold mb-6 text-gray-900 dark:text-gray-100 text-center">
          Đặt lại Mật khẩu
        </h2>

        {/* Nếu thành công, chỉ hiển thị thông báo */}
        {successMessage ? (
          <div className="text-center">
            <p className="text-green-600 dark:text-green-400">{successMessage}</p>
            <Link href="/login" className="mt-4 inline-block text-indigo-600 hover:underline">
              Đi đến trang Đăng nhập
            </Link>
          </div>
        ) : (
          // Nếu chưa, hiển thị form
          <form onSubmit={handleSubmit} className="space-y-4">
            <p className="text-sm text-gray-600 dark:text-gray-300">
              Nhập mật khẩu mới của bạn.
            </p>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">Mật khẩu mới</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm focus:ring-indigo-500 focus:border-indigo-500 p-2"
                placeholder="Nhập mật khẩu mới"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">Xác nhận mật khẩu</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm focus:ring-indigo-500 focus:border-indigo-500 p-2"
                placeholder="Nhập lại mật khẩu"
              />
            </div>

            {error && <div className="text-red-600 text-sm">{error}</div>}

            <div>
              <button
                type="submit"
                disabled={loading || !token} // Vô hiệu hóa nếu đang tải hoặc không có token
                className="w-full inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60"
              >
                {loading ? "Đang lưu..." : "Lưu mật khẩu mới"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

// Bọc component bằng Suspense vì useSearchParams yêu cầu
export default function ResetPasswordPage() {
//Sửa Trang Đặt lại Mật khẩu 
  return (
    <Suspense fallback={<div>Đang tải...</div>}>
      <ResetPasswordComponent />
    </Suspense>
  );
}

