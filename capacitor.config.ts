import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.onlooker',
  appName: 'Onlooker',
  webDir: 'dist/client',
  ios: {
    contentInset: 'always',
  },
  android: {
    backgroundColor: '#0a1020',
  },
};

export default config;