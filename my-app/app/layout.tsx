import type React from "react"
import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import "./globals.css"
import { AuthProvider } from "@/context/authContext"  
import AuthWrapper from "@/components/AuthWrapper"
import { ModelProvider } from "@/context/modelContext"

const geistSans = Geist({
  subsets: ["latin"],
  variable: "--font-geist-sans",
})

const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
})

export const metadata = {
  title: "VTuber Studio",
  description: "Professional VTuber streaming platform with 3D avatars and real-time video calling",
  generator: "Next.js",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
      <body className="min-h-screen bg-background font-sans antialiased">
        <ModelProvider>
          <AuthWrapper>
            {children}
          </AuthWrapper>
        </ModelProvider>
      </body>
    </html>
  )
}
