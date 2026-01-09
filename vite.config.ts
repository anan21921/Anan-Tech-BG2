import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: './', // Netlify SPA ও অন্যান্য static host-এ ঠিক চলার জন্য
})
