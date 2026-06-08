import { Clip } from "../types";

export function getInterpolatedProps(clip: Clip, timeInClip: number, activeMenu: string | null) {
  const normVolume = (v: number | undefined) => {
    if (v === undefined) return 100;
    if (v <= 1.0) return v * 100;
    return v;
  };

  const clipVolumeOriginal = normVolume(clip.volume);

  if (!clip.keyframes || clip.keyframes.length === 0) {
    return {
      translateX: clip.translateX,
      translateY: clip.translateY,
      rotation: clip.rotation,
      scale: clip.scale,
      opacity: clip.opacity,
      volume: clipVolumeOriginal,
    };
  }

  const kfs = [...clip.keyframes].sort((a, b) => a.timeOffset - b.timeOffset);

  // Fallback map if we don't interpolate
  const staticProps = {
    translateX: clip.translateX,
    translateY: clip.translateY,
    rotation: clip.rotation,
    scale: clip.scale,
    opacity: clip.opacity,
    volume: clipVolumeOriginal,
  };

  const isVol = activeMenu === "volume";

  // Filter keyframes to only those relevant to the current mode
  const relevantKfs = kfs.filter(k => {
    if (isVol) {
      return k.properties.volume !== undefined;
    } else {
      return k.properties.translateX !== undefined || k.properties.scale !== undefined;
    }
  });

  if (relevantKfs.length === 0) {
    return staticProps;
  }

  const getInterpolatedValue = (
    propName: "translateX" | "translateY" | "rotation" | "scale" | "opacity" | "volume",
    clipValue: number | undefined,
    fallbackDefault: number
  ) => {
    // If we're not supposed to interpolate this property in the current mode, return the clip's own static value
    if (isVol && propName !== "volume") return clipValue ?? fallbackDefault;
    if (!isVol && propName === "volume") return clipValue ?? fallbackDefault;

    // Filter relevant keyframes that actually define this property
    const activeKfs = relevantKfs.filter(k => k.properties[propName] !== undefined);
    if (activeKfs.length === 0) {
      return clipValue ?? fallbackDefault;
    }

    if (timeInClip <= activeKfs[0].timeOffset) {
      const firstVal = activeKfs[0].properties[propName];
      if (propName === "volume") return normVolume(firstVal);
      return firstVal ?? clipValue ?? fallbackDefault;
    }
    if (timeInClip >= activeKfs[activeKfs.length - 1].timeOffset) {
      const lastVal = activeKfs[activeKfs.length - 1].properties[propName];
      if (propName === "volume") return normVolume(lastVal);
      return lastVal ?? clipValue ?? fallbackDefault;
    }

    for (let i = 0; i < activeKfs.length - 1; i++) {
      const startKf = activeKfs[i];
      const endKf = activeKfs[i + 1];

      if (timeInClip >= startKf.timeOffset && timeInClip <= endKf.timeOffset) {
        const range = endKf.timeOffset - startKf.timeOffset;
        let progress = (timeInClip - startKf.timeOffset) / range;

        switch (startKf.curve) {
          case "easeIn": 
            progress = progress * progress; 
            break;
          case "easeOut": 
            progress = progress * (2 - progress); 
            break;
          case "easeInOut": 
            progress = progress < 0.5 ? 2 * progress * progress : -1 + (4 - 2 * progress) * progress; 
            break;
          case "hold": 
            progress = 0; 
            break;
          case "linear": 
          default: 
            break;
        }

        const startRaw = startKf.properties[propName];
        const endRaw = endKf.properties[propName];

        const s = propName === "volume" ? normVolume(startRaw) : (startRaw ?? clipValue ?? fallbackDefault);
        const e = propName === "volume" ? normVolume(endRaw) : (endRaw ?? clipValue ?? fallbackDefault);
        return s + (e - s) * progress;
      }
    }

    return clipValue ?? fallbackDefault;
  };

  return {
    translateX: getInterpolatedValue("translateX", clip.translateX, 0),
    translateY: getInterpolatedValue("translateY", clip.translateY, 0),
    rotation: getInterpolatedValue("rotation", clip.rotation, 0),
    scale: Math.max(0.01, getInterpolatedValue("scale", clip.scale, 1)),
    opacity: Math.max(0, Math.min(1, getInterpolatedValue("opacity", clip.opacity, 1))),
    volume: Math.max(0, Math.min(100, getInterpolatedValue("volume", clip.volume, 100))),
  };
}
