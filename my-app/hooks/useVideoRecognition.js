import { create } from "zustand";

export const useVideoRecognition = create((set) => ({
  videoElement: null,
  setVideoElement: (videoElement) => set({ videoElement }),
  resultsCallback: null,
  setResultsCallback: (resultsCallback) => set({ resultsCallback }),
  riggedFace: null, // WFLW face rig data
  setRiggedFace: (riggedFace) => set({ riggedFace }),
}));
