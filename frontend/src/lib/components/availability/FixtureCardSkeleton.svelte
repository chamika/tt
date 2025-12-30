<script lang="ts">
	// Skeleton loader for FixtureCard
</script>

<div
	class="bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-gray-200 dark:border-slate-700 overflow-hidden animate-pulse"
>
	<!-- Header Skeleton -->
	<div class="h-40 bg-gradient-to-br from-gray-300 to-gray-400 dark:from-slate-600 dark:to-slate-700"></div>

	<!-- Content Skeleton -->
	<div class="p-6">
		<!-- Availability Section -->
		<div class="space-y-2 mb-6">
			<div class="h-4 bg-gray-200 dark:bg-slate-700 rounded w-32 mb-3"></div>
			{#each Array(5) as _}
				<div class="flex items-center gap-3 p-2 min-h-[44px]">
					<div class="w-4 h-4 bg-gray-200 dark:bg-slate-700 rounded"></div>
					<div class="h-4 bg-gray-200 dark:bg-slate-700 rounded flex-1"></div>
					<div class="w-9 h-9 bg-gray-200 dark:bg-slate-700 rounded"></div>
				</div>
			{/each}
		</div>

		<!-- Final Selection Skeleton -->
		<div class="border-t border-gray-200 dark:border-slate-700 pt-4">
			<div class="flex items-center justify-between mb-2">
				<div class="h-4 bg-gray-200 dark:bg-slate-700 rounded w-28"></div>
				<div class="h-6 w-12 bg-gray-200 dark:bg-slate-700 rounded-full"></div>
			</div>
			<div class="space-y-2">
				{#each Array(3) as _}
					<div class="h-10 bg-gray-100 dark:bg-slate-700/50 rounded-lg"></div>
				{/each}
			</div>
		</div>
	</div>
</div>
