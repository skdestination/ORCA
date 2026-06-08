package com.litecut.app.slowmo;

import android.os.Environment;
import android.util.Log;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import org.opencv.android.OpenCVLoader;
import org.opencv.core.Core;
import org.opencv.core.CvType;
import org.opencv.core.Mat;
import org.opencv.imgcodecs.Imgcodecs;
import org.opencv.imgproc.Imgproc;
import org.opencv.video.Video;

import com.arthenica.ffmpegkit.FFmpegKit;
import com.arthenica.ffmpegkit.ReturnCode;
import com.arthenica.ffmpegkit.FFmpegSession;

import java.io.File;

@CapacitorPlugin(name = "SmoothSlowMotion")
public class SmoothSlowMotionPlugin extends Plugin {

    private static final String TAG = "SmoothSlowMotion";

    @Override
    public void load() {
        super.load();
        if (OpenCVLoader.initDebug()) {
            Log.i(TAG, "OpenCV initialized successfully");
        } else {
            Log.e(TAG, "OpenCV initialization failed");
        }
    }

    @PluginMethod
    public void interpolateVideo(PluginCall call) {
        String inputPath = call.getString("inputPath");
        String outputPath = call.getString("outputPath");

        if (inputPath == null || outputPath == null) {
            call.reject("Must provide input and output paths");
            return;
        }

        new Thread(() -> {
            try {
                // 1. Create a temp directory for frames
                File cacheDir = getContext().getCacheDir();
                File framesDir = new File(cacheDir, "frames_" + System.currentTimeMillis());
                framesDir.mkdirs();

                // 2. Decode frames using FFmpegKit
                String framePattern = framesDir.getAbsolutePath() + "/frame_%06d.jpg";
                
                Log.i(TAG, "Extracting frames from: " + inputPath);
                // Use executeWithArguments to avoid path quoting issues
                FFmpegSession extractSession = FFmpegKit.executeWithArguments(new String[]{
                    "-i", inputPath, 
                    "-qscale:v", "2", 
                    framePattern
                });
                
                if (!ReturnCode.isSuccess(extractSession.getReturnCode())) {
                    call.reject("Failed to extract frames. Return code: " + extractSession.getReturnCode());
                    return;
                }

                // 3. List all extracted frames
                File[] files = framesDir.listFiles((dir, name) -> name.endsWith(".jpg"));
                if (files == null || files.length == 0) {
                    call.reject("No frames dumped.");
                    return;
                }
                
                // Sort files alphabetically to ensure frame order
                java.util.Arrays.sort(files, (f1, f2) -> f1.getName().compareTo(f2.getName()));

                // Create a directory for output frames
                File outFramesDir = new File(cacheDir, "out_frames_" + System.currentTimeMillis());
                outFramesDir.mkdirs();

                Log.i(TAG, "Total frames to process: " + files.length);

                Mat prevFrame = new Mat();
                Mat prevGray = new Mat();

                int outputFrameIndex = 1;

                for (int i = 0; i < files.length; i++) {
                    Log.i(TAG, "Processing frame " + (i + 1) + " of " + files.length);
                    
                    Mat currentFrame = Imgcodecs.imread(files[i].getAbsolutePath());
                    if (currentFrame.empty()) continue;

                    Mat currentGray = new Mat();
                    Imgproc.cvtColor(currentFrame, currentGray, Imgproc.COLOR_BGR2GRAY);

                    if (i == 0) {
                        // First frame, just pass it through
                        String outName = String.format("%s/out_%06d.jpg", outFramesDir.getAbsolutePath(), outputFrameIndex++);
                        Imgcodecs.imwrite(outName, currentFrame);
                    } else {
                        // Calculate Optical Flow
                        Mat flow = new Mat();
                        // Farneback params: pyr_scale, levels, winsize, iterations, poly_n, poly_sigma, flags
                        Video.calcOpticalFlowFarneback(prevGray, currentGray, flow, 0.5, 3, 15, 3, 5, 1.2, 0);

                        // Generate interpolated frame at t=0.5
                        Mat interpFrame = generateInterpolatedFrame(prevFrame, flow, 0.5f);

                        // Save interpolated frame
                        String interpPath = String.format("%s/out_%06d.jpg", outFramesDir.getAbsolutePath(), outputFrameIndex++);
                        Imgcodecs.imwrite(interpPath, interpFrame);

                        // Save the current original frame
                        String outName = String.format("%s/out_%06d.jpg", outFramesDir.getAbsolutePath(), outputFrameIndex++);
                        Imgcodecs.imwrite(outName, currentFrame);
                        
                        // memory management
                        flow.release();
                        interpFrame.release();
                    }

                    prevFrame.release();
                    prevGray.release();
                    
                    prevFrame = currentFrame;
                    prevGray = currentGray;
                }
                
                prevFrame.release();
                prevGray.release();

                // 4. Encode back to video using FFmpegKit
                String outPattern = outFramesDir.getAbsolutePath() + "/out_%06d.jpg";
                // Get original framerate or assume 30, so output is 60.
                Log.i(TAG, "Encoding video from: " + outPattern);
                FFmpegSession encodeSession = FFmpegKit.executeWithArguments(new String[]{
                    "-framerate", "60",
                    "-i", outPattern,
                    "-c:v", "mpeg4",
                    "-q:v", "2",
                    outputPath
                });
                
                if (!ReturnCode.isSuccess(encodeSession.getReturnCode())) {
                    call.reject("Failed to encode frames. Return code: " + encodeSession.getReturnCode());
                    return;
                }

                // Cleanup (optional, but good for disk space)
                deleteDir(framesDir);
                deleteDir(outFramesDir);

                JSObject ret = new JSObject();
                ret.put("success", true);
                ret.put("outputPath", outputPath);
                call.resolve(ret);

            } catch (Exception e) {
                Log.e(TAG, "Interpolation error", e);
                call.reject("Interpolation failed: " + e.getMessage());
            }
        }).start();
    }

    private Mat generateInterpolatedFrame(Mat prevFrame, Mat flow, float t) {
        int width = flow.cols();
        int height = flow.rows();

        Mat map_x = new Mat(height, width, CvType.CV_32FC1);
        Mat map_y = new Mat(height, width, CvType.CV_32FC1);

        float[] flowData = new float[(int)(flow.total() * flow.channels())];
        flow.get(0, 0, flowData);

        float[] mapXData = new float[(int)map_x.total()];
        float[] mapYData = new float[(int)map_y.total()];

        for (int y = 0; y < height; y++) {
            for (int x = 0; x < width; x++) {
                int idxFlow = (y * width + x) * 2;
                int idxMap = y * width + x;
                float dx = flowData[idxFlow];
                float dy = flowData[idxFlow + 1];

                // Backward warp: to find pixel value at (x,y) in interp frame,
                // we look at (x - t*dx, y - t*dy) in prevFrame.
                mapXData[idxMap] = x - t * dx;
                mapYData[idxMap] = y - t * dy;
            }
        }

        map_x.put(0, 0, mapXData);
        map_y.put(0, 0, mapYData);

        Mat interpFrame = new Mat();
        Imgproc.remap(prevFrame, interpFrame, map_x, map_y, Imgproc.INTER_LINEAR);

        map_x.release();
        map_y.release();

        return interpFrame;
    }

    private void deleteDir(File dir) {
        if (dir.isDirectory()) {
            for (File child : dir.listFiles()) {
                deleteDir(child);
            }
        }
        dir.delete();
    }
}
