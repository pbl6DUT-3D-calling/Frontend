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
    <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-900 px-4 sm:px-6 lg:px-8">
        <div className="w-full max-w-md space-y-6 bg-white dark:bg-gray-800 p-8 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700">
            <div className="text-center">
                <h2 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-gray-100">
                    Đặt lại Mật khẩu
                </h2>
            </div>
            {successMessage ? (
                <div className="text-center space-y-4">
                    <div className="rounded-md bg-green-50 p-4">
                        <p className="text-green-700 dark:text-green-400 font-medium">
                            {successMessage}
                        </p>
                    </div>
                    <Link 
                        href="/login" 
                        className="inline-flex items-center text-indigo-600 hover:text-indigo-500 font-semibold transition-colors"
                    >
                        Đi đến trang Đăng nhập &rarr;
                    </Link>
                </div>
            ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                    Vui lòng nhập mật khẩu mới của bạn bên dưới.
                    </p>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Mật khẩu mới
                            </label>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                className="block w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 px-3 py-2 text-sm"
                                placeholder="••••••••"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Xác nhận mật khẩu
                            </label>
                            <input
                                type="password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                required
                                className="block w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 px-3 py-2 text-sm"
                                placeholder="••••••••"
                            />
                        </div>
                    </div>
                    {error && (
                        <div className="rounded-md bg-red-50 p-3">
                            <p className="text-sm text-red-600 text-center font-medium">{error}</p>
                        </div>
                    )}
                    <button
                        type="submit"
                        disabled={loading || !token}
                        className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-70 disabled:cursor-not-allowed transition-colors"
                    >
                        {loading ? (
                            <span className="flex items-center">
                                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                Đang xử lý...
                            </span>
                        ) : "Lưu mật khẩu mới"}
                    </button>
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

