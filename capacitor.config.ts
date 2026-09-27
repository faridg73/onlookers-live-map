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
  },
};

export default config;