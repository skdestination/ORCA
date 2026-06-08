import { Capacitor } from "@capacitor/core";
import { Filesystem, Directory } from "@capacitor/filesystem";
import { FFmpegKitPlugin } from "@richardaware74/capacitor-ffmpeg-kit";

export async function processSmoothSlowMoBrowser(
  videoBlobUrlOrBlob: string | Blob,
  speedFactor: number,
  onProgress: (progress: number) => void
): Promise<{ url: string; fileId: string }> {

  if (!Capacitor.isNativePlatform()) {
    // Web Fallback: bypass processing since WASM is hanging and we agreed to focus on Android locally.
    console.log("Web platform detected. Bypassing smooth slow motion to avoid WASM hanging.");
    const url = typeof videoBlobUrlOrBlob === "string" 
      ? videoBlobUrlOrBlob 
      : URL.createObjectURL(videoBlobUrlOrBlob);
    return { url, fileId: Date.now().toString() };
  }

  // Focus on Native processing
  console.log("Native platform detected. Processing FFmpeg locally.");
  const inputFileName = `input_${Date.now()}.mp4`;
  const outputFileName = `output_${Date.now()}.mp4`;
  
  // Write input file to Capacitor filesystem
  let base64Data: string;
  if (videoBlobUrlOrBlob instanceof Blob) {
    base64Data = await convertBlobToBase64(videoBlobUrlOrBlob);
  } else {
    // String URL (blob:, http:, data:)
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
  
  const outputUri = await Filesystem.getUri({
    directory: Directory.Cache,
    path: outputFileName
  });

  const ptsMultiplier = 1 / speedFactor;
  // FFmpeg command to apply minterpolate for smooth slow-motion
  const filterString = `setpts=${ptsMultiplier}*PTS,minterpolate=fps=30:mi_mode=mci:mc_mode=aobmc:me_mode=bidir`;
  
  // Fake progression since CLI execute doesn't return progress callback via bridging plugin
  let fakeProgress = 1;
  const progressInterval = setInterval(() => {
    fakeProgress = Math.min(95, fakeProgress + 5);
    onProgress(fakeProgress);
  }, 1000);

  // Command needs plain paths without file:// prefix for executeFFmpegCommand
  const rawInput = inputUri.uri.replace("file://", "");
  const rawOutput = outputUri.uri.replace("file://", "");
  const command = `-i '${rawInput}' -vf "${filterString}" -c:v mpeg4 -q:v 2 '${rawOutput}'`;

  try {
    const result = await FFmpegKitPlugin.executeFFmpegCommand({ command });
    clearInterval(progressInterval);
    onProgress(100);

    if (result.returnCode !== 0) {
      throw new Error(`FFmpeg exited with code ${result.returnCode}`);
    }

    const finalUrl = Capacitor.convertFileSrc(outputUri.uri);
    return {
      url: finalUrl,
      fileId: outputUri.uri
    };

  } catch (err: any) {
    clearInterval(progressInterval);
    console.error("FFmpeg native command failed", err);
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

