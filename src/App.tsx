import { SettingsScreen } from './screens/SettingsScreen';
import { HomeScreen } from './screens/HomeScreen';
import { EditorScreen } from './screens/EditorScreen';
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
const screenProps: any = {
  currentScreen,
  setCurrentScreen,
  toastMessage,
  setToastMessage,
  projectMenuOpenId,
  setProjectMenuOpenId,
  projectToDelete,
  setProjectToDelete,
  flowBarOrder,
  setFlowBarOrder,
  projects,
  setProjects,
  appScale,
  setAppScale,
  activeProjectId,
  setActiveProjectId,
  isCreatingProject,
  setIsCreatingProject,
  selectedRatioTransition,
  setSelectedRatioTransition,
  focusedRatio,
  setFocusedRatio,
  customRatioW,
  setCustomRatioW,
  customRatioH,
  setCustomRatioH,
  layers,
  setLayers,
  clips,
  setClips,
  currentTime,
  setCurrentTime,
  isPlaying,
  setIsPlaying,
  zoomLevel,
  setZoomLevel,
  playheadX,
  setPlayheadX,
  activeExpandedMenu,
  setActiveExpandedMenu,
  layerMenuOpenId,
  setLayerMenuOpenId,
  draggingLayerId,
  setDraggingLayerId,
  applyVolumeToAll,
  setApplyVolumeToAll,
  clipVolume,
  setClipVolume,
  clipSpeed,
  setClipSpeed,
  smoothProcessingProgress,
  setSmoothProcessingProgress,
  selectedClipIds,
  setSelectedClipIds,
  marquee,
  setMarquee,
  showKeyframeGraph,
  setShowKeyframeGraph,
  isExportExpanded,
  setIsExportExpanded,
  pillPopup,
  setPillPopup,
  isRatioExpanded,
  setIsRatioExpanded,
  exportResolution,
  setExportResolution,
  exportFps,
  setExportFps,
  exportBitrate,
  setExportBitrate,
  exportOpticalFlow,
  setExportOpticalFlow,
  erroredClips,
  setErroredClips,
  copiedClip,
  setCopiedClip,
  pastePopup,
  setPastePopup,
  history,
  setHistory,
  historyIndex,
  setHistoryIndex,
  isExporting,
  setIsExporting,
  exportProgress,
  setExportProgress,
  exportedVideoUrl,
  setExportedVideoUrl,
  exportedVideoBlob,
  setExportedVideoBlob,
  handleAppScaleChange,
  setSelectedClipId,
  isBetweenKeyframes,
  handleClipError,
  undo,
  redo,
  playLoop,
  deltaTime,
  showToast,
  drawFn,
  elapsed,
  absTranslateX,
  absTranslateY,
  handleBackToHome,
  handlePopState,
  createProject,
  duplicateProject,
  confirmDeleteProject,
  addMediaClip,
  handleAddText,
  deleteSelectedClip,
  splitSelectedClip,
  formatTime,
  handleCopy,
  handleExtractAudio,
  handleStabilize,
  handlePaste,
  toggleLayerMute,
  toggleLayerVisibility,
  handleLayerPointerDown,
  onPointerMove,
  onPointerUp,
  handleTouchStart,
  handleTouchMove,
  handleTouchEnd,
  handleWheel,
  handlePreviewTouchStart,
  startX,
  startY,
  handlePreviewTouchMove,
  currentX,
  currentY,
  deltaX,
  deltaY,
  handlePreviewTouchEnd,
  handleClipDragStart,
  handlePointerMove,
  handlePointerUp,
  handleTrimStart,
  diff,
  handleCreateProject,
  handleMoveFlowBarItem,
  getFlowBarItemLabel,
  updateVol,
  moveHandler,
  upHandler
};

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

      const newSrc = await processSmoothSlowMoBrowser(
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
              ? { ...c, opticalFlow: true, originalSrc: c.originalSrc || c.src, src: newSrc }
              : c,
          ),
        );
      }

      setTimeout(() => {
        setPillPopup(null);
      }, 2000);
    } catch (err) {
      console.error(err);
      setPillPopup({ message: "Failed to apply Slow-mo.", type: 'info' });
      setTimeout(() => {
        setPillPopup(null);
      }, 2000);
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
          startX,
          startY,
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

    return (
    <div 
      className="min-h-screen bg-[#121212] text-white flex flex-col font-sans"
      style={{ zoom: appScale }}
    >
      {/* Dynamic Render based on Screen */}
      {currentScreen === "home" && <HomeScreen {...screenProps} /> /* TODO: define props object */}
      {currentScreen === "settings" && <SettingsScreen {...screenProps} /> /* TODO: define props object */}
      {currentScreen === "editor" && <EditorScreen {...screenProps} /> /* TODO: define props object */}
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

                          const newSrc = await processSmoothSlowMoBrowser(
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
                                  ? { ...c, opticalFlow: true, originalSrc: c.originalSrc || c.src, src: newSrc }
                                  : c,
                              ),
                            );
                          }

                          setTimeout(() => {
                            setSmoothProcessingProgress(null);
                            setPillPopup(null);
                          }, 2000);
                        } catch (err) {
                          console.error(err);
                          setPillPopup({ message: "Failed to apply Slow-mo.", type: 'info' });
                          setTimeout(() => {
                            setPillPopup(null);
                          }, 2000);
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
                    return (
                    <button
                      key={preset.name}
                      onClick={() => {
                         const cId = selectedClipId;
                         setClips(prev => prev.map(c => {
                           if (c.id !== cId) return c;
                           const kfs = [...(c.keyframes || [])].sort((a,b) => a.timeOffset - b.timeOffset);
                           const timeInClip = currentTime - c.leftSeconds;
                           const idx = kfs.findIndex(k => k.timeOffset > timeInClip);
                           if (idx > 0) {
                             kfs[idx - 1] = { ...kfs[idx - 1], curve: preset.id as any };
                           }
                           return { ...c, keyframes: kfs };
                         }));
                      }}
                      className="flex flex-col items-center justify-center gap-1.5 p-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 transition-colors border border-transparent hover:border-white/10 active:scale-95 group"
                    >
                      <div className="h-4 w-full opacity-60 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white">
                        <svg width="20" height="10" viewBox="0 0 24 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d={preset.path} />
                        </svg>
                      </div>
                      <span className="text-[8px] font-medium text-zinc-300 group-hover:text-white transition-colors">{preset.name}</span>
                    </button>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}

      {/* Global Project Saving Toast */}
      {toastMessage && (
        <div className="fixed top-8 left-1/2 -translate-x-1/2 bg-white text-black px-5 py-2.5 rounded-full shadow-2xl z-50 font-bold tracking-wide animate-fade-in-down border border-black/10">
          {toastMessage}
        </div>
      )}

      {/* Paste Popup */}
      <AnimatePresence>
        {pastePopup && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="fixed z-[100] bg-zinc-800 border border-white/10 rounded-lg shadow-xl overflow-hidden flex flex-col"
            style={{ left: pastePopup.x, top: pastePopup.y }}
          >
            <button
              onClick={handlePaste}
              className="px-4 py-3 text-sm font-semibold text-white hover:bg-white/10 transition-colors flex items-center gap-2"
            >
              <Copy size={16} /> Paste Here
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

