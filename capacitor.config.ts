import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "app.lovable.onlooker",
  appName: "Onlooker",
  webDir: "dist/client",
  server: {
    // Remove this block before submitting to the App Store / Google Play
    // so the app loads the bundled build instead of the live preview.
    url: "https://id-preview--bd06a57d-a4e3-4e08-a564-3d3580147ce0.lovable.app?forceHideBadge=true",
    cleartext: true,
  },
  ios: {
    contentInset: "always",
  },
  android: {
    backgroundColor: "#0a1020",
  },
};

export default config;
