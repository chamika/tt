<script lang="ts">
	// Skeleton loader for PlayerSummaryCard
</script>

<div
	class="bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-gray-200 dark:border-slate-700 p-4 sm:p-6 animate-pulse"
>
	<!-- Header Skeleton -->
	<div class="flex items-start gap-3 sm:gap-4 mb-4">
		<div class="flex-shrink-0 w-12 h-12 sm:w-16 sm:h-16 bg-gray-300 dark:bg-slate-600 rounded-full"></div>
		<div class="flex-1 min-w-0">
			<div class="h-5 sm:h-6 bg-gray-200 dark:bg-slate-700 rounded w-3/4 mb-2"></div>
			<div class="h-4 bg-gray-200 dark:bg-slate-700 rounded w-1/2"></div>
		</div>
	</div>

	<!-- Stats Grid Skeleton -->
	<div class="grid grid-cols-3 gap-2 sm:gap-3">
		{#each Array(3) as _}
			<div class="text-center p-2 sm:p-3 bg-gray-100 dark:bg-slate-700/50 rounded-lg">
				<div class="h-7 sm:h-8 bg-gray-200 dark:bg-slate-600 rounded w-8 mx-auto mb-2"></div>
				<div class="h-3 bg-gray-200 dark:bg-slate-600 rounded w-12 mx-auto"></div>
			</div>
		{/each}
	</div>
</div>
