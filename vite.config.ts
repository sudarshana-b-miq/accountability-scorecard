import fs from 'node:fs/promises';
import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';

// Fiber's ESM build keeps a few type-only imports that esbuild treats as values.
const TYPE_ONLY_IMPORTS = /^\s*import\s+\{\s*(?:DayPickerProps|InputProps|ModalProps)\s*\}\s+from\s+['"][^'"]+['"];?\s*$/gm;

function stripFiberTypeImports(code: string) {
  return code.replace(TYPE_ONLY_IMPORTS, '');
}

const fiberTypeImports = {
  name: 'fiber-type-imports',
  setup(build: { onLoad: (options: { filter: RegExp }, callback: (args: { path: string }) => Promise<{ contents: string; loader: 'js' }>) => void }) {
    build.onLoad({ filter: /@miq\/fiber-ui\/dist\/es\/.*\.js$/ }, async args => {
      const contents = stripFiberTypeImports(await fs.readFile(args.path, 'utf8'));
      return { contents, loader: 'js' };
    });
  },
};

function fiberTypeImportPlugin(): Plugin {
  return {
    name: 'fiber-type-import-plugin',
    enforce: 'pre',
    transform(code, id) {
      if (id.includes('@miq/fiber-ui/dist/es/') && id.endsWith('.js')) {
        const next = stripFiberTypeImports(code);
        if (next !== code) return { code: next, map: null };
      }
      return null;
    },
  };
}

export default defineConfig({
  plugins: [fiberTypeImportPlugin(), react()],
  // Fiber pulls in node-oriented packages (global-cache) that read `global`.
  define: { global: 'globalThis' },
  optimizeDeps: {
    include: ['@miq/fiber-ui', '@miq/fiber-ui/icons', '@miq/fiber-ui/charts'],
    esbuildOptions: {
      define: { global: 'globalThis' },
      plugins: [fiberTypeImports],
    },
  },
  server: { port: 5173, open: true },
});
