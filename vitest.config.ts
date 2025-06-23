import { defineConfig } from 'vitest/config'
import openApiPlugin from './vitest-openapi-plugin'

export default defineConfig({
  test: {
    includeSource: ['src/**/*.{js,ts}'],
    setupFiles: ['./database_test_setup.ts'],
    watchExclude: ['src/routes/generated/**', 'client/**']
  },
  plugins: [openApiPlugin]
})
