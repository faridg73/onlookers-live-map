import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.onlooker.app',
  appName: 'Onlooker LLC',
  webDir: 'mobile-shell',
  server: { url: 'https://onlookerlive.com' },
  ios: {
    contentInset: 'always',
  },
  android: {
    backgroundColor: '#000000',
  },
};

export default config;