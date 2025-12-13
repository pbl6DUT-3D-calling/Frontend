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
import PreviewMedia from '@/components/video-call/PreviewMedia';
import { ModelProvider } from '@/context/modelContext';
import { VRMProvider } from '@/context/vrmContext'

export default function Page() {
  const params = useSearchParams();
  const router = useRouter();

  const [room, setRoom] = useState<string>('');
  const [name, setName] = useState<string>('');
  const [token, setToken] = useState<string>('');
  const [shouldRender, setShouldRender] = useState(false);
  const [is3DEnabled, setIs3DEnabled] = useState(false);
  const [previewSettings, setPreviewSettings] = useState({
    isCameraOn: true,
    isMicOn: true
  });

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
      throw e;
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
        <div className="w-full max-w-6xl">
          {/* Back Button */}
          <button
            onClick={() => router.push('/')}
            className="mb-6 flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            <span className="font-medium">Back to Home</span>
          </button>

          {/* Main Card - Unified */}
          <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
            <div className="grid grid-cols-1 lg:grid-cols-2">
              
              {/* Left Column: Form */}
              <div className="p-8 lg:p-10 space-y-6 lg:border-r border-gray-200">
                <div className="text-center lg:text-left">
                  <h1 className="text-3xl font-bold text-gray-900 mb-2">Join Video Call</h1>
                  <p className="text-gray-600">Enter your details to start the meeting</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                  <div>
                    <label htmlFor="room" className="block text-sm font-medium text-gray-700 mb-2">
                      Room Name
                    </label>
                    <input
                      id="room"
                      type="text"
                      placeholder="e.g., team-meeting"
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
                      placeholder="e.g., John Doe"
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
                    Join Room
                  </button>
                </form>

                {/* Info Section */}
                <div className="pt-4 border-t border-gray-200">
                  <p className="text-xs text-gray-500 text-center lg:text-left">
                    Make sure your camera and microphone are ready before joining
                  </p>
                </div>
              </div>

              {/* Right Column: Preview */}
              <div className="p-8 lg:p-10 bg-gray-50">
                <div className="mb-6">
                  <h2 className="text-xl font-bold text-gray-900 mb-2">Device Preview</h2>
                  <p className="text-sm text-gray-600">Test your camera and microphone</p>
                </div>
                
                <PreviewMedia onSettingsChange={setPreviewSettings} />
                
                {/* Preview Settings Summary */}
                <div className="mt-6 p-4 bg-blue-50 border border-blue-100 rounded-lg">
                  <div className="flex items-start gap-3">
                    <svg className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div>
                      <p className="text-sm font-medium text-blue-900">Ready to join</p>
                      <p className="text-xs text-blue-700 mt-1">
                        Your settings will be applied when you enter the room
                      </p>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          </div>

          {/* Footer */}
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              Having trouble? Check your browser permissions for camera and microphone access.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <ModelProvider>
      <VRMProvider> {/* ⬅️ THÊM wrap VRMProvider */}
        <LiveKitRoom
          video={previewSettings.isCameraOn} 
          audio={previewSettings.isMicOn}
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
      </VRMProvider> {/* ⬅️ ĐÓNG VRMProvider */}
    </ModelProvider>
  );
}

function AvatarControlsAndPublisher({ is3DEnabled, setIs3DEnabled }: { is3DEnabled: boolean, setIs3DEnabled: (v: boolean) => void }) {
  const { localParticipant } = useLocalParticipant();
  const [webcamStream, setWebcamStream] = useState<MediaStream | null>(null);
  const [isCameraOn, setIsCameraOn] = useState(false);
  const trackReplacedRef = useRef(false);
  const originalWebcamStreamRef = useRef<MediaStream | null>(null); // ===== THÊM: Lưu stream gốc =====

  useEffect(() => {
    const cameraPub = localParticipant.getTrackPublication(Track.Source.Camera);
    
    if (cameraPub) {
    const isEnabled = !cameraPub.isMuted;
    setIsCameraOn(isEnabled);
    console.log('Camera track found, enabled:', isEnabled);
  }

  if (!cameraPub || !cameraPub.track || !cameraPub.track.mediaStream || trackReplacedRef.current) {
    return;
  }

    // ===== QUAN TRỌNG: Lưu stream webcam GỐC vào ref =====
    const originalStream = cameraPub.track.mediaStream;
    originalWebcamStreamRef.current = originalStream;
    
    // ===== Clone stream để giữ nguyên stream gốc =====
    const clonedStream = originalStream.clone();
    setWebcamStream(clonedStream);
    
    console.log('Saved original webcam stream:', {
      videoTracks: originalStream.getVideoTracks().length,
      audioTracks: originalStream.getAudioTracks().length
    });

    const canvas = document.getElementById('vrm-canvas') as HTMLCanvasElement;
    if (!canvas) {
      console.warn("VRM Canvas not found, skipping track replacement.");
      return;
    }

    console.log("Found canvas, capturing stream and replacing track...");
    const canvasStream = canvas.captureStream(30);
    const canvasTrack = canvasStream.getVideoTracks()[0];

    if (canvasTrack && cameraPub.track instanceof LocalVideoTrack) {
      cameraPub.track.replaceTrack(canvasTrack).then(() => {
        trackReplacedRef.current = true;
        console.log("Successfully replaced webcam track with canvas track.");
      }).catch(e => {
        console.error("Failed to replace track:", e);
      });
    }

    const handleTrackMuted = (pub: any) => {
      if (pub.source === Track.Source.Camera) {
        console.log('Camera track muted/disabled');
        setIsCameraOn(false);
      }
    };

    const handleTrackUnmuted = (pub: any) => {
      if (pub.source === Track.Source.Camera) {
        console.log('Camera track unmuted/enabled');
        setIsCameraOn(true);
      }
    };

    localParticipant.on('trackMuted', handleTrackMuted);
    localParticipant.on('trackUnmuted', handleTrackUnmuted);

    return () => {
      localParticipant.off('trackMuted', handleTrackMuted);
      localParticipant.off('trackUnmuted', handleTrackUnmuted);
      
      // ===== Cleanup cloned stream =====
      if (clonedStream) {
        clonedStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [localParticipant, localParticipant.getTrackPublication(Track.Source.Camera)?.track]);

  const handle3DToggle = () => {
    setIs3DEnabled(!is3DEnabled);
    console.log('Toggling 3D mode:', !is3DEnabled);
  };

  return (
    <>
      <div style={{ display: 'none' }}>
        <VRMVideoPublisher enabled={is3DEnabled} webcamStream={webcamStream} />
      </div>

      <div className="lk-control-bar">
        <ControlBar controls={{ camera: true, microphone: true, screenShare: true, leave: true }} />
        <button 
          className="lk-button" 
          onClick={handle3DToggle}
          style={{
            backgroundColor: is3DEnabled ? '#10b981' : '#6b7280',
            color: 'white',
            padding: '10px 20px',
            borderRadius: '8px',
            border: 'none',
            cursor: 'pointer',
            fontWeight: 'bold',
          }}
        >
          {is3DEnabled ? 'VTuber Mode' : 'Camera Mode'}
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