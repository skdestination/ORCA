export type Screen = "home" | "editor" | "settings";

export type Layer = {
  id: string; // unique ID
  order: number; // For Up/Down sorting. Lower = deeper layer, Higher = top layer.
  isMuted: boolean;
  isHidden: boolean;
  name?: string;
};

export type Keyframe = {
  id: string;
  timeOffset: number; // Offset from clip's leftSeconds
  properties: {
    volume?: number;
    translateX?: number;
    translateY?: number;
    rotation?: number;
    scale?: number;
    opacity?: number;
  };
  curve?: "linear" | "easeIn" | "easeOut" | "easeInOut" | "hold";
};

export type Clip = {
  id: string;
  layerId: string;
  type: "video" | "image" | "audio" | "text";
  src: string;
  originalSrc?: string;
  fileId?: string;
  text?: string;
  color?: string;
  fontFamily?: string;
  fontSize?: number;
  textAnimation?: string;
  leftSeconds: number; // Start time on timeline
  durationSeconds: number; // Length on timeline
  originalDurationSeconds?: number; // Original source duration
  trimStartSeconds: number; // Offset within the source media
  volume?: number; // 0 to 100
  speed?: number; // playback speed modifier
  opticalFlow?: boolean; // smooth slow-motion
  translateX?: number;
  translateY?: number;
  rotation?: number;
  scale?: number;
  maskType?: "none" | "circle" | "square" | "rounded";
  cropRatio?: "1:1" | "16:9" | "9:16" | "4:3" | "free" | null;
  cropRect?: { top: number, right: number, bottom: number, left: number };
  opacity?: number;
  mixBlendMode?: "normal" | "multiply" | "screen" | "overlay" | "darken" | "lighten" | "color-dodge" | "color-burn" | "hard-light" | "soft-light" | "difference" | "exclusion" | "hue" | "saturation" | "color" | "luminosity";
  keyframes?: Keyframe[];
};

export type Project = {
  id: string;
  name: string;
  ratio: string;
  updatedAt: string;
  duration: string;
  size: string;
  thumbnail: string;
  layers: Layer[];
  clips: Clip[];
};
