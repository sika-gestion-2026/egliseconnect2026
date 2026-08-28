import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.egliseconnect.app',
  appName: 'Eglise Connect',
  webDir: 'public', 
  server: {
    // Replace with actual production URL
    url: 'https://eglise-connect.com',
    cleartext: true
  }
};

export default config;
