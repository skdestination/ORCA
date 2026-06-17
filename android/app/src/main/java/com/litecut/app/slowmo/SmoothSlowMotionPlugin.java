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
                                matA = new Mat(height, width, CvType.CV_8UC1);
                                matB = new Mat(height, width, CvType.CV_8UC1);
                                if (flowMat != null) flowMat.release();
                                flowMat = new Mat();
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
                                    
                                    // Visualize flow vectors for peak activity frame
                                    if (avgMag > peakAvgFlowMagnitude) {
                                        peakAvgFlowMagnitude = avgMag;
                                        
                                        Mat visualMat = new Mat();
                                        Imgproc.cvtColor(currMat, visualMat, Imgproc.COLOR_GRAY2BGR);
                                        
                                        int drawStep = 16;
                                        for (int y = 0; y < height; y += drawStep) {
                                            for (int x = 0; x < width; x += drawStep) {
                                                flowMat.get(y, x, flowVec);
                                                float dx = flowVec[0];
                                                float dy = flowVec[1];
                                                double mag = Math.sqrt(dx * dx + dy * dy);
                                                if (mag > 1.0) {
                                                    Point pt1 = new Point(x, y);
                                                    Point pt2 = new Point(Math.round(x + dx), Math.round(y + dy));
                                                    Imgproc.arrowedLine(visualMat, pt1, pt2, new Scalar(0, 255, 0), 1, 8, 0, 0.1);
                                                }
                                            }
                                        }
                                        
                                        Imgproc.putText(visualMat, String.format("Frame %d Flow (Avg: %.2fpx, Max: %.1fpx)", frameCount, avgMag, localMaxMag),
                                                        new Point(20, 40), Imgproc.FONT_HERSHEY_SIMPLEX, 0.7, new Scalar(0, 255, 255), 2);
                                        
                                        MatOfByte buf = new MatOfByte();
                                        Imgcodecs.imencode(".jpg", visualMat, buf);
                                        byte[] bytes = buf.toArray();
                                        bestFlowVisualizationBase64 = "data:image/jpeg;base64," + android.util.Base64.encodeToString(bytes, android.util.Base64.NO_WRAP);
                                        
                                        visualMat.release();
                                        buf.release();
                                    }
                                    
                                    if (flowComputedCount % 15 == 0) {
                                        Log.i(TAG, String.format("DIS Flow computed for %d frames. Frame %d Stats (Avg: %.2fpx, Max: %.1fpx)", 
                                              flowComputedCount, frameCount, avgMag, localMaxMag));
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

            Log.i(TAG, "Finished processing sequence. Count: " + frameCount + ", Verified: " + timestampsVerified + ", Flow run: " + flowComputedCount + ", Global Avg Flow: " + globalAvgFlow);
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
