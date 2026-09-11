import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.onlooker',
  appName: 'Onlooker',
  webDir: 'mobile-shell',
  server: { url: 'https://onlookers-live-map.lovable.app' },
  ios: {
    contentInset: 'always',
  },
  android: {
    backgroundColor: '#000000',
  },
};

export default config;