"use client";

import {
 Avatar,
 AvatarFallback,
 AvatarImage,
} from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
// 1. IMPORT THÊM isLoading
import { useAuth } from "@/context/authContext";
import { LogOut, Settings } from "lucide-react";
import Link from "next/link";

export function UserNav() {
  // 2. LẤY isLoading TỪ CONTEXT
  const { user, isLoggedIn, logout, isLoading } = useAuth();

  // 3. XỬ LÝ TRẠNG THÁI LOADING BAN ĐẦU
  // (Hiển thị tạm thời hoặc không hiển thị gì cả)
  if (isLoading) {
    return <div className="h-8 w-8 rounded-full bg-gray-200 animate-pulse"></div>; // Ví dụ placeholder
    // Hoặc return null;
  }

  // 4. XỬ LÝ KHI CHƯA ĐĂNG NHẬP (Giữ nguyên)
  if (!isLoggedIn || !user) {
    return (
      <Button asChild variant="ghost">
        <Link href="/login">Đăng nhập</Link>
      </Button>
    );
  }

  // 5. TẠO BIẾN FALLBACK AN TOÀN
  // Kiểm tra user.username trước khi gọi charAt
  const fallbackInitial = user.username
                          ? user.username.charAt(0).toUpperCase()
                          : "?"; // Ký tự mặc định nếu không có username

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
     <button>Test</button>
     {/* <Button variant="ghost" className="relative h-8 w-8 rounded-full">
       <Avatar className="h-8 w-8">
         <AvatarImage src={user.avatar || ""} alt={user.username || "User"} />
         <AvatarFallback>{fallbackInitial}</AvatarFallback>
       </Avatar>
     </Button> */}
  </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            {/* Thêm kiểm tra cho fullName và email */}
            <p className="text-sm font-medium leading-none">{user.fullName || "User"}</p>
            <p className="text-xs leading-none text-muted-foreground">{user.email || ""}</p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem>
            <Settings className="mr-2 h-4 w-4" />
            <span>Cài đặt</span>
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={logout}
        className="cursor-pointer hover:bg-red-600 hover:text-white focus:bg-red-600 focus:text-white transition-colors"
        >
          <LogOut className="mr-2 h-4 w-4" />
          <span>Đăng xuất</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
