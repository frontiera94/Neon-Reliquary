import { defineConfig, minimal2023Preset } from '@vite-pwa/assets-generator/config'

export default defineConfig({
  preset: {
    ...minimal2023Preset,
    maskable: {
      sizes: [512],
      resizeOptions: {
        background: '#0a0a0f',
      },
    },
    apple: {
      sizes: [180],
      resizeOptions: {
        background: '#0a0a0f',
      },
    },
  },
  images: ['public/favicon.svg'],
})
