"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/context/authContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useRouter } from "next/navigation";
import { ArrowLeft, Camera, Save, Loader2 } from "lucide-react";
import axios from "axios";

const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8001";

export default function ProfilePage() {
  const { user, isLoggedIn, isLoading: authLoading, refreshUser } = useAuth();
  const router = useRouter();
  
  const [formData, setFormData] = useState({
    username: "",
    fullname: "",
    email: "",
    avatar_url: "",
  });
  
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  useEffect(() => {
    if (!authLoading && !isLoggedIn) {
      router.push("/login");
      return;
    }

    if (user) {
      console.log("Profile page - User data updated:", user);
      setFormData({
        username: user.username || "",
        fullname: user.fullName || "",
        email: user.email || "",
        avatar_url: user.avatar || "",
      });
    }
  }, [user?.user_id, user?.username, user?.fullName, user?.email, user?.avatar, isLoggedIn, authLoading, router]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      alert("Vui lòng chọn file ảnh");
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert("Kích thước ảnh tối đa 5MB");
      return;
    }

    setUploadingAvatar(true);

    try {
      // Convert to base64 or upload to Firebase first
      // For now, we'll use the file object directly and let user save it
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData({
          ...formData,
          avatar_url: reader.result as string,
        });
        alert("Ảnh đã được chọn. Nhấn 'Lưu thay đổi' để cập nhật avatar.");
        setUploadingAvatar(false);
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error("Upload avatar error:", error);
      alert("Upload avatar thất bại");
      setUploadingAvatar(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.username.trim() || !formData.email.trim()) {
      alert("Vui lòng điền đầy đủ thông tin bắt buộc");
      return;
    }

    setIsSaving(true);

    try {
      const token = localStorage.getItem("token");
      const userId = user?.user_id;
      
      if (!userId) {
        alert("Không tìm thấy thông tin người dùng");
        return;
      }

      const response = await axios.put(
        `${BASE_URL}/api/users/${userId}`,
        {
          username: formData.username,
          fullname: formData.fullname,
          email: formData.email,
          avatar_url: formData.avatar_url,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );
      console.log("Update profile response:", response.data);

      if (response.data.message || response.data.user) {
        console.log("Update response:", response.data);
        
        // Backend returns updated user in response.data.user
        if (response.data.user) {
          // Update localStorage and context with the returned user data
          const updatedUser = {
            user_id: response.data.user.user_id,
            username: response.data.user.username,
            fullName: response.data.user.fullname || response.data.user.full_name || response.data.user.fullName,
            email: response.data.user.email,
            role: response.data.user.role,
            avatar: response.data.user.avatar_url || response.data.user.avatar,
            joinedAt: response.data.user.created_at || response.data.user.joinedAt,
            bio: response.data.user.bio || null,
          };
          
          console.log("Updated user object:", updatedUser);
          
          // Save to localStorage
          localStorage.setItem("data", JSON.stringify(updatedUser));
          
          // Update formData directly
          setFormData({
            username: updatedUser.username || "",
            fullname: updatedUser.fullName || "",
            email: updatedUser.email || "",
            avatar_url: updatedUser.avatar || "",
          });
        }
        
        // Also try to refresh from API (but don't block on error)
        refreshUser().catch(err => console.warn("Refresh user failed:", err));
        
        alert("Cập nhật thông tin thành công!");
        setIsEditing(false);
      }
    } catch (error: any) {
      console.error("Update profile error:", error);
      const errorMessage = error.response?.data?.message || error.response?.data?.error || "Cập nhật thông tin thất bại";
      alert(errorMessage);
    } finally {
      setIsSaving(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
      </div>
    );
  }

  if (!isLoggedIn || !user) {
    return null;
  }

  const fallbackInitial = user.username ? user.username.charAt(0).toUpperCase() : "?";

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-purple-50 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => router.back()}
            className="mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Quay lại
          </Button>
        </div>

        {/* Profile Card */}
        <Card className="border-2 border-purple-200 shadow-lg">
          <CardHeader className="bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-t-lg">
            <CardTitle className="text-2xl">Thông tin cá nhân</CardTitle>
            <CardDescription className="text-purple-100">
              Quản lý thông tin tài khoản của bạn
            </CardDescription>
          </CardHeader>
          
          <CardContent className="p-6">
            {/* Avatar Section */}
            <div className="flex flex-col items-center mb-8">
              <div className="relative">
                <Avatar className="w-32 h-32 border-4 border-purple-200">
                  <AvatarImage src={formData.avatar_url || undefined} alt={formData.username} />
                  <AvatarFallback className="text-3xl bg-purple-100 text-purple-700">
                    {fallbackInitial}
                  </AvatarFallback>
                </Avatar>
                
                {isEditing && (
                  <label className="absolute bottom-0 right-0 bg-purple-600 text-white p-2 rounded-full cursor-pointer hover:bg-purple-700 transition-colors">
                    <Camera className="w-5 h-5" />
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleAvatarUpload}
                      className="hidden"
                    />
                  </label>
                )}
              </div>
              <p className="mt-3 text-sm text-gray-500">
                {isEditing ? "Click vào icon camera để upload ảnh avatar" : ""}
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="username" className="text-purple-700 font-medium">
                  Tên đăng nhập *
                </Label>
                <Input
                  id="username"
                  name="username"
                  type="text"
                  value={formData.username}
                  onChange={handleChange}
                  disabled={!isEditing}
                  required
                  className="border-2 border-purple-200 focus:border-purple-400 disabled:bg-gray-50 rounded-xl"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="fullname" className="text-purple-700 font-medium">
                  Họ và tên
                </Label>
                <Input
                  id="fullname"
                  name="fullname"
                  type="text"
                  value={formData.fullname}
                  onChange={handleChange}
                  disabled={!isEditing}
                  className="border-2 border-purple-200 focus:border-purple-400 disabled:bg-gray-50 rounded-xl"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email" className="text-purple-700 font-medium">
                  Email *
                </Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                  disabled={!isEditing}
                  required
                  className="border-2 border-purple-200 focus:border-purple-400 disabled:bg-gray-50 rounded-xl"
                />
              </div>

              {/* Google Account Info */}
              {(user as any).google_id && (
                <div className="p-4 bg-purple-50 border-2 border-purple-200 rounded-xl">
                  <p className="text-sm text-purple-700">
                    <strong>Tài khoản Google:</strong> Đã liên kết
                  </p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4">
                {!isEditing ? (
                  <Button
                    type="button"
                    onClick={() => setIsEditing(true)}
                    className="flex-1 bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white rounded-xl"
                  >
                    Chỉnh sửa thông tin
                  </Button>
                ) : (
                  <>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setIsEditing(false);
                        // Reset form
                        if (user) {
                          setFormData({
                            username: user.username || "",
                            fullname: user.fullName || "",
                            email: user.email || "",
                            avatar_url: user.avatar || "",
                          });
                        }
                      }}
                      disabled={isSaving}
                      className="flex-1 border-2 border-purple-200 hover:bg-purple-50 rounded-xl"
                    >
                      Hủy
                    </Button>
                    <Button
                      type="submit"
                      disabled={isSaving}
                      className="flex-1 bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white rounded-xl"
                    >
                      {isSaving ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Đang lưu...
                        </>
                      ) : (
                        <>
                          <Save className="w-4 h-4 mr-2" />
                          Lưu thay đổi
                        </>
                      )}
                    </Button>
                  </>
                )}
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
