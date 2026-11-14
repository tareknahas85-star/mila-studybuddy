import { readFileSync } from 'node:fs'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf-8')) as { version: string }

export default defineConfig({
  plugins: [react()],
  base: './',
  // رقم النسخة من package.json: بيظهر بـ"عن التطبيق" وبيتقارن مع آخر ريليس على GitHub.
  define: { __APP_VERSION__: JSON.stringify(pkg.version) },
})
