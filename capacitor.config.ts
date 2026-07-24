import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.lauckdastele.expressmanager",
  appName: "Express Manager",
  webDir: "capacitor-web",

  server: {
    url: "https://express-manager1.vercel.app",
    cleartext: false,
  },
};

export default config;
