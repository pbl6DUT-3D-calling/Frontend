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
  DialogFooter,
} from "@/components/ui/dialog"
import { Upload, Plus, CheckCircle, X } from "lucide-react"
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
      id: "default-1",
      name: "Default Model",
      vrmUrl: "models/7667029464206216702.vrm", // Giả sử bạn có model này
      thumbnailUrl: "https://placehold.co/150x150/06b6d4/ffffff?text=M1"
    }
  ]);
  
  const [currentVrmUrl, setCurrentVrmUrl] = useState<string | null>(modelList[0]?.vrmUrl || null);
  const [selectedInModal, setSelectedInModal] = useState<string | null>(modelList[0]?.id || null);
  const [previewInModalUrl, setPreviewInModalUrl] = useState<string | null>(modelList[0]?.vrmUrl || null);

  const [showModal, setShowModal] = useState(false);
  const [isLoading, setIsLoading] = useState(false); // Loading cho model chính
  const [isUploading, setIsUploading] = useState(false); // Loading khi upload file
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // === Handlers ===
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.vrm')) {
      alert('Vui lòng chọn file .vrm')
      return;
    }

    setIsUploading(true);
    try {
      // 1. Tạo vrmUrl (Blob URL)
      const vrmUrl = URL.createObjectURL(file);
      
      // 2. Trích xuất thumbnail (Data URL)
      const thumbnailUrl = await extractThumbnail(file);

      // 3. Tạo object model mới
      const newModel: ModelItem = {
        id: crypto.randomUUID(),
        name: file.name,
        vrmUrl: vrmUrl,
        thumbnailUrl: thumbnailUrl
      };

      // 4. Cập nhật state
      setModelList(prev => [...prev, newModel]);
      // TODO: Ở đây bạn sẽ gọi API để upload file (file) và thumbnailUrl (string) lên server
      
    } catch (error) {
      console.error("Upload thất bại:", error);
      alert("Upload model thất bại. Vui lòng thử lại.");
    } finally {
      setIsUploading(false);
      // Reset file input để có thể upload lại file
      if(fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleSelectModel = (model: ModelItem) => {
    setSelectedInModal(model.id);
    setPreviewInModalUrl(model.vrmUrl);
  };
  
  const confirmSelection = () => {
    const selectedModel = modelList.find(m => m.id === selectedInModal);
    if (selectedModel) {
      setCurrentVrmUrl(selectedModel.vrmUrl);
    }
    setShowModal(false);
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="w-full space-y-4">
      {/* Input file ẩn */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileUpload}
        accept=".vrm"
        className="hidden"
      />

      {/* Tiêu đề và Mô tả */}
      

      {/* Component Model3D đã refactor */}
      <Model3D vrmUrl={currentVrmUrl} height="h-[50vh]" showLoading={isLoading} />

      {/* Các nút điều khiển */}
      <div className="flex items-center gap-4 justify-center">
        <Button onClick={() => setShowModal(true)} variant="outline" size="lg">
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

      {/* ==== Modal "Tủ đồ" ==== */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-4xl h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Chọn Avatar</DialogTitle>
          </DialogHeader>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 h-full overflow-hidden">
            {/* Cột 1: Danh sách model */}
            <div className="md:col-span-1 h-full overflow-y-auto pr-2 space-y-2">
              <p className="text-sm font-medium text-muted-foreground mb-2">Thư viện của bạn</p>
              
              {/* Nút Upload trong Modal */}
              <button
                onClick={triggerFileInput}
                disabled={isUploading}
                className="w-full h-24 border-2 border-dashed border-border rounded-lg flex flex-col items-center justify-center text-muted-foreground hover:bg-accent transition-colors disabled:opacity-50"
              >
                {isUploading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin mb-2"></div>
                    <span>Đang xử lý...</span>
                  </>
                ) : (
                  <>
                    <Plus className="w-8 h-8" />
                    <span>Tải lên model mới</span>
                  </>
                )}
              </button>

              {/* Grid danh sách model */}
              <div className="grid grid-cols-3 gap-2">
                {modelList.map((model) => (
                  <button
                    key={model.id}
                    onClick={() => handleSelectModel(model)}
                    className={`relative aspect-square rounded-lg overflow-hidden border-2 ${
                      selectedInModal === model.id ? 'border-primary' : 'border-transparent'
                    } transition-all`}
                  >
                    <img
                      src={model.thumbnailUrl}
                      alt={model.name}
                      className="w-full h-full object-cover"
                      onError={(e) => (e.currentTarget.src = 'https://placehold.co/150x150/f87171/ffffff?text=Error')}
                    />
                    <div className="absolute bottom-0 left-0 right-0 bg-black/50 p-1">
                      <p className="text-white text-xs truncate">{model.name}</p>
                    </div>
                    {selectedInModal === model.id && (
                      <div className="absolute top-1 right-1 bg-primary rounded-full p-0.5">
                        <CheckCircle className="w-4 h-4 text-white" />
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Cột 2: Preview 3D */}
            <div className="md:col-span-2 h-full rounded-lg bg-muted border overflow-hidden">
              <Model3D vrmUrl={previewInModalUrl} height="h-full" />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowModal(false)}>
              <X className="w-4 h-4 mr-2" />
              Hủy
            </Button>
            <Button onClick={confirmSelection}>
              <CheckCircle className="w-4 h-4 mr-2" />
              Xác nhận & Sử dụng
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}