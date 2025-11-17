"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Smile, Frown, Angry, Sparkles, Music, Zap } from "lucide-react";

interface VRMControlsProps {
  onAnimationChange: (animation: string) => void;
  onExpressionChange: (expression: string, value: number) => void;
  currentAnimation: string;
}

export function VRMControls({ onAnimationChange, onExpressionChange, currentAnimation }: VRMControlsProps) {
  const [activeExpression, setActiveExpression] = useState<string | null>(null);

  const animations = [
    { id: "Idle", name: "Idle", icon: Sparkles, color: "from-blue-500 to-cyan-500" },
    { id: "Swing Dancing", name: "Dance", icon: Music, color: "from-purple-500 to-pink-500" },
    { id: "Thriller Part 2", name: "Thriller", icon: Zap, color: "from-orange-500 to-red-500" },
  ];

  const expressions = [
    { id: "happy", name: "Happy", icon: Smile, color: "bg-yellow-500" },
    { id: "sad", name: "Sad", icon: Frown, color: "bg-blue-500" },
    { id: "angry", name: "Angry", icon: Angry, color: "bg-red-500" },
    { id: "relaxed", name: "Relaxed", icon: Sparkles, color: "bg-green-500" },
  ];

  const handleExpressionClick = (expId: string) => {
    if (activeExpression === expId) {
      // Toggle off
      setActiveExpression(null);
      onExpressionChange(expId, 0);
    } else {
      // Toggle on, turn off previous
      if (activeExpression) {
        onExpressionChange(activeExpression, 0);
      }
      setActiveExpression(expId);
      onExpressionChange(expId, 1);
    }
  };

  return (
    <div className="absolute top-4 right-4 z-10 space-y-3 w-64">
      {/* Animation Controls */}
      <Card className="bg-white/95 backdrop-blur-sm border-2 border-purple-200 shadow-xl">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold text-purple-700 flex items-center gap-2">
            <Music className="w-4 h-4" />
            Animations
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {animations.map((anim) => {
            const Icon = anim.icon;
            const isActive = currentAnimation === anim.id;
            return (
              <Button
                key={anim.id}
                onClick={() => onAnimationChange(anim.id)}
                className={`w-full justify-start text-left transition-all ${
                  isActive
                    ? `bg-gradient-to-r ${anim.color} text-white shadow-lg scale-105`
                    : "bg-white hover:bg-purple-50 text-gray-700 border-2 border-gray-200"
                }`}
                size="sm"
              >
                <Icon className="w-4 h-4 mr-2" />
                {anim.name}
              </Button>
            );
          })}
        </CardContent>
      </Card>

      {/* Expression Controls */}
      <Card className="bg-white/95 backdrop-blur-sm border-2 border-purple-200 shadow-xl">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold text-purple-700 flex items-center gap-2">
            <Smile className="w-4 h-4" />
            Expressions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-2">
            {expressions.map((exp) => {
              const Icon = exp.icon;
              const isActive = activeExpression === exp.id;
              return (
                <Button
                  key={exp.id}
                  onClick={() => handleExpressionClick(exp.id)}
                  className={`flex flex-col items-center justify-center h-16 transition-all ${
                    isActive
                      ? `${exp.color} text-white shadow-lg scale-105`
                      : "bg-white hover:bg-purple-50 text-gray-700 border-2 border-gray-200"
                  }`}
                  size="sm"
                >
                  <Icon className="w-5 h-5 mb-1" />
                  <span className="text-xs">{exp.name}</span>
                </Button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Info Card */}
      <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white border-0 shadow-xl">
        <CardContent className="p-3">
          <p className="text-xs font-medium">💡 Tip: Click expressions to toggle emotions!</p>
        </CardContent>
      </Card>
    </div>
  );
}
