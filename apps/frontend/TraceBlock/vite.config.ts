import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // @provenance/shared is a linked CommonJS package: pre-bundle it so named imports of
  // runtime values (e.g. PARTICIPANT_TYPES) work in dev and in the production build.
  optimizeDeps: {
    include: ['@provenance/shared'],
  },
  build: {
    commonjsOptions: {
      include: [/packages[\\/]shared/, /node_modules/],
    },
  },
})
