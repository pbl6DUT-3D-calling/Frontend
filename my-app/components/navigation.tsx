"use client"

import { Button } from "@/components/ui/button"
import { Video, Users, Download, Settings } from "lucide-react"

export function Navigation() {
  return (
    <nav className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center animate-glow">
              <Video className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              VTuber Call
            </span>
          </div>

          <div className="flex items-center space-x-4">
            <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
              <Users className="w-4 h-4 mr-2" />
              Rooms
            </Button>
            <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
              <Download className="w-4 h-4 mr-2" />
              Models
            </Button>
            <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
              <Settings className="w-4 h-4 mr-2" />
              Settings
            </Button>
            <Button className="bg-primary hover:bg-primary/90 text-primary-foreground">Start Stream</Button>
          </div>
        </div>
      </div>
    </nav>
  )
}
