import { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile, toBlobURL } from "@ffmpeg/util";

export async function processSmoothSlowMoBrowser(
  videoBlobUrlOrBlob: string | Blob,
  speedFactor: number,
  onProgress: (progress: number) => void
): Promise<string> {
  const ffmpeg = new FFmpeg();
  
  ffmpeg.on("progress", ({ progress }) => {
    onProgress(progress * 100);
  });

  const baseURL = "https://unpkg.com/@ffmpeg/core-gpl@0.12.6/dist/esm";
  await ffmpeg.load({
    coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, "text/javascript"),
    wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, "application/wasm"),
  });

  const inputName = "input.mp4";
  const outputName = "output.mp4";

  try {
    console.log("FFmpeg: Attempting to process:", typeof videoBlobUrlOrBlob === "string" ? videoBlobUrlOrBlob : "Blob");
    let data: Uint8Array;
    if (videoBlobUrlOrBlob instanceof Blob) {
      data = new Uint8Array(await videoBlobUrlOrBlob.arrayBuffer());
    } else if (typeof videoBlobUrlOrBlob === "string" && videoBlobUrlOrBlob.startsWith("blob:")) {
      const response = await fetch(videoBlobUrlOrBlob);
      const blob = await response.blob();
      data = new Uint8Array(await blob.arrayBuffer());
    } else if (typeof videoBlobUrlOrBlob === "string") {
      data = await fetchFile(videoBlobUrlOrBlob);
    } else {
      throw new Error("Invalid video source type");
    }
    await ffmpeg.writeFile(inputName, data);
  } catch (e) {
    console.error("FFmpeg file loading failed", e);
    throw new Error(`Failed to load video file: ${typeof videoBlobUrlOrBlob}`);
  }

  // Increase the frame rate by the inverse of speedFactor (e.g. 0.5 speed = 2x framerate = 60fps)
  // We cap targetFps at 120 so the browser/WASM doesn't crash on extreme slow-mo.
  const targetFps = Math.min(120, Math.round(30 / speedFactor));
  
  // Use mci (Motion Compensated Interpolation) for better slow motion using optical flow.
  const filterString = `minterpolate=fps=${targetFps}:mi_mode=mci:mc_mode=obmc:me_mode=bidir:vsbmc=1`;

  await ffmpeg.exec([
    "-i",
    inputName,
    "-filter:v",
    filterString,
    "-c:v",
    "libx264",
    "-preset",
    "ultrafast",
    "-pix_fmt",
    "yuv420p",
    outputName,
  ]);

  const outputData = await ffmpeg.readFile(outputName);
  const outputBlob = new Blob([outputData], { type: "video/mp4" });
  return URL.createObjectURL(outputBlob);
}

