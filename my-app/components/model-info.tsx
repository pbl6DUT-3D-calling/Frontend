"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Info, Calendar, HardDrive, Tag } from "lucide-react";

interface ModelInfoProps {
  modelName: string;
  modelUrl: string;
  uploadDate?: string;
  fileSize?: number;
}

const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
};

export function ModelInfo({ modelName, modelUrl, uploadDate, fileSize }: ModelInfoProps) {
  // Sử dụng fileSize từ API luôn, không cần fetch
  const formattedSize = fileSize ? formatFileSize(fileSize) : 'N/A';

  const formatDate = (dateString?: string): string => {
    if (!dateString) return 'Không rõ';
    const date = new Date(dateString);
    return date.toLocaleDateString('vi-VN', { 
      day: '2-digit', 
      month: '2-digit', 
      year: 'numeric' 
    });
  };

  return (
    <Card className="absolute top-4 left-4 z-10 w-72 bg-white/95 backdrop-blur-sm border-2 border-purple-200 shadow-xl">
      <CardHeader className="pb-3 bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-t-lg">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <Info className="w-4 h-4" />
          Model Information
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-4 space-y-3">
        {/* Model Name */}
        <div className="flex items-start gap-2">
          <Tag className="w-4 h-4 text-purple-600 mt-0.5 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-xs text-gray-500 mb-0.5">Tên model</p>
            <p className="text-sm font-semibold text-gray-800 truncate" title={modelName}>
              {modelName || 'Unknown Model'}
            </p>
          </div>
        </div>

        {/* File Size */}
        <div className="flex items-start gap-2">
          <HardDrive className="w-4 h-4 text-purple-600 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-xs text-gray-500 mb-0.5">Dung lượng</p>
            <p className="text-sm font-semibold text-gray-800">
              {formattedSize}
            </p>
          </div>
        </div>

        {/* Upload Date */}
        <div className="flex items-start gap-2">
          <Calendar className="w-4 h-4 text-purple-600 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-xs text-gray-500 mb-0.5">Ngày tải lên</p>
            <p className="text-sm font-semibold text-gray-800">
              {formatDate(uploadDate)}
            </p>
          </div>
        </div>

        {/* Decorative bottom */}
        <div className="pt-2 mt-2 border-t border-purple-100">
          <p className="text-xs text-center text-gray-400">
            💎 VRM Format
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
