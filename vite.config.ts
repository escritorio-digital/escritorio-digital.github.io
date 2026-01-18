import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig(() => ({
    base: '/escritorio/',
    plugins: [
        react(),
        VitePWA({
            registerType: 'autoUpdate',
            manifest: {
                name: 'Escritorio Digital',
                short_name: 'Escritorio',
                description: 'Un escritorio digital interactivo con herramientas y widgets para el aula.',
                theme_color: '#ffffff',
                background_color: '#ffffff',
                icons: [
                    {
                        src: 'escritorio-digital.png',
                        sizes: '192x192',
                        type: 'image/png',
                    },
                    {
                        src: 'escritorio-digital.png',
                        sizes: '512x512',
                        type: 'image/png',
                    },
                ],
            },
        })
    ],
    build: {
        chunkSizeWarningLimit: 1000,
    },
}))
