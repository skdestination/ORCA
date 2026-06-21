import React, { useRef, useEffect } from "react";
import { Clip } from "../types";

export function VideoRenderer({
  id,
  clip,
  currentTime,
  isPlaying,
  isMuted,
  style,
  className,
  onPointerDown,
  onError,
  volumeMultiplier = 1,
}: {
  id?: string;
  clip: Clip;
  currentTime: number;
  isPlaying: boolean;
  isMuted: boolean;
  style?: React.CSSProperties;
  className?: string;
  onPointerDown?: (e: React.PointerEvent) => void;
  onError?: () => void;
  volumeMultiplier?: number;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    video.volume = (typeof clip.volume === "number" ? clip.volume / 100 : 1) * volumeMultiplier;
    const effectiveSpeed = clip.opticalFlow ? 1 : (clip.speed || 1);
    video.playbackRate = effectiveSpeed;

    let effectiveTrimStart = clip.trimStartSeconds;
    if (clip.opticalFlow && clip.speed) {
      effectiveTrimStart = clip.trimStartSeconds / clip.speed;
    }

    const targetTime =
      (currentTime - clip.leftSeconds) * effectiveSpeed +
      effectiveTrimStart;

    if (!isPlaying) {
      if (Math.abs(video.currentTime - targetTime) > 0.04) {
        const now = performance.now();
        const lastSeekTime = (video as any)._lastSeekTime || 0;
        const timeSinceLastSeek = now - lastSeekTime;

        if (!video.seeking && timeSinceLastSeek > 30) {
          try {
            video.currentTime = targetTime;
            (video as any)._lastSeekTime = performance.now();
          } catch (e) {}
        } else {
          (video as any)._pendingSeekTime = targetTime;
          if (!(video as any)._isRafScheduled) {
            (video as any)._isRafScheduled = true;
            requestAnimationFrame(() => {
              (video as any)._isRafScheduled = false;
              if (video && (video as any)._pendingSeekTime !== undefined) {
                const pending = (video as any)._pendingSeekTime;
                (video as any)._pendingSeekTime = undefined;
                if (Math.abs(video.currentTime - pending) > 0.04 && !video.seeking) {
                  try {
                    video.currentTime = pending;
                    (video as any)._lastSeekTime = performance.now();
                  } catch (err) {}
                }
              }
            });
          }
        }
      }
      if (!video.paused) video.pause();
    } else {
      if (Math.abs(video.currentTime - targetTime) > 0.5) {
        try {
          video.currentTime = targetTime;
        } catch (e) {}
      }
      if (video.paused) {
        const playPromise = video.play();
        if (playPromise !== undefined) {
          playPromise.catch((e) => {
            if (e.name !== "AbortError") console.error("Video play failed", e);
          });
        }
      }
    }
  }, [
    currentTime,
    isPlaying,
    clip.leftSeconds,
    clip.trimStartSeconds,
    clip.volume,
    clip.speed,
    volumeMultiplier,
  ]);

  return (
    <video
      id={id}
      ref={videoRef}
      src={clip.src || undefined}
      className={className || "w-full h-full object-cover"}
      muted={isMuted}
      playsInline
      style={style}
      crossOrigin="anonymous"
      onPointerDown={onPointerDown}
      onError={onError}
    />
  );
}

export function AudioRenderer({
  clip,
  currentTime,
  isPlaying,
  isMuted,
  onError,
  volumeMultiplier = 1,
}: {
  clip: Clip;
  currentTime: number;
  isPlaying: boolean;
  isMuted: boolean;
  onError?: () => void;
  volumeMultiplier?: number;
}) {
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    audio.volume = (typeof clip.volume === "number" ? clip.volume / 100 : 1) * volumeMultiplier;
    const effectiveSpeed = clip.opticalFlow ? 1 : (clip.speed || 1);
    audio.playbackRate = effectiveSpeed;

    let effectiveTrimStart = clip.trimStartSeconds;
    if (clip.opticalFlow && clip.speed) {
      effectiveTrimStart = clip.trimStartSeconds / clip.speed;
    }

    const targetTime =
      (currentTime - clip.leftSeconds) * effectiveSpeed +
      effectiveTrimStart;

    if (!isPlaying) {
      if (Math.abs(audio.currentTime - targetTime) > 0.04) {
        const now = performance.now();
        const lastSeekTime = (audio as any)._lastSeekTime || 0;
        const timeSinceLastSeek = now - lastSeekTime;

        if (!audio.seeking && timeSinceLastSeek > 30) {
          try {
            audio.currentTime = targetTime;
            (audio as any)._lastSeekTime = performance.now();
          } catch (e) {}
        } else {
          (audio as any)._pendingSeekTime = targetTime;
          if (!(audio as any)._isRafScheduled) {
            (audio as any)._isRafScheduled = true;
            requestAnimationFrame(() => {
              (audio as any)._isRafScheduled = false;
              if (audio && (audio as any)._pendingSeekTime !== undefined) {
                const pending = (audio as any)._pendingSeekTime;
                (audio as any)._pendingSeekTime = undefined;
                if (Math.abs(audio.currentTime - pending) > 0.04 && !audio.seeking) {
                  try {
                    audio.currentTime = pending;
                    (audio as any)._lastSeekTime = performance.now();
                  } catch (err) {}
                }
              }
            });
          }
        }
      }
      if (!audio.paused) audio.pause();
    } else {
      if (Math.abs(audio.currentTime - targetTime) > 0.5) {
        try {
          audio.currentTime = targetTime;
        } catch (e) {}
      }
      if (audio.paused) {
        const playPromise = audio.play();
        if (playPromise !== undefined) {
          playPromise.catch((e) => {
            if (e.name !== "AbortError") console.error("Audio play failed", e);
          });
        }
      }
    }
  }, [
    currentTime,
    isPlaying,
    clip.leftSeconds,
    clip.trimStartSeconds,
    clip.volume,
    clip.speed,
    volumeMultiplier,
  ]);

  return (
    <audio ref={audioRef} src={clip.src || undefined} muted={isMuted} onError={onError} />
  );
}
