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
import { useAuth } from "@/context/authContext";
import { LogOut, Settings, User } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export function UserNav() {
  const { user, isLoggedIn, logout, isLoading } = useAuth();
  const router = useRouter();

  // Loading state
  if (isLoading) {
    return <div className="h-8 w-8 rounded-full bg-gray-200 animate-pulse"></div>;
  }

  // Chưa đăng nhập
  if (!isLoggedIn || !user) {
    return (
      <Button asChild variant="ghost">
        <Link href="/login">Đăng nhập</Link>
      </Button>
    );
  }

  // Fallback avatar
  const fallbackInitial = user.username
    ? user.username.charAt(0).toUpperCase()
    : "?";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-8 w-8 rounded-full">
          <Avatar className="h-8 w-8">
            <AvatarImage src={user.avatar || ""} alt={user.username || "User"} />
            <AvatarFallback>{fallbackInitial}</AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>

      {/* ForceMount đôi khi gây lỗi layout nếu không cần thiết thì nên bỏ, nhưng tôi giữ lại theo ý bạn */}
      <DropdownMenuContent className="w-72" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex items-center gap-3">
            {/* Avatar nhỏ bên trong menu */}
            <Avatar className="h-9 w-9">
              <AvatarImage src={user.avatar || ""} alt={user.username || "User"} />
              <AvatarFallback>{fallbackInitial}</AvatarFallback>
            </Avatar>

            {/* Phần thông tin user */}
            <div className="flex flex-col space-y-1">
              <p className="text-sm font-medium leading-none m-0">{user.fullName || "User"}</p>
              <p className="text-xs leading-none text-muted-foreground m-0 truncate">{user.email || ""}</p>
            </div>
          </div>
        </DropdownMenuLabel>
        
        <DropdownMenuSeparator />
        
        <DropdownMenuGroup>
          {/* Thêm flex, items-center và gap-2 thay vì mr-2 để căn chỉnh tốt hơn */}
          <DropdownMenuItem onClick={() => router.push('/profile')} className="cursor-pointer flex items-center gap-2">
            <User className="h-4 w-4" />
            <span>Thông tin cá nhân</span>
          </DropdownMenuItem>
        </DropdownMenuGroup>
        
        <DropdownMenuSeparator />
        
        {/* Nút đăng xuất: Thêm w-full và justify-start để đảm bảo không bị co cụm */}
        <DropdownMenuItem 
          onClick={logout}
          className="cursor-pointer flex items-center gap-2 w-full justify-start text-red-600 focus:text-red-600 hover:text-red-600 hover:bg-red-100 focus:bg-red-100 transition-colors"
        >
          <LogOut className="h-4 w-4" />
          <span>Đăng xuất</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}