import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        // Use 127.0.0.1 — on Windows `localhost` can resolve to ::1 while Nest listens on IPv4
        target: 'http://127.0.0.1:4000',
        changeOrigin: true,
      },
    },
  },
})
