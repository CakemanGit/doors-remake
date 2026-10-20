import { readFile, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import react from '@vitejs/plugin-react'
import { defineConfig, type Plugin } from 'vite'

function inlineProductionAssets(): Plugin {
  return {
    name: 'inline-production-assets',
    apply: 'build',
    async closeBundle() {
      const outputDirectory = resolve(
        dirname(fileURLToPath(import.meta.url)),
        'dist',
      )
      const htmlPath = resolve(outputDirectory, 'index.html')
      let html = await readFile(htmlPath, 'utf8')
      html = html.replace(
        /<script id="source-file-redirect">[\s\S]*?<\/script>/,
        '',
      )

      const scriptTag = html.match(
        /<script\b[^>]*\bsrc="([^"]+)"[^>]*><\/script>/,
      )
      if (!scriptTag) {
        throw new Error('Could not find the production JavaScript bundle in index.html.')
      }

      const scriptPath = resolve(outputDirectory, scriptTag[1])
      const script = await readFile(scriptPath, 'utf8')
      html = html.replace(
        scriptTag[0],
        () => `<script type="module">\n${script.replace(/<\/script/gi, '<\\/script')}\n</script>`,
      )

      const stylesheetTags = Array.from(
        html.matchAll(/<link\b[^>]*rel="stylesheet"[^>]*>/g),
      )
      for (const [tag] of stylesheetTags) {
        const stylesheetPathMatch = tag.match(/\bhref="([^"]+)"/)
        if (!stylesheetPathMatch) {
          throw new Error('Could not find a production stylesheet path in index.html.')
        }

        const stylesheetPath = resolve(
          outputDirectory,
          stylesheetPathMatch[1],
        )
        const stylesheet = await readFile(stylesheetPath, 'utf8')
        html = html.replace(tag, () => `<style>\n${stylesheet}\n</style>`)
      }

      await writeFile(htmlPath, html)
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), inlineProductionAssets()],
  base: './',
  resolve: {
    dedupe: ['react', 'react-dom', 'three', '@react-three/fiber'],
  },
  build: {
    chunkSizeWarningLimit: 1500,
    modulePreload: {
      polyfill: false,
    },
    rolldownOptions: {
      output: {
        codeSplitting: false,
      },
    },
  },
})
