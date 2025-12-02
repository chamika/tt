<script lang="ts">
	import Header from '$lib/components/Header.svelte';
	import Footer from '$lib/components/Footer.svelte';
	import { darkMode } from '$lib/store';
	import '../app.css';

	let { children } = $props();
</script>

<div class="min-h-screen transition-colors duration-300 bg-gray-50 dark:bg-slate-900">
	<Header />
	<main class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
		{@render children()}
	</main>
	<Footer />
</div>
