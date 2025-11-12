"use client"

import { useState, useRef, useEffect } from "react"
import { Model3D } from "./model-3d" // Import component đã refactor
import { Button } from "@/components/ui/button"
// Import các component UI cho Modal (ví dụ từ shadcn/ui)
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Upload, Plus, CheckCircle, X, Trash2 } from "lucide-react"
import { modelService } from "@/service/modelService" // Import model service
import { AvatarSelector } from "@/components/avatar-selector" // Import AvatarSelector
// Sửa: Đã xóa import tĩnh
// import { VRM, VRMLoaderPlugin } from "@pixiv/three-vrm" 

// Định nghĩa kiểu dữ liệu cho một model
type ModelItem = {
  id: string;
  name: string;
  vrmUrl: string;       // URL (blob) để load trong <Model3D>
  thumbnailUrl: string; // URL (dataURL) để load trong <img>
};

// ==== HÀM TRÍCH XUẤT THUMBNAIL (CORE LOGIC) ====
/**
 * Trích xuất thumbnail được nhúng từ file VRM.
 * Nếu không tìm thấy, trả về một URL placeholder.
 */
async function extractThumbnail(file: File): Promise<string> {
    // Import động loader (chỉ chạy trên client)
    const { GLTFLoader } = await import("three/examples/jsm/loaders/GLTFLoader.js");
    const { VRMLoaderPlugin } = await import("@pixiv/three-vrm");
  
    // Khởi tạo loader
    const loader = new GLTFLoader();
    loader.register((parser: any) => new VRMLoaderPlugin(parser));
  
    // Tạo blob URL cho file
    const fileUrl = URL.createObjectURL(file);
  
    return new Promise((resolve, reject) => {
      loader.load(
        fileUrl,
        (gltf: any) => {
          // Dọn blob sau khi load xong
          URL.revokeObjectURL(fileUrl);
  
          const vrm = gltf.userData.vrm;
          const thumbnailTexture = vrm?.meta?.thumbnailTexture;
  
          if (thumbnailTexture?.image) {
            const image = thumbnailTexture.image as HTMLImageElement | HTMLCanvasElement;
  
            // Lấy kích thước thật, phân biệt 2 loại đối tượng
            const width =
              image instanceof HTMLImageElement ? image.naturalWidth : image.width;
            const height =
              image instanceof HTMLImageElement ? image.naturalHeight : image.height;
  
            // Tạo canvas vẽ ra ảnh thumbnail
            const canvas = document.createElement("canvas");
            canvas.width = width;
            canvas.height = height;
  
            const ctx = canvas.getContext("2d");
            if (ctx) {
              ctx.drawImage(image, 0, 0);
              resolve(canvas.toDataURL("image/png"));
            } else {
              console.warn("Không thể tạo context 2D cho thumbnail");
              resolve("https://placehold.co/150x150/a78bfa/ffffff?text=?");
            }
          } else {
            console.warn("Model không có thumbnail nhúng. Dùng placeholder.");
            resolve("https://placehold.co/150x150/a78bfa/ffffff?text=?");
          }
        },
        undefined,
        (error) => {
          URL.revokeObjectURL(fileUrl);
          console.error("Lỗi khi load VRM để trích xuất thumbnail:", error);
          // Dù lỗi vẫn trả về fallback để không crash app
          resolve("https://placehold.co/150x150/f87171/ffffff?text=Error");
        }
      );
    });
  }

// ==== COMPONENT CHÍNH QUẢN LÝ STUDIO ====
export function VRMStudio() {
  // === State ===
  const [modelList, setModelList] = useState<ModelItem[]>([
    // Thêm một model mặc định
    {
      id: "local-default-1",
      name: "Default Model",
      vrmUrl: "models/7667029464206216702.vrm",
      thumbnailUrl: "https://placehold.co/150x150/06b6d4/ffffff?text=M1"
    }
  ]);
  
  const [currentVrmUrl, setCurrentVrmUrl] = useState<string | null>(modelList[0]?.vrmUrl || null);
  const [selectedInModal, setSelectedInModal] = useState<string | null>(modelList[0]?.id || null);
  const [previewInModalUrl, setPreviewInModalUrl] = useState<string | null>(modelList[0]?.vrmUrl || null);

  const [showModal, setShowModal] = useState(false);
  const [isLoading, setIsLoading] = useState(false); // Loading cho model chính
  const [isUploading, setIsUploading] = useState(false); // Loading khi upload file
  
  // State cho dialog đặt tên model
  const [showNameDialog, setShowNameDialog] = useState(false);
  const [modelName, setModelName] = useState("");
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  
  // State cho dialog xác nhận xóa
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [modelToDelete, setModelToDelete] = useState<{ id: string; name: string } | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const selectTimeoutRef = useRef<NodeJS.Timeout | null>(null); // Debounce timeout

  // === Load models từ server khi component mount ===
  useEffect(() => {
    const loadUserModels = async () => {
      try {
        const response = await modelService.getUserModels();
        console.log("API Response:", response);
        
        // Backend có thể trả về array trực tiếp hoặc object {models: [...]}
        const modelsArray = Array.isArray(response) ? response : (response.models || []);
        
        // Chuyển đổi dữ liệu từ server sang format ModelItem
        const convertedModels: ModelItem[] = modelsArray.map((model: any) => ({
          id: "server-" + (model.id?.toString() || model._id?.toString() || crypto.randomUUID()),
          name: model.name || model.fileName || "Unnamed Model",
          vrmUrl: model.file_url || model.fileUrl || model.url || "",
          thumbnailUrl: model.thumbnail_url || model.thumbnailUrl || "https://placehold.co/150x150/a78bfa/ffffff?text=VRM",
        }));

        console.log("Converted models:", convertedModels);

        // Merge với model mặc định và loại bỏ duplicate
        setModelList(prev => {
          const existingIds = new Set(prev.map(m => m.id));
          const uniqueNewModels = convertedModels.filter(m => !existingIds.has(m.id));
          return [...prev, ...uniqueNewModels];
        });
        
      } catch (error) {
        console.error("Failed to load user models:", error);
        alert("Không thể tải danh sách models. Vui lòng đăng nhập lại.");
      }
    };

    loadUserModels();

    // Cleanup timeout khi unmount
    return () => {
      if (selectTimeoutRef.current) {
        clearTimeout(selectTimeoutRef.current);
      }
    };
  }, []); // Chạy 1 lần khi mount

  // === Handlers ===
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.vrm')) {
      alert('Vui lòng chọn file .vrm')
      return;
    }

    // Lưu file và hiện dialog đặt tên
    setPendingFile(file);
    setModelName(file.name.replace('.vrm', '')); // Tên mặc định từ file
    setShowNameDialog(true);
    
    // Reset file input
    if(fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleConfirmUpload = async () => {
    if (!pendingFile || !modelName.trim()) {
      alert('Vui lòng nhập tên model');
      return;
    }

    setShowNameDialog(false);
    setIsUploading(true);

    try {
      // 1. Trích xuất thumbnail
      const thumbnailUrl = await extractThumbnail(pendingFile);

      // 2. Upload lên server với tên model
      const response = await modelService.uploadModel(pendingFile, thumbnailUrl, modelName.trim());
      
      console.log("Upload success:", response);

      // 3. Tạo Blob URL
      const vrmUrl = URL.createObjectURL(pendingFile);

      // 4. Tạo object model mới
      const firebaseUrl = response.model?.file_url || vrmUrl;
      
      console.log("Firebase URL:", firebaseUrl);
      
      const newModel: ModelItem = {
        id: response.model?.id?.toString() || crypto.randomUUID(),
        name: modelName.trim(),
        vrmUrl: firebaseUrl,
        thumbnailUrl: thumbnailUrl
      };

      // 5. Cập nhật state
      setModelList(prev => [...prev, newModel]);
      
      alert("Upload model thành công!");
      
    } catch (error) {
      console.error("Upload thất bại:", error);
      const errorMessage = error instanceof Error ? error.message : "Upload model thất bại";
      alert(errorMessage);
    } finally {
      setIsUploading(false);
      setPendingFile(null);
      setModelName("");
    }
  };

  const handleCancelUpload = () => {
    setShowNameDialog(false);
    setPendingFile(null);
    setModelName("");
  };

  const handleSelectModel = (model: ModelItem) => {
    setSelectedInModal(model.id);
    setPreviewInModalUrl(model.vrmUrl);
  };
  
  const confirmSelection = () => {
    const selectedModel = modelList.find(m => m.id === selectedInModal);
    if (selectedModel) {
      setIsLoading(true);
      
      // Debug: Log URL để kiểm tra
      console.log("Loading model from:", selectedModel.vrmUrl);
      
      setCurrentVrmUrl(selectedModel.vrmUrl);
      
      // Tắt loading sau 3s
      setTimeout(() => setIsLoading(false), 3000);
    }
    setShowModal(false);
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const handleDeleteModel = (modelId: string, modelName: string) => {
    // Không cho xóa model mặc định
    if (modelId.startsWith("local-")) {
      alert("Không thể xóa model mặc định!");
      return;
    }

    setModelToDelete({ id: modelId, name: modelName });
    setShowDeleteDialog(true);
  };

  const handleConfirmDelete = async () => {
    if (!modelToDelete) return;

    setShowDeleteDialog(false);

    try {
      // Lấy server ID (bỏ prefix "server-")
      const serverId = modelToDelete.id.replace("server-", "");
      
      await modelService.deleteModel(serverId);
      
      // Xóa khỏi state
      setModelList(prev => prev.filter(m => m.id !== modelToDelete.id));
      
      // Nếu đang preview/sử dụng model này thì clear
      if (selectedInModal === modelToDelete.id) {
        setSelectedInModal(null);
        setPreviewInModalUrl(null);
      }
      if (currentVrmUrl === modelList.find(m => m.id === modelToDelete.id)?.vrmUrl) {
        setCurrentVrmUrl(null);
      }

      alert("Xóa model thành công!");
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Xóa model thất bại";
      alert(errorMessage);
      console.error("Delete error:", error);
    } finally {
      setModelToDelete(null);
    }
  };

  const handleCancelDelete = () => {
    setShowDeleteDialog(false);
    setModelToDelete(null);
  };

  return (
    <div className="w-full space-y-4">
      {/* Input file ẩn */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileSelect}
        accept=".vrm"
        className="hidden"
      />

      {/* Tiêu đề và Mô tả */}
      

      {/* Component Model3D đã refactor */}
      {!showModal && (
        <Model3D vrmUrl={currentVrmUrl} height="h-[50vh]" showLoading={isLoading} />
      )}

      {/* Các nút điều khiển */}
      <div className="flex items-center gap-4 justify-center">
        <Button 
          onClick={() => setShowModal(true)} 
          variant="outline" 
          size="lg"
        >
          Thay đổi Model
        </Button>
        <Button onClick={triggerFileInput} size="lg" disabled={isUploading}>
          {isUploading ? (
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
          ) : (
            <Upload className="w-5 h-5 mr-2" />
          )}
          {isUploading ? "Đang xử lý..." : "Tải lên Model Mới"}
        </Button>
      </div>

      {/* Avatar Selector Dialog */}
      <AvatarSelector
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onSelect={(vrmUrl) => {
          // Khi user chọn model, load model đó vào scene chính
          setCurrentVrmUrl(vrmUrl);
          setIsLoading(true);
          setShowModal(false);
          
          // Đợi model load xong rồi tắt loading
          setTimeout(() => {
            setIsLoading(false);
          }, 2000);
        }}
        currentAvatar={currentVrmUrl || undefined}
      />

      {/* Dialog Đặt tên Model khi Upload */}
      <Dialog open={showNameDialog} onOpenChange={setShowNameDialog}>
        <DialogContent className="sm:max-w-md bg-gradient-to-br from-purple-50 to-white border-purple-200 rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-purple-700">
              <Upload className="w-6 h-6 inline mr-2" />
              Đặt tên cho Model
            </DialogTitle>
            <DialogDescription className="text-purple-600">
              Nhập tên cho model VRM của bạn
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-purple-700">
                Tên Model
              </label>
              <input
                type="text"
                value={modelName}
                onChange={(e) => setModelName(e.target.value)}
                placeholder="Nhập tên model..."
                className="w-full px-4 py-3 border-2 border-purple-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent transition-all"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleConfirmUpload();
                  }
                }}
              />
              {pendingFile && (
                <p className="text-xs text-purple-500">
                  File: {pendingFile.name}
                </p>
              )}
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button 
              variant="outline" 
              onClick={handleCancelUpload}
              className="rounded-xl border-2 border-purple-200 hover:bg-purple-50"
            >
              <X className="w-4 h-4 mr-2" />
              Hủy
            </Button>
            <Button 
              onClick={handleConfirmUpload}
              disabled={!modelName.trim()}
              className="rounded-xl bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white"
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              Upload
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Xác nhận Xóa Model */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="sm:max-w-md bg-gradient-to-br from-red-50 to-white border-red-200 rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-red-700">
              <Trash2 className="w-6 h-6 inline mr-2" />
              Xác nhận Xóa
            </DialogTitle>
            <DialogDescription className="text-red-600">
              Hành động này không thể hoàn tác
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            <p className="text-gray-700">
              Bạn có chắc chắn muốn xóa model{' '}
              <span className="font-bold text-red-600">
                "{modelToDelete?.name}"
              </span>
              ?
            </p>
          </div>

          <DialogFooter className="gap-2">
            <Button 
              variant="outline" 
              onClick={handleCancelDelete}
              className="rounded-xl border-2 border-gray-200 hover:bg-gray-50"
            >
              <X className="w-4 h-4 mr-2" />
              Hủy
            </Button>
            <Button 
              onClick={handleConfirmDelete}
              className="rounded-xl bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Xóa
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}