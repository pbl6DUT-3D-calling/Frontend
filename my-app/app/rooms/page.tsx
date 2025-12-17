'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Video, Users, Trash2, RefreshCw, ArrowLeft } from "lucide-react";

interface Room {
  sid: string;
  name: string;
  emptyTimeout: number;
  maxParticipants: number;
  creationTime: string;
  numParticipants: number;
  metadata: string;
}

export default function RoomsPage() {
  const router = useRouter();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  const fetchRooms = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      console.log('🔄 Fetching rooms...');
      const response = await fetch('/api/rooms');
      const data = await response.json();
      
      if (data.success) {
        setRooms(data.rooms);
        setLastRefresh(new Date());
        console.log(`✅ Loaded ${data.rooms.length} rooms`);
      } else {
        setError(data.error || 'Failed to fetch rooms');
      }
    } catch (err: any) {
      console.error('❌ Error fetching rooms:', err);
      setError('Failed to connect to server');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // ⬅️ Load once on mount
  useEffect(() => {
    fetchRooms();
  }, [fetchRooms]);


  // // ⬅️ Auto-refresh khi tab được focus lại (user quay lại trang)
  // useEffect(() => {
  //   const handleVisibilityChange = () => {
  //     if (document.visibilityState === 'visible') {
  //       const timeSinceLastRefresh = Date.now() - lastRefresh.getTime();
  //       // Chỉ refresh nếu đã qua 5 giây kể từ lần refresh cuối
  //       if (timeSinceLastRefresh > 5000) {
  //         console.log('👁️ Tab focused - Auto refreshing rooms');
  //         fetchRooms();
  //       }
  //     }
  //   };

  //   document.addEventListener('visibilitychange', handleVisibilityChange);
  //   return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  // }, [lastRefresh, fetchRooms]);

  const handleJoinRoom = (roomName: string) => {
    router.push(`/room?room=${encodeURIComponent(roomName)}`);
  };


  // ⬅️ Format thời gian refresh
  const getTimeAgo = () => {
    const seconds = Math.floor((Date.now() - lastRefresh.getTime()) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    return lastRefresh.toLocaleTimeString();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <button
                onClick={() => router.push('/')}
                className="p-2 text-gray-600 hover:text-gray-900 hover:bg-white/50 rounded-lg transition-all"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                  <Video className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-gray-900">Active Rooms</h1>
                  {!isLoading && (
                    <p className="text-xs text-gray-500 mt-1">
                      Last updated: {getTimeAgo()}
                    </p>
                  )}
                </div>
              </div>
            </div>
            
            <Button 
              onClick={fetchRooms}
              disabled={isLoading}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
          
          <div className="flex items-center justify-between">
            <p className="text-gray-600">
              Click on a room to join or create a new one from the home page
            </p>
            {rooms.length > 0 && (
              <span className="text-sm font-medium text-blue-600 bg-blue-50 px-3 py-1 rounded-full">
                {rooms.length} {rooms.length === 1 ? 'room' : 'rooms'}
              </span>
            )}
          </div>
        </div>

        {/* Loading State */}
        {isLoading && rooms.length === 0 && (
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading rooms...</p>
            </div>
          </div>
        )}

        {/* Error State */}
        {error && !isLoading && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
            <svg className="w-12 h-12 text-red-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h3 className="text-lg font-semibold text-red-900 mb-2">Error Loading Rooms</h3>
            <p className="text-red-700">{error}</p>
            <Button 
              onClick={fetchRooms}
              className="mt-4 bg-red-600 hover:bg-red-700"
            >
              Try Again
            </Button>
          </div>
        )}

        {/* Empty State */}
        {!isLoading && !error && rooms.length === 0 && (
          <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Video className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No Active Rooms</h3>
            <p className="text-gray-600 mb-6">Create a new room to get started</p>
            <Button 
              onClick={() => router.push('/room')}
              className="bg-blue-600 hover:bg-blue-700"
            >
              Create Room
            </Button>
          </div>
        )}

        {/* Rooms Grid */}
        {!error && rooms.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {rooms.map((room) => (
              <div
                key={room.sid}
                className="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition-shadow duration-200"
              >
                <div className="p-6">
                  {/* Room Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-semibold text-gray-900 mb-1 truncate">
                        {room.name}
                      </h3>
                      <p className="text-sm text-gray-500">
                        ID: {room.sid.slice(0, 8)}...
                      </p>
                    </div>
                  
                  </div>

                  {/* Room Stats */}
                  <div className="space-y-2 mb-4">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600 flex items-center gap-2">
                        <Users className="w-4 h-4" />
                        Participants
                      </span>
                      <span className="font-semibold text-gray-900">
                        {room.numParticipants} / {room.maxParticipants || '∞'}
                      </span>
                    </div>
                    
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Created</span>
                      <span className="text-gray-900">
                        {new Date(Number(room.creationTime) * 1000).toLocaleTimeString()}
                      </span>
                    </div>
                  </div>

                  {/* Join Button */}
                  <Button
                    onClick={() => handleJoinRoom(room.name)}
                    className="w-full bg-blue-600 hover:bg-blue-700"
                  >
                    <Video className="w-4 h-4 mr-2" />
                    Join Room
                  </Button>
                </div>

                {/* Status Badge */}
                <div className={`px-6 py-2 ${room.numParticipants > 0 ? 'bg-green-50' : 'bg-gray-50'}`}>
                  <span className={`text-xs font-medium ${room.numParticipants > 0 ? 'text-green-700' : 'text-gray-600'}`}>
                    {room.numParticipants > 0 ? '● Active' : '○ Empty'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}