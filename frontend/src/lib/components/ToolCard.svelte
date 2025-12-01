<script lang="ts">
	import { Calendar, Calculator, Trophy } from 'lucide-svelte';

	let { title, description, icon, href, disabled = false, badge = '' } = $props();

	const icons = {
		Calculator: Calculator,
		Calendar: Calendar,
		Trophy: Trophy
	};

	const iconComponent = typeof icon === 'string' ? icons[icon] : icon;
</script>

<a
	href={disabled ? undefined : href}
	class={`
      relative p-6 rounded-2xl border transition-all duration-300 ease-in-out group
      ${
				disabled
					? 'opacity-60 cursor-not-allowed'
					: 'cursor-pointer hover:-translate-y-1 hover:shadow-xl'
			}
      dark:bg-slate-800 dark:border-slate-700 dark:hover:border-emerald-500/50
      bg-white border-gray-200 hover:border-emerald-500/50 shadow-sm
    `}
>
	<div class="flex items-start justify-between mb-4">
		<div
			class={`p-3 rounded-lg ${
				disabled
					? 'bg-gray-100 dark:bg-slate-700'
					: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400'
			}`}
		>
			<svelte:component this={iconComponent} size={24} />
		</div>
		{#if badge}
			<span
				class="px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300"
			>
				{badge}
			</span>
		{/if}
	</div>
	<h3
		class="text-xl font-bold mb-2 text-gray-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors"
	>
		{title}
	</h3>
	<p class="text-gray-600 dark:text-gray-400">
		{description}
	</p>
</a>
