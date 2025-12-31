<!-- Import Team Form -->
<script lang="ts">
	import { ArrowLeft, Calendar, Loader2 } from 'lucide-svelte';
	import { goto } from '$app/navigation';
	import { importTeam } from '$lib/api/availability';

	let elttlUrl = '';
	let loading = false;
	let error = '';

	async function handleSubmit() {
		if (!elttlUrl) {
			error = 'Please enter a valid ELTTL team URL';
			return;
		}

		// Validate URL format
		if (!elttlUrl.includes('elttl.interactive.co.uk/teams/view/')) {
			error = 'Invalid ELTTL URL format. URL should be like: https://elttl.interactive.co.uk/teams/view/839';
			return;
		}

		loading = true;
		error = '';

		try {
			const response = await importTeam(elttlUrl);
			// Redirect to the team tracker page
			goto(response.redirect);
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to import team';
			loading = false;
		}
	}
</script>

<div class="max-w-2xl mx-auto animate-fadeIn">
	<a
		href="/availability"
		class="flex items-center text-sm text-gray-500 hover:text-emerald-600 dark:text-gray-400 dark:hover:text-emerald-400 mb-6 transition-colors"
	>
		<ArrowLeft size={16} class="mr-2" />
		Back to Availability
	</a>

	<div class="bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-gray-200 dark:border-slate-700 overflow-hidden">
		<div class="p-6 border-b border-gray-100 dark:border-slate-700 bg-gray-50 dark:bg-slate-800/50">
			<div class="flex items-center gap-3">
				<div class="p-2 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 rounded-lg">
					<Calendar size={24} />
				</div>
				<h2 class="text-2xl font-bold text-gray-900 dark:text-white">Import Team</h2>
			</div>
		</div>

		<form onsubmit={handleSubmit} class="p-6 space-y-6">
			<div class="space-y-2">
				<label for="elttlUrl" class="block text-sm font-medium text-gray-700 dark:text-gray-300">
					ELTTL Team URL
				</label>
				<input
					id="elttlUrl"
					type="url"
					bind:value={elttlUrl}
					placeholder="https://elttl.interactive.co.uk/teams/view/839"
					disabled={loading}
					class="w-full px-4 py-3 rounded-lg bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-600 focus:ring-2 focus:ring-emerald-500 outline-none text-gray-900 dark:text-white transition-all disabled:opacity-50"
					required
				/>
				<p class="text-xs text-gray-500 dark:text-gray-400">
					Enter the URL of your team from the ELTTL website
				</p>
			</div>

			{#if error}
				<div class="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900/30 rounded-lg">
					<p class="text-sm text-red-700 dark:text-red-400">{error}</p>
				</div>
			{/if}

			<button
				type="submit"
				disabled={loading || !elttlUrl}
				class="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-lg shadow-emerald-500/20 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
			>
				{#if loading}
					<Loader2 size={20} class="animate-spin" />
					<span>Importing Team...</span>
				{:else}
					<span>Import Team</span>
				{/if}
			</button>

			<div class="p-4 bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-900/20 rounded-lg">
				<h4 class="text-sm font-semibold text-blue-900 dark:text-blue-300 mb-2">
					How to find your team URL:
				</h4>
				<ol class="text-xs text-blue-700 dark:text-blue-400 space-y-1 list-decimal list-inside">
					<li>Go to <a href="https://elttl.interactive.co.uk" target="_blank" rel="noopener" class="underline">elttl.interactive.co.uk</a></li>
					<li>Search for your team</li>
					<li>Copy the URL from your browser address bar</li>
					<li>Paste it above and click "Import Team"</li>
				</ol>
			</div>
		</form>
	</div>
</div>
