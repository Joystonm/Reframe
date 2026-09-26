import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
// Preserve Host so the backend can validate the browser Origin through the dev proxy.
const proxy = { target: 'http://127.0.0.1:3001', changeOrigin: false };
export default defineConfig({plugins:[react()],server:{proxy:{'/api':proxy,'/assets':proxy}}});
