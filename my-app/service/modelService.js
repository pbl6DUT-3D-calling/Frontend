import axios from "axios";

const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8001";

// Tạo axios instance riêng cho upload (không dùng JSON header)
const createUploadClient = () => {
  const client = axios.create({
    baseURL: BASE_URL,
  });

  // Thêm token vào header
  client.interceptors.request.use(
    (config) => {
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

  return client;
};

export const modelService = {
  /**
   * Upload VRM model file lên server
   * @param {File} file - File VRM cần upload
   * @param {string} thumbnailDataUrl - Data URL của thumbnail (base64)
   * @param {string} name - Tên model do user đặt
   * @returns {Promise} - Promise với response data
   */
  uploadModel: async (file, thumbnailDataUrl, name) => {
    try {
      // 1. Tạo FormData
      const formData = new FormData();
      formData.append("modelFile", file); // Field name phải khớp với backend
      
      // 2. Thêm tên model
      if (name) {
        formData.append("name", name);
      }
      
      // 3. Nếu có thumbnail, có thể gửi kèm (tùy backend)
      // Chuyển dataURL thành blob nếu cần
      if (thumbnailDataUrl && thumbnailDataUrl.startsWith("data:")) {
        const thumbnailBlob = dataURLToBlob(thumbnailDataUrl);
        formData.append("thumbnail", thumbnailBlob, "thumbnail.png");
      }

      // 4. Call API với multipart/form-data
      const uploadClient = createUploadClient();
      const response = await uploadClient.post("/api/model3d/upload", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
        // Theo dõi progress (optional)
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total
          );
          console.log(`Upload progress: ${percentCompleted}%`);
        },
      });

      return response.data;
    } catch (error) {
      console.error("Model upload error:", error);
      throw new Error(
        error.response?.data?.error || 
        error.response?.data?.message || 
        "Upload model thất bại"
      );
    }
  },

  /**
   * Lấy danh sách models của user
   * @returns {Promise} - Promise với danh sách models
   */
  getUserModels: async () => {
    try {
      const uploadClient = createUploadClient();
      const response = await uploadClient.get("/api/model3d/");
      return response.data;
    } catch (error) {
      console.error("Get user models error:", error);
      throw new Error(
        error.response?.data?.error || 
        "Lấy danh sách models thất bại"
      );
    }
  },

  /**
   * Xóa model theo ID
   * @param {string} modelId - ID của model cần xóa
   * @returns {Promise} - Promise với response data
   */
  deleteModel: async (modelId) => {
    try {
      const uploadClient = createUploadClient();
      const response = await uploadClient.delete(`/api/model3d/${modelId}`);
      return response.data;
    } catch (error) {
      console.error("Delete model error:", error);
      throw new Error(
        error.response?.data?.error || 
        error.response?.data?.message || 
        "Xóa model thất bại"
      );
    }
  },
};

/**
 * Helper: Chuyển Data URL (base64) thành Blob
 */
function dataURLToBlob(dataURL) {
  const parts = dataURL.split(",");
  const mimeMatch = parts[0].match(/:(.*?);/);
  const mime = mimeMatch ? mimeMatch[1] : "image/png";
  const bstr = atob(parts[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new Blob([u8arr], { type: mime });
}
