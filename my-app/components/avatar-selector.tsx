"use client";

import { useState, useEffect, Suspense } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { CheckCircle, X, Loader2, Trash2 } from "lucide-react";
import { modelService } from "@/service/modelService";
import { DEFAULT_MODEL, getDefaultModelThumbnail } from "@/utils/defaultModel";
import dynamic from "next/dynamic";

// Lazy load 3D components để tránh SSR và giảm context loss
const Canvas = dynamic(() => import("@react-three/fiber").then(mod => ({ default: mod.Canvas })), { ssr: false });
const OrbitControls = dynamic(() => import("@react-three/drei").then(mod => ({ default: mod.OrbitControls })), { ssr: false });
const Environment = dynamic(() => import("@react-three/drei").then(mod => ({ default: mod.Environment })), { ssr: false });
const VRMAvatar = dynamic(() => import("@/components/VRMAvatar").then(mod => ({ default: mod.VRMAvatar })), { ssr: false });

interface ModelItem {
  id: string;
  name: string;
  vrmUrl: string;
  thumbnailUrl: string;
}

interface AvatarSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (avatarUrl: string) => void;
  currentAvatar?: string;
  onApplyToVideoCall?: (avatarUrl: string, modelName: string) => void; // ✅ NEW: Apply to video call
}

export function AvatarSelector({ isOpen, onClose, onSelect, currentAvatar, onApplyToVideoCall }: AvatarSelectorProps) {
  const [models, setModels] = useState<ModelItem[]>([DEFAULT_MODEL]); // ✅ Initialize with default
  const [selectedModel, setSelectedModel] = useState<ModelItem | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingThumbnail, setIsLoadingThumbnail] = useState(true); // ✅ Thumbnail loading state
  const [show3DPreview, setShow3DPreview] = useState(false);
  
  // Delete confirmation state
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [modelToDelete, setModelToDelete] = useState<ModelItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showSuccessToast, setShowSuccessToast] = useState(false);

  // ✅ Pre-load default thumbnail on mount (ONCE)
  useEffect(() => {
    const loadDefaultThumbnail = async () => {
      const thumbnail = await getDefaultModelThumbnail();
      setModels(prev => prev.map(m => 
        m.id === DEFAULT_MODEL.id 
          ? { ...m, thumbnailUrl: thumbnail }
          : m
      ));
      setIsLoadingThumbnail(false);
    };

    loadDefaultThumbnail();
  }, []); // Empty deps - only run once

  // ✅ Load user models when dialog opens
  useEffect(() => {
    console.log("AvatarSelector isOpen:", isOpen);
    if (isOpen) {
      loadModels();
    } else {
      // Cleanup khi đóng dialog
      setSelectedModel(null);
      setShow3DPreview(false);
    }
  }, [isOpen]);

  const loadModels = async () => {
    setIsLoading(true);
    try {
      const response = await modelService.getUserModels();
      console.log("📦 API Response:", response);
      
      const modelsArray = Array.isArray(response) ? response : (response.models || []);
      console.log("📋 Models array:", modelsArray);
      
      const convertedModels: ModelItem[] = modelsArray.map((model: any) => ({
        id: model.id?.toString() || crypto.randomUUID(),
        name: model.name || "Unnamed Model",
        vrmUrl: model.file_url || model.fileUrl || "",
        thumbnailUrl: model.thumbnail_url || model.thumbnailUrl || "https://placehold.co/150x150/a78bfa/ffffff?text=VRM",
      }));

      console.log("✅ Converted models:", convertedModels);

      // ✅ MERGE: Default model + server models (avoid duplicates)
      setModels(prev => {
        const defaultModel = prev.find(m => m.id === DEFAULT_MODEL.id);
        const serverModels = convertedModels.filter(m => 
          m.vrmUrl !== DEFAULT_MODEL.vrmUrl && 
          m.id !== DEFAULT_MODEL.id
        );
        
        return defaultModel 
          ? [defaultModel, ...serverModels]
          : [DEFAULT_MODEL, ...serverModels];
      });
      
    } catch (error) {
      console.error("❌ Failed to load models:", error);
      // Keep default model in list even if API fails
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectModel = (model: ModelItem) => {
    console.log("Selected model:", model);
    console.log("VRM URL:", model.vrmUrl);
    setSelectedModel(model);
    // Delay để tránh tạo Canvas quá nhanh
    setTimeout(() => setShow3DPreview(true), 100);
  };

  const handleConfirm = () => {
    if (selectedModel) {
      // Trả về vrmUrl để load model 3D, không phải thumbnailUrl
      onSelect(selectedModel.vrmUrl);
      setShow3DPreview(false); // Dispose canvas trước khi đóng
      setTimeout(() => onClose(), 100);
    }
  };

  const handleClose = () => {
    setShow3DPreview(false);
    setTimeout(() => onClose(), 100);
  };

  const handleDeleteClick = (e: React.MouseEvent, model: ModelItem) => {
    e.stopPropagation(); // Prevent selecting the model
    setModelToDelete(model);
    setShowDeleteDialog(true);
  };

  const handleConfirmDelete = async () => {
    if (!modelToDelete) return;
    
    setIsDeleting(true);
    try {
      await modelService.deleteModel(modelToDelete.id);
      
      // Remove from list
      setModels(prev => prev.filter(m => m.id !== modelToDelete.id));
      
      // Clear selection if deleted model was selected
      if (selectedModel?.id === modelToDelete.id) {
        setSelectedModel(null);
        setShow3DPreview(false);
      }
      
      // Close delete dialog
      setShowDeleteDialog(false);
      setModelToDelete(null);
      
      // Show success toast
      setShowSuccessToast(true);
      setTimeout(() => setShowSuccessToast(false), 3000);
      
    } catch (error) {
      console.error("Delete failed:", error);
      alert(error instanceof Error ? error.message : "Xóa model thất bại");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCancelDelete = () => {
    setShowDeleteDialog(false);
    setModelToDelete(null);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden bg-gradient-to-br from-purple-50 to-white border-2 border-purple-200 rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-purple-700">
            Chọn Avatar
          </DialogTitle>
        </DialogHeader>

        <div className="flex gap-6 h-[600px]">
          {/* Left Side - Model List */}
          <div className="flex-1 flex flex-col space-y-4">
            {/* <div className="space-y-2">
              <Button
                variant="outline"
                className="w-full border-2 border-dashed border-purple-300 hover:border-purple-500 hover:bg-purple-50 rounded-xl py-6"
              >
                <span className="text-purple-600">+ Tải lên Model mới</span>
              </Button>

              <h3 className="text-sm font-semibold text-purple-700 mt-4">Thư viện của bạn</h3>
            </div> */}

            {/* Model Grid - Scrollable */}
            <div className="flex-1 overflow-y-auto pr-2 space-y-2">
              {isLoading ? (
                <div className="flex items-center justify-center h-full">
                  <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
                </div>
              ) : models.length === 0 ? (
                <div className="flex items-center justify-center h-full">
                  <p className="text-gray-500">Chưa có model nào</p>
                </div>
              ) : (
                models.map((model) => (
                  <div
                    key={model.id}
                    onClick={() => handleSelectModel(model)}
                    className={`w-full p-3 rounded-xl border-2 transition-all flex items-center gap-3 relative group cursor-pointer ${
                      selectedModel?.id === model.id
                        ? "border-purple-500 bg-purple-50"
                        : "border-gray-200 hover:border-purple-300 hover:bg-purple-50/50"
                    }`}
                  >
                    <div className="w-16 h-16 rounded-lg overflow-hidden border border-gray-200 flex-shrink-0">
                      {/* ✅ Show loading spinner while thumbnail loads */}
                      {isLoadingThumbnail && model.id === DEFAULT_MODEL.id ? (
                        <div className="w-full h-full flex items-center justify-center bg-purple-100">
                          <Loader2 className="w-6 h-6 animate-spin text-purple-500" />
                        </div>
                      ) : (
                        <img
                          src={model.thumbnailUrl}
                          alt={model.name}
                          className="w-full h-full object-cover"
                        />
                      )}
                    </div>
                    <div className="flex-1 text-left">
                      <p className="font-medium text-gray-800 truncate">{model.name}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {selectedModel?.id === model.id && (
                        <CheckCircle className="w-6 h-6 text-purple-600 flex-shrink-0" />
                      )}
                      {/* Delete Button */}
                      <button
                        onClick={(e) => handleDeleteClick(e, model)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity bg-red-500 hover:bg-red-600 text-white p-1.5 rounded-lg shadow-lg z-10"
                        title="Xóa model"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Right Side - Preview */}
          <div className="w-[380px] flex flex-col">
            <h3 className="text-sm font-semibold text-purple-700 mb-3">Xem trước</h3>
            
            <div className="flex-1 bg-gradient-to-br from-purple-100 to-purple-50 rounded-2xl border-2 border-purple-200 flex flex-col items-center justify-center overflow-hidden">
              {selectedModel && show3DPreview && selectedModel.vrmUrl ? (
                <div className="w-full h-full flex flex-col">
                  {/* 3D Preview Viewer */}
                  <div className="flex-1 relative">
                    <Suspense fallback={
                      <div className="w-full h-full flex items-center justify-center">
                        <Loader2 className="w-12 h-12 animate-spin text-purple-500" />
                      </div>
                    }>
                      <Canvas
                        camera={{ position: [0, 1, 2], fov: 50 }}
                        gl={{ 
                          preserveDrawingBuffer: true,
                          antialias: true,
                          alpha: true
                        }}
                        dpr={[1, 2]}
                        style={{ background: 'linear-gradient(to bottom right, #f3e8ff, #faf5ff)' }}
                      >
                        <ambientLight intensity={0.8} />
                        <directionalLight position={[5, 5, 5]} intensity={1} />
                        <directionalLight position={[-5, 5, -5]} intensity={0.5} />
                        <VRMAvatar avatar={selectedModel.vrmUrl} autoPlayIdle={true} />
                        <OrbitControls
                          enableZoom={true}
                          enablePan={false}
                          minDistance={1}
                          maxDistance={5}
                          target={[0, 0.9, 0]}
                        />
                        <Environment preset="sunset" />
                      </Canvas>
                    </Suspense>
                    
                    <div className="absolute top-4 left-4 bg-white/80 backdrop-blur-sm px-3 py-2 rounded-lg shadow">
                      <p className="text-xs text-purple-700 font-medium">Kéo để xoay • Cuộn để zoom</p>
                    </div>
                  </div>
                  
                  {/* <div className="p-4 bg-white/70 backdrop-blur-sm border-t-2 border-purple-200 space-y-3"> */}
                    {/* <p className="text-lg font-semibold text-purple-900 text-center">{selectedModel.name}</p>
                    <p className="text-sm text-purple-600 text-center">
                      Nhấn "Xác nhận" để sử dụng làm avatar
                    </p>
                    
                     ✅ NEW: Apply to Video Call Button 
                    {onApplyToVideoCall && (
                      <Button
                        onClick={() => {
                          onApplyToVideoCall(selectedModel.vrmUrl, selectedModel.name);
                          onClose();
                        }}
                        className="w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-semibold py-2 rounded-lg shadow-md transition-all"
                      >
                        📹 Apply to Video Call
                      </Button>
                    )} */}
                  {/* </div> */}
                </div>
              ) : selectedModel && show3DPreview ? (
                <div className="text-center space-y-4 p-6">
                  <div className="w-48 h-48 mx-auto rounded-2xl bg-red-100 flex items-center justify-center">
                    <span className="text-6xl text-red-400">❌</span>
                  </div>
                  <p className="text-sm text-red-600 font-medium">Model URL không hợp lệ</p>
                  <p className="text-xs text-gray-500 break-all">{selectedModel.vrmUrl || "undefined"}</p>
                </div>
              ) : selectedModel ? (
                <div className="text-center space-y-4 p-6">
                  <Loader2 className="w-16 h-16 mx-auto animate-spin text-purple-500" />
                  <p className="text-sm text-gray-600">Đang tải model 3D...</p>
                </div>
              ) : (
                <div className="text-center space-y-4 p-6">
                  <div className="w-48 h-48 mx-auto rounded-2xl bg-purple-200 flex items-center justify-center">
                    <span className="text-6xl text-purple-400">?</span>
                  </div>
                  <p className="text-sm text-gray-600 font-medium">Chọn một model để xem preview</p>
                </div>
              )}
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={handleClose}
            className="rounded-xl border-2 border-gray-200 hover:bg-gray-50"
          >
            <X className="w-4 h-4 mr-2" />
            Hủy
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!selectedModel}
            className="rounded-xl bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white disabled:opacity-50"
          >
            <CheckCircle className="w-4 h-4 mr-2" />
            Xác nhận & Sử dụng
          </Button>
        </DialogFooter>
      </DialogContent>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="sm:max-w-md bg-gradient-to-br from-red-50 to-white border-2 border-red-200 rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-red-700 flex items-center gap-2">
              <Trash2 className="w-6 h-6" />
              Xác nhận Xóa
            </DialogTitle>
          </DialogHeader>
          
          <div className="py-4 space-y-4">
            <div className="bg-red-100 border-2 border-red-200 rounded-xl p-4">
              <p className="text-gray-700 text-center">
                Bạn có chắc chắn muốn xóa model{' '}
                <span className="font-bold text-red-600">"{modelToDelete?.name}"</span>?
              </p>
            </div>
            <p className="text-sm text-gray-500 text-center">
              Hành động này không thể hoàn tác.
            </p>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={handleCancelDelete}
              disabled={isDeleting}
              className="rounded-xl border-2 border-gray-200 hover:bg-gray-50"
            >
              <X className="w-4 h-4 mr-2" />
              Hủy
            </Button>
            <Button
              onClick={handleConfirmDelete}
              disabled={isDeleting}
              className="rounded-xl bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white"
            >
              {isDeleting ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Trash2 className="w-4 h-4 mr-2" />
              )}
              {isDeleting ? "Đang xóa..." : "Xóa"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Success Toast */}
      {showSuccessToast && (
        <div className="fixed bottom-8 right-8 z-[9999] animate-in slide-in-from-bottom-5 fade-in duration-300">
          <div className="bg-gradient-to-r from-green-500 to-green-600 text-white px-6 py-4 rounded-2xl shadow-2xl border-2 border-green-400 flex items-center gap-3">
            <div className="bg-white/20 rounded-full p-2">
              <CheckCircle className="w-6 h-6" />
            </div>
            <div>
              <p className="font-bold text-lg">Đã xóa thành công!</p>
              <p className="text-sm text-green-100">Model đã được xóa khỏi thư viện</p>
            </div>
          </div>
        </div>
      )}
    </Dialog>
  );
}