import { useState, useEffect } from 'react';

export function useWebcamStream(
  videoRef: React.RefObject<HTMLVideoElement>,
  webcamStream: MediaStream | null
) {
  const [isCameraReady, setIsCameraReady] = useState(false);

  useEffect(() => {
    let mounted = true;

    if (webcamStream && videoRef.current) {
      videoRef.current.srcObject = webcamStream;

      videoRef.current.style.objectFit = 'cover'; 
      videoRef.current.playsInline = true;
      videoRef.current.muted = true;

      videoRef.current.onloadedmetadata = async () => {
        if (!mounted) return;

        try {
          await videoRef.current!.play();
          setIsCameraReady(true);
        } catch (error) {
          console.error('Error playing video:', error);
        }
      };

      if (videoRef.current.readyState >= videoRef.current.HAVE_CURRENT_DATA) {
        videoRef.current.play().catch((e) => console.error('Error auto-playing:', e));
        setIsCameraReady(true);
      }
    } else {
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
      setIsCameraReady(false);
    }

    return () => {
      mounted = false;
      if (videoRef.current) {
        videoRef.current.pause();
        videoRef.current.srcObject = null;
      }
    };
  }, [webcamStream, videoRef]);

  return { isCameraReady };
}