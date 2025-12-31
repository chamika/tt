<script lang="ts">
	import { CalendarOff, AlertCircle } from 'lucide-svelte';
	
	let {
		title = "No fixtures found",
		message = "There are no fixtures to display at this time.",
		icon = "calendar"
	}: {
		title?: string;
		message?: string;
		icon?: "calendar" | "alert";
	} = $props();
</script>

<div class="text-center py-12 px-4">
	<div class="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 dark:bg-slate-800 mb-4">
		{#if icon === "calendar"}
			<CalendarOff size={32} class="text-gray-400 dark:text-gray-500" />
		{:else}
			<AlertCircle size={32} class="text-gray-400 dark:text-gray-500" />
		{/if}
	</div>
	<h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-2">
		{title}
	</h3>
	<p class="text-sm text-gray-600 dark:text-gray-400 max-w-md mx-auto">
		{message}
	</p>
</div>
