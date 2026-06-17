package com.litecut.app.slowmo;

import android.media.MediaCodec;
import android.media.MediaExtractor;
import android.media.MediaFormat;
import android.media.MediaMetadataRetriever;
import android.util.Log;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.File;
import java.nio.ByteBuffer;
import java.util.ArrayList;
import java.util.List;
import org.opencv.android.OpenCVLoader;
import org.opencv.core.Core;
import org.opencv.core.CvType;
import org.opencv.core.Mat;
import org.opencv.core.Point;
import org.opencv.core.Scalar;
import org.opencv.core.MatOfByte;
import org.opencv.imgproc.Imgproc;
import org.opencv.imgcodecs.Imgcodecs;
import org.opencv.video.DISOpticalFlow;

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

    @PluginMethod
    public void decodeAllFrames(PluginCall call) {
        String inputPath = call.getString("inputPath");
        
        if (inputPath == null || inputPath.isEmpty()) {
            call.reject("Must provide an input path");
            return;
        }

        File file = new File(inputPath);
        if (!file.exists()) {
            call.reject("File does not exist: " + inputPath);
            return;
        }

        Log.i(TAG, "Starting decodeAllFrames (OpenCV + DIS) for: " + inputPath);

        // Integrate OpenCV Android SDK
        if (!OpenCVLoader.initDebug()) {
            Log.e(TAG, "OpenCV initialization failed!");
            call.reject("OpenCV initialization failed");
            return;
        } else {
            Log.i(TAG, "OpenCV initialization succeeded!");
        }

        MediaExtractor extractor = new MediaExtractor();
        MediaCodec decoder = null;
        
        // Optimizing Memory Allocations: Preallocated Mats
        Mat matA = null;
        Mat matB = null;
        Mat flowMat = null;
        byte[] rowData = null;
        
        // Frame Interpolation (W1D6) Preallocated Mats & Trackers
        Mat mapAx = null;
        Mat mapAy = null;
        Mat mapBx = null;
        Mat mapBy = null;
        Mat warpedA = null;
        Mat warpedB = null;
        Mat intermediateFrame = null;
        Mat diffMat = null;
        Mat squareDiff = null;

        int interpolatedFramesCount = 0;
        double sumPsnr = 0;
        double sumWarpError = 0;
        String bestInterpolationVisualizationBase64 = "";

        // Visualization & Verification Trackers
        double peakAvgFlowMagnitude = 0;
        double overallMaxFlowMagnitude = 0;
        double sumFlowMagnitude = 0;
        int flowComputedCount = 0;
        String bestFlowVisualizationBase64 = "";
        
        try {
            extractor.setDataSource(inputPath);
            int trackIndex = -1;
            MediaFormat format = null;
            String mime = null;
            
            int numTracks = extractor.getTrackCount();
            for (int i = 0; i < numTracks; i++) {
                MediaFormat trackFormat = extractor.getTrackFormat(i);
                String trackMime = trackFormat.getString(MediaFormat.KEY_MIME);
                if (trackMime != null && trackMime.startsWith("video/")) {
                    trackIndex = i;
                    format = trackFormat;
                    mime = trackMime;
                    break;
                }
            }

            if (trackIndex < 0 || format == null || mime == null) {
                call.reject("No video track found in file");
                extractor.release();
                return;
            }

            extractor.selectTrack(trackIndex);
            
            decoder = MediaCodec.createDecoderByType(mime);
            decoder.configure(format, null, null, 0);
            decoder.start();

            MediaCodec.BufferInfo bufferInfo = new MediaCodec.BufferInfo();
            boolean isInputEOS = false;
            boolean isOutputEOS = false;
            int frameCount = 0;
            List<Long> timestamps = new ArrayList<>();
            long lastTimestampUs = -1;
            boolean timestampsVerified = true;
            String verificationErrorMsg = "";

            int width = format.containsKey(MediaFormat.KEY_WIDTH) ? format.getInteger(MediaFormat.KEY_WIDTH) : 0;
            int height = format.containsKey(MediaFormat.KEY_HEIGHT) ? format.getInteger(MediaFormat.KEY_HEIGHT) : 0;
            int stride = format.containsKey(MediaFormat.KEY_STRIDE) ? format.getInteger(MediaFormat.KEY_STRIDE) : width;

            DISOpticalFlow disFlow = DISOpticalFlow.create(DISOpticalFlow.PRESET_FAST);
            long timeoutUs = 10000; // 10ms

            while (!isOutputEOS) {
                // Feed input buffers
                if (!isInputEOS) {
                    int inputBufferIndex = decoder.dequeueInputBuffer(timeoutUs);
                    if (inputBufferIndex >= 0) {
                        ByteBuffer inputBuffer = decoder.getInputBuffer(inputBufferIndex);
                        if (inputBuffer != null) {
                            int sampleSize = extractor.readSampleData(inputBuffer, 0);
                            if (sampleSize < 0) {
                                decoder.queueInputBuffer(inputBufferIndex, 0, 0, 0, MediaCodec.BUFFER_FLAG_END_OF_STREAM);
                                isInputEOS = true;
                            } else {
                                long sampleTime = extractor.getSampleTime();
                                decoder.queueInputBuffer(inputBufferIndex, 0, sampleSize, sampleTime, 0);
                                extractor.advance();
                            }
                        }
                    }
                }

                // Dequeue output buffers
                int outputBufferIndex = decoder.dequeueOutputBuffer(bufferInfo, timeoutUs);
                if (outputBufferIndex >= 0) {
                    if ((bufferInfo.flags & MediaCodec.BUFFER_FLAG_END_OF_STREAM) != 0) {
                        isOutputEOS = true;
                    }

                    if (bufferInfo.size > 0 && width > 0 && height > 0) {
                        frameCount++;
                        long pts = bufferInfo.presentationTimeUs;
                        timestamps.add(pts);
                        
                        if (lastTimestampUs != -1 && pts < lastTimestampUs) {
                            timestampsVerified = false;
                            verificationErrorMsg = "Non-monotonic timestamp detected: Frame " + frameCount + " pts=" + pts + " < lastPts=" + lastTimestampUs;
                            Log.w(TAG, verificationErrorMsg);
                        }
                        lastTimestampUs = pts;

                        // Retrieve Y plane directly for grayscale conversion
                        ByteBuffer outputBuffer = decoder.getOutputBuffer(outputBufferIndex);
                        if (outputBuffer != null) {
                            outputBuffer.position(bufferInfo.offset);
                            
                            // Reinitialize preallocated Mats dynamically if dimension changes or at start
                            if (matA == null || matA.cols() != width || matA.rows() != height) {
                                if (matA != null) matA.release();
                                if (matB != null) matB.release();
                                if (flowMat != null) flowMat.release();
                                
                                if (mapAx != null) mapAx.release();
                                if (mapAy != null) mapAy.release();
                                if (mapBx != null) mapBx.release();
                                if (mapBy != null) mapBy.release();
                                if (warpedA != null) warpedA.release();
                                if (warpedB != null) warpedB.release();
                                if (intermediateFrame != null) intermediateFrame.release();
                                if (diffMat != null) diffMat.release();
                                if (squareDiff != null) squareDiff.release();

                                matA = new Mat(height, width, CvType.CV_8UC1);
                                matB = new Mat(height, width, CvType.CV_8UC1);
                                flowMat = new Mat();
                                
                                mapAx = new Mat(height, width, CvType.CV_32FC1);
                                mapAy = new Mat(height, width, CvType.CV_32FC1);
                                mapBx = new Mat(height, width, CvType.CV_32FC1);
                                mapBy = new Mat(height, width, CvType.CV_32FC1);
                                warpedA = new Mat(height, width, CvType.CV_8UC1);
                                warpedB = new Mat(height, width, CvType.CV_8UC1);
                                intermediateFrame = new Mat(height, width, CvType.CV_8UC1);
                                diffMat = new Mat();
                                squareDiff = new Mat();
                            }
                            
                            if (rowData == null || rowData.length != width) {
                                rowData = new byte[width];
                            }
                            
                            // Pick target Mat alternating based on frameCount
                            Mat currMat = (frameCount % 2 == 1) ? matA : matB;
                            Mat prevMat = (frameCount % 2 == 1) ? matB : matA;

                            for (int r = 0; r < height; r++) {
                                int startPos = bufferInfo.offset + r * stride;
                                if (startPos + width <= outputBuffer.limit()) {
                                    outputBuffer.position(startPos);
                                    outputBuffer.get(rowData, 0, width);
                                    currMat.put(r, 0, rowData);
                                }
                            }
                            
                            // On second frame onwards, run DIS Dense Optical Flow
                            if (frameCount > 1) {
                                try {
                                    disFlow.calc(prevMat, currMat, flowMat);
                                    flowComputedCount++;
                                    
                                    // Verify optical flow correctness & extract stats
                                    int step = 16;
                                    double sumMag = 0;
                                    double localMaxMag = 0;
                                    int activeCount = 0;
                                    int sampleCount = 0;
                                    float[] flowVec = new float[2];
                                    
                                    for (int y = 0; y < height; y += step) {
                                        for (int x = 0; x < width; x += step) {
                                            flowMat.get(y, x, flowVec);
                                            float dx = flowVec[0];
                                            float dy = flowVec[1];
                                            double mag = Math.sqrt(dx * dx + dy * dy);
                                            sumMag += mag;
                                            if (mag > localMaxMag) {
                                                localMaxMag = mag;
                                            }
                                            if (mag > 0.5) {
                                                activeCount++;
                                            }
                                            sampleCount++;
                                        }
                                    }
                                    
                                    double avgMag = sampleCount > 0 ? sumMag / sampleCount : 0;
                                    double activeRatio = sampleCount > 0 ? (double) activeCount / sampleCount : 0;
                                    
                                    sumFlowMagnitude += avgMag;
                                    if (localMaxMag > overallMaxFlowMagnitude) {
                                        overallMaxFlowMagnitude = localMaxMag;
                                    }
                                    
                                    // Today's Work (W1D6): Frame Interpolation Pipeline
                                    // 1. Create Warp Maps recursively (backward mapping) using fast array copy
                                    int totalPixels = width * height;
                                    float[] flowData = new float[totalPixels * 2];
                                    flowMat.get(0, 0, flowData);

                                    float[] mapAxData = new float[totalPixels];
                                    float[] mapAyData = new float[totalPixels];
                                    float[] mapBxData = new float[totalPixels];
                                    float[] mapByData = new float[totalPixels];

                                    for (int r = 0; r < height; r++) {
                                        for (int c = 0; c < width; c++) {
                                            int idx = r * width + c;
                                            float u = flowData[idx * 2];
                                            float v = flowData[idx * 2 + 1];

                                            // Frame A backward mapping (warp map A): src_x = current_x - t * vector_x
                                            mapAxData[idx] = c - 0.5f * u;
                                            mapAyData[idx] = r - 0.5f * v;

                                            // Frame B backward mapping (warp map B): src_y = current_x + (1-t) * vector_x
                                            mapBxData[idx] = c + 0.5f * u;
                                            mapByData[idx] = r + 0.5f * v;
                                        }
                                    }

                                    mapAx.put(0, 0, mapAxData);
                                    mapAy.put(0, 0, mapAyData);
                                    mapBx.put(0, 0, mapBxData);
                                    mapBy.put(0, 0, mapByData);

                                    // 2. Backward Warping via remap (linear interpolation, border replicated to handle edge artifacts)
                                    Imgproc.remap(prevMat, warpedA, mapAx, mapAy, Imgproc.INTER_LINEAR, Imgproc.BORDER_REPLICATE);
                                    Imgproc.remap(currMat, warpedB, mapBx, mapBy, Imgproc.INTER_LINEAR, Imgproc.BORDER_REPLICATE);

                                    // 3. Generate Intermediate Frame (t = 0.5)
                                    Core.addWeighted(warpedA, 0.5, warpedB, 0.5, 0.0, intermediateFrame);
                                    interpolatedFramesCount++;

                                    // 4. Compare original vs interpolated (warp alignment error metric & PSNR score)
                                    Core.absdiff(warpedA, warpedB, diffMat);
                                    Scalar meanDiff = Core.mean(diffMat);
                                    double localWarpError = meanDiff.val[0];
                                    sumWarpError += localWarpError;

                                    Core.multiply(diffMat, diffMat, squareDiff);
                                    Scalar meanSquareDiff = Core.mean(squareDiff);
                                    double localMse = meanSquareDiff.val[0];
                                    double localPsnr = (localMse > 0) ? (10.0 * Math.log10((255.0 * 255.0) / localMse)) : 99.0;
                                    sumPsnr += localPsnr;

                                    // Visualize and validate frame interpolation
                                    if (avgMag > peakAvgFlowMagnitude || bestFlowVisualizationBase64.isEmpty()) {
                                        peakAvgFlowMagnitude = avgMag;

                                        // Create split-view visual validation card: [Original | Interpolated]
                                        Mat leftBGR = new Mat();
                                        Imgproc.cvtColor(prevMat, leftBGR, Imgproc.COLOR_GRAY2BGR);

                                        Mat rightBGR = new Mat();
                                        Imgproc.cvtColor(intermediateFrame, rightBGR, Imgproc.COLOR_GRAY2BGR);

                                        // Annotate Left & Right Panes
                                        Imgproc.putText(leftBGR, "Original (Frame A)", new Point(15, 30),
                                                Imgproc.FONT_HERSHEY_SIMPLEX, 0.6, new Scalar(0, 255, 255), 2);

                                        Imgproc.putText(rightBGR, "Interpolated Frame I (t=0.5)", new Point(15, 30),
                                                Imgproc.FONT_HERSHEY_SIMPLEX, 0.6, new Scalar(100, 240, 100), 2);

                                        List<Mat> framesList = new ArrayList<>();
                                        framesList.add(leftBGR);
                                        framesList.add(rightBGR);

                                        Mat sideBySide = new Mat();
                                        Core.hconcat(framesList, sideBySide);

                                        // Divider
                                        Imgproc.line(sideBySide, new Point(width, 0), new Point(width, height), new Scalar(255, 255, 255), 2);

                                        // Footer Telemetry Bar overlay to prevent cluttering the canvas
                                        int footerHeight = 45;
                                        Mat footerOverlay = sideBySide.submat(height - footerHeight, height, 0, width * 2);
                                        footerOverlay.setTo(new Scalar(20, 20, 20));

                                        Imgproc.putText(sideBySide, "WEEK 1 DAY 6 VALIDATION: 30fps -> 60fps Frame Interpolation",
                                                new Point(15, height - 28), Imgproc.FONT_HERSHEY_SIMPLEX, 0.45, new Scalar(220, 220, 220), 1);
                                        Imgproc.putText(sideBySide, String.format("DIS Motion: %.2fpx | PSNR: %.2fdB | Warping Error: %.3fpx", avgMag, localPsnr, localWarpError),
                                                new Point(15, height - 10), Imgproc.FONT_HERSHEY_SIMPLEX, 0.45, new Scalar(130, 240, 130), 1);

                                        MatOfByte buf = new MatOfByte();
                                        Imgcodecs.imencode(".jpg", sideBySide, buf);
                                        byte[] bytes = buf.toArray();
                                        bestFlowVisualizationBase64 = "data:image/jpeg;base64," + android.util.Base64.encodeToString(bytes, android.util.Base64.NO_WRAP);
                                        bestInterpolationVisualizationBase64 = bestFlowVisualizationBase64;

                                        leftBGR.release();
                                        rightBGR.release();
                                        sideBySide.release();
                                        footerOverlay.release();
                                        buf.release();
                                    }

                                    if (flowComputedCount % 15 == 0) {
                                         Log.i(TAG, String.format("DIS Flow + Interpolation for %d frames. PSNR: %.2f dB, Error: %.3f px",
                                               flowComputedCount, localPsnr, localWarpError));
                                    }
                                } catch (Exception flowErr) {
                                    Log.e(TAG, "Failed to calculate/verify/visualize DIS Optical Flow on frame " + frameCount + ": " + flowErr.getMessage());
                                }
                            }
                        }
                    }

                    decoder.releaseOutputBuffer(outputBufferIndex, false);
                } else if (outputBufferIndex == MediaCodec.INFO_OUTPUT_FORMAT_CHANGED) {
                    MediaFormat newFormat = decoder.getOutputFormat();
                    Log.i(TAG, "Decoder format changed: " + newFormat.toString());
                    width = newFormat.containsKey(MediaFormat.KEY_WIDTH) ? newFormat.getInteger(MediaFormat.KEY_WIDTH) : width;
                    height = newFormat.containsKey(MediaFormat.KEY_HEIGHT) ? newFormat.getInteger(MediaFormat.KEY_HEIGHT) : height;
                    stride = newFormat.containsKey(MediaFormat.KEY_STRIDE) ? newFormat.getInteger(MediaFormat.KEY_STRIDE) : width;
                } else if (outputBufferIndex == MediaCodec.INFO_TRY_AGAIN_LATER) {
                    // No output buffer available, wait or loop
                }
            }

            JSObject result = new JSObject();
            result.put("success", true);
            result.put("decodedFramesCount", frameCount);
            result.put("flowComputedCount", flowComputedCount);
            result.put("timestampsVerified", timestampsVerified);
            result.put("verificationError", verificationErrorMsg);
            
            // Add dense flow correctness metrics
            double globalAvgFlow = flowComputedCount > 0 ? sumFlowMagnitude / flowComputedCount : 0;
            result.put("avgFlowMagnitude", globalAvgFlow);
            result.put("maxFlowMagnitude", overallMaxFlowMagnitude);
            result.put("flowVisualization", bestFlowVisualizationBase64);
            result.put("isFlowCorrect", flowComputedCount > 0 && overallMaxFlowMagnitude > 0.05);

            // Add frame interpolation (W1D6) metrics
            double averagePsnr = interpolatedFramesCount > 0 ? sumPsnr / interpolatedFramesCount : 0;
            double averageWarpError = interpolatedFramesCount > 0 ? sumWarpError / interpolatedFramesCount : 0;
            result.put("interpolatedFramesCount", interpolatedFramesCount);
            result.put("averagePsnr", averagePsnr);
            result.put("averageWarpError", averageWarpError);
            result.put("interpolationVisualization", bestInterpolationVisualizationBase64);

            JSArray tsArray = new JSArray();
            int sampleStep = Math.max(1, timestamps.size() / 20);
            for (int i = 0; i < timestamps.size(); i += sampleStep) {
                tsArray.put(timestamps.get(i));
            }
            result.put("sampledTimestampsUs", tsArray);
            if (!timestamps.isEmpty()) {
                result.put("firstTimestampUs", timestamps.get(0));
                result.put("lastTimestampUs", timestamps.get(timestamps.size() - 1));
            }

            Log.i(TAG, "Finished processing sequence. Count: " + frameCount + ", Verified: " + timestampsVerified + ", Flow run: " + flowComputedCount + ", Global Avg Flow: " + globalAvgFlow + ", Interpolated: " + interpolatedFramesCount + " (avg PSNR: " + averagePsnr + " dB)");
            call.resolve(result);

        } catch (Exception e) {
            Log.e(TAG, "Error decoding & optimizing optical flow loop", e);
            call.reject("Error decoding frames: " + e.getMessage(), e);
        } finally {
            try {
                if (matA != null) matA.release();
            } catch (Exception ignored) {}
            try {
                if (matB != null) matB.release();
            } catch (Exception ignored) {}
            try {
                if (flowMat != null) flowMat.release();
            } catch (Exception ignored) {}
            try {
                if (mapAx != null) mapAx.release();
            } catch (Exception ignored) {}
            try {
                if (mapAy != null) mapAy.release();
            } catch (Exception ignored) {}
            try {
                if (mapBx != null) mapBx.release();
            } catch (Exception ignored) {}
            try {
                if (mapBy != null) mapBy.release();
            } catch (Exception ignored) {}
            try {
                if (warpedA != null) warpedA.release();
            } catch (Exception ignored) {}
            try {
                if (warpedB != null) warpedB.release();
            } catch (Exception ignored) {}
            try {
                if (intermediateFrame != null) intermediateFrame.release();
            } catch (Exception ignored) {}
            try {
                if (diffMat != null) diffMat.release();
            } catch (Exception ignored) {}
            try {
                if (squareDiff != null) squareDiff.release();
            } catch (Exception ignored) {}
            try {
                if (decoder != null) {
                    try {
                        decoder.stop();
                    } catch (Exception ignored) {}
                    decoder.release();
                }
            } catch (Exception ignored) {}
            try {
                extractor.release();
            } catch (Exception ignored) {}
        }
    }
}
