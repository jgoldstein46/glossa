import { defineConfig } from '@hey-api/openapi-ts'

export default defineConfig({
  client: '@hey-api/client-fetch',
  input: './openapi.yaml',
  output: {
    path: './lib/api/client',
    format: 'prettier',
  },
  plugins: [
    '@hey-api/sdk',
    '@hey-api/typescript',
  ],
})
