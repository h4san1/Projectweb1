import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Host tambahan untuk preview di VM (mis. pv-xxxx.style.dev).
const extraHosts = (process.env.__VITE_ADDITIONAL_SERVER_ALLOWED_HOSTS ?? '')
  .split(',')
  .map((host) => host.trim())
  .filter(Boolean)

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 3000,
    strictPort: true,
    allowedHosts: extraHosts,
  },
  preview: {
    host: '0.0.0.0',
    port: 3000,
  },
})
