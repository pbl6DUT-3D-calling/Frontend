import axios from "axios";
const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8001";
const apiClient = axios.create({
  baseURL: BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});
apiClient.interceptors.request.use(
  (config) => {
    // Chỉ chạy ở phía client (trình duyệt)
    if (typeof window !== "undefined") {
      const token = localStorage.getItem("token");
      if (token) {
        config.headers["Authorization"] = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (typeof window !== "undefined" && error.response && error.response.status === 401) {
      // Chỉ thực hiện nếu không phải là request login (tránh vòng lặp vô hạn)
      if (!error.config.url.endsWith('/auth/login')) {
        authService.logout(); // Gọi hàm logout để xóa localStorage
        window.location.href = '/login'; // Dùng window.location để đảm bảo refresh toàn bộ context
      }
    }
    return Promise.reject(error);
  }
);

const normalizeUserData = (user) => {
  return {
    user_id: user.user_id,
    username: user.username,
    fullName: user.full_name || user.fullName, // Hỗ trợ cả hai kiểu trả về
    email: user.email,
    role: user.role,
    avatar: user.avatar_url || user.avatar, // Hỗ trợ cả hai kiểu trả về
    joinedAt: user.created_at || user.joinedAt, // Hỗ trợ cả hai kiểu trả về
    bio: user.bio || null,
  };
};

const saveTokenAndData = (data) => {
  const { accessToken, user } = data;

  if (!accessToken || !user) {
    throw new Error("Dữ liệu trả về không hợp lệ từ saveTokenAndData");
  }

  localStorage.setItem("token", accessToken);
  const normalizedUser = normalizeUserData(user);
  localStorage.setItem("data", JSON.stringify(normalizedUser));
  
  return normalizedUser; // Trả về thông tin user đã chuẩn hóa
}


export const authService = {

  login: async (email, password) => {
    try {
      const response = await apiClient.post("/auth/login", { email, password });
      return saveTokenAndData(response.data); // Lưu và trả về user đã chuẩn hóa
    } catch (error) {
      throw new Error(error.response?.data?.error || "Đăng nhập thất bại");
    }
  },

  register: async (userData) => {
    try {
      const response = await apiClient.post("/auth/register", userData);
      return response.data; // Trả về { message: "..." }
    } catch (error) {
      throw new Error(error.response?.data?.error || "Đăng ký thất bại");
    }
  },
  
  logout: () => {
    localStorage.removeItem("token");
    localStorage.removeItem("data");
  },


  getCurrentUser: () => {
    try {
      if (typeof window !== "undefined") {
        const userData = localStorage.getItem("data");
        return userData ? JSON.parse(userData) : null;
      }
      return null;
    } catch (e) {
      return null;
    }
  },
  
  googleLogin: () => {
    window.location.href = `${BASE_URL}/auth/google`;
  },
  fetchUserProfile: async () => {
     try {
       const response = await apiClient.get("/api/me"); 
       const normalizedUser = normalizeUserData(response.data);
       localStorage.setItem("data", JSON.stringify(normalizedUser));
       return normalizedUser; // Trả về user đã chuẩn hóa

     } catch (error) {
       console.error("Fetch User Profile Error:", error);
       // Ném lỗi ra để AuthContext bắt
       throw new Error(error.response?.data?.error || "Không thể lấy thông tin người dùng.");
     }
  },
  forgotPassword: async (email) => {
    try {
      const response = await apiClient.post("/auth/forgot-password", { email });
      return response.data; // Trả về { message: "..." }
    } catch (error) {
      throw new Error(error.response?.data?.error || "Gửi email thất bại");
    }
  },
  resetPassword: async (token, newPassword) => {
    try {
      const response = await apiClient.post("/auth/reset-password", { token, newPassword });
      return response.data; // Trả về { message: "..." }
    } catch (error) {
      throw new Error(error.response?.data?.error || "Đặt lại mật khẩu thất bại");
    }
  }
};
export default apiClient;

