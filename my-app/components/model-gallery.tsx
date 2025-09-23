"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Download, Eye, Star } from "lucide-react"

const sampleModels = [
  {
    id: 1,
    name: "Cyber Bunny",
    preview: "/cute-anime-bunny-character-3d-model.jpg",
    downloads: 1234,
    rating: 4.8,
    tags: ["Cute", "Anime", "Popular"],
    size: "15.2 MB",
  },
  {
    id: 2,
    name: "Space Cat",
    preview: "/futuristic-cat-character-3d-model-space-theme.jpg",
    downloads: 892,
    rating: 4.6,
    tags: ["Sci-Fi", "Cat", "Cool"],
    size: "18.7 MB",
  },
  {
    id: 3,
    name: "Dragon Mage",
    preview: "/dragon-humanoid-mage-character-3d-model-fantasy.jpg",
    downloads: 567,
    rating: 4.9,
    tags: ["Fantasy", "Dragon", "Magic"],
    size: "22.1 MB",
  },
]

export function ModelGallery() {
  const [selectedModel, setSelectedModel] = useState<number | null>(null)

  const handleDownload = (modelId: number) => {
    // Placeholder for download functionality
    console.log(`Downloading model ${modelId}`)
  }

  const handlePreview = (modelId: number) => {
    setSelectedModel(modelId)
  }

  return (
    <Card className="bg-card/50 backdrop-blur-sm border-border">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Eye className="w-5 h-5 text-accent" />
          3D Avatar Models
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 gap-4">
          {sampleModels.map((model) => (
            <div
              key={model.id}
              className={`p-4 rounded-lg border transition-all duration-200 hover:shadow-lg ${
                selectedModel === model.id ? "border-primary bg-primary/5" : "border-border bg-muted/20"
              }`}
            >
              <div className="flex items-start gap-4">
                <img
                  src={model.preview || "/placeholder.svg"}
                  alt={model.name}
                  className="w-16 h-16 rounded-lg object-cover bg-muted animate-float"
                />

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold text-foreground truncate">{model.name}</h3>
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                      {model.rating}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-1 mb-3">
                    {model.tags.map((tag) => (
                      <Badge key={tag} variant="secondary" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Download className="w-3 h-3" />
                        {model.downloads.toLocaleString()}
                      </span>
                      <span className="text-xs">{model.size}</span>
                    </div>

                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => handlePreview(model.id)}>
                        <Eye className="w-3 h-3 mr-1" />
                        Preview
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => handleDownload(model.id)}
                        className="bg-accent hover:bg-accent/90"
                      >
                        <Download className="w-3 h-3 mr-1" />
                        Download
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 text-center">
          <Button variant="outline" className="w-full bg-transparent">
            Browse All Models
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
