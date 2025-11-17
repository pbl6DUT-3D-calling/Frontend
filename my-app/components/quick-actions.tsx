"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Camera, Download, Share2, Maximize, Check } from "lucide-react";
import { Card } from "@/components/ui/card";

interface QuickActionsProps {
  onScreenshot: () => void;
  onExportPose: () => void;
  onShare: () => void;
  onFullscreen: () => void;
}

export function QuickActions({
  onScreenshot,
  onExportPose,
  onShare,
  onFullscreen,
}: QuickActionsProps) {
  const [copied, setCopied] = useState(false);

  const handleShare = () => {
    onShare();
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const actions = [
    {
      id: "screenshot",
      label: "Screenshot",
      icon: Camera,
      onClick: onScreenshot,
      color: "from-blue-500 to-cyan-500",
      bgColor: "bg-blue-50 hover:bg-blue-100",
    },
    {
      id: "export",
      label: "Export Pose",
      icon: Download,
      onClick: onExportPose,
      color: "from-green-500 to-emerald-500",
      bgColor: "bg-green-50 hover:bg-green-100",
    },
    {
      id: "share",
      label: copied ? "Copied!" : "Share Link",
      icon: copied ? Check : Share2,
      onClick: handleShare,
      color: "from-purple-500 to-pink-500",
      bgColor: copied ? "bg-green-50" : "bg-purple-50 hover:bg-purple-100",
    },
    {
      id: "fullscreen",
      label: "Fullscreen",
      icon: Maximize,
      onClick: onFullscreen,
      color: "from-orange-500 to-red-500",
      bgColor: "bg-orange-50 hover:bg-orange-100",
    },
  ];

  return (
    <Card className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 bg-white/95 backdrop-blur-sm border-2 border-gray-200 shadow-xl">
      <div className="flex items-center gap-2 p-2">
        {actions.map((action) => {
          const Icon = action.icon;
          return (
            <Button
              key={action.id}
              onClick={action.onClick}
              variant="ghost"
              size="sm"
              className={`flex items-center gap-2 ${action.bgColor} transition-all duration-200 hover:scale-105 active:scale-95`}
            >
              <div className={`bg-gradient-to-r ${action.color} rounded-full p-1.5`}>
                <Icon className="w-4 h-4 text-white" />
              </div>
              <span className="text-sm font-medium text-gray-700">
                {action.label}
              </span>
            </Button>
          );
        })}
      </div>
    </Card>
  );
}
