import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const isVercel = !!process.env.VERCEL

export default defineConfig({
  base: isVercel ? '/' : '/TBI_marian/',
  plugins: [react()],
})
