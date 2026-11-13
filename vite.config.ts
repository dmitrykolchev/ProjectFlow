import path from 'path';
import fs from 'fs';
import { defineConfig, type Plugin } from 'vite';

function litCssPlugin(): Plugin {
  const VIRTUAL_PREFIX = '\0lit-css:';
  return {
    name: 'vite-plugin-lit-css',
    enforce: 'pre',
    async resolveId(source: string, importer?: string) {
      if (source.endsWith('.css') && !source.endsWith('index.css') && importer) {
        const cleanImporter = importer.startsWith(VIRTUAL_PREFIX)
          ? importer.slice(VIRTUAL_PREFIX.length).replace(/\.js$/, '')
          : importer;
        const resolved = await this.resolve(source, cleanImporter, { skipSelf: true });
        if (resolved && !resolved.external) {
          return VIRTUAL_PREFIX + resolved.id + '.js';
        }
      }
      return null;
    },
    load(id: string) {
      if (id.startsWith(VIRTUAL_PREFIX)) {
        const filePath = id.slice(VIRTUAL_PREFIX.length).replace(/\.js$/, '').split('?')[0];
        if (fs.existsSync(filePath)) {
          const cssCode = fs.readFileSync(filePath, 'utf-8');
          const shadowScrollbars = `
* { scrollbar-width: thin; scrollbar-color: var(--scrollbar-thumb) var(--scrollbar-track); }
*::-webkit-scrollbar { width: 8px; height: 8px; }
*::-webkit-scrollbar-track { background: var(--scrollbar-track); }
*::-webkit-scrollbar-thumb { background-color: var(--scrollbar-thumb); border-radius: 4px; border: 2px solid var(--scrollbar-track); }
*::-webkit-scrollbar-thumb:hover { background-color: var(--scrollbar-thumb-hover); }
*::-webkit-scrollbar-corner { background: var(--scrollbar-track); }
`;
          return {
            code: `import { unsafeCSS } from 'lit';\nconst styles = unsafeCSS(${JSON.stringify(cssCode + shadowScrollbars)});\nexport default styles;\n`,
            map: { mappings: '' },
          };
        }
      }
      return null;
    },
  };
}

export default defineConfig(() => {
  return {
    plugins: [litCssPlugin()],
    esbuild: {
      target: 'es2022',
      tsconfigRaw: {
        compilerOptions: {
          experimentalDecorators: true,
          useDefineForClassFields: false,
        },
      },
    },
    build: {
      target: 'es2022',
      rollupOptions: {
        output: {
          manualChunks: undefined,
        },
      },
    },
    resolve: {
      alias: {
        '@': path.resolve(import.meta.dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
