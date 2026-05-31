import { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile, toBlobURL } from "@ffmpeg/util";
import { registerPlugin, Capacitor } from "@capacitor/core";

export async function processSmoothSlowMoBrowser(
  videoBlobUrlOrBlob: string | Blob,
  speedFactor: number,
  mode: "blend" | "optical-flow",
  onProgress: (progress: number) => void
): Promise<string> {
  const isNative = typeof window !== "undefined" && Capacitor && Capacitor.isNativePlatform();

  if (isNative) {
    console.log("Detecting Native Capacitor Platform! Elevating slow-motion processing to native Android hardware core...");
    try {
      let blob: Blob;
      if (videoBlobUrlOrBlob instanceof Blob) {
        blob = videoBlobUrlOrBlob;
      } else if (typeof videoBlobUrlOrBlob === "string" && videoBlobUrlOrBlob.startsWith("blob:")) {
        const response = await fetch(videoBlobUrlOrBlob);
        blob = await response.blob();
      } else if (typeof videoBlobUrlOrBlob === "string") {
        const response = await fetch(videoBlobUrlOrBlob);
        blob = await response.blob();
      } else {
        throw new Error("Invalid video source");
      }

      onProgress(10);

      const base64Data = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });

      onProgress(30);

      const VideoProcessor = registerPlugin<any>("VideoProcessor");
      const listener = await VideoProcessor.addListener("processProgress", (data: any) => {
        console.log("Native process progress statistics:", data);
        onProgress(Math.min(98, 30 + Math.round((data.time || 0) / 100)));
      });

      const result = await VideoProcessor.processSlowMo({
        base64Data,
        speed: speedFactor,
        mode
      });

      await listener.remove();
      onProgress(100);

      console.log("Native processor success output path:", result.outputPath);
      const convertedUrl = Capacitor.convertFileSrc(result.outputPath);
      console.log("Converted native output path to playable container URL:", convertedUrl);
      return convertedUrl;
    } catch (nativeErr) {
      console.error("Native slow-motion processor failed! Falling back to browser standard WASM fallback as backup.", nativeErr);
    }
  }

  const ffmpeg = new FFmpeg();
  
  ffmpeg.on("progress", ({ progress }) => {
    onProgress(progress * 100);
  });

  // Log everything outputted by FFmpeg to web/Android inspector
  ffmpeg.on("log", ({ message }) => {
    console.log("FFmpeg Core Log:", message);
  });

  const isSharedArrayBufferSupported =
    typeof SharedArrayBuffer !== "undefined" &&
    typeof window !== "undefined" &&
    !!window.crossOriginIsolated;

  let isGPL = false;

  if (isSharedArrayBufferSupported) {
    try {
      console.log("FFmpeg: SharedArrayBuffer is supported. Attempting to load multi-threaded GPL engine (minterpolate)...");
      const baseURL = "https://unpkg.com/@ffmpeg/core-gpl@0.12.6/dist/esm";
      await ffmpeg.load({
        coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, "text/javascript"),
        wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, "application/wasm"),
      });
      isGPL = true;
      console.log("FFmpeg: Loaded multi-threaded GPL core successfully.");
    } catch (err) {
      console.warn("FFmpeg: Failed to load multi-threaded GPL core. Falling back to single-threaded...", err);
    }
  }

  if (!isGPL) {
    console.log("FFmpeg: Attempting to load single-threaded standard core from local assets (offline-ready)...");
    
    // Resolve local asset location dynamically. Serves locally from APK/assets context.
    let baseLoc = "";
    if (typeof window !== "undefined") {
      baseLoc = window.location.origin + window.location.pathname;
      if (baseLoc.endsWith(".html")) {
        baseLoc = baseLoc.substring(0, baseLoc.lastIndexOf("/"));
      }
      if (!baseLoc.endsWith("/")) {
        baseLoc += "/";
      }
    }

    const localCoreURL = `${baseLoc}ffmpeg-core.js`;
    const localWasmURL = `${baseLoc}ffmpeg-core.wasm`;

    try {
      console.log(`FFmpeg: Trying local paths:\n- ${localCoreURL}\n- ${localWasmURL}`);
      await ffmpeg.load({
        coreURL: await toBlobURL(localCoreURL, "text/javascript"),
        wasmURL: await toBlobURL(localWasmURL, "application/wasm"),
      });
      console.log("FFmpeg: Loaded single-threaded standard core successfully from local web assets!");
    } catch (localErr) {
      console.warn("FFmpeg: Local files failed or unavailable. Falling back to remote CDN...", localErr);
      try {
        const baseURL = "https://unpkg.com/@ffmpeg/core@0.12.10/dist/esm";
        await ffmpeg.load({
          coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, "text/javascript"),
          wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, "application/wasm"),
        });
        console.log("FFmpeg: Loaded single-threaded standard core successfully from unpkg.");
      } catch (err) {
        console.warn("FFmpeg: Failed to load single-threaded core from unpkg, trying jsdelivr...", err);
        try {
          const baseURL = "https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.10/dist/esm";
          await ffmpeg.load({
            coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, "text/javascript"),
            wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, "application/wasm"),
          });
          console.log("FFmpeg: Loaded single-threaded standard core successfully from jsdelivr.");
        } catch (e2) {
          console.error("FFmpeg failed to load from CDNs", e2);
          throw new Error("Could not load high-performance video engine. Please check your internet connection.");
        }
      }
    }
  }

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
  
  // Mode selection: "blend" (Frame Blending - Fast & Stable) or "optical-flow" (Motion Compensated Interpolation)
  const ptsMultiplier = (1 / speedFactor).toFixed(4);
  const filterString = isGPL
    ? (mode === "blend"
        ? `minterpolate=fps=${targetFps}:mi_mode=blend`
        : `minterpolate=fps=${targetFps}:mi_mode=mci:mc_mode=obmc:me_mode=bidir:vsbmc=1`)
    : `setpts=${ptsMultiplier}*PTS,framerate=fps=60`;

  // Standard LGPL standard single-thread core doesn't have libx264 compiled.
  // We omit specifying the exact codec encoder or fallback to standard copy if no changes,
  // or default encoder which works natively out-of-the-box in standard builds!
  const execArgs = ["-i", inputName, "-filter:v", filterString];
  
  if (isGPL) {
    execArgs.push("-c:v", "libx264", "-preset", "ultrafast", "-pix_fmt", "yuv420p");
  } else {
    // If not GPL, let the encoder default or set to mpeg4 or default h264 encoder. 
    // Omitting "-c:v libx264" prevents the "Unknown encoder" crash.
    execArgs.push("-preset", "ultrafast", "-pix_fmt", "yuv420p");
  }
  
  execArgs.push(outputName);

  console.log("FFmpeg: Executing command with args:", execArgs);
  await ffmpeg.exec(execArgs);

  const outputData = await ffmpeg.readFile(outputName);
  const outputBlob = new Blob([outputData], { type: "video/mp4" });
  return URL.createObjectURL(outputBlob);
}

