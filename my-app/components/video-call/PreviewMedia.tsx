'use client';

import { useEffect, useRef, useState } from 'react';

interface PreviewMediaProps {
  onSettingsChange: (settings: { isCameraOn: boolean; isMicOn: boolean }) => void;
}

export default function PreviewMedia({ onSettingsChange }: PreviewMediaProps) {
  const [isCameraOn, setIsCameraOn] = useState(true);
  const [isMicOn, setIsMicOn] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [audioLevel, setAudioLevel] = useState(0);
  const [videoDeviceId, setVideoDeviceId] = useState<string>('');
  const [audioDeviceId, setAudioDeviceId] = useState<string>('');
  const [devices, setDevices] = useState<{
    videoDevices: MediaDeviceInfo[];
    audioDevices: MediaDeviceInfo[];
  }>({ videoDevices: [], audioDevices: [] });
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number>();

  // Get available devices
  useEffect(() => {
    const getDevices = async () => {
      try {
        const deviceList = await navigator.mediaDevices.enumerateDevices();
        
        const videoDevices = deviceList.filter(d => d.kind === 'videoinput');
        const audioDevices = deviceList.filter(d => d.kind === 'audioinput');
        
        setDevices({ videoDevices, audioDevices });

        // Set default devices
        if (videoDevices.length > 0) setVideoDeviceId(videoDevices[0].deviceId);
        if (audioDevices.length > 0) setAudioDeviceId(audioDevices[0].deviceId);
      } catch (err) {
        console.error('Error enumerating devices:', err);
      }
    };

    getDevices();
  }, []);

  // Get webcam and mic stream
  useEffect(() => {
    if (!videoDeviceId && !audioDeviceId) return;

    const getMediaStream = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Stop existing stream
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((track) => track.stop());
        }

        const constraints: MediaStreamConstraints = {
          video: videoDeviceId ? { deviceId: { exact: videoDeviceId } } : true,
          audio: audioDeviceId ? { deviceId: { exact: audioDeviceId } } : true,
        };

        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        streamRef.current = stream;

        // Set video
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }

        // Enable/disable tracks based on state
        const videoTrack = stream.getVideoTracks()[0];
        const audioTrack = stream.getAudioTracks()[0];
        
        if (videoTrack) videoTrack.enabled = isCameraOn;
        if (audioTrack) audioTrack.enabled = isMicOn;

        // Setup audio analyzer
        setupAudioAnalyzer(stream);

        setIsLoading(false);
      } catch (err) {
        console.error('Error accessing media devices:', err);
        setError('Could not access camera or microphone. Please check permissions.');
        setIsLoading(false);
      }
    };

    getMediaStream();

    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [videoDeviceId, audioDeviceId]);

  // Update track enabled state when toggle buttons are clicked
  useEffect(() => {
    if (streamRef.current) {
      const videoTrack = streamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = isCameraOn;
      }
    }
  }, [isCameraOn]);

  useEffect(() => {
    if (streamRef.current) {
      const audioTrack = streamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = isMicOn;
      }
    }
  }, [isMicOn]);

  // Setup audio analyzer
  const setupAudioAnalyzer = (stream: MediaStream) => {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const analyser = audioContext.createAnalyser();
      const microphone = audioContext.createMediaStreamSource(stream);
      
      analyser.fftSize = 1024;
      analyser.smoothingTimeConstant = 0.85;
      analyser.minDecibels = -90;
      analyser.maxDecibels = -10;
      microphone.connect(analyser);
      
      audioContextRef.current = audioContext;
      analyserRef.current = analyser;
      
      monitorAudioLevel();
    } catch (err) {
      console.error('Error setting up audio analyzer:', err);
    }
  };

  // Monitor audio level
  const monitorAudioLevel = () => {
    if (!analyserRef.current) return;

    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
    
    const checkLevel = () => {
      if (!analyserRef.current) return;
      
      analyserRef.current.getByteFrequencyData(dataArray);
      
      // Lọc chỉ lấy frequency thấp và trung bình (giọng nói)
      let sum = 0;
      const relevantBins = Math.floor(dataArray.length * 0.3);
      for (let i = 0; i < relevantBins; i++) {
        sum += dataArray[i];
      }
      const average = sum / relevantBins;
      
      // Boost mạnh hơn cho giọng nói
      const boostedLevel = Math.pow(average / 100, 0.6) * 150;
      const normalizedLevel = Math.min(100, Math.max(0, boostedLevel));
      
      setAudioLevel(isMicOn ? normalizedLevel : 0);
      
      animationFrameRef.current = requestAnimationFrame(checkLevel);
    };
    
    checkLevel();
  };

  // Notify parent when settings change
  useEffect(() => {
    onSettingsChange({ isCameraOn, isMicOn });
  }, [isCameraOn, isMicOn, onSettingsChange]);

  return (
    <div className="space-y-4">
      {/* Video Preview */}
      <div className="relative bg-gray-900 rounded-lg overflow-hidden aspect-video">
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-800">
            <div className="text-white text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
              <p>Loading camera...</p>
            </div>
          </div>
        )}

        {error && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-800">
            <div className="text-red-400 text-center px-4">
              <svg className="w-12 h-12 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              <p className="text-sm">{error}</p>
            </div>
          </div>
        )}

        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className={`w-full h-full object-cover ${!isCameraOn ? 'hidden' : ''}`}
        />

        {!isCameraOn && !isLoading && !error && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-800">
            <div className="text-gray-400 text-center">
              <svg className="w-12 h-12 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              <p className="text-sm">Camera is off</p>
            </div>
          </div>
        )}

        {/* Audio Level Indicator */}
        {isMicOn && (
          <div className="absolute bottom-4 left-4 right-4">
            <div className="bg-black/50 rounded-lg p-2 backdrop-blur-sm">
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 text-white flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                </svg>
                <div className="flex-1 h-2 bg-gray-700 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-green-500 to-green-400 transition-all duration-100"
                    style={{ width: `${Math.max(5, audioLevel)}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Controls with Dropdowns */}
      <div className="space-y-4">
        {/* Camera Control Row */}
        <div className="flex items-center gap-2">
          {/* Camera Toggle Button */}
          <button
            onClick={() => setIsCameraOn(!isCameraOn)}
            disabled={isLoading || !!error}
            className={`flex items-center justify-center w-12 h-12 rounded-full transition-all duration-200 flex-shrink-0 ${
              isCameraOn
                ? 'bg-gray-700 hover:bg-gray-600 text-white'
                : 'bg-red-500 hover:bg-red-600 text-white'
            } ${isLoading || error ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
            title={isCameraOn ? 'Turn off camera' : 'Turn on camera'}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {isCameraOn ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
              )}
            </svg>
          </button>

          {/* Camera Dropdown */}
          <div className="relative flex-1">
            <select
              value={videoDeviceId}
              onChange={(e) => setVideoDeviceId(e.target.value)}
              disabled={isLoading || !!error || devices.videoDevices.length === 0}
              className={`w-full pl-3 pr-10 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none bg-white ${
                isLoading || error || devices.videoDevices.length === 0 ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
              }`}
            >
              {devices.videoDevices.length === 0 ? (
                <option>No camera found</option>
              ) : (
                devices.videoDevices.map((device) => (
                  <option key={device.deviceId} value={device.deviceId}>
                    {device.label || `Camera ${device.deviceId.slice(0, 8)}`}
                  </option>
                ))
              )}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-gray-500">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
        </div>

        {/* Microphone Control Row */}
        <div className="flex items-center gap-2">
          {/* Microphone Toggle Button */}
          <button
            onClick={() => setIsMicOn(!isMicOn)}
            disabled={isLoading || !!error}
            className={`flex items-center justify-center w-12 h-12 rounded-full transition-all duration-200 flex-shrink-0 ${
              isMicOn
                ? 'bg-gray-700 hover:bg-gray-600 text-white'
                : 'bg-red-500 hover:bg-red-600 text-white'
            } ${isLoading || error ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
            title={isMicOn ? 'Mute microphone' : 'Unmute microphone'}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {isMicOn ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
              )}
            </svg>
          </button>

          {/* Microphone Dropdown */}
          <div className="relative flex-1">
            <select
              value={audioDeviceId}
              onChange={(e) => setAudioDeviceId(e.target.value)}
              disabled={isLoading || !!error || devices.audioDevices.length === 0}
              className={`w-full pl-3 pr-10 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none bg-white ${
                isLoading || error || devices.audioDevices.length === 0 ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
              }`}
            >
              {devices.audioDevices.length === 0 ? (
                <option>No microphone found</option>
              ) : (
                devices.audioDevices.map((device) => (
                  <option key={device.deviceId} value={device.deviceId}>
                    {device.label || `Microphone ${device.deviceId.slice(0, 8)}`}
                  </option>
                ))
              )}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-gray-500">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}