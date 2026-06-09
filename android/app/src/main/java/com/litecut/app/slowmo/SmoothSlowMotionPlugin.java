package com.litecut.app.slowmo;

import android.util.Log;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "SmoothSlowMotion")
public class SmoothSlowMotionPlugin extends Plugin {
    private static final String TAG = "SmoothSlowMotion";

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
        call.resolve(ret);
    }
}
