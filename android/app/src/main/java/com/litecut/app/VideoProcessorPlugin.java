package com.litecut.app;

import android.content.Context;
import android.util.Base64;
import android.util.Log;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import com.arthenica.ffmpegkit.FFmpegKit;
import com.arthenica.ffmpegkit.FFmpegSession;
import com.arthenica.ffmpegkit.ReturnCode;

import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;

@CapacitorPlugin(name = "VideoProcessor")
public class VideoProcessorPlugin extends Plugin {
    private static final String TAG = "VideoProcessorPlugin";

    @PluginMethod
    public void processSlowMo(PluginCall call) {
        String base64Data = call.getString("base64Data");
        Double speed = call.getDouble("speed", 1.0);
        String mode = call.getString("mode", "blend");

        if (base64Data == null) {
            call.reject("base64Data is required");
            return;
        }

        // Strip data URI prefix if present (e.g. data:video/mp4;base64,)
        if (base64Data.contains(",")) {
            base64Data = base64Data.substring(base64Data.indexOf(",") + 1);
        }

        try {
            Context context = getContext();
            File cacheDir = context.getCacheDir();
            File inputFile = File.createTempFile("input_raw_video", ".mp4", cacheDir);
            File outputFile = File.createTempFile("output_slow_video", ".mp4", cacheDir);

            // Decode base64 to input file
            byte[] videoBytes = Base64.decode(base64Data, Base64.DEFAULT);
            try (FileOutputStream fos = new FileOutputStream(inputFile)) {
                fos.write(videoBytes);
            }

            // Calculate target frame rate (cap at 120 so standard video players don't struggle)
            int targetFps = (int) Math.min(120, Math.round(30.0 / speed));

            // Select minterpolate mode
            String filterString;
            if (mode.equals("blend")) {
                filterString = "minterpolate=fps=" + targetFps + ":mi_mode=blend";
            } else {
                // MCI: Motion Compensated Interpolation (Optical Flow) using bidirectional OBMC
                filterString = "minterpolate=fps=" + targetFps + ":mi_mode=mci:mc_mode=obmc:me_mode=bidir:vsbmc=1";
            }

            // Command using native full-gpl ffmpeg with multithreading
            String cmd = "-y -i " + inputFile.getAbsolutePath() + " -filter:v " + filterString + " -c:v libx264 -preset ultrafast -pix_fmt yuv420p " + outputFile.getAbsolutePath();
            Log.d(TAG, "Executing FFmpeg command: " + cmd);

            // Execute asynchronously with progress statistics
            FFmpegKit.executeAsync(cmd, session -> {
                ReturnCode returnCode = session.getReturnCode();
                if (ReturnCode.isSuccess(returnCode)) {
                    Log.d(TAG, "Native process success!");
                    
                    JSObject ret = new JSObject();
                    // We return the absolute filePath which we'll convert via Capacitor.convertFileSrc in JS
                    ret.put("outputPath", outputFile.getAbsolutePath());
                    call.resolve(ret);
                } else {
                    String logs = session.getOutput();
                    Log.e(TAG, "Native process failed with code " + returnCode + ". Logs:\n" + logs);
                    call.reject("FFmpeg native processing failed: " + logs);
                }

                // Cleanup input file. Keep output file since the webview will load it directly.
                try {
                    inputFile.delete();
                } catch (Exception e) {
                    Log.e(TAG, "Error deleting input temp file", e);
                }
            }, log -> {
                Log.v(TAG, log.getMessage());
            }, statistics -> {
                // Send real-time progress update to JS through listener events
                JSObject progressObj = new JSObject();
                progressObj.put("time", statistics.getTime());
                progressObj.put("speed", statistics.getSpeed());
                progressObj.put("size", statistics.getSize());
                notifyListeners("processProgress", progressObj);
            });

        } catch (Exception e) {
            Log.e(TAG, "Failed in native processSlowMo call", e);
            call.reject("Native plugin exception: " + e.getMessage());
        }
    }
}
