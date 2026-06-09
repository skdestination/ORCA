import { Capacitor, registerPlugin } from "@capacitor/core";
import { Filesystem, Directory } from "@capacitor/filesystem";

export interface SmoothSlowMotionPlugin {
  receiveVideoPath(options: { inputPath: string }): Promise<{ success: boolean; receivedPath: string }>;
}

const SmoothSlowMotionNative = registerPlugin<SmoothSlowMotionPlugin>("SmoothSlowMotion");

export async function processSmoothSlowMoBrowser(
  videoBlobUrlOrBlob: string | Blob,
  speedFactor: number,
  onProgress: (progress: number) => void
): Promise<{ url: string; fileId: string }> {

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
    const result = await SmoothSlowMotionNative.receiveVideoPath({
      inputPath: rawInput
    });
    console.log("Plugin verified returning:", result);
    onProgress(100);

    // Returning original url because the feature is strictly incomplete right now
    const url = typeof videoBlobUrlOrBlob === "string" 
      ? videoBlobUrlOrBlob 
      : URL.createObjectURL(videoBlobUrlOrBlob);
    return { url, fileId: "incomplete-feature-" + Date.now().toString() };

  } catch (err: any) {
    console.error("Plugin failed to receive path", err);
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

