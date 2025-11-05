"use client";

import React, {
    createContext,
    useState,
    useEffect,
    useContext,
    ReactNode
} from "react";
import { authService } from "../service/authService";
import { useRouter, usePathname } from "next/navigation";

// (Các kiểu User, RegisterData, IAuthContext... của bạn giữ nguyên)
type User = {
    user_id: number;
    username: string;
    fullName: string;
    email: string;
    role: 'user' | 'admin';
    avatar: string;
    joinedAt: string;
    bio: any;
} | null;

interface RegisterData {
    fullName: string;
    username: string;
    email: string;
    password: string;
}

interface IAuthContext {
    user: User;
    isLoggedIn: boolean;
    isLoading: boolean;
    login: (email: string, password: string) => Promise<User>;
    register: (userData: RegisterData) => Promise<any>;
    logout: () => void;
    googleLogin: () => void;
    handleGoogleCallback: (token: string) => Promise<User>;
    forgotPassword: (email: string) => Promise<any>;
    resetPassword: (token: string, newPassword: string) => Promise<any>;
}

export const AuthContext = createContext<IAuthContext | null>(null);

type AuthProviderProps = {
    children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
    const [user, setUser] = useState<User>(null);
    const [isLoading, setIsLoading] = useState(true);
    const router = useRouter();
    const pathname = usePathname();

    useEffect(() => {
        const currentUser = authService.getCurrentUser();
        if (currentUser) {
            setUser(currentUser);
        }
        setIsLoading(false);
    }, []);


    useEffect(() => {
        console.log("--- [Auth Guard Check] ---");
        console.log("Pathname:", pathname);
        console.log("Is Loading:", isLoading);
        console.log("User exists:", !!user);

        if (isLoading || !pathname) {
            console.log("[Auth Guard] Bỏ qua: Đang loading hoặc pathname chưa sẵn sàng.");
            return;
        }

        const publicPaths = [
            '/login',
            '/register',
            '/reset-password',
            '/forgot-password',
            '/login-success'
        ];
        console.log("[Auth Guard] Public Paths:", publicPaths);

        const isPublicPage = publicPaths.some(path => pathname.startsWith(path));
        console.log("[Auth Guard] Trang này có public không?", isPublicPage);

        if (!user && !isPublicPage) {
            console.log("!!! [Auth Guard] QUYẾT ĐỊNH: Chuyển hướng về /login");
            router.push('/login');
        }

       
        if (user && (pathname === '/login' || pathname === '/register')) {
            console.log("!!! [Auth Guard] QUYẾT ĐỊNH: Chuyển hướng về / (Trang chủ)");
            router.push('/');
        }

        console.log("--- [Auth Guard Check] Kết thúc ---");

    }, [isLoading, user, router, pathname]);
    // === KẾT THÚC LOGIC BẢO VỆ ===

    const login = async (email: string, password: string) => {
        const userData = await authService.login(email, password);
        setUser(userData);
        return userData;
    };

    const register = async (userData: RegisterData) => {
        return await authService.register(userData);
    };

    const logout = () => {
        authService.logout();
        setUser(null);
        router.push('/login');
    };

    const googleLogin = () => {
        authService.googleLogin();
    };

    const handleGoogleCallback = async (token: string) => {
        if (!token) throw new Error("Không tìm thấy token Google");

        // SỬA LỖI: Bạn đã quên lưu token ở đây
        localStorage.setItem("token", token);

        const userData = await authService.fetchUserProfile();

        if (userData) {
            setUser(userData);
            return userData;
        } else {
            throw new Error("Không thể lấy thông tin user");
        }
    };

    const forgotPassword = async (email: string) => {
        return authService.forgotPassword(email);
    };

    const resetPassword = async (token: string, newPassword: string) => {
        return authService.resetPassword(token, newPassword);
    };

    // Cung cấp giá trị (value)
    const value: IAuthContext = {
        user,
        isLoggedIn: !!user,
        isLoading,
        login,
        register,
        logout,
        googleLogin,
        handleGoogleCallback,
        forgotPassword,
        resetPassword,
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error("useAuth phải được dùng bên trong AuthProvider");
    }
    return context;
};

