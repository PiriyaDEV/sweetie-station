import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { mockApi } from './dev/mock-api.ts'

export default defineConfig({
  plugins: [react(), tailwindcss(), ...(process.env.MOCK_API === '1' ? [mockApi()] : [])],
})
