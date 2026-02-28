import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      // Backend API
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
      // MiniMax API proxy — avoids CORS when calling from the browser
      '/minimax-api': {
        target: 'https://api.minimax.io',
        changeOrigin: true,
        secure: true,
        rewrite: path => path.replace(/^\/minimax-api/, ''),
      },
      // ElevenLabs API proxy — avoids CORS for TTS calls
      '/elevenlabs-api': {
        target: 'https://api.elevenlabs.io',
        changeOrigin: true,
        secure: true,
        rewrite: path => path.replace(/^\/elevenlabs-api/, ''),
      },
    },
  },
})
