import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [sveltekit()],
	css: {
		devSourcemap: true
	},
	build: {
		sourcemap: true
	},
	test: {
		include: ['src/**/*.test.ts'],
		exclude: ['e2e/**', 'node_modules/**']
	}
});
