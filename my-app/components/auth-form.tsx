"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth} from "../context/authContext";
type Props = {
  mode: "login" | "register";
};

/**
 * AuthForm
 * A reusable client-side authentication form used by the /login and /register pages.
 *
 * Developer notes (backend integration):
 * - Login endpoint: POST /api/auth/login
 *   Request JSON: { email: string, password: string }
 *   Expected success response: { ok: true, token?: string, user?: { id, name, email } }
 *   Expected error response: { ok: false, error: string }
 *
 * - Signup endpoint: POST /api/auth/signup
 *   Request JSON: { name: string, email: string, password: string }
 *   Expected success response: { ok: true, user: { id, name, email } }
 *   Expected error response: { ok: false, error: string }
 *
 * Adjust endpoints if your backend uses different paths (for example: /api/login).
 * The component sends JSON and expects JSON in response.
 */

export default function AuthForm({ mode }: Props) {
  const {login, register} = useAuth();
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmError, setConfirmError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const MIN_PASSWORD_LENGTH = 6;
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setConfirmError(null);

    try {
      if(mode === "login") {
        await login(email, password);
        router.push("/");
      } else {
        if (password !== confirmPassword) {
          setConfirmError("Mat khau khoong khop");
          setLoading(false);
          return;
        }

        const userData = {
          fullName: fullName,
          username: name,
          email: email,
          password: password,
        };

        await register(userData);
        alert("Đăng ký thành công! Vui lòng đăng nhập.");
        router.push("/login");
      }
    } catch (err) {
      // Hiển thị lỗi từ backend (nếu có) hoặc lỗi chung
      const errorMessage = err instanceof Error ? err.message : "Đã xảy ra lỗi không xác định";
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };



  return (
    <div className="w-full max-w-[480px] mx-auto bg-white/80 dark:bg-gray-900/60 p-6 rounded-lg shadow">
      <h2 className="text-2xl font-semibold mb-4 text-gray-900 dark:text-gray-100 text-center">
        {mode === "login" ? "Đăng nhập" : "Đăng ký"}
      </h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        {mode === "register" && (
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">Họ và tên</label>
            <input
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:ring-indigo-500 focus:border-indigo-500 p-2"
              placeholder="Nguyễn Văn A"
            />
          </div>
        )}
        {mode === "register" && (
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">Tên người dùng</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:ring-indigo-500 focus:border-indigo-500 p-2"
              placeholder="nguyenvana"
            />
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:ring-indigo-500 focus:border-indigo-500 p-2"
            placeholder="you@example.com"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">Mật khẩu</label>
          <div className="mt-1 flex items-center">
            <input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => {
                const v = e.target.value;
                setPassword(v);
                if (v.length < MIN_PASSWORD_LENGTH) {
                  setPasswordError(`Mật khẩu phải chứa ít nhất ${MIN_PASSWORD_LENGTH} kí tự`);
                } else {
                  setPasswordError(null);
                }

                // if user already typed a confirmation, re-check match
                if (confirmPassword.length > 0) {
                  if (v !== confirmPassword) setConfirmError("Mật khẩu không khớp");
                  else setConfirmError(null);
                }
              }}
              required
              minLength={MIN_PASSWORD_LENGTH}
              className="flex-1 block w-full rounded-md border-gray-300 shadow-sm focus:ring-indigo-500 focus:border-indigo-500 p-2"
              placeholder="Your password"
            />
            <button
              type="button"
              onClick={() => setShowPassword((s) => !s)}
              className="ml-2 text-sm text-gray-600 hover:text-gray-900 dark:text-gray-300"
              aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
            >
              {showPassword ? "Ẩn" : "Hiện"}
            </button>
          </div>
          {passwordError && <div className="text-red-600 text-sm mt-1">{passwordError}</div>}
        </div>

        {mode === "register" && (
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">Nhập lại mật khẩu</label>
            <div className="mt-1 flex items-center">
              <input
                type={showConfirmPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => {
                  const v = e.target.value;
                  setConfirmPassword(v);
                  if (v.length > 0 && v !== password) setConfirmError("Mật khẩu không khớp");
                  else setConfirmError(null);
                }}
                required
                minLength={MIN_PASSWORD_LENGTH}
                className="flex-1 block w-full rounded-md border-gray-300 shadow-sm focus:ring-indigo-500 focus:border-indigo-500 p-2"
                placeholder="Your password confirmation"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword((s) => !s)}
                className="ml-2 text-sm text-gray-600 hover:text-gray-900 dark:text-gray-300"
                aria-label={showConfirmPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
              >
                {showConfirmPassword ? "Ẩn" : "Hiện"}
              </button>
            </div>
            {confirmError && <div className="text-red-600 text-sm mt-1">{confirmError}</div>}
          </div>
        )}

        {error && <div className="text-red-600 text-sm">{error}</div>}

        <div>
          <button
            type="submit"
            disabled={
              loading ||
              (mode === "register" && (
                !!passwordError || !!confirmError || password.length < MIN_PASSWORD_LENGTH
              ))
            }
            className="w-full inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60"
          >
            {loading ? "Đang xử lý..." : mode === "login" ? "Đăng nhập" : "Đăng ký"}
          </button>
        </div>
      </form>
      
      
      <div className="mt-4 text-sm text-gray-600 dark:text-gray-300">
        {mode === "login" ? (
          <>
            Chưa có tài khoản? <Link href="/register" className="text-indigo-600 hover:underline">Đăng ký</Link>
          </>
        ) : (
          <>
            Đã có tài khoản? <Link href="/login" className="text-indigo-600 hover:underline">Đăng nhập</Link>
          </>
        )}
      </div>
    </div>
  );
}
