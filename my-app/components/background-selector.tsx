"use client"

import { ImageIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

export interface BackgroundOption {
  id: string
  name: string
  type: "color" | "gradient" | "image"
  value: string
}

export const BACKGROUNDS: BackgroundOption[] = [
  { 
    id: "default", 
    name: "Mặc định (Xám tối)", 
    type: "color", 
    value: "#333333" 
  },
  { 
    id: "black", 
    name: "Đen", 
    type: "color", 
    value: "#000000" 
  },
  { 
    id: "white", 
    name: "Trắng", 
    type: "color", 
    value: "#ffffff" 
  },
  { 
    id: "blue", 
    name: "Xanh dương", 
    type: "color", 
    value: "#1e40af" 
  },
  { 
    id: "purple", 
    name: "Tím", 
    type: "color", 
    value: "#7c3aed" 
  },
  { 
    id: "green", 
    name: "Xanh lá", 
    type: "color", 
    value: "#059669" 
  },
  { 
    id: "gradient1", 
    name: "Hoàng hôn", 
    type: "gradient", 
    value: "linear-gradient(180deg, #ff6b6b 0%, #4ecdc4 100%)" 
  },
  { 
    id: "gradient2", 
    name: "Vũ trụ", 
    type: "gradient", 
    value: "linear-gradient(180deg, #0f0c29 0%, #302b63 50%, #24243e 100%)" 
  },
  { 
    id: "gradient3", 
    name: "Bình minh", 
    type: "gradient", 
    value: "linear-gradient(180deg, #FF512F 0%, #DD2476 100%)" 
  },
  { 
    id: "bg1", 
    name: "Hình 1", 
    type: "image", 
    value: "/backgrounds/bg1.jpg" 
  },
  // { 
  //   id: "bg2", 
  //   name: "Hình 2", 
  //   type: "image", 
  //   value: "/backgrounds/bg2.jpg" 
  // },
  // { 
  //   id: "bg3", 
  //   name: "Hình 3", 
  //   type: "image", 
  //   value: "/backgrounds/bg3.jpg" 
  // },
]

interface BackgroundSelectorProps {
  onBackgroundChange: (bg: BackgroundOption) => void
  currentBackground: BackgroundOption
}

export function BackgroundSelector({ 
  onBackgroundChange, 
  currentBackground 
}: BackgroundSelectorProps) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          className="rounded-full w-12 h-12 bg-background/80 backdrop-blur-sm hover:bg-background/90"
          title="Thay đổi phông nền"
        >
          <ImageIcon className="h-5 w-5" />
        </Button>
      </PopoverTrigger>
      <PopoverContent 
        side="top" 
        align="center" 
        className="w-auto p-3 mb-2"
      >
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">Chọn phông nền</p>
          <div className="flex gap-2 flex-wrap max-w-[300px]">
            {BACKGROUNDS.map((bg) => (
              <button
                key={bg.id}
                onClick={() => onBackgroundChange(bg)}
                className={`
                  w-12 h-12 rounded-lg border-2 transition-all hover:scale-110
                  ${currentBackground.id === bg.id 
                    ? 'border-primary ring-2 ring-primary/20' 
                    : 'border-border hover:border-primary/50'
                  }
                `}
                style={{
                  ...(bg.type === "image" 
                    ? {
                        backgroundImage: `url(${bg.value})`,
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                        backgroundColor: '#333'
                      }
                    : {
                        background: bg.value
                      }
                  )
                }}
                title={bg.name}
              />
            ))}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}
