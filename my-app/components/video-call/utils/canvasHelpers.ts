import { CANVAS_CONFIG } from './constants';

export function clearCanvas(canvas: HTMLCanvasElement): void {
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }
}

export function drawPlaceholder(
  canvas: HTMLCanvasElement,
  message: string
): void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  
  ctx.fillStyle = '#212121';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  ctx.fillStyle = '#ffffff';
  ctx.font = '16px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(message, canvas.width / 2, canvas.height / 2);
}

export function drawVideoMirrored(
  ctx: CanvasRenderingContext2D,
  video: HTMLVideoElement,
  width: number,
  height: number
): void {
  ctx.save();
  ctx.scale(-1, 1);
  ctx.drawImage(video, -width, 0, width, height);
  ctx.restore();
}

export function drawVideoNormal(
  ctx: CanvasRenderingContext2D,
  video: HTMLVideoElement,
  width: number,
  height: number
): void {
  ctx.drawImage(video, 0, 0, width, height);
}

export function copyCanvasMirrored(
  ctx: CanvasRenderingContext2D,
  sourceCanvas: HTMLCanvasElement,
  width: number
): void {
  ctx.save();
  ctx.scale(-1, 1);
  ctx.drawImage(sourceCanvas, -width, 0);
  ctx.restore();
}

export function canDrawVideo(
  video: HTMLVideoElement,
  isCameraReady: boolean,
  webcamStream: MediaStream | null
): boolean {
  return (
    isCameraReady &&
    !!webcamStream &&
    video.readyState >= video.HAVE_CURRENT_DATA &&
    video.videoWidth > 0 &&
    video.videoHeight > 0
  );
}