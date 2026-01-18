import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig(() => ({
    base: '/',
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
        rollupOptions: {
            output: {
                manualChunks(id) {
                    if (!id.includes('node_modules')) return;
                    if (id.includes('react')) return 'react-vendor';
                    if (id.includes('i18next')) return 'i18n-vendor';
                    if (id.includes('katex')) return 'katex-vendor';
                    if (id.includes('jspdf')) return 'pdf-vendor';
                    if (id.includes('html2canvas')) return 'canvas-vendor';
                    if (id.includes('marked') || id.includes('turndown')) return 'markdown-vendor';
                    if (id.includes('@tiptap')) return 'editor-vendor';
                    return 'vendor';
                },
            },
        },
    },
}))
