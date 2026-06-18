import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'cl.montajes2c.inventario',
  appName: '2C Inventario',
  webDir: 'www',
  server: {
    url: 'https://2c-inventario.vercel.app',
    androidScheme: 'https',
  },
  android: {
    backgroundColor: '#2E333A',
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1500,
      backgroundColor: '#2E333A',
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
    },
  },
};

export default config;
