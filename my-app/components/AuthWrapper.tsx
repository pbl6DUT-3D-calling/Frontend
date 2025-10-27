"use client";

import { usePathname } from "next/navigation";
import { AuthProvider } from "@/context/authContext";
import ProtectedRoute from "./ProtectedRoute";

interface AuthWrapperProps {
  children: React.ReactNode;
}

//Đinh nghĩa các route công khai không cần xác thực
const publicRoute = ["/login", "/register", "/forgot-password"];

export default function AuthWrapper({ children }: AuthWrapperProps) {
  const pathname = usePathname();
  const isPublicRoute = publicRoute.includes(pathname);

  return (
    <AuthProvider>
      {isPublicRoute ? (
        children
      ) : (
        <ProtectedRoute>{children}</ProtectedRoute>
      )}
    </AuthProvider>
  );
}