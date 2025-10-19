import React from "react";
import AuthForm from "../../components/auth-form";

export const metadata = {
  title: "Đăng ký",
};

export default function SignupPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-800 p-6">
      <AuthForm mode="signup" />
    </div>
  );
}
