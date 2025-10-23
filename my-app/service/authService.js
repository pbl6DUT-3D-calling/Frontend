import axios from "axios";

// ĐỊA CHỈ BACKEND CỦA BẠN
// (Bạn nên đặt nó trong file .env.local là VITE_API_BASE_URL)
const BASE_URL = "http://localhost:8001";

// Tạo một instance axios cho API
const apiClient = axios.create({
  baseURL: BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

/**
 * Tự động đính kèm token vào MỌI request
 * sau khi người dùng đã đăng nhập
 */
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers["Authorization"] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);


/**
 * Hàm lưu token và data user
 */
const saveTokenAndData = (data) => {
  const { accessToken, user } = data;

  if (!accessToken || !user) {
    throw new Error("Dữ liệu trả về không hợp lệ");
  }

  // Bước 9: Lưu accessToken vào localStorage
  localStorage.setItem("token", accessToken);
  // Lưu thông tin user (đã chuẩn hóa) vào localStorage
  localStorage.setItem("data", JSON.stringify(user));
  
  return user; // Trả về thông tin user
}


export const authService = {
  /**
   * Bước 4: Gửi POST request đến .../auth/login
   */
  login: async (email, password) => {
    try {
      // Gửi API call
      const response = await apiClient.post("/auth/login", { email, password });
      
      // Lưu token và trả về data user
      return saveTokenAndData(response.data);

    } catch (error) {
      // Ném lỗi ra để component bắt
      throw new Error(error.response?.data?.error || "Đăng nhập thất bại");
    }
  },

  /**
   * API call cho Đăng ký
   */
  register: async (userData) => {
    try {
      // 'userData' là { name, email, password } từ form
      const response = await apiClient.post("/auth/register", userData);
      return response.data; // Trả về { message: "..." }
    } catch (error) {
      throw new Error(error.response?.data?.error || "Đăng ký thất bại");
    }
  },

  // ... (Các hàm khác như logout, getCurrentUser... ở đây)
  
  logout: () => {
    localStorage.removeItem("token");
    localStorage.removeItem("data");
    // (Không cần gọi API logout, trừ khi bạn muốn)
  },

  getCurrentUser: () => {
    try {
      return JSON.parse(localStorage.getItem("data"));
    } catch (e) {
      return null;
    }
  },
  
  googleLogin: () => {
    // Chuyển hướng trình duyệt đến API backend
    window.location.href = `${BASE_URL}/auth/google`;
  },
  
  fetchUserProfile: async () => {
     // Hàm này dùng sau khi Google login
     try {
       const response = await apiClient.get("/api/me"); 
       localStorage.setItem("data", JSON.stringify(response.data));
       return response.data;
     } catch (error) {
       console.error("Fetch User Profile Error:", error);
       return null;
     }
  }
};

export default apiClient; // Export để các service khác dùng
