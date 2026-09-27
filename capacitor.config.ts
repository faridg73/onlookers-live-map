import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.onlooker.app',
  appName: 'Onlooker',
  webDir: 'mobile-shell',
  // Must be the final (non-redirecting) host: onlooker.io 302s to www, and
  // Capacitor opens any navigation to a host outside server.url/allowNavigation
  // in Safari — that was the "black screen → Safari" launch bug.
  server: {
    url: 'https://www.onlooker.io',
    allowNavigation: [
      'onlooker.io',
      'www.onlooker.io',
      'onlookerlive.com',
      'www.onlookerlive.com',
      '*.stripe.com',
      'accounts.google.com',
    ],
  },
  ios: {
    contentInset: 'never',
    allowsLinkPreview: false,
    scrollEnabled: true,
  },
  android: {
    backgroundColor: '#000000',
    allowMixedContent: false,
  },
  plugins: {
    Keyboard: {
      resize: 'body',
      style: 'dark',
      resizeOnFullScreen: true,
    },
    StatusBar: {
      overlaysWebView: false,
      style: 'LIGHT',
      backgroundColor: '#000000',
    },
    // The splash is dismissed from the web layer (src/lib/native.ts) once the
    // first real layout + fonts are ready, so a cold launch never shows a
    // half-painted screen.
    SplashScreen: {
      launchAutoHide: false,
      launchShowDuration: 0,
      backgroundColor: '#000000',
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true,
      iosSpinnerStyle: 'small',
      androidScaleType: 'CENTER_CROP',
    },
  },
};

export default config;