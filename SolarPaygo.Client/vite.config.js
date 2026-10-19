import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'fs'
import path from 'path'

const versionPlugin = () => ({
  name: 'version-generator',
  buildStart() {
    const versionData = { buildTime: Date.now() };
    const publicDir = path.resolve(__dirname, 'public');
    if (!fs.existsSync(publicDir)) {
      fs.mkdirSync(publicDir, { recursive: true });
    }
    fs.writeFileSync(path.join(publicDir, 'version.json'), JSON.stringify(versionData));
    console.log('[Vite] Generated public/version.json with buildTime:', versionData.buildTime);
  }
});

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), versionPlugin()],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:5032',
        changeOrigin: true,
        secure: false,
      },
    },
  },
})
