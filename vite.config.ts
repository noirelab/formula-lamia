import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';

// Build num único index.html (JS, CSS e fontes embutidos): abre direto do disco,
// sem servidor e sem internet. Módulos separados seriam bloqueados em file://.
export default defineConfig({ base: './', plugins: [react(), viteSingleFile()] });
