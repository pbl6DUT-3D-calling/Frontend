export {};

declare global {
  interface Window {
    _lastAITrackingEyeLog?: number;
    _lastBlinkLog?: number;
    _mediaPipeWarningShown?: boolean;
  }
}