"use client";

import React, { 
  createContext, 
  useState, 
  useEffect, 
  useContext, 
  ReactNode // Import ReactNode để gõ kiểu cho 'children'
} from "react";
import { authService } from "../service/authService"; // (Đảm bảo file này là .ts hoặc .js)
import { useRouter } from "next/navigation";

// (Tùy chọn, nhưng nên làm) Định nghĩa kiểu cho User
// Dựa trên object 'user' mà AuthService trả về
type User = {
  user_id: number;
  username: string;
  fullName: string;
  email: string;
  role: 'user' | 'admin';
  avatar: string;
  joinedAt: string;
  bio: any; // (Hoặc một kiểu chi tiết hơn)
} | null; // User có thể là null

// 1. ĐỊNH NGHĨA KIỂU (HÌNH DẠNG) CỦA CONTEXT
// Đây là "hợp đồng" mà Provider hứa sẽ cung cấp
interface IAuthContext {
  user: User;
  isLoggedIn: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<any>;
  register: (userData: any) => Promise<any>;
  logout: () => void;
  googleLogin: () => void;
  handleGoogleCallback: (token: string) => Promise<any>;
}

// 2. TẠO CONTEXT VỚI KIỂU VÀ GIÁ TRỊ MẶC ĐỊNH
// Chúng ta khởi tạo là 'null' và gõ kiểu là 'IAuthContext | null'
export const AuthContext = createContext<IAuthContext | null>(null);

// 3. ĐỊNH NGHĨA KIỂU CHO PROPS CỦA PROVIDER
type AuthProviderProps = {
  children: ReactNode;
}

// 4. TẠO PROVIDER
export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<User>(null); // Gõ kiểu cho state
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const currentUser = authService.getCurrentUser();
    if (currentUser) {
      setUser(currentUser);
    }
    setIsLoading(false);
  }, []);

  // (Các hàm logic của bạn giữ nguyên, chúng đã đúng)
  const login = async (email: any, password: any) => {
    const userData = await authService.login(email, password);
    setUser(userData);
    return userData;
  };

  const register = async (userData: any) => {
    return await authService.register(userData);
  };

  const logout = () => {
    authService.logout();
    setUser(null);
    window.location.href = '/login'; // Chuyển trang sau khi logout
  };

  const googleLogin = () => {
    authService.googleLogin();
  };

  const handleGoogleCallback = async (token: string) => {
    if (!token) throw new Error("Không tìm thấy token Google");
    localStorage.setItem("token", token);
    
    // (Giả sử bạn đã thêm hàm này vào authService.js)
    const userData = await authService.fetchUserProfile(); 
    
    if (userData) {
      setUser(userData);
      return userData;
    } else {
      throw new Error("Không thể lấy thông tin user");
    }
  };

  // 5. Cung cấp giá trị (value) KHỚP VỚI INTERFACE
  const value: IAuthContext = {
    user,
    isLoggedIn: !!user,
    isLoading,
    login,
    register,
    logout,
    googleLogin,
    handleGoogleCallback,
  };

  return (
    <AuthContext.Provider value={value}>
      {!isLoading && children}
    </AuthContext.Provider>
  );
};

// 6. TẠO CUSTOM HOOK (useAuth)
export const useAuth = () => {
  const context = useContext(AuthContext);

  // Kiểm tra runtime (khi chạy) xem có bị dùng bên ngoài Provider không
  if (!context) {
    throw new Error("useAuth phải được dùng bên trong AuthProvider");
  }

  // Sau khi kiểm tra, TypeScript biết 'context' chắc chắn là kiểu 'IAuthContext'
  return context;
};