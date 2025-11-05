"use client";

import React, { useState } from "react";
import { useAuth } from "@/context/authContext"; // Import hook useAuth
import Link from "next/link";


export default function ForgotPasswordPage() {
  
  const { forgotPassword } = useAuth(); 
  
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccessMessage(null);
    
    try {
      
      const data = await forgotPassword(email);
      setSuccessMessage(data.message || "Đã gửi email. Vui lòng kiểm tra hộp thư của bạn.");
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
          Quên Mật khẩu   
        </h2>

        {successMessage ? (
          <div className="text-center">
            <p className="text-green-600 dark:text-green-400">{successMessage}</p>
            <Link href="/login" className="mt-4 inline-block text-indigo-600 hover:underline">
              Quay lại Đăng nhập
            </Link>
          </div>
        ) : (
          // Nếu chưa làm j thì hiển thị form
          <form onSubmit={handleSubmit} className="space-y-4">
            <p className="text-sm text-gray-600 dark:text-gray-300">
              Nhập email của bạn. Chúng tôi sẽ gửi một link để đặt lại mật khẩu.
            </p>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200" htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm focus:ring-indigo-500 focus:border-indigo-500 p-2"
                placeholder="you@example.com"
              />
            </div>
            {error && <div className="text-red-600 text-sm">{error}</div>}

            <div>
              <button
                type="submit"
                disabled={loading}
                className="w-full inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60"
              >
                {loading ? "Đang gửi..." : "Gửi link Đặt lại"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

