'use client';

import { useState, useRef, useCallback } from 'react';
import { useRoomContext, useParticipants } from '@livekit/components-react';

export interface RecordingOptions {
  type: 'screen' | 'participant' | 'fullroom';
  participantId?: string;
  fileName?: string;
}

export function useRecording() {
  const room = useRoomContext();
  const participants = useParticipants();
  const [isRecording, setIsRecording] = useState(false);
  const [recordingType, setRecordingType] = useState<'screen' | 'participant' | 'fullroom' | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  // 🎥 Ghi màn hình của chính mình
  const startScreenRecording = useCallback(async () => {
    try {
      const screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: { mediaSource: 'screen' },
        audio: true,
      });

      const mediaRecorder = new MediaRecorder(screenStream, {
        mimeType: 'video/webm;codecs=vp9',
      });

      chunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'video/webm' });
        downloadRecording(blob, 'screen-recording');
        
        // Dừng tất cả tracks
        screenStream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start(1000); // Lưu chunk mỗi 1 giây
      mediaRecorderRef.current = mediaRecorder;
      setIsRecording(true);
      setRecordingType('screen');

      console.log('✅ Screen recording started');
    } catch (error) {
      console.error('❌ Failed to start screen recording:', error);
      alert('Failed to start screen recording. Please check permissions.');
    }
  }, []);

  // 👤 Ghi video của một participant cụ thể
  const startParticipantRecording = useCallback(async (participantId: string) => {
    try {
      const participant = participants.find(p => p.sid === participantId);
      if (!participant) {
        alert('Participant not found');
        return;
      }

      // Lấy video track của participant
      const videoTrack = participant.videoTrackPublications.values().next().value?.track;
      const audioTrack = participant.audioTrackPublications.values().next().value?.track;

      if (!videoTrack) {
        alert('Participant has no video track');
        return;
      }

      // Tạo MediaStream từ tracks
      const stream = new MediaStream();
      if (videoTrack.mediaStream) {
        videoTrack.mediaStream.getVideoTracks().forEach(track => stream.addTrack(track));
      }
      if (audioTrack?.mediaStream) {
        audioTrack.mediaStream.getAudioTracks().forEach(track => stream.addTrack(track));
      }

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'video/webm;codecs=vp9',
      });

      chunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'video/webm' });
        downloadRecording(blob, `participant-${participant.name || participant.identity}`);
      };

      mediaRecorder.start(1000);
      mediaRecorderRef.current = mediaRecorder;
      setIsRecording(true);
      setRecordingType('participant');

      console.log(`✅ Recording participant: ${participant.name}`);
    } catch (error) {
      console.error('❌ Failed to record participant:', error);
      alert('Failed to record participant.');
    }
  }, [participants]);

  // 🎬 Ghi toàn bộ phòng (composite recording)
  const startFullRoomRecording = useCallback(async () => {
    try {
      // Tạo canvas để composite tất cả video
      const canvas = document.createElement('canvas');
      canvas.width = 1920;
      canvas.height = 1080;
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        alert('Canvas not supported');
        return;
      }

      // Lấy tất cả video elements
      const videoElements = Array.from(document.querySelectorAll('video')) as HTMLVideoElement[];

      if (videoElements.length === 0) {
        alert('No video tracks to record');
        return;
      }

      // Capture canvas stream
      const canvasStream = canvas.captureStream(30);

      // Thêm audio từ room
      const audioContext = new AudioContext();
      const destination = audioContext.createMediaStreamDestination();
      
      participants.forEach(participant => {
        participant.audioTrackPublications.forEach(pub => {
          if (pub.track?.mediaStream) {
            const source = audioContext.createMediaStreamSource(pub.track.mediaStream);
            source.connect(destination);
          }
        });
      });

      // Merge audio và video
      destination.stream.getAudioTracks().forEach(track => {
        canvasStream.addTrack(track);
      });

      // Draw loop
      const drawFrame = () => {
        if (!mediaRecorderRef.current || mediaRecorderRef.current.state !== 'recording') {
          return;
        }

        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Grid layout
        const cols = Math.ceil(Math.sqrt(videoElements.length));
        const rows = Math.ceil(videoElements.length / cols);
        const cellWidth = canvas.width / cols;
        const cellHeight = canvas.height / rows;

        videoElements.forEach((video, index) => {
          if (video.readyState >= 2) {
            const col = index % cols;
            const row = Math.floor(index / cols);
            ctx.drawImage(
              video,
              col * cellWidth,
              row * cellHeight,
              cellWidth,
              cellHeight
            );
          }
        });

        requestAnimationFrame(drawFrame);
      };

      const mediaRecorder = new MediaRecorder(canvasStream, {
        mimeType: 'video/webm;codecs=vp9',
        videoBitsPerSecond: 2500000,
      });

      chunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'video/webm' });
        downloadRecording(blob, `room-${room.name}`);
        audioContext.close();
      };

      mediaRecorder.start(1000);
      mediaRecorderRef.current = mediaRecorder;
      setIsRecording(true);
      setRecordingType('fullroom');

      drawFrame();

      console.log('✅ Full room recording started');
    } catch (error) {
      console.error('❌ Failed to start full room recording:', error);
      alert('Failed to start full room recording.');
    }
  }, [participants, room.name]);

  // ⏹️ Dừng ghi
  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setRecordingType(null);
      console.log('⏹️ Recording stopped');
    }
  }, []);

  // 💾 Download file
  const downloadRecording = (blob: Blob, baseName: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = url;
    a.download = `${baseName}-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.webm`;
    document.body.appendChild(a);
    a.click();
    
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 100);

    console.log(`💾 Recording saved: ${a.download}`);
  };

  return {
    isRecording,
    recordingType,
    startScreenRecording,
    startParticipantRecording,
    startFullRoomRecording,
    stopRecording,
    participants,
  };
}