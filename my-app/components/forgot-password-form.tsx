"use client";

import React, { useState } from "react";
import Link from "next/link";

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);
    
    try {
        // --- PHẦN LOGIC BACKEND SẼ ĐƯỢC THÊM VÀO ĐÂY ---
      // Hiện tại, chúng ta chỉ giả lập một cuộc gọi API thành công
      console.log("Gửi yêu cầu đặt lại mật khẩu cho email:", email);
      
      // Giả lập độ trễ của mạng
      await new Promise(resolve => setTimeout(resolve, 1500));

      // Giả sử backend trả về thành công
      setSuccess("Nếu email của bạn tồn tại trong hệ thống, bạn sẽ nhận được một liên kết để đặt lại mật khẩu.");
      
      // Trong trường hợp backend trả về lỗi (ví dụ: email không tồn tại), bạn sẽ xử lý như sau:
      // throw new Error("Email không được tìm thấy.");

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Đã xảy ra lỗi không xác định.";
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };
  return (
    <div className="w-full max-w-[480px] mx-auto">
      <div className="bg-white/80 dark:bg-gray-900/60 p-6 rounded-lg shadow">
        <h2 className="text-2xl font-semibold mb-4 text-gray-900 dark:text-gray-100 text-center">
          Quên Mật Khẩu
        </h2>
        <p className="text-center text-sm text-gray-600 dark:text-gray-400 mb-6">
          Nhập email của bạn để nhận hướng dẫn đặt lại mật khẩu.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:ring-indigo-500 focus:border-indigo-500 p-2"
              placeholder="you@example.com"
              disabled={loading || !!success}
            />
          </div>

          {error && <div className="text-red-600 text-sm">{error}</div>}
          {success && <div className="text-green-600 text-sm">{success}</div>}

          <div>
            <button
              type="submit"
              disabled={loading || !email || !!success}
              className="w-full inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60"
            >
              {loading ? "Đang gửi..." : "Gửi Hướng Dẫn"}
            </button>
          </div>
        </form>
      </div>
      <div className="mt-4 text-center text-sm text-gray-600 dark:text-gray-300">
        Bạn đã có tài khoản ? 
        <Link href="/login" className="font-semibold text-indigo-600 hover:underline">
          Đăng nhập
        </Link>
      </div>
    </div>
  );
}