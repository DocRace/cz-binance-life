import { defineConfig, loadEnv } from 'vite'
import path from 'path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'


function figmaAssetResolver() {
  return {
    name: 'figma-asset-resolver',
    resolveId(id) {
      if (id.startsWith('figma:asset/')) {
        const filename = id.replace('figma:asset/', '')
        return path.resolve(__dirname, 'src/assets', filename)
      }
    },
  }
}

export default defineConfig(({ mode }) => {
  const envDir = path.resolve(__dirname)
  const loaded = loadEnv(mode, envDir, '')
  const proxyTarget =
    typeof loaded.DEV_IPDEX_API_PROXY_TARGET === 'string'
      ? loaded.DEV_IPDEX_API_PROXY_TARGET.trim()
      : ''
  const bookBffTarget =
    typeof loaded.DEV_BOOK_BFF_TARGET === 'string'
      ? loaded.DEV_BOOK_BFF_TARGET.trim()
      : 'http://127.0.0.1:8787'

  const proxy: Record<string, { target: string; changeOrigin: boolean; secure?: boolean }> = {}
  if (proxyTarget.length > 0) {
    proxy['/api/v1'] = { target: proxyTarget, changeOrigin: true, secure: true }
  }
  proxy['/api/bff'] = { target: bookBffTarget, changeOrigin: true }

  return {
    plugins: [
      figmaAssetResolver(),
      // The React and Tailwind plugins are both required for Make, even if
      // Tailwind is not being actively used – do not remove them
      react(),
      tailwindcss(),
    ],
    resolve: {
      alias: {
        // Alias @ to the src directory
        '@': path.resolve(__dirname, './src'),
      },
    },

    // File types to support raw imports. Never add .css, .tsx, or .ts files to this.
    assetsInclude: ['**/*.svg', '**/*.csv'],

    server: {
      proxy,
    },
  }
})
