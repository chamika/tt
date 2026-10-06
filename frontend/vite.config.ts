import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [sveltekit()],
	css: {
		devSourcemap: true
	},
	server: {
		fs: {
			// Code shared with the worker (e.g. the handicap calculator) lives outside the app root
			allow: ['../shared']
		}
	},
	build: {
		sourcemap: true
	}
});
