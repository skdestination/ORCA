import React, {
  useState,
  useRef,
  useEffect,
  useMemo,
  useCallback,
} from "react";
import {
  Play,
  Pause,
  Undo2,
  Redo2,
  Trash2,
  PlusCircle,
  ChevronLeft,
  ChevronDown,
  ArrowUpDown,
  Volume2,
  VolumeX,
  Eye,
  EyeOff,
  Scissors,
  Clock,
  SlidersHorizontal,
  Crop,
  Star,
  MoreVertical,
  Plus as PlusIcon,
  Settings,
  Copy,
  Check,
  X,
  Save,
  Move,
  Wand2,
  Activity,
  Blend,
  SkipBack,
  AlertCircle,
  ArrowUp,
  ArrowDown,
  Type,
  Smile,
  Image as ImageIcon,
  ListOrdered,
  List,
  Diamond,
  LineChart,
  SquareDashed,
  Music,
  Download,
  Share,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { processSmoothSlowMoBrowser } from "./lib/opticalFlow";
import { SpeedCurveEditor } from "./SpeedCurveEditor";
import { TextEditorMenu } from "./TextEditorMenu";

import { Screen, Layer, Keyframe, Clip, Project } from "./types";
import { getInterpolatedProps } from "./lib/utils";
import { VideoRenderer, AudioRenderer } from "./components/Renderers";
import { MinusIcon, CompactRulerControl, SpeedRulerControl } from "./components/Controls";

// --- Mock Data & Constants ---
const BASE_PIXELS_PER_SECOND = 100;

export const DEFAULT_FLOW_BAR_ORDER = [
  'volume',
  'text',
  'crop',
  'adjust',
  'speed',
  'stabilize',
  'copy',
  'extract-audio',
  'move',
  'magic',
  'activity',
  'mask',
];

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<Screen>("home");
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [projectMenuOpenId, setProjectMenuOpenId] = useState<string | null>(
    null,
  );
  const [projectToDelete, setProjectToDelete] = useState<string | null>(null);

  const [flowBarOrder, setFlowBarOrder] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem("ai_studio_video_flowbar_order");
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return DEFAULT_FLOW_BAR_ORDER;
  });

  // Home Screen State
  const [projects, setProjects] = useState<Project[]>(() => {
    try {
      const saved = localStorage.getItem("ai_studio_video_projects");
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return [
      {
        id: "1",
        name: "Summer Vacation",
        ratio: "9:16",
        updatedAt: "2 hours ago",
        duration: "00:15",
        size: "124 MB",
        thumbnail:
          "https://images.unsplash.com/photo-1542204165-65bf26472b9b?auto=format&fit=crop&q=80&w=300",
        layers: [],
        clips: [],
      },
    ];
  });
  
  const [appScale, setAppScale] = useState(1);
  useEffect(() => {
    try {
      const savedScale = localStorage.getItem("ai_studio_app_scale");
      if (savedScale && !isNaN(parseFloat(savedScale))) {
        setAppScale(parseFloat(savedScale));
      }
    } catch(e){}
    try {
      const savedFonts = localStorage.getItem('ai_studio_custom_fonts');
      if (savedFonts) {
        const fonts = JSON.parse(savedFonts);
        fonts.forEach((f: any) => {
          const newFont = new FontFace(f.name, `url(${f.url})`);
          newFont.load().then((loadedFace) => {
            document.fonts.add(loadedFace);
          }).catch((err) => console.error("Failed to load font on startup", f.name, err));
        });
      }
    } catch(e){}
  }, []);

  const handleAppScaleChange = (scale: number) => {
    setAppScale(scale);
    localStorage.setItem("ai_studio_app_scale", scale.toString());
  };

  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [isCreatingProject, setIsCreatingProject] = useState(false);
  const [selectedRatioTransition, setSelectedRatioTransition] = useState<
    string | null
  >(null);
  const [focusedRatio, setFocusedRatio] = useState<string>("9:16");
  const [customRatioW, setCustomRatioW] = useState("1080");
  const [customRatioH, setCustomRatioH] = useState("1920");

  // Editor State
  const [currentProjectRatio, setCurrentProjectRatio] =
    useState<string>("9:16");
  const [layers, setLayers] = useState<Layer[]>([]);
  const [clips, setClips] = useState<Clip[]>([]);
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1); // 1 = normal, 2 = zoomed in
  const [playheadX, setPlayheadX] = useState(150);
  const playheadXRef = useRef(150);
  const [activeExpandedMenu, setActiveExpandedMenu] = useState<string | null>(
    null,
  );
  const [layerMenuOpenId, setLayerMenuOpenId] = useState<string | null>(null);
  const [draggingLayerId, setDraggingLayerId] = useState<string | null>(null);
  const hasDraggedLayerRef = useRef(false);
  const [applyVolumeToAll, setApplyVolumeToAll] = useState(false);
  const [clipVolume, setClipVolume] = useState(100);
  const [clipSpeed, setClipSpeed] = useState(1);
  const [smoothProcessingProgress, setSmoothProcessingProgress] = useState<
    number | null
  >(null);
  const [selectedClipIds, setSelectedClipIds] = useState<string[]>([]);
  const selectedClipId = selectedClipIds.length === 1 ? selectedClipIds[0] : null;
  const setSelectedClipId = (id: string | null) => setSelectedClipIds(id === null ? [] : [id]);
  const [marquee, setMarquee] = useState<{ startX: number, startY: number, currentX: number, currentY: number } | null>(null);
  const [showKeyframeGraph, setShowKeyframeGraph] = useState(false);
  
  const selectedClip = clips.find((c) => c.id === selectedClipId);
  const isAtKeyframe = selectedClip?.keyframes?.some(k => {
    const isClose = Math.abs(currentTime - (selectedClip.leftSeconds + k.timeOffset)) < 0.05;
    if (!isClose) return false;
    if (activeExpandedMenu === "volume") {
      return k.properties.volume !== undefined;
    } else {
      return k.properties.translateX !== undefined || k.properties.scale !== undefined;
    }
  }) ?? false;

  const isBetweenKeyframes = (selectedClip?.keyframes?.filter(k => {
    if (activeExpandedMenu === "volume") {
      return k.properties.volume !== undefined;
    } else {
      return k.properties.translateX !== undefined || k.properties.scale !== undefined;
    }
  }).length ?? 0) >= 2;

  const [isExportExpanded, setIsExportExpanded] = useState(false);
  const [pillPopup, setPillPopup] = useState<{ message: string; progress?: number; type: 'info' | 'loading' } | null>(null);
  const [isRatioExpanded, setIsRatioExpanded] = useState(false);
  const [exportResolution, setExportResolution] = useState("4K");
  const [exportFps, setExportFps] = useState("30");
  const [exportBitrate, setExportBitrate] = useState("High");
  const [exportOpticalFlow, setExportOpticalFlow] = useState(true);
  const [erroredClips, setErroredClips] = useState<Set<string>>(new Set());

  const handleClipError = (clipId: string) => {
    setErroredClips((prev) => {
      if (prev.has(clipId)) return prev;
      const newSet = new Set(prev);
      newSet.add(clipId);
      return newSet;
    });
  };

  const [copiedClip, setCopiedClip] = useState<Clip | null>(null);
  const [pastePopup, setPastePopup] = useState<{
    x: number;
    y: number;
    time: number;
    layerId?: string;
  } | null>(null);
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const pointerMoveCanvasRef = useRef(false);

  const [history, setHistory] = useState<{ layers: Layer[]; clips: Clip[] }[]>([
    { layers: [], clips: [] },
  ]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const isUndoRedoAction = useRef(false);

  const historyStateRef = useRef({ history, historyIndex });
  useEffect(() => {
    historyStateRef.current = { history, historyIndex };
  }, [history, historyIndex]);

  useEffect(() => {
    if (selectedClipId) {
      const clip = clips.find((c) => c.id === selectedClipId);
      if (clip) {
        setClipVolume(prev => {
          const val = typeof clip.volume === "number" ? clip.volume : 100;
          return prev === val ? prev : val;
        });
      }
    }
  }, [selectedClipId, clips]);

  useEffect(() => {
    // Intentional omission of empty layer cleanup so users can add empty layers
  }, [clips, layers]);

  useEffect(() => {
    // Identify and clean up any text clips that are empty/whitespace only and are not currently active/selected
    const emptyTextClips = clips.filter(
      (c) =>
        c.type === "text" &&
        (!c.text || c.text.trim() === "") &&
        (c.id !== selectedClipId || activeExpandedMenu !== "text")
    );

    if (emptyTextClips.length > 0) {
      const idsToRemove = emptyTextClips.map((c) => c.id);
      const layersToRemove = emptyTextClips.map((c) => c.layerId);

      // Remove the empty layers associated with deleted text clips
      setLayers((prevLayers) => prevLayers.filter((l) => !layersToRemove.includes(l.id)));

      // Remove from the selection list if needed
      setSelectedClipIds((prevSel) => {
        const updated = prevSel.filter((id) => !idsToRemove.includes(id));
        return prevSel.length === updated.length ? prevSel : updated;
      });

      setClips((prevClips) => prevClips.filter((c) => !idsToRemove.includes(c.id)));
    }
  }, [clips, selectedClipId, activeExpandedMenu]);

  useEffect(() => {
    if (isUndoRedoAction.current) {
      isUndoRedoAction.current = false;
      return;
    }
    const timeout = setTimeout(() => {
      const { history: latestHistory, historyIndex: latestIndex } = historyStateRef.current;
      const last = latestHistory[latestIndex] || latestHistory[latestHistory.length - 1];
      if (
        last &&
        JSON.stringify(last.layers) === JSON.stringify(layers) &&
        JSON.stringify(last.clips) === JSON.stringify(clips)
      ) {
        return;
      }
      let newHistory = latestHistory.slice(0, latestIndex + 1);
      newHistory.push({ layers, clips });
      if (newHistory.length > 50) newHistory = newHistory.slice(newHistory.length - 50);
      
      setHistory(newHistory);
      setHistoryIndex(newHistory.length - 1);
    }, 300);

    return () => clearTimeout(timeout);
  }, [layers, clips]);

  const undo = () => {
    if (historyIndex > 0) {
      isUndoRedoAction.current = true;
      const prev = history[historyIndex - 1];
      setLayers(prev.layers);
      setClips(prev.clips);
      setHistoryIndex(historyIndex - 1);
    }
  };

  const redo = () => {
    if (historyIndex < history.length - 1) {
      isUndoRedoAction.current = true;
      const next = history[historyIndex + 1];
      setLayers(next.layers);
      setClips(next.clips);
      setHistoryIndex(historyIndex + 1);
    }
  };

  const fileInputRef = useRef<HTMLInputElement>(null);
  const timelineScrollRef = useRef<HTMLDivElement>(null);
  const animationFrameRef = useRef<number>();
  const lastTimeRef = useRef<number>();

  // Real-time synchronization
  const isPlayingRef = useRef(isPlaying);
  // Important: timeline zoom level affects pixels per second
  const pixelsPerSecond = BASE_PIXELS_PER_SECOND * zoomLevel;

  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);

  useEffect(() => {
    const playLoop = (time: number) => {
      if (lastTimeRef.current === undefined) lastTimeRef.current = time;
      const deltaTime = (time - lastTimeRef.current) / 1000;
      lastTimeRef.current = time;

      if (isPlayingRef.current) {
        setCurrentTime((prev) => {
          const next = prev + deltaTime;
          if (timelineScrollRef.current) {
            const container = timelineScrollRef.current;
            container.scrollLeft = Math.max(
              0,
              next * pixelsPerSecond - playheadXRef.current,
            );
          }
          return next;
        });
      }
      animationFrameRef.current = requestAnimationFrame(playLoop);
    };
    animationFrameRef.current = requestAnimationFrame(playLoop);

    return () => {
      if (animationFrameRef.current)
        cancelAnimationFrame(animationFrameRef.current);
    };
  }, [pixelsPerSecond]);

  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [exportedVideoUrl, setExportedVideoUrl] = useState<string | null>(null);
  const [exportedVideoBlob, setExportedVideoBlob] = useState<Blob | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const startExport = async () => {
    let maxDuration = 0;
    for (const c of clips) {
      if (c.leftSeconds + c.durationSeconds > maxDuration) {
        maxDuration = c.leftSeconds + c.durationSeconds;
      }
    }
    if (maxDuration === 0) {
      showToast("No clips to export.");
      setIsExportExpanded(false);
      return;
    }

    setIsExportExpanded(false);
    setIsExporting(true);
    setExportProgress(0);
    setCurrentTime(0);
    setIsPlaying(false);

    await new Promise((r) => setTimeout(r, 600)); // wait for video seek

    const canvas = document.createElement("canvas");
    let exportWidth = 1920;
    let exportHeight = 1080;
    if (exportResolution === "4K") {
      exportWidth = 3840;
      exportHeight = 2160;
    }
    if (exportResolution === "2K") {
      exportWidth = 2560;
      exportHeight = 1440;
    }

    const [rw, rh] = currentProjectRatio.split(":").map(Number);
    if (rw && rh) {
      if (rw < rh) {
        canvas.height = exportHeight;
        canvas.width = exportHeight * (rw / rh);
      } else {
        canvas.width = exportWidth;
        canvas.height = exportWidth * (rh / rw);
      }
    }
    const ctx = canvas.getContext("2d")!;

    const fps = parseInt(exportFps) || 30;
    const stream = canvas.captureStream(fps);

    const recorder = new MediaRecorder(stream, { mimeType: "video/webm" });
    const chunks: Blob[] = [];
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunks.push(e.data);
    };
    recorder.onstop = () => {
      const blob = new Blob(chunks, { type: "video/webm" });
      const url = URL.createObjectURL(blob);
      setExportedVideoBlob(blob);
      setExportedVideoUrl(url);
      setIsExporting(false);
      setExportProgress(0);
      setIsPlaying(false);
    };

    recorder.start();
    setIsPlaying(true);

    const previewEl = document.getElementById("preview-screen");
    const previewW = previewEl?.clientWidth || 1;
    const previewH = previewEl?.clientHeight || 1;

    const startTime = performance.now();
    let rAF: number;
    let playingLocal = true;

    const drawFn = () => {
      if (!playingLocal) return;

      const elapsed = (performance.now() - startTime) / 1000;

      if (elapsed >= maxDuration + 0.1) {
        playingLocal = false;
        recorder.stop();
        return;
      }

      setExportProgress(
        Math.min(100, Math.round((elapsed / maxDuration) * 100)),
      );

      ctx.fillStyle = "black";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const layerOrder = [...layers].sort((a, b) => a.order - b.order);
      for (const layer of layerOrder) {
        if (layer.isHidden) continue;
        const clip = clips.find(
          (c) =>
            c.layerId === layer.id &&
            elapsed >= c.leftSeconds &&
            elapsed <= c.leftSeconds + c.durationSeconds,
        );
        if (!clip) continue;

        const elId = `clip-media-${clip.id}`;
        const el = document.getElementById(elId) as any;
        if (el && (el.tagName === "IMG" || el.tagName === "VIDEO")) {
          ctx.save();
          ctx.translate(canvas.width / 2, canvas.height / 2);

          const scaleX = canvas.width / previewW;
          const scaleY = canvas.height / previewH;
          const absTranslateX = (clip.translateX || 0) * scaleX;
          const absTranslateY = (clip.translateY || 0) * scaleY;

          ctx.translate(absTranslateX, absTranslateY);
          ctx.rotate(((clip.rotation || 0) * Math.PI) / 180);
          ctx.scale(clip.scale ?? 1, clip.scale ?? 1);

          const imgW = el.videoWidth || el.naturalWidth || canvas.width;
          const imgH = el.videoHeight || el.naturalHeight || canvas.height;
          if (imgW && imgH) {
            const imgRatio = imgW / imgH;
            const canvasRatio = canvas.width / canvas.height;
            let drawWidth, drawHeight;
            if (imgRatio > canvasRatio) {
              drawHeight = canvas.height;
              drawWidth = canvas.height * imgRatio;
            } else {
              drawWidth = canvas.width;
              drawHeight = canvas.width / imgRatio;
            }
            ctx.drawImage(
              el,
              -drawWidth / 2,
              -drawHeight / 2,
              drawWidth,
              drawHeight,
            );
          }
          ctx.restore();
        }
      }
      rAF = requestAnimationFrame(drawFn);
    };
    rAF = requestAnimationFrame(drawFn);
  };

  const handleBackToHome = () => {
    // Save project
    showToast("Project saved successfully!");
    setIsPlaying(false);
    setCurrentScreen("home");
    setActiveProjectId(null);
  };

  useEffect(() => {
    if (currentScreen === "editor") {
      // Push an initial state when entering editor
      window.history.pushState({ screen: "editor" }, "", window.location.href);
      
      const handlePopState = (event: PopStateEvent) => {
        handleBackToHome();
      };
      
      window.addEventListener("popstate", handlePopState);
      
      return () => {
        window.removeEventListener("popstate", handlePopState);
      };
    }
  }, [currentScreen]);

  const createProject = (ratio: string) => {
    const newProjectId = Math.random().toString(36).substring(2, 9);
    const newProject: Project = {
      id: newProjectId,
      name: "New Project",
      ratio,
      updatedAt: "Just now",
      duration: "00:00",
      size: "0 MB",
      thumbnail:
        "https://images.unsplash.com/photo-1579546929518-9e396f3cc809?auto=format&fit=crop&q=80&w=300",
      layers: [],
      clips: [],
    };

    setProjects((prev) => {
      const updated = [newProject, ...prev];
      localStorage.setItem("ai_studio_video_projects", JSON.stringify(updated));
      return updated;
    });

    setActiveProjectId(newProjectId);
    setCurrentProjectRatio(ratio);
    setLayers([]);
    setClips([]);
    setCurrentTime(0);
    setZoomLevel(1);
    setCurrentScreen("editor");
  };

  const duplicateProject = (project: Project) => {
    const newProject = {
      ...project,
      id: Math.random().toString(36).substring(7),
      name: `${project.name} (Copy)`,
      lastEdited: new Date().toISOString(),
    };
    setProjects((prev) => {
      const updated = [newProject, ...prev];
      localStorage.setItem("ai_studio_video_projects", JSON.stringify(updated));
      return updated;
    });
    setProjectMenuOpenId(null);
    showToast("Project duplicated");
  };

  const confirmDeleteProject = () => {
    if (!projectToDelete) return;
    setProjects((prev) => {
      const updated = prev.filter((p) => p.id !== projectToDelete);
      localStorage.setItem("ai_studio_video_projects", JSON.stringify(updated));
      return updated;
    });
    setProjectToDelete(null);
    showToast("Project deleted");
  };

  const openProject = async (project: Project) => {
    // Show some loading indicator if needed here, but since it's local it should be fast
    let resolvedClips = project.clips || [];
    try {
      const { getFile } = await import("./lib/db");
      resolvedClips = await Promise.all(
        resolvedClips.map(async (c) => {
          if (c.fileId) {
            const blob = await getFile(c.fileId);
            if (blob) {
              const url = URL.createObjectURL(blob);
              return { ...c, src: url, originalSrc: c.originalSrc ? url : undefined };
            }
          }
          return c;
        })
      );
    } catch(err) {
      console.warn("Could not restore media blobs", err);
    }

    setActiveProjectId(project.id);
    setCurrentProjectRatio(project.ratio);
    setLayers(project.layers || []);
    setClips(resolvedClips);
    setCurrentTime(0);
    setZoomLevel(1);
    setCurrentScreen("editor");
  };

  // Auto-save
  useEffect(() => {
    if (currentScreen === "editor" && activeProjectId) {
      setProjects((prev) => {
        let hasChanges = false;
        const updated = prev.map((p) => {
          if (p.id === activeProjectId) {
            // compute max duration
            let maxDuration = 0;
            for (const c of clips) {
              if (c.leftSeconds + c.durationSeconds > maxDuration) {
                maxDuration = c.leftSeconds + c.durationSeconds;
              }
            }

            const newDuration = formatTime(maxDuration);
            if (p.ratio !== currentProjectRatio || p.layers !== layers || p.clips !== clips || p.duration !== newDuration) {
              hasChanges = true;
              return {
                ...p,
                ratio: currentProjectRatio,
                layers,
                clips,
                updatedAt: "Just now",
                duration: newDuration,
              };
            }
            return p;
          }
          return p;
        });

        if (!hasChanges) return prev;

        // We debounce local storage save slightly or just write it
        localStorage.setItem(
          "ai_studio_video_projects",
          JSON.stringify(updated),
        );
        return updated;
      });
    }
  }, [layers, clips, currentProjectRatio, activeProjectId, currentScreen]);

  const addMediaClip = (
    id: string,
    type: "video" | "audio" | "image",
    src: string,
    duration: number,
    startAtTime: number,
    fileId?: string,
  ) => {
    const newLayerId = "L_" + id;
    setLayers((prev) => {
      const maxOrder = prev.reduce((max, l) => Math.max(max, l.order), -1);
      return [
        ...prev,
        {
          id: newLayerId,
          order: maxOrder + 1,
          isHidden: false,
          isMuted: false,
        },
      ];
    });

    setClips((prev) => [
      ...prev,
      {
        id,
        layerId: newLayerId,
        type,
        src,
        fileId,
        leftSeconds: startAtTime,
        durationSeconds: duration,
        originalDurationSeconds: duration,
        trimStartSeconds: 0,
      },
    ]);
  };

  const handleAddText = () => {
    const startAtTime = currentTime;
    const duration = 5;
    const newLayerId = Math.random().toString(36).substring(2, 9);

    setLayers((prev) => {
      const minOrder =
        prev.length > 0 ? Math.min(...prev.map((l) => l.order)) : 0;
      return [
        ...prev,
        {
          id: newLayerId,
          order: minOrder - 1,
          isMuted: false,
          isHidden: false,
        },
      ];
    });

    const newTextId = Math.random().toString(36).substring(2, 9);
    setClips((prev) => [
      ...prev,
      {
        id: newTextId,
        layerId: newLayerId,
        type: "text",
        src: "",
        text: "",
        color: "#ffffff",
        fontSize: 48,
        leftSeconds: startAtTime,
        durationSeconds: duration,
        trimStartSeconds: 0,
      },
    ]);
    setSelectedClipId(newTextId);
    setActiveExpandedMenu("text");
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    let type: "video" | "image" | "audio" = "video";
    if (file.type.startsWith("image/")) type = "image";
    if (file.type.startsWith("audio/")) type = "audio";

    const src = URL.createObjectURL(file);
    const id = Math.random().toString(36).substring(2, 9);
    const fileId = "F_" + Math.random().toString(36).substring(2, 9);
    const startAtTime = currentTime;

    try {
      if (navigator.storage && navigator.storage.persist) {
        await navigator.storage.persist();
      }
      const { storeFile } = await import("./lib/db");
      await storeFile(fileId, file);
    } catch(err) {
      console.warn("Storage failed", err);
    }

    if (type === "video" || type === "audio") {
      const media =
        type === "video"
          ? document.createElement("video")
          : document.createElement("audio");
      media.preload = "metadata";
      media.onloadedmetadata = () => {
        addMediaClip(id, type, src, media.duration || 10, startAtTime, fileId);
      };
      media.src = src;
    } else {
      addMediaClip(id, type, src, 5, startAtTime, fileId);
    }
  };

  const deleteSelectedClip = () => {
    if (selectedClipIds.length > 0) {
      setClips((prev) => prev.filter((c) => !selectedClipIds.includes(c.id)));
      setSelectedClipIds([]);
      // Optional: Cleanup empty layers
    }
  };

  const handleToggleKeyframe = useCallback(() => {
    if (!selectedClipId) return;
    setClips(prev => prev.map(c => {
      if (c.id !== selectedClipId) return c;
      const timeInClip = currentTime - c.leftSeconds;
      const keyframes = c.keyframes || [];
      const isVolMode = activeExpandedMenu === "volume";

      const existingIndex = keyframes.findIndex(kf => {
        const isTimeClose = Math.abs(kf.timeOffset - timeInClip) < 0.05;
        if (!isTimeClose) return false;
        
        if (isVolMode) {
          return kf.properties.volume !== undefined;
        } else {
          return kf.properties.translateX !== undefined || kf.properties.scale !== undefined;
        }
      });

      if (existingIndex >= 0) {
        const targetKf = keyframes[existingIndex];
        let updatedProperties = { ...targetKf.properties };

        if (isVolMode) {
          delete updatedProperties.volume;
        } else {
          delete updatedProperties.translateX;
          delete updatedProperties.translateY;
          delete updatedProperties.rotation;
          delete updatedProperties.scale;
          delete updatedProperties.opacity;
        }

        if (Object.keys(updatedProperties).length === 0) {
          return {
            ...c,
            keyframes: keyframes.filter((_, i) => i !== existingIndex)
          };
        } else {
          return {
            ...c,
            keyframes: keyframes.map((k, i) => i === existingIndex ? { ...k, properties: updatedProperties } : k)
          };
        }
      } else {
        const newProperties: any = {};
        if (isVolMode) {
          const currentVol = typeof c.volume === "number" ? (c.volume <= 1.0 ? c.volume * 100 : c.volume) : 100;
          newProperties.volume = currentVol;
        } else {
          newProperties.translateX = c.translateX || 0;
          newProperties.translateY = c.translateY || 0;
          newProperties.rotation = c.rotation || 0;
          newProperties.scale = c.scale ?? 1;
          newProperties.opacity = c.opacity ?? 1;
        }

        const newKeyframe: Keyframe = {
          id: "kf_" + Date.now() + Math.random(),
          timeOffset: timeInClip,
          properties: newProperties,
          curve: "linear",
        };

        return {
          ...c,
          keyframes: [...keyframes, newKeyframe].sort((a, b) => a.timeOffset - b.timeOffset)
        };
      }
    }));
  }, [selectedClipId, currentTime, activeExpandedMenu]);

  const splitSelectedClip = () => {
    if (!selectedClipId) return;
    const clip = clips.find((c) => c.id === selectedClipId);
    if (!clip) return;

    const isWithin =
      currentTime > clip.leftSeconds &&
      currentTime < clip.leftSeconds + clip.durationSeconds;
    if (!isWithin) return;

    const firstDuration = currentTime - clip.leftSeconds;
    const newClipId = "C_" + Math.random().toString(36).substring(2, 9);

    setClips((prev) => {
      const rest = prev.filter((c) => c.id !== selectedClipId);
      const newClip1 = {
        ...clip,
        durationSeconds: firstDuration,
      };
      const newClip2 = {
        ...clip,
        id: newClipId,
        leftSeconds: currentTime,
        trimStartSeconds: clip.trimStartSeconds + firstDuration,
        durationSeconds: clip.durationSeconds - firstDuration,
      };
      return [...rest, newClip1, newClip2];
    });
  };

  const formatTime = (seconds: number) => {
    const s = Math.max(0, seconds);
    const mins = Math.floor((s % 3600) / 60);
    const secs = Math.floor(s % 60);
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const handleSmoothSlowMo = async () => {
    const currentClip = clips.find(c => c.id === selectedClipId);
    if (!currentClip || currentClip.type !== "video") return;

    const isOpticalFlowApplied = currentClip?.opticalFlow || false;

    if (isOpticalFlowApplied) {
      if (selectedClipId) {
        setClips((prev) =>
          prev.map((c) =>
            c.id === selectedClipId
              ? { ...c, opticalFlow: false, src: c.originalSrc || c.src }
              : c,
          ),
        );
      }
      return;
    }

    if (smoothProcessingProgress !== null) return;
    setSmoothProcessingProgress(0);

    try {
      if (!currentClip.src) {
        throw new Error("No video source found.");
      }
      setPillPopup({ message: "Applying Smooth Slow-mo...", progress: 0, type: 'loading' });
      
      let videoSource: string | Blob = currentClip.src;
      if (currentClip.fileId) {
        try {
          const { getFile } = await import("./lib/db");
          const cachedBlob = await getFile(currentClip.fileId);
          if (cachedBlob) {
            videoSource = cachedBlob;
          }
        } catch (dbErr) {
          console.warn("Could not retrieve file from IndexedDB:", dbErr);
        }
      }

      const { url: newSrcUrl, fileId: newFileId } = await processSmoothSlowMoBrowser(
        videoSource,
        currentClip.speed || 1,
        (progress) => {
          setPillPopup({ message: "Applying Smooth Slow-mo...", progress: Math.min(99, Math.round(progress)), type: 'loading' });
        }
      );

      setPillPopup({ message: "Smooth Slow-mo Applied", type: 'info' });

      if (selectedClipId) {
        setClips((prev) =>
          prev.map((c) =>
            c.id === selectedClipId
              ? { ...c, opticalFlow: true, originalSrc: c.originalSrc || c.src, src: newSrcUrl, fileId: newFileId }
              : c,
          ),
        );
      }

      setTimeout(() => {
        setPillPopup(null);
      }, 2000);
    } catch (err: any) {
      console.error(err);
      setPillPopup({ message: `Failed: ${err.message || 'unknown error'}`, type: 'info' });
      setTimeout(() => {
        setPillPopup(null);
      }, 5000);
      setSmoothProcessingProgress(null);
    }
  };

  const handleCopy = () => {
    const clipToCopy = clips.find((c) => c.id === selectedClipId);
    if (clipToCopy) {
      setCopiedClip(clipToCopy);
      setToastMessage("Clip copied");
      setTimeout(() => setToastMessage(null), 2000);
    }
  };

  const handleExtractAudio = () => {
    const videoClip = clips.find(c => c.id === selectedClipId && c.type === "video");
    if (!videoClip) return;

    const newClipId = "C_" + Math.random().toString(36).substring(2, 9);
    
    setLayers(prevLayers => {
      // Find the minimum layer order to place the new audio layer below it
      const minOrder = prevLayers.length > 0 ? Math.min(...prevLayers.map(l => l.order)) : 0;
      const newLayerId = "L_AUDIO_" + Math.random().toString(36).substring(2, 9);
      
      const newLayer: Layer = {
        id: newLayerId,
        order: minOrder - 1,
        isHidden: false,
        isMuted: false,
        name: "Extracted Audio",
      };
      
      const newClipsLayers = [...prevLayers, newLayer];
      
      setClips(prevClips => {
        const audioClip: Clip = {
           ...videoClip,
           id: newClipId,
           layerId: newLayerId,
           type: "audio"
        };
        // Also mute the original video clip? It defaults to replacing audio. Let's set its volume to 0.
        const modifiedVideos = prevClips.map(c => c.id === videoClip.id ? { ...c, volume: 0 } : c);
        return [...modifiedVideos, audioClip];
      });
      
      return newClipsLayers;
    });
    
    setToastMessage("Audio extracted to new layer");
    setTimeout(() => setToastMessage(null), 2000);
  };

  const handleStabilize = (clipId: string, cropLimit: "low" | "high") => {
    const clip = clips.find(c => c.id === clipId);
    if (!clip || !clip.src) {
        setToastMessage("Error: Clip not found or no source!");
        return;
    }
    
    setPillPopup({ message: `Stabilizing with ${cropLimit} crop limit...`, type: 'loading', progress: 0 });
    // Placeholder for actual stabilization logic
    console.log(`Stabilizing clip ${clipId} with ${cropLimit} crop limit`);
    
    // Simulate stabilization progress
    setTimeout(() => {
        setPillPopup({ message: "Stabilization Applied", type: 'info' });
        setTimeout(() => {
            setPillPopup(null);
        }, 2000);
    }, 2000);
    
    setActiveExpandedMenu(null);
  };

  const handlePaste = () => {
    if (!copiedClip || !pastePopup) return;

    let targetLayerId = pastePopup.layerId;
    let newLayers = [...layers];

    if (!targetLayerId) {
      targetLayerId = Date.now().toString();
      const maxOrder = layers.reduce((max, l) => Math.max(max, l.order), 0);
      newLayers = [
        ...layers,
        {
          id: targetLayerId,
          order: maxOrder + 1,
          isMuted: false,
          isHidden: false,
        },
      ];
      setLayers(newLayers);
    }

    let targetTime = pastePopup.time;
    const layerClips = clips.filter((c) => c.layerId === targetLayerId);

    // Check if targetTime overlaps any existing clip on this layer
    const overlappingClip = layerClips.find(
      (c) =>
        targetTime >= c.leftSeconds &&
        targetTime < c.leftSeconds + c.durationSeconds,
    );
    if (overlappingClip) {
      const midPoint =
        overlappingClip.leftSeconds + overlappingClip.durationSeconds / 2;
      if (targetTime < midPoint) {
        targetTime = overlappingClip.leftSeconds - copiedClip.durationSeconds;
        if (targetTime < 0) targetTime = 0;
      } else {
        targetTime =
          overlappingClip.leftSeconds + overlappingClip.durationSeconds;
      }
    }

    const newClip: Clip = {
      ...copiedClip,
      id: Date.now().toString(),
      layerId: targetLayerId,
      leftSeconds: targetTime,
    };

    setClips([...clips, newClip]);
    setPastePopup(null);
    setToastMessage("Clip pasted");
    setTimeout(() => setToastMessage(null), 2000);
  };

  const toggleLayerMute = (layerId: string) => {
    setLayers((l) =>
      l.map((layer) =>
        layer.id === layerId ? { ...layer, isMuted: !layer.isMuted } : layer,
      ),
    );
  };

  const toggleLayerVisibility = (layerId: string) => {
    setLayers((l) =>
      l.map((layer) =>
        layer.id === layerId ? { ...layer, isHidden: !layer.isHidden } : layer,
      ),
    );
  };

  const handleLayerPointerDown = (e: React.PointerEvent, layerId: string) => {
    e.stopPropagation();
    const target = e.currentTarget;
    target.setPointerCapture(e.pointerId);

    let startY = e.clientY;
    hasDraggedLayerRef.current = false;
    let hasMoved = false;
    let pendingSteps = 0;
    
    setDraggingLayerId(layerId);

    const onPointerMove = (moveEvent: PointerEvent) => {
      const deltaY = moveEvent.clientY - startY;
      if (Math.abs(deltaY) > 5) {
        hasMoved = true;
        hasDraggedLayerRef.current = true;
      }

      if (hasMoved) {
        const rowHeight = window.innerWidth >= 640 ? 38 : 32;
        const expectedSteps =
          deltaY > 0 ? Math.floor(deltaY / rowHeight) : Math.ceil(deltaY / rowHeight);
        if (expectedSteps !== 0 && expectedSteps !== pendingSteps) {
          const stepDiff = expectedSteps - pendingSteps;
          pendingSteps = expectedSteps;

          setLayers((prev) => {
            const sorted = [...prev].sort((a, b) => b.order - a.order);
            const visIdx = sorted.findIndex((l) => l.id === layerId);
            const targetVisIdx = visIdx + stepDiff;

            if (targetVisIdx >= 0 && targetVisIdx < sorted.length) {
              const targetLayer = sorted[targetVisIdx];
              const clone = [...prev];
              const l1 = clone.findIndex((l) => l.id === layerId);
              const l2 = clone.findIndex((l) => l.id === targetLayer.id);

              const tempOrder = clone[l1].order;
              clone[l1].order = clone[l2].order;
              clone[l2].order = tempOrder;

              startY = moveEvent.clientY;
              pendingSteps = 0;
              return clone;
            }
            return prev;
          });
        }
      }
    };

    const onPointerUp = (upEvent: PointerEvent) => {
      try {
        target.releasePointerCapture(upEvent.pointerId);
      } catch (err) {}
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("pointercancel", onPointerUp);

      setDraggingLayerId(null);
      // Removed the custom menu opening logic to avoid conflict with onClick
    };

    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    window.addEventListener("pointercancel", onPointerUp);
  };

  const currentPixelsPerSecondRef = useRef(pixelsPerSecond);
  useEffect(() => {
    currentPixelsPerSecondRef.current = pixelsPerSecond;
  }, [pixelsPerSecond]);

  const currentZoomLevelRef = useRef(zoomLevel);
  useEffect(() => {
    currentZoomLevelRef.current = zoomLevel;
  }, [zoomLevel]);

  // --- Pinch/Wheel to Zoom ---
  useEffect(() => {
    const container = timelineScrollRef.current;
    if (!container) return;

    let initialDist: number | null = null;
    let initialZoom = 1;

    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        initialDist = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY,
        );
        initialZoom = currentZoomLevelRef.current;
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 2 && initialDist !== null) {
        e.preventDefault(); // prevent native scroll
        const dist = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY,
        );
        const scale = dist / initialDist;
        setZoomLevel(Math.min(Math.max(0.2, initialZoom * scale), 10));
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (e.touches.length < 2) {
        initialDist = null;
      }
    };

    const handleWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        const delta = -e.deltaY * 0.01;
        setZoomLevel((prev) =>
          Math.min(Math.max(0.2, prev * Math.exp(delta)), 10),
        );
      }
    };

    container.addEventListener("touchstart", handleTouchStart, {
      passive: false,
    });
    container.addEventListener("touchmove", handleTouchMove, {
      passive: false,
    });
    container.addEventListener("touchend", handleTouchEnd);
    container.addEventListener("wheel", handleWheel, { passive: false });

    return () => {
      container.removeEventListener("touchstart", handleTouchStart);
      container.removeEventListener("touchmove", handleTouchMove);
      container.removeEventListener("touchend", handleTouchEnd);
      container.removeEventListener("wheel", handleWheel);
    };
  }, [currentScreen]);

  const previewTouchRef = useRef<{
    startX: number;
    startY: number;
    startTranslateX: number;
    startTranslateY: number;
    startDistance: number;
    startScale: number;
    activeClipId: string;
  } | null>(null);

  const handlePreviewTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2 && selectedClipId) {
      const clip = clips.find(c => c.id === selectedClipId);
      if (clip) {
        const startX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
        const startY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        const startDistance = Math.hypot(dx, dy) || 1;
        previewTouchRef.current = {
                          startTranslateX: clip.translateX || 0,
          startTranslateY: clip.translateY || 0,
          startDistance,
          startScale: clip.scale || 1,
          activeClipId: clip.id,
        };
      }
    }
  };

  const handlePreviewTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2 && previewTouchRef.current && previewTouchRef.current.activeClipId === selectedClipId) {
      const currentX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
      const currentY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
      const deltaX = (currentX - previewTouchRef.current.startX) / appScale;
      const deltaY = (currentY - previewTouchRef.current.startY) / appScale;
      
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const currentDistance = Math.hypot(dx, dy);
      
      const { startTranslateX, startTranslateY, startDistance, startScale, activeClipId } = previewTouchRef.current;
      
      const scaleRatio = currentDistance / startDistance;
      const newScale = Math.max(0.1, Math.min(5.0, startScale * scaleRatio));

      setClips((prev) => 
        prev.map((c) =>
          c.id === activeClipId
            ? { 
                ...c, 
                translateX: startTranslateX + deltaX, 
                translateY: startTranslateY + deltaY,
                scale: newScale
              }
            : c
        )
      );
    }
  };

  const handlePreviewTouchEnd = (e: React.TouchEvent) => {
    if (e.touches.length < 2) {
      previewTouchRef.current = null;
    }
  };

  const handleClipDragStart = (e: React.PointerEvent, clip: Clip) => {
    e.stopPropagation();
    setIsPlaying(false);

    const target = e.target as HTMLElement;
    target.setPointerCapture(e.pointerId);
    
    let activeSelectedIds = selectedClipIds;
    if (!selectedClipIds.includes(clip.id)) {
      activeSelectedIds = [clip.id];
      setSelectedClipIds(activeSelectedIds);
    }

    const startX = e.clientX;
    const startY = e.clientY;
    const initialLeftSeconds = clip.leftSeconds;
    
    // Map of initial states for ALL selected clips
    const initialClipsData = new Map<string, { left: number, layer: string }>();
    clips.forEach(c => {
      if (activeSelectedIds.includes(c.id)) {
        initialClipsData.set(c.id, { left: c.leftSeconds, layer: c.layerId });
      }
    });

    const initialScrollLeft = timelineScrollRef.current?.scrollLeft || 0;
    const initialScrollTop = timelineScrollRef.current?.scrollTop || 0;

    let isDraggingMode = false;
    let dragTimeout = setTimeout(() => {
      isDraggingMode = true;
    }, 400); // 400ms hold delay to drag

    let isCreatingLayer = false;
    let fallbackLayerId = clip.layerId;
    let createdLayerId: string | null = null;

    const handlePointerMove = (moveEvent: PointerEvent) => {
      const deltaX = moveEvent.clientX - startX;
      const deltaY = moveEvent.clientY - startY;

      if (!isDraggingMode) {
        if (Math.abs(deltaX) > 5 || Math.abs(deltaY) > 5) {
          clearTimeout(dragTimeout);
          if (timelineScrollRef.current) {
            timelineScrollRef.current.scrollLeft = initialScrollLeft - deltaX;
            timelineScrollRef.current.scrollTop = initialScrollTop - deltaY;
          }
        }
        return;
      }

      const deltaSeconds = deltaX / currentPixelsPerSecondRef.current;
      let newLeftSeconds = initialLeftSeconds + deltaSeconds;

      // --- MAGNETIC SNAPPING (Only snap the clip being dragged) ---
      const SNAP_THRESHOLD_SECONDS = 15 / currentPixelsPerSecondRef.current;
      let minDistance = SNAP_THRESHOLD_SECONDS;
      let snappedLeftSeconds = newLeftSeconds;

      const snapPoints = [0, currentTime];
      clips.forEach((c) => {
        if (!activeSelectedIds.includes(c.id)) {
          snapPoints.push(c.leftSeconds);
          snapPoints.push(c.leftSeconds + c.durationSeconds);
        }
      });

      snapPoints.forEach(sp => {
         const distLeft = Math.abs(sp - newLeftSeconds);
         if (distLeft < minDistance) {
             minDistance = distLeft;
             snappedLeftSeconds = sp;
         }
         const newRight = newLeftSeconds + clip.durationSeconds;
         const distRight = Math.abs(sp - newRight);
         if (distRight < minDistance) {
             minDistance = distRight;
             snappedLeftSeconds = sp - clip.durationSeconds;
         }
      });
      newLeftSeconds = snappedLeftSeconds;
      
      const finalDeltaSeconds = newLeftSeconds - initialLeftSeconds;

      // Handle layer dropping ONLY if a single clip is selected
      let targetLayerId = fallbackLayerId;
      if (activeSelectedIds.length === 1) {
        const elementsUnder = document.elementsFromPoint(
          moveEvent.clientX,
          moveEvent.clientY,
        );
        const trackEl = elementsUnder.find((el) =>
          el.classList.contains("track-space"),
        );
        const timelineInner = elementsUnder.find(
          (el) => el.id === "timeline-inner",
        );

        if (trackEl) {
          targetLayerId = trackEl.getAttribute("data-layer-id") || fallbackLayerId;
        } else if (timelineInner && !isCreatingLayer) {
          // Create layer
          isCreatingLayer = true;
          const newId = Math.random().toString(36).substring(7);
          createdLayerId = newId;
          setLayers((prev) => {
            const minOrder = prev.length > 0 ? Math.min(...prev.map((l) => l.order)) : 0;
            return [...prev, { id: newId, order: minOrder - 1, isMuted: false, isHidden: false }];
          });
          targetLayerId = newId;
          setTimeout(() => { isCreatingLayer = false; }, 200);
        }

        // If a layer was created but the user moved back / away from it to a different track
        if (createdLayerId && targetLayerId !== createdLayerId) {
          const idToDelete = createdLayerId;
          createdLayerId = null;
          setLayers((prev) => prev.filter((l) => l.id !== idToDelete));
        }
      }

      setClips((prevClips) => {
        // Evaluate horizontal bounds to prevent crossing x=0
        let effectiveDelta = finalDeltaSeconds;
        let minLeft = Infinity;
        activeSelectedIds.forEach(id => {
          const init = initialClipsData.get(id);
          if (init && init.left + effectiveDelta < 0) {
            effectiveDelta = -init.left;
          }
        });

        if (activeSelectedIds.length === 1) {
          // Single clip check for overlaps with targetLayerId
          const hasOverlap = prevClips.some(
            (c) =>
              c.layerId === targetLayerId &&
              !activeSelectedIds.includes(c.id) &&
              initialLeftSeconds + effectiveDelta < c.leftSeconds + c.durationSeconds &&
              initialLeftSeconds + effectiveDelta + clip.durationSeconds > c.leftSeconds,
          );

          let finalLayerId = targetLayerId;
          if (hasOverlap) finalLayerId = fallbackLayerId;
          else fallbackLayerId = targetLayerId;

          return prevClips.map((c) =>
            c.id === clip.id
              ? { ...c, leftSeconds: Math.max(0, initialLeftSeconds + effectiveDelta), layerId: finalLayerId }
              : c,
          );
        } else {
          // Multi clip - just apply delta
          return prevClips.map((c) => {
            if (activeSelectedIds.includes(c.id)) {
              const init = initialClipsData.get(c.id);
              if (init) return { ...c, leftSeconds: Math.max(0, init.left + effectiveDelta) };
            }
            return c;
          });
        }
      });
    };

    const handlePointerUp = (upEvent: PointerEvent) => {
      clearTimeout(dragTimeout);
      try {
        target.releasePointerCapture(upEvent.pointerId);
      } catch (err) {}
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
      window.removeEventListener("pointercancel", handlePointerUp);

      // If a layer was created but the clip didn't end up on it, delete the layer
      if (createdLayerId) {
        const idToCheck = createdLayerId;
        setClips((prevClips) => {
          const finalClip = prevClips.find(c => c.id === clip.id);
          if (!finalClip || finalClip.layerId !== idToCheck) {
            setLayers((prevLayers) => prevLayers.filter(l => l.id !== idToCheck));
          }
          return prevClips;
        });
      }
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
    window.addEventListener("pointercancel", handlePointerUp);
  };

  const handleTrimStart = (
    e: React.PointerEvent,
    clip: Clip,
    side: "left" | "right",
  ) => {
    e.stopPropagation();
    setIsPlaying(false);
    (e.target as HTMLElement).setPointerCapture(e.pointerId);

    const startX = e.clientX;
    const initialLeftSeconds = clip.leftSeconds;
    const initialDurationSeconds = clip.durationSeconds;
    const initialTrimStartSeconds = clip.trimStartSeconds;

    const handlePointerMove = (moveEvent: PointerEvent) => {
      const deltaX = moveEvent.clientX - startX;
      let deltaSeconds = deltaX / currentPixelsPerSecondRef.current;

      setClips((prev) =>
        prev.map((c) => {
          if (c.id !== clip.id) return c;
          
          const maxAvailableDuration = c.originalDurationSeconds !== undefined ? c.originalDurationSeconds : Number.MAX_VALUE;

          if (side === "left") {
            let newLeft = Math.max(0, initialLeftSeconds + deltaSeconds);
            
            // Snap left edge
            const SNAP_THRESHOLD_SECONDS = 15 / currentPixelsPerSecondRef.current;
            let minDistance = SNAP_THRESHOLD_SECONDS;
            let snappedLeft = newLeft;
            const snapPoints = [0, currentTime];
            prev.forEach(other => {
              if (other.id !== clip.id) {
                snapPoints.push(other.leftSeconds);
                snapPoints.push(other.leftSeconds + other.durationSeconds);
              }
            });
            snapPoints.forEach(sp => {
              const dist = Math.abs(sp - newLeft);
              if (dist < minDistance) {
                minDistance = dist;
                snappedLeft = sp;
              }
            });
            newLeft = snappedLeft;

            const change = newLeft - initialLeftSeconds;
            let newDuration = Math.max(0.5, initialDurationSeconds - change);
            let newTrimStart = initialTrimStartSeconds + change;
            
            if (newTrimStart < 0) {
                const diff = (0 - newTrimStart);
                newTrimStart = 0;
                newLeft += diff;
                newDuration -= diff;
            }

            if (newDuration < 0.5) return c; // Clamp
            return {
              ...c,
              leftSeconds: newLeft,
              durationSeconds: newDuration,
              trimStartSeconds: newTrimStart,
              opticalFlow: undefined,
            };
          } else {
            let newDuration = Math.max(
              0.5,
              initialDurationSeconds + deltaSeconds,
            );
            
            if (newDuration + initialTrimStartSeconds > maxAvailableDuration) {
                newDuration = maxAvailableDuration - initialTrimStartSeconds;
            }
            
            // Snap right edge
            let newRight = initialLeftSeconds + newDuration;
            const SNAP_THRESHOLD_SECONDS = 15 / currentPixelsPerSecondRef.current;
            let minDistance = SNAP_THRESHOLD_SECONDS;
            let snappedRight = newRight;
            const snapPoints = [currentTime];
            prev.forEach(other => {
              if (other.id !== clip.id) {
                snapPoints.push(other.leftSeconds);
                snapPoints.push(other.leftSeconds + other.durationSeconds);
              }
            });
            snapPoints.forEach(sp => {
              const dist = Math.abs(sp - newRight);
              if (dist < minDistance) {
                minDistance = dist;
                snappedRight = sp;
              }
            });
            newDuration = Math.max(0.5, snappedRight - initialLeftSeconds);

            if (newDuration + initialTrimStartSeconds > maxAvailableDuration) {
                newDuration = maxAvailableDuration - initialTrimStartSeconds;
            }

            return { ...c, durationSeconds: newDuration, opticalFlow: undefined };
          }
        }),
      );
    };

    const handlePointerUp = (upEvent: PointerEvent) => {
      (upEvent.target as HTMLElement).releasePointerCapture(upEvent.pointerId);
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
  };

  // Calculate max timeline duration from clips
  const maxTimelineDuration = useMemo(() => {
    let max = 0;
    clips.forEach((c) => {
      if (c.leftSeconds + c.durationSeconds > max)
        max = c.leftSeconds + c.durationSeconds;
    });
    return Math.max(max + 10, 30); // At least 30s buffer, always buffer + 10s
  }, [clips]);

  const visibleLayers = [...layers].sort((a, b) => b.order - a.order);

  // --- RENDERING ---
  const handleCreateProject = (r: string) => {
    setSelectedRatioTransition(r);
    setTimeout(() => {
      createProject(r);
      setIsCreatingProject(false);
      setSelectedRatioTransition(null);
    }, 400);
  };

  const handleMoveFlowBarItem = (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === flowBarOrder.length - 1) return;
    
    setFlowBarOrder((prev) => {
      const newOrder = [...prev];
      const targetIndex = direction === 'up' ? index - 1 : index + 1;
      const temp = newOrder[index];
      newOrder[index] = newOrder[targetIndex];
      newOrder[targetIndex] = temp;
      localStorage.setItem("ai_studio_video_flowbar_order", JSON.stringify(newOrder));
      return newOrder;
    });
  };

  const getFlowBarItemLabel = (key: string) => {
    switch (key) {
      case 'volume': return 'Volume';
      case 'text': return 'Text';
      case 'crop': return 'Crop';
      case 'adjust': return 'Adjust';
      case 'speed': return 'Speed';
      case 'copy': return 'Copy';
      case 'move': return 'Move';
      case 'magic': return 'Magic';
      case 'activity': return 'Blend & Opacity';
      case 'mask': return 'Mask Shape';
      default: return key;
    }
  };

  const renderSettings = () => (
  <div className="flex flex-col h-screen w-full bg-[#121212] overflow-hidden relative">
      <div className="flex-1 overflow-y-auto px-4 sm:px-6 scrollbar-hide">
        <div className="min-h-full flex flex-col pb-[150px]">
          {/* Header */}
          <div className="pt-32 pb-8 flex justify-between items-end mt-auto">
            <h1 className="text-[52px] font-extrabold tracking-tight leading-none text-white">
              Settings
            </h1>
            <button
              className="w-10 h-10 rounded-full hover:bg-zinc-800 flex items-center justify-center transition-colors mb-2 text-zinc-400 hover:text-white"
              onClick={() => setCurrentScreen("home")}
            >
              <ChevronLeft size={24} />
            </button>
          </div>

          {/* Settings Content */}
          <div className="flex flex-col gap-6 max-w-2xl mx-auto w-full mt-4">
            <div className="bg-zinc-900 border border-white/5 rounded-3xl p-6">
              <h3 className="text-white font-bold mb-4 text-xl">
                Flow Bar Order
              </h3>
              <p className="text-sm text-zinc-400 mb-4 font-medium">Customize the order of tools in the floating action menu.</p>
              <div className="flex flex-col gap-2">
                {flowBarOrder.map((key, index) => (
                  <div key={key} className="flex items-center justify-between bg-zinc-800/50 rounded-xl px-4 py-3 border border-white/5">
                    <span className="text-zinc-200 font-medium text-sm">{getFlowBarItemLabel(key)}</span>
                    <div className="flex items-center gap-1">
                      <button 
                        onClick={() => handleMoveFlowBarItem(index, 'up')}
                        disabled={index === 0}
                        className={`p-1.5 rounded-lg transition-colors ${index === 0 ? 'opacity-30' : 'hover:bg-zinc-700 text-zinc-400 hover:text-white'}`}
                      >
                        <ArrowUp size={16} />
                      </button>
                      <button 
                        onClick={() => handleMoveFlowBarItem(index, 'down')}
                        disabled={index === flowBarOrder.length - 1}
                        className={`p-1.5 rounded-lg transition-colors ${index === flowBarOrder.length - 1 ? 'opacity-30' : 'hover:bg-zinc-700 text-zinc-400 hover:text-white'}`}
                      >
                        <ArrowDown size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-zinc-900 border border-white/5 rounded-3xl p-6">
              <h3 className="text-white font-bold mb-4 text-xl">
                App Layout Scale
              </h3>
              <p className="text-sm text-zinc-400 mb-6 font-medium">
                Adjust the overall size of the app interface independently from your device display.
              </p>
              <div className="flex flex-col gap-4">
                <div className="flex justify-between items-center px-1">
                  <span className="text-zinc-300 font-medium text-sm">Scale</span>
                  <span className="text-white font-mono font-bold">{Math.round(appScale * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0.5"
                  max="2"
                  step="0.05"
                  value={appScale}
                  onChange={(e) => handleAppScaleChange(parseFloat(e.target.value))}
                  className="w-full accent-white h-2 rounded-lg appearance-none bg-zinc-800"
                />
                <div className="flex justify-between w-full px-1 mt-1">
                  <span className="text-[10px] text-zinc-500 font-bold">50%</span>
                  <span className="text-[10px] text-zinc-500 font-bold">100%</span>
                  <span className="text-[10px] text-zinc-500 font-bold">200%</span>
                </div>
                <button
                  onClick={() => handleAppScaleChange(1)}
                  className="mt-2 text-xs font-bold text-zinc-400 hover:text-white transition-colors bg-zinc-800/50 hover:bg-zinc-800 py-2 rounded-xl border border-white/5"
                >
                  Reset Default
                </button>
              </div>
            </div>

            <div className="bg-zinc-900 border border-white/5 rounded-3xl p-6">
              <h3 className="text-white font-bold mb-4 text-xl">
                Export Preferences
              </h3>
              <div className="flex flex-col gap-5">
                <div className="flex justify-between items-center">
                  <span className="text-zinc-300 font-medium text-sm">
                    Default Resolution
                  </span>
                  <select className="bg-zinc-800 text-white rounded-xl px-4 py-2 outline-none border border-white/10 text-sm focus:border-white/20 transition-colors">
                    <option>1080p</option>
                    <option>4K</option>
                    <option>720p</option>
                  </select>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-zinc-300 font-medium text-sm">
                    Default FPS
                  </span>
                  <select className="bg-zinc-800 text-white rounded-xl px-4 py-2 outline-none border border-white/10 text-sm focus:border-white/20 transition-colors">
                    <option>30 fps</option>
                    <option>60 fps</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="bg-zinc-900 border border-white/5 rounded-3xl p-6">
              <h3 className="text-white font-bold mb-4 text-xl">App Info</h3>
              <div className="flex flex-col gap-2">
                <div className="flex justify-between items-center">
                  <span className="text-zinc-400 text-sm font-medium">
                    Version
                  </span>
                  <span className="text-zinc-500 font-mono text-sm">1.0.0</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-zinc-400 text-sm font-medium">
                    Developer
                  </span>
                  <span className="text-zinc-500 text-sm">AI Studio</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  
);

const renderHome = () => (
  <div className="flex flex-col h-screen w-full bg-black overflow-hidden relative">
      <div className="flex-1 overflow-y-auto px-4 sm:px-6 scrollbar-hide">
        <div className="min-h-full flex flex-col pb-[120px]">
          {/* Header - ORCA Logo */}
          <div className="pt-20 pb-10 flex justify-center items-center w-full mt-[5vh]">
            <h1 className="text-[72px] font-black tracking-[-0.05em] text-[#A4C6D9]">
              ORCA
            </h1>
          </div>

          {/* Project List */}
          <div className="flex flex-col gap-5 max-w-2xl mx-auto w-full">
            {projects.map((p) => (
              <div
                key={p.id}
                className="relative h-[150px] w-full rounded-[40px] overflow-hidden cursor-pointer shadow-lg active:scale-[0.98] transition-transform group"
                onClick={() => openProject(p)}
              >
                {/* Background Image */}
                <div className="absolute inset-0 bg-zinc-900">
                  <img
                    src={p.thumbnail}
                    alt=""
                    className="w-full h-full object-cover object-left group-hover:scale-105 transition-transform duration-700"
                  />
                </div>
                
                {/* Frosted Overlay */}
                <div 
                  className="absolute inset-0 bg-black/60 backdrop-blur-2xl transition-opacity duration-300"
                  style={{ 
                    maskImage: 'linear-gradient(to right, transparent 0%, transparent 25%, black 50%, black 100%)', 
                    WebkitMaskImage: 'linear-gradient(to right, transparent 0%, transparent 25%, black 50%, black 100%)' 
                  }}
                ></div>

                {/* Border effect like glass */}
                <div className="absolute inset-0 border-[1.5px] border-white/10 rounded-[40px] pointer-events-none"></div>

                {/* Content inside */}
                <div className="absolute inset-0 flex items-center p-6">
                  {/* Left spacer for clear image */}
                  <div className="w-[30%] h-full shrink-0"></div>

                  {/* Center Content */}
                  <div className="flex-1 flex justify-center items-start flex-col pl-4 sm:pl-8">
                    <h3 className="text-[26px] font-bold text-white tracking-tight mb-1 flex items-center gap-2">
                      {p.name}
                      <span className="flex items-center justify-center w-4 h-4 rounded-full bg-emerald-500 text-white shadow-[0_0_8px_rgba(16,185,129,0.5)]">
                        <Check size={10} strokeWidth={4} />
                      </span>
                    </h3>
                    <p className="text-[14px] font-medium text-white/60 leading-snug max-w-[220px]">
                      Concept project focusing on simplicity & usability.
                    </p>
                    <div className="flex items-center gap-4 mt-3">
                       <div className="flex items-center gap-1.5 text-white/50 text-xs font-semibold uppercase tracking-wider">
                         <Clock size={13}/>
                         {p.duration}
                       </div>
                    </div>
                  </div>

                  {/* Actions on right */}
                  <div className="flex flex-col items-end justify-center gap-3 pr-2">
                    <button
                      className="h-10 px-5 rounded-full bg-white text-black font-bold text-sm tracking-wide flex items-center justify-center hover:scale-105 transition-transform z-10 shadow-[0_4px_14px_rgba(255,255,255,0.25)]"
                      onClick={(e) => {
                        e.stopPropagation();
                        openProject(p);
                      }}
                    >
                      Open <ArrowUp size={14} className="rotate-45 ml-1" />
                    </button>
                    <div className="flex gap-2">
                      <button
                        className="w-[38px] h-[38px] rounded-full bg-white/10 border border-white/5 flex items-center justify-center text-white/80 hover:text-white hover:bg-white/20 transition-all z-10 backdrop-blur-md"
                        onClick={(e) => {
                          e.stopPropagation();
                          duplicateProject(p);
                        }}
                      >
                        <Copy size={15} />
                      </button>
                      <button
                        className="w-[38px] h-[38px] rounded-full bg-white/10 border border-white/5 flex items-center justify-center text-red-400/80 hover:text-red-400 hover:bg-red-500/20 transition-all z-10 backdrop-blur-md"
                        onClick={(e) => {
                          e.stopPropagation();
                          setProjectToDelete(p.id);
                        }}
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Floating Action Menu for Home */}
      <div className="absolute bottom-10 left-0 right-0 flex justify-center items-center px-6 z-[60] pointer-events-none">
        <div className="w-full max-w-[340px] flex gap-4 pointer-events-auto">
          <AnimatePresence mode="popLayout">
            {!isCreatingProject && (
              <motion.div
                key="new-project"
                role="button"
                layoutId="new-project-btn"
                transition={{ type: "spring", bounce: 0.5, duration: 0.6 }}
                onClick={() => setIsCreatingProject(true)}
                className="flex-1 cursor-pointer flex justify-center items-center gap-3 shadow-[0_8px_30px_rgb(0,0,0,0.5)] active:scale-[0.98] h-[64px] bg-transparent rounded-full text-white font-medium text-xl border-[2px] border-white backdrop-blur-md hover:bg-white/10 transition-colors"
              >
                <span className="pr-2">New Project</span>
              </motion.div>
            )}
            {!isCreatingProject && (
              <motion.div
                key="settings-btn"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                onClick={() => setCurrentScreen("settings")}
                className="cursor-pointer shrink-0 w-[64px] h-[64px] rounded-full border-[2px] border-white flex items-center justify-center bg-transparent backdrop-blur-md text-white shadow-[0_8px_30px_rgb(0,0,0,0.5)] active:scale-[0.98] hover:bg-white/10 transition-colors"
              >
                <Settings size={28} />
              </motion.div>
            )}
            {isCreatingProject && (
              <motion.div
                key="create-project"
                role="button"
                layoutId="new-project-btn"
                transition={{ type: "spring", bounce: 0.5, duration: 0.6 }}
                onClick={() => handleCreateProject(focusedRatio)}
                className="cursor-pointer pointer-events-auto flex justify-center items-center gap-3 shadow-[0_8px_30px_rgb(0,0,0,0.5)] active:scale-[0.98] w-full h-[64px] bg-white rounded-full text-black font-bold text-xl"
              >
                <span>Create</span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Ratio Selection Overlay */}
      <AnimatePresence>
        {isCreatingProject && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="fixed inset-0 z-50 bg-black flex flex-col items-center justify-center"
          >
            <motion.button
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="absolute top-8 right-8 w-12 h-12 rounded-full bg-zinc-800/80 backdrop-blur hover:bg-zinc-700 flex items-center justify-center text-white transition-colors z-50"
              onClick={() => setIsCreatingProject(false)}
            >
              <X size={24} />
            </motion.button>

            <div 
              className="flex flex-nowrap items-center overflow-x-auto w-full pb-20 pt-10 scrollbar-hide snap-x snap-mandatory"
              onScroll={(e) => {
                const container = e.currentTarget;
                const containerCenter = container.getBoundingClientRect().left + container.clientWidth / 2;
                let closest = null;
                let minDist = Infinity;
                container.childNodes.forEach((node) => {
                  if (node.nodeType === 1) {
                    const el = node as HTMLElement;
                    const val = el.getAttribute("data-ratio");
                    if (val) {
                      const rect = el.getBoundingClientRect();
                      const elCenter = rect.left + rect.width / 2;
                      const dist = Math.abs(elCenter - containerCenter);
                      if (dist < minDist) {
                        minDist = dist;
                        closest = val;
                      }
                    }
                  }
                });
                if (closest && closest !== focusedRatio) setFocusedRatio(closest);
              }}
              style={{
                paddingLeft: "calc(50vw - 160px)",
                paddingRight: "calc(50vw - 160px)"
              }}
            >
              {[
                { ratio: "9:16", baseW: 180, baseH: 320, label: "Reels, TikTok" },
                { ratio: "16:9", baseW: 320, baseH: 180, label: "YouTube" },
                { ratio: "1:1", baseW: 240, baseH: 240, label: "Instagram" },
                { ratio: "custom", baseW: 240, baseH: 240, label: "Custom" },
              ].map((r, i) => {
                const isFocused = focusedRatio === r.ratio;
                const scale = isFocused ? 1 : 0.85;
                return (
                  <div key={r.ratio} data-ratio={r.ratio} className="w-[320px] shrink-0 snap-center flex justify-center items-center">
                    <motion.div
                       className="cursor-pointer group relative flex justify-center items-center"
                       onClick={(e) => {
                          if (!isFocused) {
                             e.currentTarget.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
                          }
                       }}
                    >
                      <motion.div
                        animate={{ width: r.baseW * scale, height: r.baseH * scale }}
                        transition={{ type: "spring", bounce: 0.4 }}
                        className={`border-[4px] rounded-[32px] flex items-center justify-center bg-transparent transition-colors duration-300 ${isFocused ? "border-white" : "border-zinc-700"}`}
                      >
                         <span className={`font-bold text-3xl transition-colors ${isFocused ? "text-white" : "text-zinc-500"}`}>
                           {r.ratio === "custom" ? "Custom" : r.ratio}
                         </span>
                      </motion.div>
                    </motion.div>
                  </div>
                );
              })}
            </div>

            <div className="absolute bottom-12 left-0 right-0 flex flex-col items-center gap-6 pointer-events-none">
              {focusedRatio === "custom" ? (
                <div className="flex items-center gap-3 bg-zinc-900/80 backdrop-blur-md rounded-2xl p-2 border border-zinc-700 pointer-events-auto">
                   <input type="number" placeholder="H" className="bg-transparent w-20 text-center text-xl text-white outline-none font-bold" value={customRatioH} onChange={(e) => setCustomRatioH(e.target.value)} />
                   <div className="w-[2px] h-6 bg-zinc-600"></div>
                   <input type="number" placeholder="W" className="bg-transparent w-20 text-center text-xl text-white outline-none font-bold" value={customRatioW} onChange={(e) => setCustomRatioW(e.target.value)} />
                </div>
              ) : (
                <span className="text-sm font-semibold text-white/50 tracking-widest uppercase">
                  {[
                    { ratio: "9:16", label: "Reels, TikTok" },
                    { ratio: "16:9", label: "YouTube" },
                    { ratio: "1:1", label: "Instagram" },
                  ].find(x => x.ratio === focusedRatio)?.label}
                </span>
              )}
              
              <button 
                className="pointer-events-auto w-[240px] h-14 border-[3px] border-white rounded-full flex items-center justify-center font-bold text-white hover:bg-white hover:text-black transition-colors text-lg"
                onClick={() => {
                   handleCreateProject(focusedRatio === "custom" ? `${customRatioW}:${customRatioH}` : focusedRatio);
                }}
              >
                 Create Project
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {projectToDelete && (
          <div
            className="fixed inset-0 z-[300] bg-black/60 flex items-center justify-center p-4"
            onClick={() => setProjectToDelete(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-[#252528] border border-white/10 rounded-[32px] p-6 max-w-sm w-full shadow-2xl"
            >
              <h3 className="text-xl font-bold text-white mb-2">
                Delete Project
              </h3>
              <p className="text-zinc-400 text-sm mb-6 font-medium">
                Are you sure you want to delete this project? This action cannot
                be undone.
              </p>
              <div className="flex justify-end gap-3">
                <button
                  className="px-5 py-2.5 rounded-full text-sm font-bold text-white hover:bg-zinc-700 transition-colors"
                  onClick={() => setProjectToDelete(null)}
                >
                  Cancel
                </button>
                <button
                  className="px-5 py-2.5 bg-red-500 hover:bg-red-600 rounded-full text-sm font-bold text-white transition-colors"
                  onClick={confirmDeleteProject}
                >
                  Delete
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  
);

const renderEditor = () => (
  <div className="flex flex-col h-screen w-full bg-[#1e1e20] overflow-hidden">
      {/* Exporting Overlay */}
      {isExporting && (
        <div className="fixed inset-0 bg-black/80 z-[100] flex flex-col items-center justify-center p-8">
          <div className="w-full max-w-md bg-zinc-900 rounded-3xl p-6 border border-white/10 flex flex-col items-center">
            <div className="text-white font-bold text-lg mb-2">
              Exporting Video...
            </div>
            <div className="text-zinc-400 text-sm mb-6">
              Please do not close this window
            </div>
            <div className="w-full h-2 bg-zinc-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-white transition-all duration-300"
                style={{ width: `${exportProgress}%` }}
              ></div>
            </div>
            <div className="text-white font-mono text-xs mt-3">
              {exportProgress}%
            </div>
          </div>
        </div>
      )}
      {/* Export Complete Overlay */}
      {exportedVideoUrl && (
        <div className="fixed inset-0 bg-black/80 z-[100] flex flex-col items-center justify-center p-4 sm:p-8">
          <div className="w-full max-w-xl bg-zinc-900 rounded-3xl p-6 border border-white/10 flex flex-col">
            <h2 className="text-white font-bold text-xl mb-4 text-center">Export Complete</h2>
            <div className="relative w-full aspect-video bg-black rounded-xl overflow-hidden mb-6 flex items-center justify-center">
              <video 
                src={exportedVideoUrl} 
                controls 
                autoPlay
                className="w-full h-full object-contain" 
              />
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => {
                  const a = document.createElement("a");
                  a.href = exportedVideoUrl;
                  a.download = `project-${exportResolution}-${Date.now()}.webm`;
                  a.click();
                  showToast("Video downloaded.");
                }}
                className="flex-1 bg-white text-black py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-zinc-200 transition-colors"
              >
                <Download size={18} />
                Save to Device
              </button>
              {navigator.share && (
                <button
                  onClick={async () => {
                    try {
                      if (!exportedVideoBlob) return;
                      const file = new File([exportedVideoBlob], `project-${Date.now()}.webm`, { type: 'video/webm' });
                      await navigator.share({
                        files: [file],
                        title: 'My Video Project',
                      });
                    } catch (err) {
                      console.warn("Share failed", err);
                    }
                  }}
                  className="flex-1 bg-zinc-800 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-zinc-700 transition-colors"
                >
                  <Share size={18} />
                  Share / Save to Gallery
                </button>
              )}
              <button
                onClick={() => {
                  setExportedVideoUrl(null);
                  URL.revokeObjectURL(exportedVideoUrl);
                }}
                className="flex-1 bg-zinc-800 text-white py-3 rounded-xl font-bold hover:bg-zinc-700 transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Top Header */}
      <header className="flex justify-between items-center px-4 py-4 shrink-0 relative z-[100] pointer-events-none">
        {/* Pill Popup */}
        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-[200] pointer-events-auto">
          <AnimatePresence>
            {pillPopup && (
              <motion.div
                initial={{ opacity: 0, y: -20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -20, scale: 0.95 }}
                className="bg-zinc-900 border border-white/10 rounded-full px-4 py-2 flex items-center gap-3 shadow-2xl"
              >
                {pillPopup.type === 'loading' && pillPopup.progress !== undefined && (
                  <div className="w-5 h-5 relative">
                    <svg className="w-5 h-5" viewBox="0 0 20 20">
                      <circle cx="10" cy="10" r="9" className="stroke-zinc-700" strokeWidth="2" fill="none" />
                      <circle cx="10" cy="10" r="9" className="stroke-blue-500" strokeWidth="2" fill="none" strokeDasharray={`${pillPopup.progress * 2 * Math.PI * 9 / 100} 1000`} transform="rotate(-90 10 10)" />
                    </svg>
                  </div>
                )}
                <span className="text-[12px] font-medium text-white">{pillPopup.message}</span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        
        <div className="flex items-center bg-zinc-800 rounded-full px-1 py-1 shadow-lg border border-white/5 pointer-events-auto">
          <button
            onClick={handleBackToHome}
            className="w-7 h-7 sm:w-8 sm:h-8 rounded-full hover:bg-zinc-700 flex items-center justify-center transition-colors text-white"
          >
            <ChevronLeft size={16} />
          </button>
          
          <div className="w-px h-3 sm:h-4 bg-zinc-700 mx-1 sm:mx-2"></div>
          
          <div className="relative">
            <div
              onClick={() => setIsRatioExpanded(!isRatioExpanded)}
              className={`px-3 py-1.5 rounded-full text-[10px] sm:text-[11px] font-extrabold tracking-wider cursor-pointer select-none flex items-center gap-2 transition-all duration-300 ${
                isRatioExpanded
                  ? "bg-white text-black shadow-[0_0_12px_rgba(255,255,255,0.25)]"
                  : "bg-zinc-800 text-zinc-100 hover:bg-zinc-700 hover:text-white"
              }`}
            >
              <div className="flex items-center gap-1.5">
                {currentProjectRatio === "9:16" ? (
                  <div className={`w-1.5 h-3 border rounded-[1px] transition-colors ${isRatioExpanded ? "border-black" : "border-white/80"}`} />
                ) : currentProjectRatio === "16:9" ? (
                  <div className={`w-3 h-1.5 border rounded-[1px] transition-colors ${isRatioExpanded ? "border-black" : "border-white/80"}`} />
                ) : currentProjectRatio === "1:1" ? (
                  <div className={`w-2.5 h-2.5 border rounded-[1px] transition-colors ${isRatioExpanded ? "border-black" : "border-white/80"}`} />
                ) : (
                  <div className={`w-2.5 h-2 border border-dashed rounded-[1px] transition-colors ${isRatioExpanded ? "border-black" : "border-white/60"}`} />
                )}
                <span>Aspect: {currentProjectRatio}</span>
              </div>
              <ChevronDown
                size={12}
                className={`transition-transform duration-300 ${isRatioExpanded ? "rotate-180" : "opacity-80"}`}
              />
            </div>

            <AnimatePresence>
              {isRatioExpanded && (
                <>
                  <div
                    className="fixed inset-0 z-[140] cursor-default pointer-events-auto"
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsRatioExpanded(false);
                    }}
                  />
                  <motion.div
                    initial={{ opacity: 0, y: -10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -10, scale: 0.95 }}
                    onClick={(e) => e.stopPropagation()}
                    className="absolute top-[calc(100%+12px)] left-0 bg-zinc-950/95 backdrop-blur-xl border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.5)] rounded-2xl w-[240px] flex flex-col p-3 z-[150] origin-top-left overflow-hidden text-left pointer-events-auto"
                  >
                    <div className="text-[9px] uppercase font-bold text-zinc-400 tracking-wider mb-2.5 px-1">
                      Change Aspect Ratio
                    </div>
                    {[
                      { r: "9:16", label: "Reels, TikTok", desc: "Vertical video" },
                      { r: "16:9", label: "YouTube", desc: "Horizontal video" },
                      { r: "1:1", label: "Instagram", desc: "Square post" },
                    ].map(({ r, label }) => (
                      <button
                        key={r}
                        onClick={(e) => {
                          e.stopPropagation();
                          setCurrentProjectRatio(r);
                          setIsRatioExpanded(false);
                          showToast(`Ratio changed to ${r}`);
                        }}
                        className={`w-full flex items-center justify-between p-2.5 rounded-xl text-left transition-all duration-250 mb-1 group ${
                          currentProjectRatio === r
                            ? "bg-white text-black font-extrabold shadow-md"
                            : "text-zinc-300 hover:bg-zinc-900 hover:text-white"
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          {r === "9:16" ? (
                            <div className={`w-2 h-4 border rounded-[2px] shrink-0 ${currentProjectRatio === r ? "border-black" : "border-zinc-400 group-hover:border-white"}`} />
                          ) : r === "16:9" ? (
                            <div className={`w-4 h-2.5 border rounded-[2px] shrink-0 ${currentProjectRatio === r ? "border-black" : "border-zinc-400 group-hover:border-white"}`} />
                          ) : (
                            <div className={`w-3 h-3 border rounded-[2px] shrink-0 ${currentProjectRatio === r ? "border-black" : "border-zinc-400 group-hover:border-white"}`} />
                          )}
                          <div className="flex flex-col">
                            <span className="text-xs font-bold leading-normal">{r}</span>
                            <span className={`text-[9px] font-medium leading-none mt-0.5 ${currentProjectRatio === r ? "text-zinc-700" : "text-zinc-500 group-hover:text-zinc-300"}`}>{label}</span>
                          </div>
                        </div>
                        {currentProjectRatio === r && (
                          <Check size={14} className="text-black stroke-[3]" />
                        )}
                      </button>
                    ))}

                    <div className="h-px bg-white/10 my-2.5"></div>
                    <div className="text-[9px] uppercase font-bold text-zinc-400 tracking-wider mb-2 px-1">
                      Custom Ratio
                    </div>
                    <div className="flex items-center gap-1.5 px-1">
                      <div className="relative flex-1">
                        <input
                          type="number"
                          placeholder="W"
                          className="bg-zinc-900 w-full text-center text-xs text-white outline-none font-bold py-2 rounded-lg border border-white/10 focus:border-white/30"
                          value={customRatioW}
                          onChange={(e) => setCustomRatioW(e.target.value)}
                          onClick={(e) => e.stopPropagation()}
                        />
                        <span className="absolute right-1 top-1 text-[8px] font-bold text-zinc-600">W</span>
                      </div>
                      <span className="text-zinc-600 text-xs font-bold">:</span>
                      <div className="relative flex-1">
                        <input
                          type="number"
                          placeholder="H"
                          className="bg-zinc-900 w-full text-center text-xs text-white outline-none font-bold py-2 rounded-lg border border-white/10 focus:border-white/30"
                          value={customRatioH}
                          onChange={(e) => setCustomRatioH(e.target.value)}
                          onClick={(e) => e.stopPropagation()}
                        />
                        <span className="absolute right-1 top-1 text-[8px] font-bold text-zinc-600">H</span>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          const w = parseInt(customRatioW);
                          const h = parseInt(customRatioH);
                          if (w > 0 && h > 0) {
                            const newRatio = `${w}:${h}`;
                            setCurrentProjectRatio(newRatio);
                            setIsRatioExpanded(false);
                            showToast(`Ratio changed to ${newRatio}`);
                          } else {
                            showToast("Enter valid W & H");
                          }
                        }}
                        className="bg-white hover:bg-zinc-100 text-black rounded-lg text-[10px] font-black px-2.5 py-2.5 transition-colors shadow-md shrink-0"
                      >
                        Apply
                      </button>
                    </div>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
        </div>
          
        <div className="flex items-center pointer-events-auto">
          <div className="relative">
            <button
              onClick={() => setIsExportExpanded(!isExportExpanded)}
              className="bg-white text-black px-4 h-[28px] rounded-full text-[10px] font-bold shadow hover:bg-zinc-200 transition-colors whitespace-nowrap"
            >
              EXPORT
            </button>

            <AnimatePresence>
              {isExportExpanded && (
                <motion.div
                  initial={{ opacity: 0, y: -10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -10, scale: 0.95 }}
                  className="absolute top-[calc(100%+8px)] right-0 bg-zinc-800 border border-white/10 shadow-2xl rounded-2xl w-[200px] flex flex-col p-2 z-[150] origin-top-right overflow-hidden"
                >
                  <div className="flex items-center justify-between px-3 py-2">
                    <span className="text-[11px] font-semibold text-white/50">
                      Resolution
                    </span>
                    <select
                      className="bg-transparent text-white text-[11px] font-semibold outline-none cursor-pointer hover:text-yellow-400 transition-colors text-right"
                      value={exportResolution}
                      onChange={(e) => setExportResolution(e.target.value)}
                    >
                      <option value="1080p" className="bg-zinc-800 text-white">
                        1080p
                      </option>
                      <option value="2K" className="bg-zinc-800 text-white">
                        2K
                      </option>
                      <option value="4K" className="bg-zinc-800 text-white">
                        4K
                      </option>
                    </select>
                  </div>
                  <div className="flex items-center justify-between px-3 py-2">
                    <span className="text-[11px] font-semibold text-white/50">
                      Frame Rate
                    </span>
                    <select
                      className="bg-transparent text-white text-[11px] font-semibold outline-none cursor-pointer hover:text-yellow-400 transition-colors text-right"
                      value={exportFps}
                      onChange={(e) => setExportFps(e.target.value)}
                    >
                      <option value="24" className="bg-zinc-800 text-white">
                        24 fps
                      </option>
                      <option value="30" className="bg-zinc-800 text-white">
                        30 fps
                      </option>
                      <option value="60" className="bg-zinc-800 text-white">
                        60 fps
                      </option>
                    </select>
                  </div>
                  <div className="flex items-center justify-between px-3 py-2 mb-2">
                    <span className="text-[11px] font-semibold text-white/50">
                      Bitrate
                    </span>
                    <select
                      className="bg-transparent text-white text-[11px] font-semibold outline-none cursor-pointer hover:text-yellow-400 transition-colors text-right"
                      value={exportBitrate}
                      onChange={(e) => setExportBitrate(e.target.value)}
                    >
                      <option value="Smart" className="bg-zinc-800 text-white">
                        Smart
                      </option>
                      <option value="High" className="bg-zinc-800 text-white">
                        High
                      </option>
                      <option value="Max" className="bg-zinc-800 text-white">
                        Max
                      </option>
                    </select>
                  </div>
                  <div className="flex flex-col px-3 py-2 border-t border-white/10 mb-2">
                    <span className="text-[11px] font-semibold text-white/90 mb-1">
                      Frame Interpolation
                    </span>
                    <label className="flex items-center justify-between cursor-pointer group mt-1">
                      <span className="text-[10px] text-white/50 group-hover:text-white/80 transition-colors">
                        Smooth Slow-Mo (Optical Flow)
                      </span>
                      <div className="relative inline-flex items-center">
                        <input
                          type="checkbox"
                          className="sr-only peer"
                          checked={exportOpticalFlow}
                          onChange={(e) =>
                            setExportOpticalFlow(e.target.checked)
                          }
                        />
                        <div className="w-7 h-4 bg-zinc-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-blue-500"></div>
                      </div>
                    </label>
                  </div>
                  <button
                    onClick={startExport}
                    className="w-full bg-white text-black py-2.5 rounded-xl text-[11px] font-bold shadow hover:bg-zinc-200 transition-colors active:scale-95 mt-1"
                  >
                    Start Export
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </header>

      {/* Main Preview Area */}
      <main className="flex-1 min-h-0 flex flex-col pt-2 pb-4 relative z-[80] bg-[#1e1e20]">
        <div className="flex-1 min-h-0 relative flex items-center justify-center px-4">
          <div className="relative w-full h-full flex items-center justify-center">
            <svg
              viewBox={`0 0 ${currentProjectRatio.split(":")[0]} ${currentProjectRatio.split(":")[1]}`}
              className="max-w-full max-h-full h-[100%] pointer-events-none opacity-0"
            />
            <motion.div
              id="preview-screen"
              layoutId="preview-screen"
              onTouchStart={handlePreviewTouchStart}
              onTouchMove={handlePreviewTouchMove}
              onTouchEnd={handlePreviewTouchEnd}
              onTouchCancel={handlePreviewTouchEnd}
              className="absolute top-0 bottom-0 left-0 right-0 m-auto bg-black rounded-3xl overflow-hidden shadow-[20px_20px_60px_rgba(0,0,0,0.5)] border border-white/10"
              style={{
                aspectRatio: currentProjectRatio.replace(":", "/"),
                maxHeight: "100%",
                maxWidth: "100%",
                touchAction: "none"
              }}
            >
            {/* Media Rendering */}
            {[...visibleLayers].reverse().map((layer) => {
              if (layer.isHidden) return null;
              const layerClips = clips.filter((c) => c.layerId === layer.id);
              // Find active clip
              const activeClipRaw = layerClips.find(
                (c) =>
                  currentTime >= c.leftSeconds &&
                  currentTime <= c.leftSeconds + c.durationSeconds,
              );

              if (!activeClipRaw) return null;

              const interpolatedProps = getInterpolatedProps(activeClipRaw, currentTime - activeClipRaw.leftSeconds, activeExpandedMenu);
              const activeClip = { ...activeClipRaw, ...interpolatedProps };

              const getClipPath = (maskType?: string) => {
                switch (maskType) {
                  case "circle":
                    return "circle(50% at 50% 50%)";
                  case "square":
                    return "inset(15% 15% 15% 15%)";
                  case "rounded":
                    return "inset(5% 5% 5% 5% round 15%)";
                  default:
                    return "none";
                }
              };

              const transformStyle: React.CSSProperties = {
                transform: `translate(${activeClip.translateX || 0}px, ${activeClip.translateY || 0}px) rotate(${activeClip.rotation || 0}deg) scale(${activeClip.scale ?? 1})`,
                clipPath: getClipPath(activeClip.maskType),
                opacity: activeClip.opacity ?? 1,
                mixBlendMode: activeClip.mixBlendMode as any || "normal",
                ...(activeClip.cropRatio ? { aspectRatio: activeClip.cropRatio.replace(":", "/") } : {})
              };

              return (
                <div
                  key={layer.id}
                  className="absolute inset-0 flex items-center justify-center pointer-events-none"
                >
                  {erroredClips.has(activeClip.id) &&
                  activeClip.type !== "text" ? (
                    <div
                      className="absolute inset-0 flex flex-col items-center justify-center bg-[#171719] border border-red-500/50 m-4 rounded-[32px] overflow-hidden"
                      style={transformStyle}
                    >
                      <AlertCircle className="text-red-500 mb-2" size={32} />
                      <span className="text-red-400 text-sm font-bold">
                        File missing
                      </span>
                    </div>
                  ) : (
                    <>
                      {activeClip.type === "text" && (
                        <div
                          id={`clip-media-${activeClip.id}`}
                          className="flex items-center justify-center w-full h-full font-sans break-words whitespace-pre-wrap text-center overflow-hidden"
                          style={{
                            ...transformStyle,
                            color: activeClip.color || "#ffffff",
                            fontSize: `${activeClip.fontSize || 48}px`,
                            fontFamily: activeClip.fontFamily || "sans-serif",
                            ...(activeClip.textAnimation === "Fade In" ? { opacity: (activeClip.opacity ?? 1) * Math.min(1, (currentTime - activeClipRaw.leftSeconds) / 1) } : {}),
                            ...(activeClip.textAnimation === "Slide Up" ? { 
                                opacity: (activeClip.opacity ?? 1) * Math.min(1, (currentTime - activeClipRaw.leftSeconds) / 1),
                                transform: `${transformStyle.transform} translateY(${(1 - Math.min(1, (currentTime - activeClipRaw.leftSeconds) / 1)) * 50}px)`
                            } : {}),
                            ...(activeClip.textAnimation === "Bounce" ? { 
                                opacity: (activeClip.opacity ?? 1) * Math.min(1, (currentTime - activeClipRaw.leftSeconds) / 1),
                                transform: `${transformStyle.transform} translateY(${-(Math.sin(Math.min(1, (currentTime - activeClipRaw.leftSeconds) / 1) * Math.PI) * 20 * (1-Math.min(1, (currentTime - activeClipRaw.leftSeconds) / 1)))}px)`
                            } : {})
                          }}
                        >
                          <span
                             className={`pointer-events-none select-none ${!activeClip.text ? 'opacity-40 italic' : ''}`}>
                             {activeClip.text ? (
                               activeClip.textAnimation === "Typewriter" 
                                 ? (activeClip.text || "").substring(0, Math.floor(Math.min(1, (currentTime - activeClipRaw.leftSeconds) / 2) * (activeClip.text || "").length))
                                 : activeClip.text
                             ) : (selectedClipId === activeClip.id ? "Type text..." : "")}
                          </span>
                        </div>
                      )}
                      {activeClip.type === "image" && (
                        <div
                          className="pointer-events-none select-none overflow-hidden max-w-full max-h-full flex items-center justify-center relative shadow-lg"
                          style={{
                               ...transformStyle,
                               ...(activeClip.cropRatio ? {
                                  width: activeClip.cropRatio === "16:9" ? "100%" : activeClip.cropRatio === "9:16" ? "auto" : activeClip.cropRatio === "1:1" ? "auto" : "100%",
                                  height: activeClip.cropRatio ? (activeClip.cropRatio === "16:9" ? "auto" : activeClip.cropRatio === "9:16" ? "100%" : activeClip.cropRatio === "1:1" ? "100%" : "100%") : '100%',
                               } : { width: '100%', height: '100%' }),
                          }}
                        >
                          <img
                            id={`clip-media-${activeClip.id}`}
                            src={activeClip.src}
                            className="w-full h-full object-cover pointer-events-none"
                            crossOrigin="anonymous"
                            onError={() => handleClipError(activeClip.id)}
                          />
                          {activeExpandedMenu === "crop" && selectedClipId === activeClip.id && (
                             <div className="absolute inset-0 pointer-events-none border-2 border-white grid grid-cols-3 grid-rows-3 shadow-[0_0_0_9999px_rgba(0,0,0,0.5)]">
                               <div className="border-r border-b border-white/40"></div>
                               <div className="border-r border-b border-white/40"></div>
                               <div className="border-b border-white/40"></div>
                               <div className="border-r border-b border-white/40"></div>
                               <div className="border-r border-b border-white/40"></div>
                               <div className="border-b border-white/40"></div>
                               <div className="border-r border-white/40"></div>
                               <div className="border-r border-white/40"></div>
                               <div></div>
                             </div>
                          )}
                        </div>
                      )}
                      {activeClip.type === "video" && (
                        <div
                          className="pointer-events-none select-none overflow-hidden max-w-full max-h-full flex items-center justify-center relative shadow-lg"
                          style={{
                               ...transformStyle,
                               ...(activeClip.cropRatio ? {
                                  width: activeClip.cropRatio === "16:9" ? "100%" : activeClip.cropRatio === "9:16" ? "auto" : activeClip.cropRatio === "1:1" ? "auto" : "100%",
                                  height: activeClip.cropRatio ? (activeClip.cropRatio === "16:9" ? "auto" : activeClip.cropRatio === "9:16" ? "100%" : activeClip.cropRatio === "1:1" ? "100%" : "100%") : '100%',
                               } : { width: '100%', height: '100%' }),
                          }}
                        >
                          <VideoRenderer
                            id={`clip-media-${activeClip.id}`}
                            clip={activeClip}
                            currentTime={currentTime}
                            isPlaying={isPlaying}
                            isMuted={layer.isMuted}
                            className="w-full h-full object-cover pointer-events-none"
                            onError={() => handleClipError(activeClip.id)}
                          />
                          {activeExpandedMenu === "crop" && selectedClipId === activeClip.id && (
                             <div className="absolute inset-0 pointer-events-none border-2 border-white grid grid-cols-3 grid-rows-3 shadow-[0_0_0_9999px_rgba(0,0,0,0.5)] z-50">
                               <div className="border-r border-b border-white/40"></div>
                               <div className="border-r border-b border-white/40"></div>
                               <div className="border-b border-white/40"></div>
                               <div className="border-r border-b border-white/40"></div>
                               <div className="border-r border-b border-white/40"></div>
                               <div className="border-b border-white/40"></div>
                               <div className="border-r border-white/40"></div>
                               <div className="border-r border-white/40"></div>
                               <div></div>
                             </div>
                          )}
                        </div>
                      )}
                      {activeClip.type === "audio" && (
                        <AudioRenderer
                          clip={activeClip}
                          currentTime={currentTime}
                          isPlaying={isPlaying}
                          isMuted={layer.isMuted}
                          onError={() => handleClipError(activeClip.id)}
                        />
                      )}
                    </>
                  )}
                </div>
              );
            })}
          </motion.div>
          </div>
        </div>

        {/* Playback Transport Controls */}
        <div 
          className="flex justify-between items-center shrink-0 w-full"
          style={{
            paddingRight: "7px",
            paddingLeft: "5px",
            height: "40px",
            marginTop: "0px",
            marginLeft: "0px",
            paddingTop: "29px",
            paddingBottom: "0px"
          }}
        >
          <div className="flex items-center gap-2 sm:gap-4 flex-1 pr-2">
            <span className="text-zinc-300 font-mono text-[10px] sm:text-xs tracking-wider opacity-80 min-w-[40px] sm:min-w-[50px]">
              {formatTime(currentTime)}
            </span>
            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
              <button
                className="w-6 h-6 sm:w-8 sm:h-8 bg-zinc-800 text-white rounded-full shadow flex items-center justify-center hover:bg-zinc-700 transition-colors m-0"
                onClick={() => {
                  setCurrentTime(0);
                  setPlayheadX(0);
                  playheadXRef.current = 0;
                  if (timelineScrollRef.current) {
                    timelineScrollRef.current.scrollLeft = 0;
                  }
                }}
                title="Go to Start"
              >
                <SkipBack size={12} fill="currentColor" />
              </button>
              <button
                className="w-7 h-7 sm:w-9 sm:h-9 bg-white text-black rounded-full shadow-lg flex items-center justify-center hover:scale-105 transition-transform m-0 pl-0 pr-[4px]"
                onClick={() => setIsPlaying(!isPlaying)}
              >
                {isPlaying ? (
                  <Pause size={14} fill="currentColor" />
                ) : (
                  <Play size={14} fill="currentColor" className="ml-[4px] sm:ml-[6px]" />
                )}
              </button>
            </div>
            
            {selectedClipId && clips.find(c => c.id === selectedClipId)?.type === "text" && (
              <motion.div 
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: "100%" }}
                exit={{ opacity: 0, width: 0 }}
                className="ml-0.5 overflow-hidden flex-1"
              >
                <input
                  type="text"
                  value={clips.find((c) => c.id === selectedClipId)?.text || ""}
                  onChange={(e) => {
                    setClips((prev) =>
                      prev.map((c) =>
                        c.id === selectedClipId ? { ...c, text: e.target.value } : c
                      )
                    );
                  }}
                  placeholder="Enter text..."
                  className="bg-zinc-800 border border-white/10 rounded-full text-xs font-medium text-white focus:outline-none focus:ring-1 focus:ring-white/30 focus:bg-zinc-700 transition-all placeholder:text-zinc-500 shadow-inner w-full"
                  style={{
                    paddingLeft: "12px",
                    marginTop: "1px",
                    paddingTop: "5px",
                    marginLeft: "0px",
                    paddingRight: "16px",
                    marginRight: "0px",
                    paddingBottom: "5px"
                  }}
                />
              </motion.div>
            )}
          </div>
          <div className="flex items-center shrink-0">
            <div className="flex bg-zinc-800 rounded-full px-0.5 py-0.5 mr-1 sm:px-1 sm:py-1 sm:mr-2">
              <button
                className={`p-1 sm:p-1.5 rounded-full transition-colors ${selectedClipId ? "hover:bg-zinc-700 text-white" : "opacity-30"}`}
                disabled={!selectedClipId}
                onClick={handleToggleKeyframe}
              >
                <Diamond size={12} className={isAtKeyframe ? "fill-white" : ""} />
              </button>
              <button
                className={`p-1 sm:p-1.5 rounded-full transition-colors ${(selectedClipId && isBetweenKeyframes) ? "hover:bg-zinc-700 text-white" : "opacity-30"}`}
                disabled={!selectedClipId || !isBetweenKeyframes}
                onClick={() => setShowKeyframeGraph(!showKeyframeGraph)}
              >
                <LineChart size={12} />
              </button>
            </div>
            <div className="flex bg-zinc-800 rounded-full px-0.5 py-0.5 mr-1 sm:px-1 sm:py-1 sm:mr-2">
              <button
                className={`p-1 sm:p-1.5 rounded-full transition-colors ${selectedClipId ? "hover:bg-zinc-700 text-white" : "opacity-30"}`}
                disabled={!selectedClipId}
                onClick={splitSelectedClip}
              >
                <Scissors size={12} />
              </button>
              <div className="w-px h-3 sm:h-4 bg-zinc-700 mx-0.5 sm:mx-1 my-auto"></div>
              <button
                className={`p-1 sm:p-1.5 rounded-full transition-colors ${selectedClipIds.length > 0 ? "hover:bg-zinc-700 text-white" : "opacity-30"}`}
                disabled={selectedClipIds.length === 0}
                onClick={deleteSelectedClip}
              >
                <Trash2 size={12} />
              </button>
            </div>
            <div className="flex bg-zinc-800 rounded-full px-0.5 py-0.5 sm:px-1 sm:py-1">
              <button
                onClick={undo}
                disabled={historyIndex <= 0}
                className={`p-1 sm:p-1.5 rounded-full transition-colors ${historyIndex <= 0 ? "opacity-30" : "hover:bg-zinc-700"}`}
              >
                <Undo2 size={12} />
              </button>
              <div className="w-px h-3 sm:h-4 bg-zinc-700 mx-0.5 sm:mx-1 my-auto"></div>
              <button
                onClick={redo}
                disabled={historyIndex >= history.length - 1}
                className={`p-1 sm:p-1.5 rounded-full transition-colors ${historyIndex >= history.length - 1 ? "opacity-30" : "hover:bg-zinc-700"}`}
              >
                <Redo2 size={12} />
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* Modern Horizontal Splitter */}
      <div className="h-px bg-gradient-to-r from-transparent via-zinc-700 to-transparent relative z-[80] bg-[#1e1e20]"></div>

      {/* Editor Timeline Space */}
      <div className="h-[40vh] shrink-0 bg-[#171719] flex flex-col relative w-full select-none z-0 overflow-hidden">
        {/* Timeline Content Flex Container */}
        <div
          id="master-vertical-scroll"
          ref={timelineScrollRef}
          className="flex-1 w-full relative overflow-auto scrollbar-hide bg-[#171719]"
          style={{ touchAction: "pan-x pan-y" }}
          onScroll={(e) => {
            if (!isPlayingRef.current) {
              setCurrentTime(
                (e.currentTarget.scrollLeft + playheadXRef.current) /
                  currentPixelsPerSecondRef.current,
              );
            }
          }}
        >
          <div className="flex min-h-full min-w-max relative w-[fit-content]">
            {/* Left Layer Control Panel */}
            <div className="w-[100px] shrink-0 flex flex-col border-r border-white/5 bg-[#171719] z-[70] sticky left-0 pb-[200px] shadow-[2px_0_10px_rgba(0,0,0,0.2)]">
              <div className="text-[9px] uppercase tracking-widest text-zinc-500 text-center font-bold sticky top-0 w-full z-[80] bg-[#171719] h-[20px] flex items-center justify-center border-b border-white/5 shrink-0 shadow-[0_4px_10px_rgba(0,0,0,0.2)]">
                Layers
              </div>

              <div id="layers-sidebar" className="flex flex-col flex-1">
                {visibleLayers.map((layer) => (
                  <div
                    key={layer.id}
                    className={`h-[32px] sm:h-[38px] flex flex-col items-center justify-center shrink-0 border-b group py-1 relative transition-all transform-gpu ${draggingLayerId === layer.id ? "bg-indigo-500/20 border-indigo-500/50 scale-[1.02] z-50 shadow-xl" : "bg-zinc-800/20 border-white/5 backdrop-blur-sm z-10"}`}
                  >
                    <div className="flex gap-0.5 sm:gap-1 items-center">
                      <button
                        onClick={() => toggleLayerMute(layer.id)}
                        className={`w-6 h-6 sm:w-7 sm:h-7 flex items-center justify-center rounded-full ${layer.isMuted ? "text-red-400 bg-red-400/10" : "text-zinc-400 hover:text-white"}`}
                      >
                        {layer.isMuted ? (
                          <VolumeX size={13} sm:size={14} />
                        ) : (
                          <Volume2 size={13} sm:size={14} />
                        )}
                      </button>
                      <button
                        onClick={() => toggleLayerVisibility(layer.id)}
                        className={`w-6 h-6 sm:w-7 sm:h-7 flex items-center justify-center rounded-full ${layer.isHidden ? "text-blue-400 bg-blue-400/10" : "text-zinc-400 hover:text-white"}`}
                      >
                        {layer.isHidden ? (
                          <EyeOff size={13} sm:size={14} />
                        ) : (
                          <Eye size={13} sm:size={14} />
                        )}
                      </button>
                      <div
                        onPointerDown={(e) =>
                          handleLayerPointerDown(e, layer.id)
                        }
                        onClick={(e) => {
                          e.stopPropagation();
                          if (!hasDraggedLayerRef.current) {
                            setLayerMenuOpenId(layerMenuOpenId === layer.id ? null : layer.id);
                          }
                        }}
                        className={`w-6 h-6 sm:w-7 sm:h-7 flex items-center justify-center rounded-full cursor-grab touch-none transition-colors ${layerMenuOpenId === layer.id || draggingLayerId === layer.id ? "bg-zinc-700 text-white" : "text-zinc-400 hover:text-white hover:bg-zinc-800"}`}
                      >
                        <MoreVertical size={13} sm:size={14} />
                      </div>
                    </div>

                    {/* Layer Options Menu */}
                    <AnimatePresence>
                      {layerMenuOpenId === layer.id && (
                        <>
                          <div
                            className="fixed inset-0 z-[60]"
                            onClick={(e) => {
                              e.stopPropagation();
                              setLayerMenuOpenId(null);
                            }}
                          />
                          <motion.div
                            initial={{ opacity: 0, scale: 0.9, x: -10 }}
                            animate={{ opacity: 1, scale: 1, x: 0 }}
                            exit={{ opacity: 0, scale: 0.9, x: -10 }}
                            className="absolute left-full ml-2 top-1/2 -translate-y-1/2 z-[70] bg-zinc-800 border border-white/10 rounded-lg shadow-xl overflow-hidden flex flex-col w-[120px]"
                          >
                            <button
                              className="px-3 py-2 text-xs text-left text-zinc-300 hover:bg-white/10 hover:text-white transition-colors flex items-center gap-2"
                              onClick={(e) => {
                                e.stopPropagation();
                                setLayers((prev) => {
                                  const sorted = [...prev].sort(
                                    (a, b) => b.order - a.order,
                                  );
                                  const visIdx = sorted.findIndex(
                                    (l) => l.id === layer.id,
                                  );
                                  // insert new layer right above this one visually (so order is between this and the one above)
                                  let newOrder = layer.order + 0.5;
                                  if (visIdx > 0) {
                                    newOrder =
                                      (layer.order + sorted[visIdx - 1].order) /
                                      2;
                                  } else {
                                    newOrder = layer.order + 1;
                                  }
                                  return [
                                    ...prev,
                                    {
                                      id: "L_" + Date.now(),
                                      order: newOrder,
                                      isMuted: false,
                                      isHidden: false,
                                    },
                                  ];
                                });
                                setLayerMenuOpenId(null);
                              }}
                            >
                              <PlusIcon size={12} /> Add Up
                            </button>
                            <button
                              className="px-3 py-2 text-xs text-left text-zinc-300 hover:bg-white/10 hover:text-white transition-colors"
                              onClick={(e) => {
                                e.stopPropagation();
                                setLayerMenuOpenId(null);
                              }}
                            >
                              Decide Later
                            </button>
                            <button
                              className="px-3 py-2 text-xs text-left text-red-500 hover:bg-red-500/20 transition-colors flex items-center gap-2 border-t border-white/10"
                              onClick={(e) => {
                                e.stopPropagation();
                                setLayers((prev) =>
                                  prev.filter((l) => l.id !== layer.id),
                                );
                                setClips((prev) =>
                                  prev.filter((c) => c.layerId !== layer.id),
                                );
                                setLayerMenuOpenId(null);
                              }}
                            >
                              <Trash2 size={12} /> Delete
                            </button>
                          </motion.div>
                        </>
                      )}
                    </AnimatePresence>
                  </div>
                ))}
                <div
                  className="h-[44px] sm:h-[50px] flex items-center justify-center shrink-0 border-b border-white/5 bg-zinc-800/10 hover:bg-zinc-800/30 cursor-pointer transition-colors"
                  onClick={() => {
                    setLayers((prev) => {
                      const maxOrder = prev.reduce(
                        (max, l) => Math.max(max, l.order),
                        -1,
                      );
                      return [
                        ...prev,
                        {
                          id: "L_" + Date.now(),
                          order: maxOrder + 1,
                          isMuted: false,
                          isHidden: false,
                        },
                      ];
                    });
                  }}
                >
                  <PlusIcon
                    size={16}
                    className="text-zinc-500 hover:text-white"
                  />
                </div>
              </div>
            </div>

            {/* STATIONARY PLAYHEAD (Now perfectly aligned) */}
            {layers.length > 0 && (
              <div
                className="sticky top-0 left-[100px] pointer-events-none z-[60] w-0 h-0"
                style={{ transform: `translateX(${playheadX}px)` }}
              >
                <div className="absolute top-0 -translate-x-[1px] flex flex-col items-center">
                  <div
                    className="w-[14px] h-[15px] bg-red-500 relative flex items-end justify-center"
                    style={{
                      clipPath:
                        "polygon(0 0, 100% 0, 100% 60%, 50% 100%, 0 60%)",
                    }}
                  >
                    <div className="w-[4px] h-[4px] bg-red-950/30 rounded-full mb-[5px]"></div>
                  </div>
                </div>
                <div className="absolute top-0 left-0 transform -translate-x-[1px] w-[1.5px] bg-red-500 h-[100vh] shadow-[0_0_8px_rgba(239,68,68,0.8)]"></div>
              </div>
            )}

            {/* Right Scrollable Timeline Container */}
            <div className="flex-1 relative flex flex-col min-w-max pt-[0px]">
              {/* sticky wrapper for Ruler */}
              {layers.length > 0 && (
                <div
                  id="ruler-container"
                  className="sticky top-0 z-[50] h-[20px] bg-[#171719] border-b border-white/5 cursor-pointer hover:bg-[#222] transition-colors"
                  onPointerDown={(e) => {
                    e.stopPropagation();
                    setIsPlaying(false);
                    const target = e.currentTarget;
                    target.setPointerCapture(e.pointerId);

                    const updateSeek = (clientX: number) => {
                      const rx = clientX - 100;
                      const rect = target.getBoundingClientRect();
                      const x = rx + timelineScrollRef.current!.scrollLeft;
                      const newTime = Math.max(
                        0,
                        x / currentPixelsPerSecondRef.current,
                      );
                      setCurrentTime(newTime);

                      setPlayheadX(Math.max(0, rx));
                      playheadXRef.current = Math.max(0, rx);
                    };
                    updateSeek(e.clientX);

                    const handlePointerMove = (moveEvent: PointerEvent) => {
                      updateSeek(moveEvent.clientX);
                    };
                    const handlePointerUp = (upEvent: PointerEvent) => {
                      target.releasePointerCapture(upEvent.pointerId);
                      window.removeEventListener(
                        "pointermove",
                        handlePointerMove,
                      );
                      window.removeEventListener("pointerup", handlePointerUp);
                    };
                    window.addEventListener("pointermove", handlePointerMove);
                    window.addEventListener("pointerup", handlePointerUp);
                  }}
                >
                  <div
                    className="relative h-full"
                    style={{
                      width: `${maxTimelineDuration * pixelsPerSecond}px`,
                    }}
                  >
                    {Array.from({ length: Math.ceil(maxTimelineDuration) }).map(
                      (_, i) => {
                        let step = 1;
                        if (pixelsPerSecond < 10) step = 30; // very zoomed out
                        else if (pixelsPerSecond < 20) step = 10;
                        else if (pixelsPerSecond < 35) step = 5;
                        else if (pixelsPerSecond < 70) step = 2; // normal default is 100
                        
                        const showText = i % step === 0;

                        // Skip rendering the tick entirely if it's too squished
                        const hideTick = pixelsPerSecond < 5 && i % 5 !== 0;
                        if (hideTick) return null;

                        return (
                          <div
                            key={i}
                            className="absolute h-full border-l border-zinc-600/80 pointer-events-none"
                            style={{ left: `${i * pixelsPerSecond}px` }}
                          >
                            {showText && (
                              <span
                                className="absolute -left-[4px] top-[2px] text-[9px] text-zinc-300 font-medium font-mono pl-1 bg-transparent px-1 rounded line-height-none leading-none"
                                style={{ textShadow: "none" }}
                              >
                                {i < 60 ? i.toString() : `${Math.floor(i/60)}:${(i%60).toString().padStart(2,"0")}`}
                              </span>
                            )}
                            {/* Sub-ticks for zoom */}
                            {zoomLevel >= 3 && Array.from({ length: 9 }).map((_, subIndex) => {
                              const isHalf = subIndex === 4;
                              return (
                                <div
                                  key={subIndex}
                                  className={`absolute bottom-0 w-px ${isHalf ? "bg-zinc-500" : "bg-zinc-700/80"} pointer-events-none`}
                                  style={{
                                    left: `${(subIndex + 1) * (pixelsPerSecond / 10)}px`,
                                    height: isHalf ? "10px" : "5px",
                                  }}
                                />
                              );
                            })}
                          </div>
                        );
                      }
                    )}
                  </div>
                </div>
              )}
              <div
                className="w-full h-full relative"
                onPointerDown={(e) => {
                  setIsPlaying(false);
                  pointerMoveCanvasRef.current = false;
                  setPastePopup(null);

                  const target = e.target as Element;
                  const isEmptySpace =
                    e.target === e.currentTarget ||
                    target.id === "timeline-content" ||
                    target.id === "timeline-inner" ||
                    target.closest(".track-space");

                  let clickTime = currentTime;
                  const innerRect = document
                    .getElementById("timeline-inner")
                    ?.getBoundingClientRect();
                  if (innerRect) {
                    const x = e.clientX - innerRect.left;
                    clickTime = Math.max(
                      0,
                      x / currentPixelsPerSecondRef.current,
                    );
                  }

                  if (isEmptySpace) {
                    setSelectedClipId(null);

                    const startX = e.clientX;
                    const startY = e.clientY;
                    const pointerId = e.pointerId;
                    const isMouse = e.pointerType === "mouse";
                    const masterScroll = timelineScrollRef.current;
                    if (!masterScroll) return;

                    const startScrollLeft = masterScroll.scrollLeft;
                    const startScrollTop = masterScroll.scrollTop;
                    const rect = document.getElementById("timeline-inner")?.getBoundingClientRect() || {left:0, top:0};

                    const container = e.currentTarget as HTMLElement;
                    container.setPointerCapture(pointerId);

                    let hasMoved = false;
                    let isMarquee = false;

                    const handlePointerMove = (moveEvent: PointerEvent) => {
                      pointerMoveCanvasRef.current = true;
                      const deltaX = moveEvent.clientX - startX;
                      const deltaY = moveEvent.clientY - startY;

                      if (!isMarquee) {
                        if (Math.abs(deltaX) > 5 || Math.abs(deltaY) > 5) {
                          hasMoved = true;
                          if (longPressTimerRef.current) {
                            clearTimeout(longPressTimerRef.current);
                            longPressTimerRef.current = null;
                          }
                          // Only polyfill scroll for mouse, touch is native pan
                          if (isMouse) {
                            masterScroll.scrollLeft = startScrollLeft - deltaX;
                            masterScroll.scrollTop = startScrollTop - deltaY;
                          }
                        }
                      } else {
                        // Marquee Selection Mode!
                        if (!isMouse) moveEvent.preventDefault(); // attempt to stop scroll on touch if we can

                        const curX = moveEvent.clientX - rect.left + masterScroll.scrollLeft;
                        const curY = moveEvent.clientY - rect.top + masterScroll.scrollTop;
                        const absStartX = startX - rect.left + masterScroll.scrollLeft;
                        const absStartY = startY - rect.top + masterScroll.scrollTop;

                        setMarquee({ startX: absStartX, startY: absStartY, currentX: curX, currentY: curY });

                        // Check Intersections
                        const minX = Math.min(absStartX, curX);
                        const maxX = Math.max(absStartX, curX);
                        const minY = Math.min(absStartY, curY);
                        const maxY = Math.max(absStartY, curY);

                        const newSelected: string[] = [];
                        const layerMap = new Map();
                        visibleLayers.forEach((l, i) => layerMap.set(l.id, i));

                        clips.forEach(clip => {
                           const lidx = layerMap.get(clip.layerId);
                           if (lidx === undefined) return;
                           const cLeft = clip.leftSeconds * currentPixelsPerSecondRef.current;
                           const cRight = cLeft + clip.durationSeconds * currentPixelsPerSecondRef.current;
                           const rowHeight = window.innerWidth >= 640 ? 48 : 40;
                           const clipHeight = window.innerWidth >= 640 ? 36 : 30;
                           const cTop = 32 + lidx * rowHeight;
                           const cBottom = cTop + clipHeight;

                           if (cLeft < maxX && cRight > minX && cTop < maxY && cBottom > minY) {
                               newSelected.push(clip.id);
                           }
                        });

                        setSelectedClipIds(newSelected);
                      }
                    };

                    const handlePointerUp = (upEvent: PointerEvent) => {
                      if (longPressTimerRef.current) {
                        clearTimeout(longPressTimerRef.current);
                        longPressTimerRef.current = null;
                      }
                      
                      if (isMarquee) {
                        setMarquee(null);
                      } else if (!hasMoved && copiedClip) {
                        // Handle paste popup exactly as before if no drag occurred
                        const trackElement = target.closest(".track-space");
                        const layerId = trackElement?.getAttribute("data-layer-id") || undefined;
                        setPastePopup({
                          x: startX,
                          y: startY,
                          time: clickTime,
                          layerId,
                        });
                      }

                      container.releasePointerCapture(upEvent.pointerId);
                      window.removeEventListener("pointermove", handlePointerMove);
                      window.removeEventListener("pointerup", handlePointerUp);
                      window.removeEventListener("pointercancel", handlePointerUp);
                    };

                    window.addEventListener("pointermove", handlePointerMove, { passive: false });
                    window.addEventListener("pointerup", handlePointerUp);
                    window.addEventListener("pointercancel", handlePointerUp);

                    // Start Long Press Timer for Marquee
                    longPressTimerRef.current = setTimeout(() => {
                      if (!hasMoved) {
                        isMarquee = true;
                        const absStartX = startX - rect.left + masterScroll.scrollLeft;
                        const absStartY = startY - rect.top + masterScroll.scrollTop;
                        setMarquee({ startX: absStartX, startY: absStartY, currentX: absStartX, currentY: absStartY });
                      }
                    }, 350);
                  }
                }}
                onPointerMove={() => {
                  pointerMoveCanvasRef.current = true;
                }}
                onPointerUp={() => {
                  if (longPressTimerRef.current) {
                    clearTimeout(longPressTimerRef.current);
                    longPressTimerRef.current = null;
                  }
                }}
                onPointerLeave={() => {
                  if (longPressTimerRef.current) {
                    clearTimeout(longPressTimerRef.current);
                    longPressTimerRef.current = null;
                  }
                }}
                onContextMenu={(e) => {
                  e.preventDefault();
                }}
              >
                {/* Scroll Content Width defined by max duration */}
                <div
                  id="timeline-content"
                  className="min-h-full min-w-full flex flex-col"
                  style={{
                    paddingRight: "calc(100vw - 100px)",
                    paddingBottom: "0px",
                    width: "fit-content",
                    boxSizing: "content-box",
                  }}
                >
                  <div
                    id="timeline-inner"
                    className="relative min-h-full w-full"
                    style={{
                      width: `${maxTimelineDuration * pixelsPerSecond}px`,
                    }}
                  >
                    {/* Moving Playhead Cursor Removed (Now stationary in parent) */}

                    {/* Tracks Grid Area */}
                    <div
                      className="w-full pb-[200px] relative z-10"
                      style={{ paddingTop: "0" }}
                    >
                      {visibleLayers.map((layer) => (
                        <div
                          key={layer.id}
                          data-layer-id={layer.id}
                          className={`relative h-[32px] sm:h-[38px] w-full border-b flex items-center group track-space transition-[background,transform,border,shadow] transform-gpu ${draggingLayerId === layer.id ? "bg-indigo-500/10 border-indigo-500/30 scale-[1.02] shadow-xl z-50 rounded-lg overflow-hidden" : "border-white/5 z-0"}`}
                        >
                          {/* Grid Background */}
                          <div
                            className="absolute inset-0 pointer-events-none opacity-20"
                            style={{
                              backgroundImage:
                                zoomLevel > 1
                                  ? `linear-gradient(to right, rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(to right, rgba(255,255,255,0.02) 1px, transparent 1px)`
                                  : `linear-gradient(to right, rgba(255,255,255,0.05) 1px, transparent 1px)`,
                              backgroundSize:
                                zoomLevel > 1
                                  ? `${pixelsPerSecond}px 100%, ${pixelsPerSecond / 10}px 100%`
                                  : `${pixelsPerSecond}px 100%`,
                              backgroundPosition: `0 0`,
                            }}
                          />

                          {/* Render Clips for this layer */}
                          {clips
                            .filter((c) => c.layerId === layer.id)
                            .map((clip) => (
                              <div
                                key={clip.id}
                                onPointerDown={(e) =>
                                  handleClipDragStart(e, clip)
                                }
                                className={`absolute h-[28px] sm:h-[34px] overflow-hidden flex items-center cursor-pointer select-none border backdrop-blur-sm transition-shadow duration-300
                                           ${clip.type === "audio" ? "rounded-2xl bg-[#2b0e45]/95 border-purple-500/25" : "rounded-lg"}
                                           ${clip.type === "video" ? "bg-gradient-to-r from-blue-900/80 to-indigo-900/60 border-white/10" : ""}
                                           ${clip.type === "text" ? "bg-gradient-to-r from-amber-900/80 to-orange-900/60 border-white/10" : ""}
                                           ${clip.type === "image" ? "bg-gradient-to-r from-emerald-900/80 to-teal-900/60 border-white/10" : ""}
                                           ${selectedClipIds.includes(clip.id) ? (clip.type === "audio" ? "z-20 opacity-100 border-purple-400 shadow-[0_0_15px_rgba(168,85,247,0.3)] bg-gradient-to-b from-[#3a155c] to-[#250a3b]" : "z-20 opacity-100 border-white/60 shadow-[0_0_15px_rgba(255,255,255,0.1)] bg-white/5") : "z-10 opacity-90 hover:opacity-100 border-white/10 hover:border-white/20"}
                                           ${layer.isHidden || (layer.isMuted && clip.type === "audio") ? "grayscale opacity-30 shadow-none" : ""}
                                         `}
                                style={{
                                  left: clip.leftSeconds * pixelsPerSecond,
                                  width: Math.max(2, clip.durationSeconds * pixelsPerSecond),
                                  touchAction: "none",
                                }}
                              >
                                <div className="absolute inset-0 bg-black/10 pointer-events-none z-10"></div>
                                {clip.type === "text" && (
                                  <div className="w-full h-full flex items-center justify-center px-4 pointer-events-none overflow-hidden pb-1 pt-3">
                                    <span className="text-[12px] font-bold text-white/90 truncate drop-shadow-sm bg-black/40 px-2 py-0.5 rounded border border-white/10">
                                      {clip.text || "Type text..."}
                                    </span>
                                  </div>
                                )}
                                {clip.type === "image" && (
                                  <>
                                    <img
                                      src={clip.src}
                                      className="absolute inset-0 w-full h-full object-cover opacity-70 pointer-events-none"
                                      draggable={false}
                                      onError={() => handleClipError(clip.id)}
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/20 to-transparent pointer-events-none z-10"></div>
                                  </>
                                )}
                                {clip.type === "video" && (
                                  <>
                                    <video
                                      src={clip.src + "#t=0.001"}
                                      className="absolute inset-0 w-full h-full object-cover opacity-70 pointer-events-none"
                                      draggable={false}
                                      preload="metadata"
                                      onError={() => handleClipError(clip.id)}
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/20 to-transparent pointer-events-none z-10"></div>
                                  </>
                                )}
                                {clip.type === "audio" && (() => {
                                  const seed = clip.id.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
                                  const freq1 = 0.07 + (seed % 7) * 0.015;
                                  const freq2 = 0.14 + (seed % 11) * 0.012;
                                  const freq3 = 0.03 + (seed % 5) * 0.008;

                                  const hasVolumeKeyframes = clip.keyframes?.some(k => k.properties.volume !== undefined);
                                  const constantVolume = typeof clip.volume === "number" ? clip.volume : 100;
                                  const constantVolMult = constantVolume / 100;

                                  const barCount = 140;
                                  let pathD = "";

                                  for (let i = 0; i < barCount; i++) {
                                    const h1 = Math.sin(i * freq1);
                                    const h2 = Math.cos(i * freq2);
                                    const h3 = Math.sin(i * freq3);
                                    
                                    // Generate a premium fluid song acoustic pattern
                                    let val = 0.12 + 0.38 * Math.abs(h1) + 0.32 * Math.abs(h2 * h3) + 0.12 * Math.sin(i * 0.3);
                                    val = Math.max(0.06, Math.min(0.95, val));

                                    // Check volume at this slice of the audio duration
                                    let volMult = constantVolMult;
                                    if (hasVolumeKeyframes && clip.durationSeconds) {
                                      const tRel = (i / (barCount - 1)) * clip.durationSeconds;
                                      const propsAtBar = getInterpolatedProps(clip, tRel, activeExpandedMenu);
                                      volMult = (propsAtBar.volume ?? 100) / 100;
                                    }
                                    
                                    const finalVal = val * volMult;
                                    const x = i * 10 + 5;
                                    const halfH = finalVal * 42; // Vertically symmetric waves scaling up to 42 units up & down
                                    const y1 = 50 - halfH;
                                    const y2 = 50 + halfH;
                                    pathD += `M ${x} ${y1} L ${x} ${y2} `;
                                  }

                                  return (
                                    <svg 
                                      className="absolute inset-y-[4px] left-[12px] right-[12px] w-[calc(100%-24px)] h-[calc(100%-8px)] pointer-events-none opacity-[0.88]"
                                      viewBox={`0 0 ${barCount * 10} 100`}
                                      preserveAspectRatio="none"
                                    >
                                      <path
                                        d={pathD}
                                        stroke="#a76ef2"
                                        strokeWidth="3.2"
                                        strokeLinecap="round"
                                      />
                                    </svg>
                                  );
                                })()}

                                {/* Type indicator icon */}
                                <div className={`absolute max-w-full overflow-hidden whitespace-nowrap pl-2 flex items-center gap-1 ${clip.type === "audio" ? "inset-y-0 z-20 pointer-events-none" : "top-1 pointer-events-none"}`}>
                                  {erroredClips.has(clip.id) &&
                                    clip.type !== "text" && (
                                      <span className="text-[10px] font-bold text-red-100 uppercase drop-shadow-md pb-0.5 px-1 bg-red-500/80 rounded inline-flex items-center gap-1">
                                        <AlertCircle size={10} /> Missing File
                                      </span>
                                    )}
                                  
                                  {clip.type === "audio" ? (
                                    <span className="text-[11px] font-semibold text-purple-100 tracking-wide drop-shadow-sm py-0.5 px-2.5 bg-black/40 border border-purple-500/15 rounded-full inline-flex items-center backdrop-blur-md shadow-inner gap-1.5 ml-1">
                                      <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse shrink-0" />
                                      Audio {layer.isHidden && "(Hidden)"} {layer.isMuted && "(Muted)"}
                                    </span>
                                  ) : (
                                    <span className="text-[10px] font-semibold tracking-wide text-white/90 drop-shadow-sm py-0.5 px-1.5 bg-black/40 border border-white/10 rounded shadow-sm backdrop-blur-md inline-flex items-center">
                                      {clip.type.charAt(0).toUpperCase() + clip.type.slice(1)} {layer.isHidden && "(Hidden)"}{" "}
                                      {layer.isMuted && "(Muted)"}
                                    </span>
                                  )}

                                  {clip.opticalFlow && (
                                    <span className="text-[10px] font-bold text-indigo-200 uppercase drop-shadow-md pb-0.5 px-1 bg-indigo-500/50 rounded inline-flex items-center gap-1">
                                      <Activity size={10} /> Smooth
                                    </span>
                                  )}
                                </div>

                                {/* Keyframe Markers and Slope Connections */}
                                {clip.keyframes && clip.keyframes.length > 0 && (
                                  <svg className="absolute inset-0 w-full h-full pointer-events-none z-30 overflow-visible">
                                    {(() => {
                                      const sortedKfs = [...clip.keyframes].sort((a, b) => a.timeOffset - b.timeOffset);
                                      const isVol = activeExpandedMenu === "volume";
                                      const relevantSortedKfs = sortedKfs.filter(kf => {
                                        if (isVol) {
                                          return kf.properties.volume !== undefined;
                                        } else {
                                          return kf.properties.translateX !== undefined || kf.properties.scale !== undefined;
                                        }
                                      });
                                      const points = relevantSortedKfs.map(kf => {
                                        const xCoord = kf.timeOffset * pixelsPerSecond;
                                        
                                        let val = 1.0;
                                        if (kf.properties.volume !== undefined) {
                                          val = kf.properties.volume > 1.5 ? kf.properties.volume / 100 : kf.properties.volume;
                                        } else if (kf.properties.opacity !== undefined) {
                                          val = kf.properties.opacity;
                                        } else if (kf.properties.scale !== undefined) {
                                          val = (kf.properties.scale - 0.1) / 2.9;
                                        }
                                        val = Math.max(0, Math.min(1, val));
                                        
                                        // keeping it beautifully inset within 9px to 29px in the 38px tall container
                                        const yCoord = 29 - (val * 20); 
                                        return { x: xCoord, y: yCoord, val, kf };
                                      });

                                      let pathD = "";
                                      if (points.length >= 2) {
                                        pathD = `M ${points[0].x} ${points[0].y} ` + points.slice(1).map(p => `L ${p.x} ${p.y}`).join(" ");
                                      }

                                      return (
                                        <>
                                          {pathD && (
                                            <>
                                              {/* High-visibility core connecting slope line */}
                                              <path
                                                d={pathD}
                                                fill="none"
                                                stroke="#a5b4fc"
                                                strokeWidth="0.5"
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                              />
                                            </>
                                          )}

                                          {points.map((p) => {
                                            const isSelectedKf = selectedClipId === clip.id && Math.abs(currentTime - (clip.leftSeconds + p.kf.timeOffset)) < 0.05;
                                            return (
                                              <g key={p.kf.id} className="transform-gpu">
                                                {/* Soft pulse effect around active keyframe */}
                                                {isSelectedKf && (
                                                  <circle
                                                    cx={p.x}
                                                    cy={p.y}
                                                    r="7"
                                                    fill="none"
                                                    stroke="#818cf8"
                                                    strokeWidth="1.5"
                                                    className="animate-pulse"
                                                    style={{ transformOrigin: `${p.x}px ${p.y}px` }}
                                                  />
                                                )}
                                                {/* Solid contrasting circle node background */}
                                                <circle
                                                  cx={p.x}
                                                  cy={p.y}
                                                  r="5"
                                                  fill="#1e1b4b"
                                                  stroke="none"
                                                />
                                                {/* Vibrant front keyframe circle */}
                                                <circle
                                                  cx={p.x}
                                                  cy={p.y}
                                                  r="3.5"
                                                  fill={isSelectedKf ? "#ffffff" : "#c7d2fe"}
                                                  stroke={isSelectedKf ? "#4f46e5" : "#4338ca"}
                                                  strokeWidth="1.5"
                                                />
                                                {/* Precision value percentage badge above point (visible when selected) */}
                                                {selectedClipId === clip.id && (
                                                  <text
                                                    x={p.x}
                                                    y={p.y - 7}
                                                    textAnchor="middle"
                                                    fill="#ffffff"
                                                    fontSize="7"
                                                    fontWeight="bold"
                                                    className="font-mono pointer-events-none drop-shadow-[0_1px_2.5px_rgba(0,0,0,0.95)] select-none"
                                                    style={{ paintOrder: "stroke", stroke: "#000000", strokeWidth: "1.5px", strokeLinejoin: "round" }}
                                                  >
                                                    {p.kf.properties.volume !== undefined 
                                                      ? `${Math.round((p.kf.properties.volume > 1.5 ? p.kf.properties.volume / 100 : p.kf.properties.volume) * 100)}%` 
                                                      : p.kf.properties.opacity !== undefined 
                                                      ? `${Math.round(p.kf.properties.opacity * 100)}%`
                                                      : p.kf.properties.scale !== undefined
                                                      ? `${Math.round(p.kf.properties.scale * 100)}%`
                                                      : ""
                                                    }
                                                  </text>
                                                )}
                                              </g>
                                            );
                                          })}
                                        </>
                                      );
                                    })()}
                                  </svg>
                                )}

                                {/* Trim Controls for selected */}
                                {selectedClipId === clip.id && (
                                  <>
                                    <div
                                      onPointerDown={(e) =>
                                        handleTrimStart(e, clip, "left")
                                      }
                                      className="absolute left-0 top-0 bottom-0 w-3 bg-white hover:w-4 flex items-center justify-center cursor-col-resize transition-all rounded-r"
                                      style={{ touchAction: "none" }}
                                    >
                                      <div className="w-0.5 h-3 bg-black/50 rounded-full"></div>
                                    </div>
                                    <div
                                      onPointerDown={(e) =>
                                        handleTrimStart(e, clip, "right")
                                      }
                                      className="absolute right-0 top-0 bottom-0 w-3 bg-white hover:w-4 flex items-center justify-center cursor-col-resize transition-all rounded-l"
                                      style={{ touchAction: "none" }}
                                    >
                                      <div className="w-0.5 h-3 bg-black/50 rounded-full"></div>
                                    </div>
                                  </>
                                )}
                              </div>
                            ))}
                        </div>
                      ))}

                      {/* Empty state instruction inside timeline */}
                      {layers.length === 0 && (
                        <div className="w-full h-[150px] flex flex-col items-center justify-center pt-8 text-zinc-500 gap-3">
                          <PlusCircle size={32} className="opacity-30" />
                          <span className="text-sm font-medium tracking-wide">
                            Tap '+' to add media to your timeline
                          </span>
                        </div>
                      )}

                      {/* Marquee Selection Box */}
                      {marquee && (
                        <div
                          className="absolute bg-white/20 border border-white/50 z-[100] pointer-events-none rounded-[2px]"
                          style={{
                            left: Math.min(marquee.startX, marquee.currentX),
                            top: Math.min(marquee.startY, marquee.currentY),
                            width: Math.abs(marquee.currentX - marquee.startX),
                            height: Math.abs(marquee.currentY - marquee.startY)
                          }}
                        />
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  
);
  return (
    <div 
      className="min-h-screen bg-[#121212] text-white flex flex-col font-sans"
      style={{ zoom: appScale }}
    >
      {/* Dynamic Render based on Screen */}
      {currentScreen === "home" && renderHome()}
      {currentScreen === "settings" && renderSettings()}
      {currentScreen === "editor" && renderEditor()}
      {currentScreen === "editor" && (
        <>
          {/* Floating Action Menu attached to bottom or overlay */}
          <motion.div
            layoutId="new-project-btn"
            layout
            transition={{ type: "spring", bounce: 0.5, duration: 0.6 }}
            className={`fixed bottom-0 mt-[0px] mb-[60px] left-1/2 -translate-x-1/2 flex flex-col bg-[#252528] overflow-hidden ${activeExpandedMenu === "speed-curves" ? "rounded-[24px] pt-1.5 pb-1 w-[320px]" : activeExpandedMenu ? "rounded-[24px] pt-1.5 pb-1 w-[220px]" : "rounded-[24px] h-[50px] justify-center w-[220px]"} shadow-[0_20px_50px_rgba(0,0,0,0.5)] border border-white/5 z-[200] transform-gpu`}
          >
            <AnimatePresence mode="popLayout">
              {activeExpandedMenu === "volume" && (
                <motion.div
                  layout
                  initial={{ opacity: 0, scale: 0.95, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 10 }}
                  transition={{ duration: 0.2 }}
                  className="flex flex-col w-full px-3 pb-1"
                >
                  <div className="flex justify-between items-center w-full mb-0.5 px-0.5 mt-0.5">
                    <button
                      className="flex items-center gap-2 text-[11px] text-zinc-300 hover:text-white"
                      onClick={() => setApplyVolumeToAll(!applyVolumeToAll)}
                    >
                      <div
                        className={`w-[14px] h-[14px] rounded-full border-[1.5px] ${applyVolumeToAll ? "border-white bg-white" : "border-zinc-500"} flex items-center justify-center transition-colors`}
                      >
                        {applyVolumeToAll && (
                          <div className="w-1.5 h-1.5 bg-black rounded-full" />
                        )}
                      </div>
                      Apply to all
                    </button>
                    <button
                      onClick={() => setActiveExpandedMenu(null)}
                      className="text-zinc-400 hover:text-white pb-0.5 pr-0.5"
                    >
                      <Check size={16} strokeWidth={2} />
                    </button>
                  </div>
                  
                  <div className="flex items-center w-full gap-3 px-0.5 mb-1 mt-0.5">
                    <div
                      className="flex-1 h-8 relative cursor-ew-resize touch-none flex items-center"
                      onPointerDown={(e) => {
                        const target = e.currentTarget;
                        target.setPointerCapture(e.pointerId);
                        const updateVol = (clientX: number) => {
                          const rect = target.getBoundingClientRect();
                          let x = clientX - rect.left;
                          x = Math.max(0, Math.min(rect.width, x));
                          let val = Math.round((x / rect.width) * 100);
                          setClipVolume(val);
                          setClips((prev) =>
                            prev.map((c) => {
                              if (applyVolumeToAll && (c.type === "video" || c.type === "audio")) {
                                return { ...c, volume: val };
                              }
                              if (c.id === selectedClipId) {
                                return { ...c, volume: val };
                              }
                              return c;
                            })
                          );
                        };
                        updateVol(e.clientX);
                        const moveHandler = (me: PointerEvent) => updateVol(me.clientX);
                        const upHandler = (ue: PointerEvent) => {
                          target.releasePointerCapture(ue.pointerId);
                          target.removeEventListener("pointermove", moveHandler);
                          target.removeEventListener("pointerup", upHandler);
                          target.removeEventListener("pointercancel", upHandler);
                        };
                        target.addEventListener("pointermove", moveHandler);
                        target.addEventListener("pointerup", upHandler);
                        target.addEventListener("pointercancel", upHandler);
                      }}
                    >
                      {/* Track background */}
                      <div className="absolute left-0 right-0 h-[1.5px] bg-white/20 rounded-full pointer-events-none" />
                      
                      {/* Active level fill */}
                      <div
                        className="absolute left-0 h-[1.5px] bg-[#a5b4fc] rounded-full pointer-events-none transition-all duration-75"
                        style={{ width: `${clipVolume}%` }}
                      />

                      {/* Premium knob mirroring user's photo */}
                      <div
                        className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 pointer-events-none transition-all duration-75 flex items-center justify-center z-10"
                        style={{ left: `${clipVolume}%` }}
                      >
                        <div className="w-[22px] h-[22px] bg-white/15 backdrop-blur-[1px] rounded-full flex items-center justify-center shadow-[0_2px_8px_rgba(0,0,0,0.4)] border border-white/20">
                          <div className="w-[11px] h-[11px] bg-white rounded-full shadow-[0_1px_3px_rgba(0,0,0,0.4)]" />
                        </div>
                      </div>
                    </div>
                    <span className="text-[10px] text-zinc-300 font-sans w-8 text-right font-medium">
                      {clipVolume}%
                    </span>
                  </div>
                </motion.div>
              )}

              {activeExpandedMenu === "speed" && (
                <motion.div
                  layout
                  initial={{ opacity: 0, scale: 0.95, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 10 }}
                  transition={{ duration: 0.2 }}
                  className="flex flex-col w-full px-3 pb-0.5"
                >
                  <SpeedRulerControl
                    value={clipSpeed}
                    onChange={(val) => {
                      setClipSpeed(val);
                      if (selectedClipId) {
                        setClips((prev) => {
                          const target = prev.find(c => c.id === selectedClipId);
                          if (!target) return prev;
                          
                          const oldSpeed = target.speed || 1;
                          const originalDur = target.originalDurationSeconds || (target.durationSeconds * oldSpeed);
                          const newDuration = originalDur / val;
                          const delta = newDuration - target.durationSeconds;
                          
                          return prev.map(c => {
                            if (c.id === selectedClipId) {
                              return {...c, speed: val, durationSeconds: newDuration, opticalFlow: undefined};
                            }
                            if (c.layerId === target.layerId && c.leftSeconds >= target.leftSeconds + target.durationSeconds) {
                              return {...c, leftSeconds: c.leftSeconds + delta};
                            }
                            return c;
                          });
                        });
                      }
                    }}
                    onReset={() => {
                      setClipSpeed(1);
                      if (selectedClipId) {
                        setClips((prev) => {
                          const target = prev.find(c => c.id === selectedClipId);
                          if (!target) return prev;
                          
                          const oldSpeed = target.speed || 1;
                          const originalDur = target.originalDurationSeconds || (target.durationSeconds * oldSpeed);
                          const newDuration = originalDur / 1;
                          const delta = newDuration - target.durationSeconds;
                          
                          return prev.map(c => {
                            if (c.id === selectedClipId) {
                              return {...c, speed: 1, durationSeconds: newDuration, opticalFlow: undefined};
                            }
                            if (c.layerId === target.layerId && c.leftSeconds >= target.leftSeconds + target.durationSeconds) {
                              return {...c, leftSeconds: c.leftSeconds + delta};
                            }
                            return c;
                          });
                        });
                      }
                    }}
                    onClose={() => setActiveExpandedMenu(null)}
                  />
                  <div className="flex gap-1.5 pb-2">
                    <button
                      onClick={async () => {
                        const currentClip = clips.find(
                          (c) => c.id === selectedClipId,
                        );
                        if (!currentClip || currentClip.type !== "video") return;

                        const isOpticalFlowApplied =
                          currentClip?.opticalFlow || false;

                        if (isOpticalFlowApplied) {
                          // Toggle off
                          if (selectedClipId) {
                            setClips((prev) =>
                              prev.map((c) =>
                                c.id === selectedClipId
                                  ? { ...c, opticalFlow: false, src: c.originalSrc || c.src }
                                  : c,
                              ),
                            );
                          }
                          return;
                        }

                        if (smoothProcessingProgress !== null) return;
                        setSmoothProcessingProgress(0);

                        try {
                          setPillPopup({ message: "Applying Smooth Slow-mo...", progress: 0, type: 'loading' });
                          
                          let videoSource: string | Blob = currentClip.src;
                          if (currentClip.fileId) {
                            try {
                              const { getFile } = await import("./lib/db");
                              const cachedBlob = await getFile(currentClip.fileId);
                              if (cachedBlob) {
                                videoSource = cachedBlob;
                              }
                            } catch (dbErr) {
                              console.warn("Could not retrieve file from IndexedDB:", dbErr);
                            }
                          }

                          const { url: newSrcUrl, fileId: newFileId } = await processSmoothSlowMoBrowser(
                            videoSource,
                            currentClip.speed || 1,
                            (progress) => {
                              const pVal = Math.min(99, Math.round(progress));
                              setSmoothProcessingProgress(pVal);
                              setPillPopup({ message: "Applying Smooth Slow-mo...", progress: pVal, type: 'loading' });
                            }
                          );

                          setSmoothProcessingProgress(100);
                          setPillPopup({ message: "Smooth Slow-mo Applied", type: 'info' });

                          if (selectedClipId) {
                            setClips((prev) =>
                              prev.map((c) =>
                                c.id === selectedClipId
                                  ? { ...c, opticalFlow: true, originalSrc: c.originalSrc || c.src, src: newSrcUrl, fileId: newFileId }
                                  : c,
                              ),
                            );
                          }

                          setTimeout(() => {
                            setSmoothProcessingProgress(null);
                            setPillPopup(null);
                          }, 2000);
                        } catch (err: any) {
                          console.error(err);
                          setPillPopup({ message: `Failed: ${err.message || 'unknown error'}`, type: 'info' });
                          setTimeout(() => {
                            setPillPopup(null);
                          }, 5000);
                          setSmoothProcessingProgress(null);
                        }
                      }}
                      className={`flex-1 flex justify-center items-center gap-1 px-2 py-1 relative rounded-lg transition-colors active:scale-95 overflow-hidden ${clips.find((c) => c.id === selectedClipId)?.opticalFlow ? "bg-indigo-600 hover:bg-indigo-500" : "bg-zinc-800 hover:bg-zinc-700"}`}
                    >
                      {smoothProcessingProgress !== null ? (
                        <>
                          <div className="relative w-3 h-3 flex items-center justify-center shrink-0">
                            <svg
                              className="w-full h-full -rotate-90"
                              viewBox="0 0 16 16"
                            >
                              <circle
                                cx="8"
                                cy="8"
                                r="6"
                                stroke="currentColor"
                                strokeWidth="2"
                                fill="none"
                                className="text-zinc-600"
                              />
                              <circle
                                cx="8"
                                cy="8"
                                r="6"
                                stroke="currentColor"
                                strokeWidth="2"
                                fill="none"
                                className="text-white transition-all duration-150 ease-linear"
                                strokeDasharray="37.7"
                                strokeDashoffset={
                                  37.7 - (smoothProcessingProgress / 100) * 37.7
                                }
                              />
                            </svg>
                          </div>
                          <span className="text-[9.5px] font-mono text-white whitespace-nowrap">
                            {Math.round(smoothProcessingProgress)}%
                          </span>
                        </>
                      ) : (
                        <span className="text-[9.5px] font-semibold text-white truncate">
                          Smooth
                        </span>
                      )}
                    </button>
                    <button
                      onClick={() => setActiveExpandedMenu("speed-curves")}
                      className="flex-1 flex justify-center items-center gap-1 px-2 py-1 bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors active:scale-95"
                    >
                      <span className="text-[9.5px] font-semibold text-white">
                        Curves
                      </span>
                    </button>
                  </div>
                </motion.div>
              )}
              {activeExpandedMenu === "speed-curves" && (
                <motion.div
                  layout
                  initial={{ opacity: 0, scale: 0.95, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 10 }}
                  transition={{ duration: 0.2 }}
                  className="flex flex-col w-full h-auto px-1 pt-0 pb-1"
                >
                  <SpeedCurveEditor onClose={() => setActiveExpandedMenu("speed")} />
                </motion.div>
              )}
              {activeExpandedMenu === "text" && (
                <TextEditorMenu 
                  clip={clips.find((c) => c.id === selectedClipId)} 
                  updateClip={(updates) => {
                    if (selectedClipId) {
                      setClips((prev) =>
                        prev.map((c) =>
                          c.id === selectedClipId ? { ...c, ...updates } : c
                        )
                      );
                    }
                  }}
                  setToastMessage={setToastMessage}
                />
              )}
              {activeExpandedMenu === "stabilize" && selectedClipId && (
                <motion.div
                  layout
                  initial={{ opacity: 0, scale: 0.95, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 10 }}
                  transition={{ duration: 0.2 }}
                  className="p-4 flex flex-col gap-2 bg-zinc-800 rounded-xl border border-white/10"
                >
                  <span className="text-[10px] font-bold text-zinc-400 uppercase">Crop Limit</span>
                  <div className="grid grid-cols-2 gap-2">
                    <button onClick={() => handleStabilize(selectedClipId, "low")} className="p-2 rounded bg-zinc-700 hover:bg-zinc-600 text-xs">Low</button>
                    <button onClick={() => handleStabilize(selectedClipId, "high")} className="p-2 rounded bg-zinc-700 hover:bg-zinc-600 text-xs">High</button>
                  </div>
                </motion.div>
              )}
              {activeExpandedMenu === "move" && selectedClipId && (
                <motion.div
                  layout
                  initial={{ opacity: 0, scale: 0.95, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 10 }}
                  transition={{ duration: 0.2 }}
                  className="flex flex-col w-full h-auto max-h-[260px] shrink-0 overflow-y-auto scrollbar-hide pt-0 pb-1"
                >
                  <div className="flex justify-between items-center w-full px-3.5 mb-1.5 shrink-0">
                    <span className="text-[10px] font-semibold text-white/90">
                      Transform
                    </span>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => {
                          setClips((prev) =>
                            prev.map((c) =>
                              c.id === selectedClipId
                                ? {
                                    ...c,
                                    translateX: 0,
                                    translateY: 0,
                                    rotation: 0,
                                    scale: 1,
                                  }
                                : c,
                            ),
                          );
                        }}
                        className="text-[8px] bg-zinc-800 px-1.5 py-0.5 rounded text-zinc-300 hover:text-white uppercase tracking-wider transition-colors"
                      >
                        Reset All
                      </button>
                      <button
                        onClick={() => setActiveExpandedMenu(null)}
                        className="text-zinc-400 hover:text-white ml-0.5"
                      >
                        <Check size={14} />
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-x-2.5 gap-y-1.5 w-full px-3 mt-1.5">
                    <div className="flex flex-col gap-1.5">
                      <CompactRulerControl
                        label="Rotation"
                        value={
                          clips.find((c) => c.id === selectedClipId)
                            ?.rotation || 0
                        }
                        onChange={(val) => {
                          setClips((prev) =>
                            prev.map((c) =>
                              c.id === selectedClipId
                                ? { ...c, rotation: val }
                                : c,
                            ),
                          );
                        }}
                        onReset={() =>
                          setClips((prev) =>
                            prev.map((c) =>
                              c.id === selectedClipId
                                ? { ...c, rotation: 0 }
                                : c,
                            ),
                          )
                        }
                        min={-180}
                        max={180}
                        step={1}
                        unit="°"
                        sensitivity={0.5}
                      />
                      <CompactRulerControl
                        label="Scale"
                        value={
                          clips.find((c) => c.id === selectedClipId)?.scale ?? 1
                        }
                        onChange={(val) => {
                          setClips((prev) =>
                            prev.map((c) =>
                              c.id === selectedClipId
                                ? { ...c, scale: val }
                                : c,
                            ),
                          );
                        }}
                        onReset={() =>
                          setClips((prev) =>
                            prev.map((c) =>
                              c.id === selectedClipId ? { ...c, scale: 1 } : c,
                            ),
                          )
                        }
                        min={0.1}
                        max={5}
                        step={0.01}
                        unit="x"
                        sensitivity={0.01}
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <CompactRulerControl
                        label="Pos X"
                        value={
                          clips.find((c) => c.id === selectedClipId)
                            ?.translateX || 0
                        }
                        onChange={(val) => {
                          setClips((prev) =>
                            prev.map((c) =>
                              c.id === selectedClipId
                                ? { ...c, translateX: val }
                                : c,
                            ),
                          );
                        }}
                        onReset={() =>
                          setClips((prev) =>
                            prev.map((c) =>
                              c.id === selectedClipId
                                ? { ...c, translateX: 0 }
                                : c,
                            ),
                          )
                        }
                        min={-2000}
                        max={2000}
                        step={1}
                        unit="px"
                        sensitivity={1}
                      />
                      <CompactRulerControl
                        label="Pos Y"
                        value={
                          clips.find((c) => c.id === selectedClipId)
                            ?.translateY || 0
                        }
                        onChange={(val) => {
                          setClips((prev) =>
                            prev.map((c) =>
                              c.id === selectedClipId
                                ? { ...c, translateY: val }
                                : c,
                            ),
                          );
                        }}
                        onReset={() =>
                          setClips((prev) =>
                            prev.map((c) =>
                              c.id === selectedClipId
                                ? { ...c, translateY: 0 }
                                : c,
                            ),
                          )
                        }
                        min={-2000}
                        max={2000}
                        step={1}
                        unit="px"
                        sensitivity={1}
                      />
                    </div>
                  </div>
                </motion.div>
              )}
              {activeExpandedMenu === "blend" && selectedClipId && (
                <motion.div
                  layout
                  initial={{ opacity: 0, scale: 0.95, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 10 }}
                  transition={{ duration: 0.2 }}
                  className="flex flex-col w-full h-auto pb-1 pt-0 shrink-0"
                >
                  <div className="flex justify-between items-center w-full px-3.5 mb-1.5">
                    <span className="text-[10px] font-semibold text-white/90">
                      Blend & Opacity
                    </span>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => setActiveExpandedMenu(null)}
                        className="text-zinc-400 hover:text-white"
                      >
                        <Check size={14} />
                      </button>
                    </div>
                  </div>

                  {/* Blending Modes */}
                  <div className="flex items-center gap-1.5 px-2.5 overflow-x-auto scrollbar-hide snap-x pt-0.5 pb-1.5">
                    {["normal", "multiply", "screen", "overlay", "darken", "lighten", "color-dodge", "color-burn", "hard-light", "soft-light", "difference", "exclusion", "hue", "saturation", "color", "luminosity"].map((mode) => {
                       const currentMode = clips.find((c) => c.id === selectedClipId)?.mixBlendMode || "normal";
                       const isActive = currentMode === mode;
                       return (
                         <button
                           key={mode}
                           onClick={() => {
                             setClips((prev) =>
                               prev.map((c) =>
                                 c.id === selectedClipId ? { ...c, mixBlendMode: mode as any } : c
                               )
                             );
                           }}
                           className={`shrink-0 px-2 py-1 rounded-full text-[9px] font-semibold capitalize transition-colors snap-start border ${isActive ? "bg-white text-black border-white" : "bg-zinc-800 text-zinc-300 border-white/5 hover:bg-zinc-700"}`}
                         >
                           {mode.replace("-", " ")}
                         </button>
                       );
                    })}
                  </div>

                  {/* Opacity Control */}
                  <div className="px-3.5 mt-0.5">
                     <div className="flex justify-between items-center mb-1">
                        <span className="text-[8px] text-zinc-500 font-bold uppercase pl-0.5">Opacity</span>
                        <span className="text-[9px] text-zinc-400 font-mono pr-0.5">
                          {Math.round((clips.find((c) => c.id === selectedClipId)?.opacity ?? 1) * 100)}%
                        </span>
                     </div>
                     <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.01"
                        value={clips.find((c) => c.id === selectedClipId)?.opacity ?? 1}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          setClips((prev) =>
                            prev.map((c) =>
                              c.id === selectedClipId ? { ...c, opacity: val } : c
                            )
                          );
                        }}
                        className="w-full accent-white h-0.5 bg-zinc-700 rounded-full appearance-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-2.5 [&::-webkit-slider-thumb]:h-2.5 [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:rounded-full cursor-pointer mt-0.5"
                     />
                  </div>
                </motion.div>
              )}
              {activeExpandedMenu === "crop" && selectedClipId && (
                <motion.div
                  layout
                  initial={{ opacity: 0, scale: 0.95, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 10 }}
                  className="bg-zinc-800 rounded-xl shadow-xl border border-white/10 overflow-hidden"
                >
                  <div className="flex items-center gap-1 p-1.5 w-[190px]">
                    {["None", "1:1", "16:9", "9:16", "4:3"].map((ratio) => {
                      const currentRatio =
                        clips.find((c) => c.id === selectedClipId)?.cropRatio || "None";
                      return (
                        <button
                          key={ratio}
                          onClick={() => {
                            if (selectedClipId) {
                               setClips(prev => prev.map(c => c.id === selectedClipId ? {...c, cropRatio: ratio === "None" ? null : ratio as any} : c));
                            }
                          }}
                          className={`flex-1 flex justify-center items-center px-1 py-1 rounded-lg transition-colors text-[10px] font-semibold ${currentRatio === ratio || (currentRatio === null && ratio === "None") ? "bg-indigo-600 text-white" : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-white"}`}
                        >
                          {ratio}
                        </button>
                      );
                    })}
                  </div>
                </motion.div>
              )}
              {activeExpandedMenu === "mask" && selectedClipId && (
                <motion.div
                  layout
                  initial={{ opacity: 0, scale: 0.95, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 10 }}
                  transition={{ duration: 0.2 }}
                  className="flex flex-col w-full h-auto pb-1 pt-0 shrink-0"
                >
                  <div className="flex justify-between items-center w-full px-3.5 mb-1.5">
                    <span className="text-[10px] font-semibold text-white/90">
                      Mask Shape
                    </span>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => setActiveExpandedMenu(null)}
                        className="text-zinc-400 hover:text-white"
                      >
                        <Check size={14} />
                      </button>
                    </div>
                  </div>
                  <div className="grid grid-cols-4 gap-1.5 px-2.5">
                    {[
                      {
                        id: "none",
                        name: "None",
                        icon: (
                          <div className="w-[14px] h-[14px] border-2 border-white/40" />
                        ),
                      },
                      {
                        id: "circle",
                        name: "Circle",
                        icon: (
                          <div className="w-[14px] h-[14px] border-2 border-white/40 rounded-full" />
                        ),
                      },
                      {
                        id: "square",
                        name: "Square",
                        icon: (
                          <div className="w-[12px] h-[12px] border-2 border-white/40" />
                        ),
                      },
                      {
                        id: "rounded",
                        name: "Rounded",
                        icon: (
                          <div className="w-[14px] h-[14px] border-2 border-white/40 rounded" />
                        ),
                      },
                    ].map((mask) => {
                      const isActive =
                        (clips.find((c) => c.id === selectedClipId)?.maskType ||
                          "none") === mask.id;
                      return (
                        <button
                          key={mask.id}
                          onClick={() => {
                            setClips((prev) =>
                              prev.map((c) =>
                                c.id === selectedClipId
                                  ? { ...c, maskType: mask.id as any }
                                  : c,
                              ),
                            );
                          }}
                          className={`flex flex-col items-center justify-center gap-1 p-1 py-1.5 rounded-lg transition-colors border ${isActive ? "bg-zinc-700 border-white/20" : "bg-zinc-800 border-transparent hover:border-white/10"}`}
                        >
                          <div className="h-6 flex items-center justify-center">
                            {mask.icon}
                          </div>
                          <span className="text-[8px] font-medium text-zinc-300">
                            {mask.name}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <motion.div
              layout
              transition={{ type: "spring", bounce: 0, duration: 0.4 }}
              className="flex items-center gap-1 w-full px-2 justify-center"
            >
              <motion.button
                layout
                className="p-1.5 shrink-0 hover:bg-zinc-700 rounded-full text-zinc-300 transition-colors"
                onClick={() => fileInputRef.current?.click()}
              >
                <PlusIcon size={16} />
              </motion.button>
              <motion.div
                layout
                className="w-px h-6 bg-zinc-700 mx-1 shrink-0"
              ></motion.div>
              <div className="flex items-center gap-1 overflow-x-auto scrollbar-hide w-[156px] overflow-hidden shrink-0 snap-x snap-mandatory">
                {flowBarOrder.filter((key) => {
                  if (selectedClip?.type === "image" && ["volume", "speed", "stabilize"].includes(key)) {
                    return false;
                  }
                  return true;
                }).map((key) => {
                  switch(key) {
                    case 'volume': return (
                      <motion.button key={key} layout className={`p-1.5 shrink-0 rounded-full transition-colors snap-start flex items-center justify-center ${selectedClipId ? (activeExpandedMenu === "volume" ? "bg-zinc-700 text-white" : "hover:bg-zinc-700 text-white") : "opacity-30"}`} disabled={!selectedClipId} onClick={() => setActiveExpandedMenu(activeExpandedMenu === "volume" ? null : "volume")}><Volume2 size={16} /></motion.button>
                    );
                    case 'text': return (
                      <motion.button key={key} layout className={`p-1.5 shrink-0 rounded-full transition-colors snap-start flex items-center justify-center ${selectedClipId && clips.find((c) => c.id === selectedClipId)?.type === "text" ? (activeExpandedMenu === "text" ? "bg-zinc-700 text-white" : "hover:bg-zinc-700 text-white") : "hover:bg-zinc-700 text-white"}`} onClick={() => { const sel = clips.find((c) => c.id === selectedClipId); if (sel && sel.type === "text") { setActiveExpandedMenu(activeExpandedMenu === "text" ? null : "text"); } else { handleAddText(); } }}><Type size={16} /></motion.button>
                    );
                    case 'crop': return (
                      <motion.button key={key} layout className={`p-1.5 shrink-0 rounded-full transition-colors snap-start flex items-center justify-center ${selectedClipId && ["video", "image"].includes(clips.find((c) => c.id === selectedClipId)?.type || "") ? (activeExpandedMenu === "crop" ? "bg-zinc-700 text-white" : "hover:bg-zinc-700 text-white") : "opacity-30"}`} disabled={!selectedClipId || !["video", "image"].includes(clips.find((c) => c.id === selectedClipId)?.type || "")} onClick={() => setActiveExpandedMenu(activeExpandedMenu === "crop" ? null : "crop")}><Crop size={16} /></motion.button>
                    );
                    case 'adjust': return (
                      <motion.button key={key} layout className={`p-1.5 shrink-0 rounded-full transition-colors snap-start flex items-center justify-center ${selectedClipId ? "hover:bg-zinc-700 text-white" : "opacity-30"}`} disabled={!selectedClipId}><SlidersHorizontal size={16} /></motion.button>
                    );
                    case 'speed': return (
                      <motion.button key={key} layout className={`p-1.5 shrink-0 rounded-full transition-colors snap-start flex items-center justify-center ${selectedClipId ? (activeExpandedMenu === "speed" ? "bg-zinc-700 text-white" : "hover:bg-zinc-700 text-white") : "opacity-30"}`} disabled={!selectedClipId} onClick={() => setActiveExpandedMenu(activeExpandedMenu === "speed" ? null : "speed")}><Clock size={16} /></motion.button>
                    );
                    case 'stabilize': return (
                      <motion.button key={key} layout className={`p-1.5 shrink-0 rounded-full transition-colors snap-start flex items-center justify-center ${selectedClipId && clips.find(c => c.id === selectedClipId)?.type === "video" ? (activeExpandedMenu === "stabilize" ? "bg-zinc-700 text-white" : "hover:bg-zinc-700 text-white") : "opacity-30"}`} disabled={!selectedClipId || clips.find(c => c.id === selectedClipId)?.type !== "video"} onClick={() => setActiveExpandedMenu(activeExpandedMenu === "stabilize" ? null : "stabilize")}><Activity size={16} /></motion.button>
                    );
                    case 'copy': return (
                      <motion.button key={key} layout className={`p-1.5 shrink-0 rounded-full transition-colors snap-start flex items-center justify-center ${selectedClipId ? "hover:bg-zinc-700 text-white" : "opacity-30"}`} disabled={!selectedClipId} onClick={handleCopy}><Copy size={16} /></motion.button>
                    );
                    case 'extract-audio': return (
                      <motion.button key={key} layout className={`p-1.5 shrink-0 rounded-full transition-colors snap-start flex items-center justify-center ${selectedClipId && clips.find(c => c.id === selectedClipId)?.type === "video" ? "hover:bg-zinc-700 text-white" : "opacity-30"}`} disabled={!selectedClipId || clips.find(c => c.id === selectedClipId)?.type !== "video"} onClick={handleExtractAudio}><Music size={16} /></motion.button>
                    );
                    case 'move': return (
                      <motion.button key={key} layout className={`p-1.5 shrink-0 rounded-full transition-colors snap-start flex items-center justify-center ${selectedClipId ? (activeExpandedMenu === "move" ? "bg-zinc-700 text-white" : "hover:bg-zinc-700 text-white") : "opacity-30"}`} disabled={!selectedClipId} onClick={() => setActiveExpandedMenu(activeExpandedMenu === "move" ? null : "move")}><Move size={16} /></motion.button>
                    );
                    case 'magic': return (
                      <motion.button key={key} layout className={`p-1.5 shrink-0 rounded-full transition-colors snap-start flex items-center justify-center ${selectedClipId ? "hover:bg-zinc-700 text-white" : "opacity-30"}`} disabled={!selectedClipId} onClick={handleSmoothSlowMo}><Wand2 size={16} /></motion.button>
                    );
                    case 'activity': return (
                      <motion.button key={key} layout className={`p-1.5 shrink-0 rounded-full transition-colors snap-start flex items-center justify-center ${selectedClipId ? (activeExpandedMenu === "blend" ? "bg-zinc-700 text-white" : "hover:bg-zinc-700 text-white") : "opacity-30"}`} disabled={!selectedClipId} onClick={() => setActiveExpandedMenu(activeExpandedMenu === "blend" ? null : "blend")}><Blend size={16} /></motion.button>
                    );
                    case 'mask': return (
                      <motion.button key={key} layout className={`p-1.5 shrink-0 rounded-full transition-colors snap-start flex items-center justify-center ${selectedClipId ? (activeExpandedMenu === "mask" ? "bg-zinc-700 text-white" : "hover:bg-zinc-700 text-white") : "opacity-30"}`} disabled={!selectedClipId} onClick={() => setActiveExpandedMenu(activeExpandedMenu === "mask" ? null : "mask")}><SquareDashed size={16} /></motion.button>
                    );
                    default: return null;
                  }
                })}
              </div>
            </motion.div>
            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              onChange={handleFileUpload}
              accept="video/*,audio/*,image/*"
            />
          </motion.div>
          {/* Keyframe Curve Graph Overlay */}
          <AnimatePresence>
            {showKeyframeGraph && selectedClipId && isBetweenKeyframes && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                className="fixed bottom-[110px] left-1/2 -translate-x-1/2 w-[340px] bg-[#252528] rounded-2xl p-4 shadow-[0_30px_60px_rgba(0,0,0,0.6)] border border-white/5 z-[250]"
              >
                <div className="flex justify-between items-center mb-3">
                  <span className="text-[11px] font-semibold text-white/90 uppercase tracking-widest text-indigo-400">Keyframe Interpolation</span>
                  <button onClick={() => setShowKeyframeGraph(false)} className="text-zinc-400 hover:text-white p-1 bg-white/5 rounded-full">
                    <X size={14} />
                  </button>
                </div>
                <div className="grid grid-cols-5 gap-2 mt-2">
                  {[
                    { id: "linear", name: "Linear", path: "M 2 10 L 22 2" },
                    { id: "easeIn", name: "Ease In", path: "M 2 10 Q 16 10 22 2" },
                    { id: "easeOut", name: "Ease Out", path: "M 2 10 Q 8 2 22 2" },
                    { id: "easeInOut", name: "In Out", path: "M 2 10 C 8 10 16 2 22 2" },
                    { id: "hold", name: "Hold", path: "M 2 10 L 12 10 L 12 2 L 22 2" },
                  ].map((preset) => {
                    const isSelected = clips.find((c) => c.id === selectedClipId)?.keyframes?.find((k) => k.id === 'some-id')?.interpolation === preset.id;
                    return (
                      <button
                        key={preset.id}
                        className={`flex flex-col items-center justify-center p-2 rounded-xl transition-all ${
                          isSelected ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/50' : 'bg-white/5 hover:bg-white/10 text-white border border-transparent'
                        }`}
                        onClick={() => {
                           setShowKeyframeGraph(false);
                        }}
                      >
                        <svg viewBox="0 0 24 12" className="w-8 h-4 mb-2 overflow-visible">
                          <path d={preset.path} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                        <span className="text-[10px] font-medium">{preset.name}</span>
                      </button>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}

      {/* Pill Toast Notification */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className="fixed top-6 left-1/2 -translate-x-1/2 z-[100] pointer-events-none"
          >
            <div className="bg-[#2A2A2D]/90 backdrop-blur-md px-4 py-2.5 rounded-full border border-white/10 shadow-lg flex items-center gap-2">
              <span className="text-[13px] font-medium text-white/90">{toastMessage}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
