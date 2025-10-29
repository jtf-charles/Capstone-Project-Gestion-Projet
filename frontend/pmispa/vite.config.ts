// vite.config.ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5174,
    proxy: {
      // tu as déjà ceci pour l'API :
      '/api': {
        target: 'https://gestionprojet-api.onrender.com',
        changeOrigin: true,
      },
      // ➜ ajoute ce bloc pour servir les fichiers statiques
      '/media': {
        target: 'https://gestionprojet-api.onrender.com',
        changeOrigin: true,
      },
    },
  },
})
