import { Capacitor, registerPlugin } from "@capacitor/core";
import { Filesystem, Directory } from "@capacitor/filesystem";

export interface SmoothSlowMotionPlugin {
  receiveVideoPath(options: { inputPath: string }): Promise<{
    success: boolean;
    receivedPath: string;
    durationMs?: number;
    width?: number;
    height?: number;
    fps?: number;
  }>;
  getVideoMetadata(options: { inputPath: string }): Promise<{
    durationMs: number;
    width: number;
    height: number;
    fps: number;
  }>;
  decodeAllFrames(options: { inputPath: string }): Promise<{
    success: boolean;
    decodedFramesCount: number;
    flowComputedCount?: number;
    timestampsVerified: boolean;
    verificationError?: string;
    sampledTimestampsUs: number[];
    firstTimestampUs?: number;
    lastTimestampUs?: number;
    avgFlowMagnitude?: number;
    maxFlowMagnitude?: number;
    flowVisualization?: string;
    isFlowCorrect?: boolean;
    interpolatedFramesCount?: number;
    averagePsnr?: number;
    averageWarpError?: number;
    interpolationVisualization?: string;
  }>;
}

const SmoothSlowMotionNative = registerPlugin<SmoothSlowMotionPlugin>("SmoothSlowMotion");

export async function getVideoMetadataNative(inputPath: string): Promise<{
  durationMs: number;
  width: number;
  height: number;
  fps: number;
}> {
  if (!Capacitor.isNativePlatform()) {
    throw new Error("getVideoMetadataNative is only supported on native Android platform.");
  }
  return await SmoothSlowMotionNative.getVideoMetadata({ inputPath });
}

export async function loadVideoMetadata(
  videoBlobUrlOrBlob: string | Blob
): Promise<{ durationMs: number; width: number; height: number; fps: number }> {
  // If native platform, try filesystem-based native plugin metadata loading first
  if (Capacitor.isNativePlatform()) {
    try {
      const inputFileName = `meta_temp_${Date.now()}.mp4`;
      let base64Data: string;
      if (videoBlobUrlOrBlob instanceof Blob) {
        base64Data = await convertBlobToBase64(videoBlobUrlOrBlob);
      } else {
        const response = await fetch(videoBlobUrlOrBlob);
        const blob = await response.blob();
        base64Data = await convertBlobToBase64(blob);
      }

      await Filesystem.writeFile({
        path: inputFileName,
        data: base64Data,
        directory: Directory.Cache,
      });

      const inputUri = await Filesystem.getUri({
        directory: Directory.Cache,
        path: inputFileName
      });

      const rawInput = inputUri.uri.replace("file://", "");
      const metadata = await getVideoMetadataNative(rawInput);
      
      // Clean up temp file
      try {
        await Filesystem.deleteFile({
          path: inputFileName,
          directory: Directory.Cache,
        });
      } catch (e) {
        console.warn("Could not delete temp meta file", e);
      }

      return metadata;
    } catch (err) {
      console.error("Native metadata extraction failed, falling back to Web element source", err);
    }
  }

  // Web or Fallback mechanism: use HTML5 Video element properties
  return new Promise((resolve, reject) => {
    const url = typeof videoBlobUrlOrBlob === "string" 
      ? videoBlobUrlOrBlob 
      : URL.createObjectURL(videoBlobUrlOrBlob);
    
    const video = document.createElement("video");
    video.preload = "metadata";
    video.src = url;
    video.crossOrigin = "anonymous";
    
    video.onloadedmetadata = () => {
      resolve({
        durationMs: Math.round(video.duration * 1000),
        width: video.videoWidth,
        height: video.videoHeight,
        fps: 30, // Standard video framerate default
      });
    };
    
    video.onerror = () => {
      reject(new Error("Failed to load video metadata from source: " + url));
    };
  });
}

export async function processSmoothSlowMoBrowser(
  videoBlobUrlOrBlob: string | Blob,
  speedFactor: number,
  onProgress: (progress: number) => void
): Promise<{
  url: string;
  fileId: string;
  decodedFramesCount?: number;
  flowComputedCount?: number;
  timestampsVerified?: boolean;
  sampledTimestampsUs?: number[];
  firstTimestampUs?: number;
  lastTimestampUs?: number;
  avgFlowMagnitude?: number;
  maxFlowMagnitude?: number;
  flowVisualization?: string;
  isFlowCorrect?: boolean;
  interpolatedFramesCount?: number;
  averagePsnr?: number;
  averageWarpError?: number;
  interpolationVisualization?: string;
}> {

  if (!Capacitor.isNativePlatform()) {
    console.log("Web platform detected. Native plugin not used.");
    const url = typeof videoBlobUrlOrBlob === "string" 
      ? videoBlobUrlOrBlob 
      : URL.createObjectURL(videoBlobUrlOrBlob);
    return { url, fileId: Date.now().toString() };
  }

  // Focus on Native processing
  console.log("Native platform detected. Verifying plugin receive path step.");
  const inputFileName = `input_${Date.now()}.mp4`;
  
  let base64Data: string;
  if (videoBlobUrlOrBlob instanceof Blob) {
    base64Data = await convertBlobToBase64(videoBlobUrlOrBlob);
  } else {
    const response = await fetch(videoBlobUrlOrBlob);
    const blob = await response.blob();
    base64Data = await convertBlobToBase64(blob);
  }

  await Filesystem.writeFile({
    path: inputFileName,
    data: base64Data,
    directory: Directory.Cache,
  });

  const inputUri = await Filesystem.getUri({
    directory: Directory.Cache,
    path: inputFileName
  });

  const rawInput = inputUri.uri.replace("file://", "");
  
  try {
    // 1. Send path to verify receive video path
    const result = await SmoothSlowMotionNative.receiveVideoPath({
      inputPath: rawInput
    });
    console.log("Plugin verified receiveVideoPath returning:", result);
    onProgress(30);

    // 2. Decode all frames and verify timestamps
    console.log("Invoking native decodeAllFrames pipeline for timestamp verification...");
    const decodeResult = await SmoothSlowMotionNative.decodeAllFrames({
      inputPath: rawInput
    });
    console.log("Native decoding and timestamp verification completed successfully:", decodeResult);
    onProgress(100);

    const url = typeof videoBlobUrlOrBlob === "string" 
      ? videoBlobUrlOrBlob 
      : URL.createObjectURL(videoBlobUrlOrBlob);

    return {
      url,
      fileId: "native-processed-" + Date.now().toString(),
      decodedFramesCount: decodeResult.decodedFramesCount,
      flowComputedCount: decodeResult.flowComputedCount,
      timestampsVerified: decodeResult.timestampsVerified,
      sampledTimestampsUs: decodeResult.sampledTimestampsUs,
      firstTimestampUs: decodeResult.firstTimestampUs,
      lastTimestampUs: decodeResult.lastTimestampUs,
      avgFlowMagnitude: decodeResult.avgFlowMagnitude,
      maxFlowMagnitude: decodeResult.maxFlowMagnitude,
      flowVisualization: decodeResult.flowVisualization,
      isFlowCorrect: decodeResult.isFlowCorrect,
      interpolatedFramesCount: decodeResult.interpolatedFramesCount,
      averagePsnr: decodeResult.averagePsnr,
      averageWarpError: decodeResult.averageWarpError,
      interpolationVisualization: decodeResult.interpolationVisualization,
    };

  } catch (err: any) {
    console.error("Plugin failed in native processing", err);
    throw err;
  }
}

function convertBlobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = () => {
        const result = reader.result as string;
        const base64Str = result.split(',')[1];
        resolve(base64Str);
    };
    reader.readAsDataURL(blob);
  });
}

