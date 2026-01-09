
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Fix: Cast process to any to avoid TS error about missing cwd property
  const env = loadEnv(mode, (process as any).cwd(), '');
  return {
    plugins: [react()],
    base: './', // Ensures relative paths are used for assets/scripts to fix loading errors
    define: {
      // This enables process.env.API_KEY to work in the browser
      'process.env.API_KEY': JSON.stringify(env.API_KEY)
    }
  }
})