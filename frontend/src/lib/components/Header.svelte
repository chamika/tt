<script lang="ts">
	import { Moon, Sun, Table2 } from 'lucide-svelte';
	import { darkMode } from '$lib/store';

	function toggleDarkMode() {
		darkMode.update((value) => !value);
	}
</script>

<header
	class="sticky top-0 z-50 backdrop-blur-md bg-white/80 dark:bg-slate-900/80 border-b border-gray-200 dark:border-slate-800"
>
	<div class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
		<a href="/" class="flex items-center gap-3 cursor-pointer group text-left no-underline">
			<div
				class="bg-gradient-to-br from-emerald-500 to-blue-600 p-2.5 rounded-xl shadow-lg shadow-emerald-500/20 group-hover:shadow-emerald-500/30 transition-all"
			>
				<Table2 class="text-white" size={24} />
			</div>
			<div>
				<h1
					class="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-400"
				>
					Table Tennis Tools
				</h1>
				<p class="text-xs text-gray-500 dark:text-gray-400 font-medium">Player Utilities</p>
			</div>
		</a>

		<button
			on:click={toggleDarkMode}
			class="p-2.5 rounded-xl bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-slate-700 transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500"
			aria-label="Toggle Theme"
		>
			{#if $darkMode}
				<Sun size={20} />
			{:else}
				<Moon size={20} />
			{/if}
		</button>
	</div>
</header>
