import type { CapacitorConfig } from '@capacitor/cli';
const config: CapacitorConfig = {
  appId: 'com.embroiderycalc.companion',
  appName: 'EmbroideryCalc',
  webDir: 'dist-native',
  ios: { contentInset: 'never' },
};
export default config;
