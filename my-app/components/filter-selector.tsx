"use client"

import { Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

export type FilterType = "none" | "bloom" | "vintage" | "bw" | "sepia"

export interface FilterOption {
  id: FilterType
  name: string
  icon: string
  preview: string // CSS để preview
}

export const FILTERS: FilterOption[] = [
  { 
    id: "none", 
    name: "Không filter", 
    icon: "⭕", 
    preview: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)" 
  },
  { 
    id: "bloom", 
    name: "Bloom (Phát sáng)", 
    icon: "✨", 
    preview: "radial-gradient(circle, #ffd700 0%, #ff6b6b 100%)" 
  },
  { 
    id: "vintage", 
    name: "Vintage", 
    icon: "📷", 
    preview: "linear-gradient(135deg, #d4a574 0%, #8b7355 100%)" 
  },
  { 
    id: "bw", 
    name: "Đen trắng", 
    icon: "⬛", 
    preview: "linear-gradient(135deg, #000000 0%, #ffffff 100%)" 
  },
  { 
    id: "sepia", 
    name: "Sepia (Hoài cổ)", 
    icon: "🎞️", 
    preview: "linear-gradient(135deg, #704214 0%, #c9a171 100%)" 
  },
]

interface FilterSelectorProps {
  onFilterChange: (filter: FilterType) => void
  currentFilter: FilterType
}

export function FilterSelector({ 
  onFilterChange, 
  currentFilter 
}: FilterSelectorProps) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          className="rounded-full w-12 h-12 bg-background/80 backdrop-blur-sm hover:bg-background/90"
          title="Thêm hiệu ứng"
        >
          <Sparkles className="h-5 w-5" />
        </Button>
      </PopoverTrigger>
      <PopoverContent 
        side="top" 
        align="center" 
        className="w-auto p-3 mb-2"
      >
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">Chọn hiệu ứng</p>
          <div className="flex gap-2">
            {FILTERS.map((filter) => (
              <button
                key={filter.id}
                onClick={() => onFilterChange(currentFilter === filter.id ? "none" : filter.id)}
                className={`
                  flex flex-col items-center gap-1 p-2 rounded-lg border-2 transition-all hover:scale-105
                  ${currentFilter === filter.id 
                    ? 'border-primary bg-primary/10' 
                    : 'border-border hover:border-primary/50'
                  }
                `}
                title={filter.name}
              >
                <div
                  className="w-10 h-10 rounded-md"
                  style={{ background: filter.preview }}
                />
                <span className="text-xl">{filter.icon}</span>
              </button>
            ))}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}
