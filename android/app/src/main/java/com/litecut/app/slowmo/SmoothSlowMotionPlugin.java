package com.litecut.app.slowmo;

import android.media.MediaExtractor;
import android.media.MediaFormat;
import android.media.MediaMetadataRetriever;
import android.util.Log;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.File;

@CapacitorPlugin(name = "SmoothSlowMotion")
public class SmoothSlowMotionPlugin extends Plugin {
    private static final String TAG = "SmoothSlowMotion";

    private JSObject extractMetadata(String path) throws Exception {
        File file = new File(path);
        if (!file.exists()) {
            throw new java.io.FileNotFoundException("File does not exist: " + path);
        }

        MediaMetadataRetriever retriever = new MediaMetadataRetriever();
        JSObject result = new JSObject();
        double captureFpsVal = 0.0;
        
        try {
            retriever.setDataSource(path);
            
            String durationStr = retriever.extractMetadata(MediaMetadataRetriever.METADATA_KEY_DURATION);
            String widthStr = retriever.extractMetadata(MediaMetadataRetriever.METADATA_KEY_VIDEO_WIDTH);
            String heightStr = retriever.extractMetadata(MediaMetadataRetriever.METADATA_KEY_VIDEO_HEIGHT);
            String rotationStr = retriever.extractMetadata(MediaMetadataRetriever.METADATA_KEY_VIDEO_ROTATION);
            String captureFps = retriever.extractMetadata(MediaMetadataRetriever.METADATA_KEY_CAPTURE_FRAMERATE);
            
            long durationMs = 0;
            if (durationStr != null) {
                durationMs = Long.parseLong(durationStr);
            }
            
            int width = 0;
            if (widthStr != null) {
                width = Integer.parseInt(widthStr);
            }
            
            int height = 0;
            if (heightStr != null) {
                height = Integer.parseInt(heightStr);
            }

            int rotation = 0;
            if (rotationStr != null) {
                rotation = Integer.parseInt(rotationStr);
            }
            
            if (captureFps != null) {
                try {
                    captureFpsVal = Double.parseDouble(captureFps);
                } catch (NumberFormatException ignored) {}
            }
            
            if (rotation == 90 || rotation == 270) {
                int temp = width;
                width = height;
                height = temp;
            }

            result.put("durationMs", durationMs);
            result.put("width", width);
            result.put("height", height);
            result.put("rotation", rotation);
            
        } finally {
            try {
                retriever.release();
            } catch (Exception ignored) {}
        }

        double fps = 0.0;
        MediaExtractor extractor = new MediaExtractor();
        try {
            extractor.setDataSource(path);
            int numTracks = extractor.getTrackCount();
            for (int i = 0; i < numTracks; i++) {
                MediaFormat format = extractor.getTrackFormat(i);
                String mime = format.getString(MediaFormat.KEY_MIME);
                if (mime != null && mime.startsWith("video/")) {
                    if (format.containsKey(MediaFormat.KEY_FRAME_RATE)) {
                        try {
                            fps = format.getInteger(MediaFormat.KEY_FRAME_RATE);
                        } catch (ClassCastException e1) {
                            try {
                                fps = format.getFloat(MediaFormat.KEY_FRAME_RATE);
                            } catch (ClassCastException e2) {
                                // Fallback
                            }
                        }
                    }
                    break;
                }
            }
        } catch (Exception e) {
            Log.e(TAG, "Failed to retrieve frame rate via MediaExtractor", e);
        } finally {
            try {
                extractor.release();
            } catch (Exception ignored) {}
        }

        if (fps <= 0.0) {
            if (captureFpsVal > 0.0) {
                fps = captureFpsVal;
            } else {
                fps = 30.0;
            }
        }
        
        result.put("fps", fps);
        return result;
    }

    @PluginMethod
    public void receiveVideoPath(PluginCall call) {
        String inputPath = call.getString("inputPath");
        
        if (inputPath == null || inputPath.isEmpty()) {
            call.reject("Must provide an input path");
            return;
        }

        Log.i(TAG, "Received video path successfully: " + inputPath);
        
        JSObject ret = new JSObject();
        ret.put("receivedPath", inputPath);
        ret.put("success", true);

        try {
            JSObject meta = extractMetadata(inputPath);
            ret.put("durationMs", meta.get("durationMs"));
            ret.put("width", meta.get("width"));
            ret.put("height", meta.get("height"));
            ret.put("fps", meta.get("fps"));
        } catch (Exception e) {
            Log.e(TAG, "Automatic metadata extraction failed for receiveVideoPath flow: " + e.getMessage(), e);
        }

        call.resolve(ret);
    }

    @PluginMethod
    public void getVideoMetadata(PluginCall call) {
        String inputPath = call.getString("inputPath");
        
        if (inputPath == null || inputPath.isEmpty()) {
            call.reject("Must provide an input path");
            return;
        }

        try {
            JSObject meta = extractMetadata(inputPath);
            call.resolve(meta);
        } catch (Exception e) {
            Log.e(TAG, "Metadata extraction failed", e);
            call.reject("Failed to extract video metadata: " + e.getMessage(), e);
        }
    }
}
