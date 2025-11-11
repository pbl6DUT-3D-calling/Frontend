'use client';

import {
  ControlBar,
  GridLayout,
  ParticipantTile,
  RoomAudioRenderer,
  useTracks,
  LiveKitRoom,
  useLocalParticipant,
} from '@livekit/components-react';
import { LocalVideoTrack, Track } from 'livekit-client';
import '@livekit/components-styles';
import { useEffect, useState, useCallback, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import VRMVideoPublisher from '@/components/video-call/VRMVideoPublisher';

export default function Page() {
  const params = useSearchParams();
  const router = useRouter();

  const [room, setRoom] = useState<string>('');
  const [name, setName] = useState<string>('');
  const [token, setToken] = useState<string>('');
  const [shouldRender, setShouldRender] = useState(false);
  const [is3DEnabled, setIs3DEnabled] = useState(false);

  const getToken = useCallback(async (roomName: string, userName: string) => {
    try {
      const resp = await fetch(
        `/api/token?room=${roomName}&username=${userName}`
      );
      const data = await resp.json();
      if(data.token) {
        return data.token;
      }
      return null;
    } catch (e) {
      console.error('Error fetching token:', e);
      return null;
    }
  }, []);

  useEffect(() => {
    const roomParam = params.get('room');
    const nameParam = params.get('name');
    if(roomParam) setRoom(roomParam);
    if(nameParam) setName(nameParam);
  }, [params]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!room || !name) {
      alert('Please enter both room name and your name');
      return;
    }

    console.log('Fetching token for:', { room, name });

    try {
      const newToken = await getToken(room, name);
      if (!newToken) {
        alert('Failed to get token. Please try again.');
        return;
      }

      setToken(newToken);
      setShouldRender(true);
      console.log('Token received, rendering LiveKitRoom');
    } catch (error) {
      console.error('Error:', error);
      alert('Failed to connect. Please try again.');
    }
  };

  const handleDisconnected = useCallback(() => {
    console.log('Disconnected from room');
    setShouldRender(false);
    setToken('');
    router.push('/room');
  }, [router]);

  if (!shouldRender || !token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-2xl shadow-xl p-8 space-y-6">
            <div className="text-center">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Join Video Call</h1>
              <p className="text-gray-600">Enter your details to start the meeting</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="room" className="block text-sm font-medium text-gray-700 mb-2">
                  Room Name
                </label>
                <input
                  id="room"
                  type="text"
                  placeholder="Enter room name"
                  value={room}
                  onChange={(e) => setRoom(e.target.value)}
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all duration-200 placeholder-gray-400"
                />
              </div>

              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                  Your Name
                </label>
                <input
                  id="name"
                  type="text"
                  placeholder="Enter your name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all duration-200 placeholder-gray-400"
                />
              </div>

              <button 
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-200 shadow-md hover:shadow-lg transform hover:scale-[1.02] active:scale-[0.98]"
              >
                Connect to Room
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  return (
    <LiveKitRoom
      video={true} // Quan trọng: Để LiveKit tự động tạo track video
      audio={true}
      token={token}
      serverUrl={process.env.NEXT_PUBLIC_LIVEKIT_URL}
      data-lk-theme="default"
      style={{ height: '100vh' }}
      onDisconnected={handleDisconnected}
      connect={true}
    >
      <MyVideoConference />
      <RoomAudioRenderer />
      
      <AvatarControlsAndPublisher 
        is3DEnabled={is3DEnabled} 
        setIs3DEnabled={setIs3DEnabled} 
      />
    </LiveKitRoom>
  );
}

function AvatarControlsAndPublisher({ is3DEnabled, setIs3DEnabled }: { is3DEnabled: boolean, setIs3DEnabled: (v: boolean) => void }) {
  const { localParticipant } = useLocalParticipant();
  // State để lưu trữ stream webcam gốc
  const [webcamStream, setWebcamStream] = useState<MediaStream | null>(null);
  const [isCameraOn, setIsCameraOn] = useState(false);
  const trackReplacedRef = useRef(false); // Ref để đánh dấu đã replace track hay chưa

  // Effect này là "trái tim" của giải pháp mới
  useEffect(() => {
    // Chờ cho đến khi LiveKit publish xong track camera
    const cameraPub = localParticipant.getTrackPublication(Track.Source.Camera);
    // Chỉ chạy khi có track và chưa thực hiện replace
    if (!cameraPub || !cameraPub.track || !cameraPub.track.mediaStream || trackReplacedRef.current) {
      return;
    }

    // Lưu lại stream webcam gốc để truyền cho VRMVideoPublisher
    setWebcamStream(cameraPub.track.mediaStream);
    setIsCameraOn(cameraPub.track.isEnabled);

    // Tìm canvas ẩn được render bởi VRMVideoPublisher
    // Dùng một selector đáng tin cậy hơn
    const canvas = document.getElementById('vrm-canvas') as HTMLCanvasElement;
    if (!canvas) {
      console.warn("VRM Canvas not found, skipping track replacement.");
      return;
    }

    console.log("Found canvas, capturing stream and replacing track...");
    const canvasStream = canvas.captureStream(30);
    const canvasTrack = canvasStream.getVideoTracks()[0];

    if (canvasTrack && cameraPub.track instanceof LocalVideoTrack) {
      // Đây là phép màu: thay thế bộ xử lý của track gốc bằng track từ canvas
      cameraPub.track.replaceTrack(canvasTrack).then(() => {
        trackReplacedRef.current = true; // Đánh dấu đã replace thành công
        console.log("Successfully replaced webcam track with canvas track.");
      }).catch(e => {
        console.error("Failed to replace track:", e);
      });
    }

    // Lắng nghe sự kiện bật/tắt camera từ ControlBar
    const handleTrackEnabled = () => setIsCameraOn(true);
    const handleTrackDisabled = () => setIsCameraOn(false);
    
    // Dùng sự kiện của participant thay vì của track để ổn định hơn
    localParticipant.on('trackEnabled', (pub) => {
      if (pub.source === Track.Source.Camera) handleTrackEnabled();
    });
    localParticipant.on('trackDisabled', (pub) => {
      if (pub.source === Track.Source.Camera) handleTrackDisabled();
    });

    return () => {
      localParticipant.off('trackEnabled', (pub) => {
        if (pub.source === Track.Source.Camera) handleTrackEnabled();
      });
      localParticipant.off('trackDisabled', (pub) => {
        if (pub.source === Track.Source.Camera) handleTrackDisabled();
      });
    };
    // Chạy lại effect này nếu localParticipant hoặc track của nó thay đổi
  }, [localParticipant, localParticipant.getTrackPublication(Track.Source.Camera)?.track]);

  const handle3DToggle = () => {
    if (isCameraOn) {
      setIs3DEnabled(!is3DEnabled);
    }
  };

  return (
    <>
      {/* VRMVideoPublisher giờ chỉ là một "công nhân" render, được đặt trong một div ẩn */}
      <div style={{ display: 'none' }}>
        <VRMVideoPublisher enabled={is3DEnabled} webcamStream={webcamStream} />
      </div>

      {/* ControlBar giờ có thể quản lý camera một cách bình thường */}
      <div className="lk-control-bar">
        <ControlBar controls={{ camera: true, microphone: true, screenShare: true, leave: true }} />
        <button className="lk-button" onClick={handle3DToggle} disabled={!isCameraOn}>
          {is3DEnabled ? '2D' : '3D'}
        </button>
      
    </div>
    </>
  );
}

function MyVideoConference() {
  const tracks = useTracks(
    [
      { source: Track.Source.Camera, withPlaceholder: false },
      { source: Track.Source.ScreenShare, withPlaceholder: false },
    ],
    { onlySubscribed: false },
  );
  
  return (
    <GridLayout tracks={tracks} style={{ height: 'calc(100vh - 80px)' }}>
      <ParticipantTile />
    </GridLayout>
  );
}