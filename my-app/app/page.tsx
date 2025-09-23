import { VideoCallRoom } from "@/components/video-call-room"
import { ModelGallery } from "@/components/model-gallery"
import { Navigation } from "@/components/navigation"
import { SectionWrapper } from "@/components/section-wrapper"
import { Model3D } from "@/components/model-3d"


export default function HomePage() {
  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <SectionWrapper 
        id="hero"
        title="3D Video Calling Platform"
        description="Tạo và chia sẻ trải nghiệm 3D tương tác với công nghệ VTuber tiên tiến"
        background="gradient"
        className="pt-20"
      >
        <Model3D />
      </SectionWrapper> 

      <SectionWrapper 
        id="video-call"
        title="Video Call Room"
        description="Kết nối và giao tiếp với bạn bè trong không gian ảo 3D"
        background="muted"
      >
        <VideoCallRoom />
      </SectionWrapper>

      <SectionWrapper 
        id="model-gallery"
        title="Model Gallery"
        description="Khám phá bộ sưu tập các model 3D và avatar đa dạng"
      >
        <ModelGallery />
      </SectionWrapper>

      {/* <SectionWrapper 
        id="new-section"
        title="Tên Section Mới"
        description="Mô tả cho section mới"
        background="muted" // hoặc "default" hoặc "gradient"
      >
        <YourNewComponent />
      </SectionWrapper>
 */}

      {/* Footer */}
      <footer className="bg-muted/30 border-t border-border mt-20">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center text-muted-foreground">
            <p>&copy; 2025 VTuber Studio Platform. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
