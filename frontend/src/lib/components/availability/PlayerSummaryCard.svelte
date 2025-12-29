<script lang="ts">
	import type { PlayerSummary } from '$lib/api/availability';

	let { summary }: { summary: PlayerSummary } = $props();
</script>

<div class="bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-gray-200 dark:border-slate-700 p-6 hover:shadow-xl transition-shadow">
	<!-- Player Icon/Silhouette -->
	<div class="flex items-start gap-4 mb-4">
		<div class="flex-shrink-0 w-16 h-16 bg-gradient-to-br from-emerald-400 to-blue-500 rounded-full flex items-center justify-center">
			<svg class="w-10 h-10 text-white" viewBox="0 0 24 24" fill="currentColor">
				<path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
			</svg>
		</div>
		
		<div class="flex-1">
			<h3 class="text-xl font-bold text-gray-900 dark:text-white mb-1">
				{summary.playerName}
			</h3>
			<div class="text-sm text-gray-600 dark:text-gray-400">
				Selection Rate: <span class="font-semibold text-emerald-600 dark:text-emerald-400">{summary.selectionRate}%</span>
			</div>
		</div>
	</div>

	<!-- Stats Grid -->
	<div class="grid grid-cols-3 gap-3">
		<div class="text-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
			<div class="text-2xl font-bold text-blue-600 dark:text-blue-400">
				{summary.gamesPlayed}
			</div>
			<div class="text-xs text-gray-600 dark:text-gray-400 mt-1">
				Played
			</div>
		</div>

		<div class="text-center p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg">
			<div class="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
				{summary.gamesScheduled}
			</div>
			<div class="text-xs text-gray-600 dark:text-gray-400 mt-1">
				Scheduled
			</div>
		</div>

		<div class="text-center p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
			<div class="text-2xl font-bold text-purple-600 dark:text-purple-400">
				{summary.totalGames}
			</div>
			<div class="text-xs text-gray-600 dark:text-gray-400 mt-1">
				Total
			</div>
		</div>
	</div>
</div>
