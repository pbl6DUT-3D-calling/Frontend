"use client"

import { useState, useRef, useEffect, Suspense } from "react"
import { Model3D } from "./model-3d" // Import component đã refactor
import { Button } from "@/components/ui/button"
import { Canvas } from "@react-three/fiber"
import { OrbitControls, Environment } from "@react-three/drei"
import { VRMAvatar } from "@/components/VRMAvatar"
import { VRMControls } from "@/components/vrm-controls"
import { ModelInfo } from "@/components/model-info"
import { QuickActions } from "@/components/quick-actions"
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
import { useModel } from "@/context/modelContext" // 🔄 Import ModelContext
// Sửa: Đã xóa import tĩnh
// import { VRM, VRMLoaderPlugin } from "@pixiv/three-vrm" 

// Định nghĩa kiểu dữ liệu cho một model
type ModelItem = {
  id: string;
  name: string;
  vrmUrl: string;       // URL (blob) để load trong <Model3D>
  thumbnailUrl: string; // URL (dataURL) để load trong <img>
  uploadDate?: string;  // Ngày upload (ISO string)
  fileSize?: number;    // Kích thước file (bytes)
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

const PREVIEW_MODEL_KEY = 'pbl6_preview_model_url';

// ==== COMPONENT CHÍNH QUẢN LÝ STUDIO ====
export function VRMStudio() {
  // 🔄 Get ONLY setSelectedModel from context (don't subscribe to selectedModelUrl to avoid re-render)
  const { setSelectedModel } = useModel();
  
  // === Refs ===
  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
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
  
  const [currentVrmUrl, setCurrentVrmUrl] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      const savedUrl = localStorage.getItem(PREVIEW_MODEL_KEY);
      if (savedUrl) {
        return savedUrl; 
      }
    }
    return modelList[0]?.vrmUrl || null;
  });
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
  
  // State cho controls
  const [currentAnimation, setCurrentAnimation] = useState("Idle");
  const [expressions, setExpressions] = useState({
    happy: 0,
    sad: 0,
    angry: 0,
    relaxed: 0,
  });
  
  const selectTimeoutRef = useRef<NodeJS.Timeout | null>(null); // Debounce timeout

  useEffect(() => {
    if (currentVrmUrl && typeof window !== 'undefined') {
      localStorage.setItem(PREVIEW_MODEL_KEY, currentVrmUrl);
      console.log('💾 Saved preview model to localStorage:', currentVrmUrl);
    }
  }, [currentVrmUrl]);

  useEffect(() => {
    if (currentVrmUrl && modelList.length > 0) {
      const matchedModel = modelList.find(m => m.vrmUrl === currentVrmUrl);
      if (matchedModel) {
        setSelectedInModal(matchedModel.id);
        setPreviewInModalUrl(matchedModel.vrmUrl);
        console.log('✅ Restored selectedInModal:', matchedModel.id);
      }
    }
  }, [modelList]);

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
          uploadDate: model.upload_date || model.created_at || model.createdAt || model.uploadDate,
          fileSize: model.file_size ? parseInt(model.file_size) : undefined,
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
      console.log("📤 Step 1: Creating temporary blob URL...");
      // 1. Tạo blob URL tạm để generate thumbnail
      const tempBlobUrl = URL.createObjectURL(pendingFile);
      
      console.log("📸 Step 2: Generating thumbnail from VRM...");
      // 2. Generate thumbnail từ VRM model (chụp mặt nhân vật)
      const { generateVrmThumbnail, dataUrlToFile } = await import("@/utils/generateVrmThumbnail");
      const thumbnailDataUrl = await generateVrmThumbnail(tempBlobUrl, {
        size: 512,
        padding: 1.3
      });
      
      // 3. Convert thumbnail dataURL → File
      const thumbnailFile = await dataUrlToFile(
        thumbnailDataUrl, 
        `${modelName.trim()}_thumb.png`
      );
      
      console.log("✅ Thumbnail generated:", thumbnailFile.size, "bytes");
      
      // Clean up temp blob
      URL.revokeObjectURL(tempBlobUrl);

      console.log("☁️ Step 3: Uploading VRM + thumbnail to server...");
      // 4. Upload VRM + thumbnail lên server (1 request duy nhất)
      const response = await modelService.uploadModel(
        pendingFile, 
        thumbnailFile, 
        modelName.trim()
      );
      
      console.log("✅ Upload success:", response);

      // 5. Tạo object model mới với data từ server
      const newModel: ModelItem = {
        id: response.model?.id?.toString() || crypto.randomUUID(),
        name: response.model?.name || modelName.trim(),
        vrmUrl: response.model?.file_url, // URL từ Firebase
        thumbnailUrl: response.model?.thumbnail_url, // Thumbnail URL từ Firebase
        uploadDate: response.model?.upload_date,
        fileSize: response.model?.file_size ? parseInt(response.model.file_size) : undefined
      };

      // 6. Cập nhật state
      setModelList(prev => [...prev, newModel]);
      
      alert("✅ Upload model và thumbnail thành công!");
      
    } catch (error) {
      console.error("❌ Upload thất bại:", error);
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

  // ==== QUICK ACTIONS HANDLERS ====
  const handleScreenshot = () => {
    const canvas = document.querySelector('canvas');
    if (!canvas) {
      alert('Không tìm thấy canvas');
      return;
    }

    try {
      // Lấy data URL từ canvas
      const dataURL = canvas.toDataURL('image/png');
      
      // Tạo link download
      const link = document.createElement('a');
      const modelName = modelList.find(m => m.vrmUrl === currentVrmUrl)?.name || 'model';
      link.download = `${modelName}_screenshot_${Date.now()}.png`;
      link.href = dataURL;
      link.click();
      
      console.log('Screenshot saved!');
    } catch (error) {
      console.error('Screenshot failed:', error);
      alert('Không thể chụp ảnh màn hình');
    }
  };

  const handleExportPose = () => {
    try {
      const poseData = {
        modelName: modelList.find(m => m.vrmUrl === currentVrmUrl)?.name || 'Unknown',
        animation: currentAnimation,
        expressions: expressions,
        timestamp: new Date().toISOString(),
      };

      const dataStr = JSON.stringify(poseData, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      
      const link = document.createElement('a');
      link.download = `${poseData.modelName}_pose_${Date.now()}.json`;
      link.href = URL.createObjectURL(dataBlob);
      link.click();
      
      console.log('Pose exported:', poseData);
    } catch (error) {
      console.error('Export pose failed:', error);
      alert('Không thể export pose');
    }
  };

  const handleShare = () => {
    const currentModel = modelList.find(m => m.vrmUrl === currentVrmUrl);
    if (!currentModel) {
      alert('Không tìm thấy model');
      return;
    }

    const shareUrl = currentModel.vrmUrl;
    
    // Copy to clipboard
    navigator.clipboard.writeText(shareUrl)
      .then(() => {
        console.log('Link copied to clipboard:', shareUrl);
      })
      .catch((error) => {
        console.error('Copy failed:', error);
        alert('Không thể copy link');
      });
  };

  const handleFullscreen = () => {
    const container = containerRef.current;
    if (!container) return;

    if (!document.fullscreenElement) {
      container.requestFullscreen()
        .then(() => console.log('Entered fullscreen'))
        .catch((error) => {
          console.error('Fullscreen failed:', error);
          alert('Không thể vào chế độ toàn màn hình');
        });
    } else {
      document.exitFullscreen()
        .then(() => console.log('Exited fullscreen'))
        .catch((error) => console.error('Exit fullscreen failed:', error));
    }
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
      

      {/* VRM Studio Preview with Animation Controls */}
      {!showModal && currentVrmUrl && (
        <div 
          ref={containerRef}
          className="h-[60vh] w-full bg-gradient-to-br from-purple-50 via-white to-purple-50 rounded-2xl border-2 border-purple-200 shadow-lg overflow-hidden relative"
        >
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center space-y-4">
                <div className="w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
                <p className="text-purple-700 font-medium">Đang tải VRM model...</p>
              </div>
            </div>
          ) : (
            <>
              {console.log('🎨 Canvas rendering with currentVrmUrl:', currentVrmUrl)}
              <Canvas
                camera={{ position: [0, 1.5, 3], fov: 50 }}
                gl={{
                  preserveDrawingBuffer: true,
                  antialias: true,
                  alpha: true
                }}
                dpr={[1, 2]}
              >
                <Suspense fallback={null}>
                  <ambientLight intensity={0.8} />
                  <directionalLight position={[5, 5, 5]} intensity={1.5} />
                  <directionalLight position={[-5, 5, -5]} intensity={0.7} />
                  <VRMAvatar 
                    key={`preview-${currentVrmUrl}`}
                    avatar={currentVrmUrl} 
                    externalAnimation={currentAnimation}
                    externalExpressions={expressions}
                    hideControls={true}
                    disableFaceTracking={true}
                  />
                  <OrbitControls
                    enableZoom={true}
                    enablePan={false}
                    minDistance={1.5}
                    maxDistance={5}
                    target={[0, 0.9, 0]}
                  />
                  <Environment preset="sunset" />
                </Suspense>
              </Canvas>
              
              {/* Model Info Card - Left */}
              <ModelInfo
                modelName={modelList.find(m => m.vrmUrl === currentVrmUrl)?.name || "Default Model"}
                modelUrl={currentVrmUrl || ""}
                uploadDate={modelList.find(m => m.vrmUrl === currentVrmUrl)?.uploadDate}
                fileSize={modelList.find(m => m.vrmUrl === currentVrmUrl)?.fileSize}
                onApplyToVideoCall={() => {
                  const currentModel = modelList.find(m => m.vrmUrl === currentVrmUrl);
                  const modelName = currentModel?.name || "Default Model";
                  console.log('🎬 ========== APPLY TO VIDEO CALL CLICKED ==========');
                  console.log('📺 Preview Model URL:', currentVrmUrl);
                  console.log('📝 Preview Model Name:', modelName);
                  console.log('==================================================');
                  setSelectedModel(currentVrmUrl || '', modelName);
                }}
              />
              
              {/* Animation Controls Overlay - Right */}
              <VRMControls
                currentAnimation={currentAnimation}
                onAnimationChange={(anim) => setCurrentAnimation(anim)}
                onExpressionChange={(exp, value) => {
                  setExpressions(prev => ({ ...prev, [exp]: value }));
                }}
              />
              
              {/* Quick Actions Bar - Bottom Center */}
              <QuickActions
                onScreenshot={handleScreenshot}
                onExportPose={handleExportPose}
                onShare={handleShare}
                onFullscreen={handleFullscreen}
              />
            </>
          )}
        </div>
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
        onApplyToVideoCall={(avatarUrl, modelName) => {
          console.log('📹 Applying model to video call:', { avatarUrl, modelName });
          setSelectedModel(avatarUrl, modelName);
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