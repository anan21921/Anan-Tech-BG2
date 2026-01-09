
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load environment variables. 
  // The third argument '' ensures we load all variables (including those without VITE_ prefix like API_KEY)
  // Casting process to any helps avoid type issues in some environments.
  const env = loadEnv(mode, (process as any).cwd(), '');
  
  return {
    plugins: [react()],
    base: '/', 
    define: {
      // This injects the API key from Netlify environment into the code where process.env.API_KEY is used
      'process.env.API_KEY': JSON.stringify(env.API_KEY)
    }
  }
})
