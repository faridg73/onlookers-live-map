package com.onlooker.app;

import android.os.Bundle;
import android.webkit.WebSettings;
import android.webkit.WebView;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        applyFixedTextZoom();
    }

    @Override
    public void onResume() {
        super.onResume();
        applyFixedTextZoom();
    }

    /**
     * Stop the Android WebView from scaling text based on the device's
     * system font-size setting. Without this, users with larger system
     * fonts get oversized, clipped text inside the app because the web
     * layout is designed with its own responsive type scale.
     * Applied on create and again on resume so it survives the WebView
     * settings being reset after the app is backgrounded.
     */
    private void applyFixedTextZoom() {
        WebView webView = getBridge() != null ? getBridge().getWebView() : null;
        if (webView == null) return;
        WebSettings settings = webView.getSettings();
        if (settings.getTextZoom() != 100) {
            settings.setTextZoom(100);
        }
    }
}
