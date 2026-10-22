<!-- One row of the match card: who plays, the games, the winner and the running score -->
<script lang="ts">
	import { Check } from 'lucide-svelte';
	import type { RubberView, TeamMatch } from '$lib/types/teamMatch';
	import { formatGames, sideText } from '$lib/teamMatch/card';

	let { rubber, match, onOpen }: { rubber: RubberView; match: TeamMatch; onOpen: (rubber: RubberView) => void } =
		$props();

	const sides = $derived(
		(['home', 'away'] as const).map((side) => ({
			side,
			labels: rubber.is_doubles && rubber[side].labels.length === 0 ? '&' : rubber[side].labels.join(' & '),
			text: sideText(rubber[side], side === 'home' ? match.home_team : match.away_team),
			won: rubber.result?.winner === side,
			games: rubber.result ? (side === 'home' ? rubber.result.home_games : rubber.result.away_games) : null
		}))
	);
</script>

<button
	type="button"
	onclick={() => onOpen(rubber)}
	class="w-full text-left bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm p-3 sm:p-4 hover:border-emerald-400 dark:hover:border-emerald-600 transition-colors"
	data-testid="rubber"
	data-rubber={rubber.number}
	aria-label="Rubber {rubber.number}: {sides[0].text} v {sides[1].text}{rubber.result ? '' : ', enter result'}"
>
	<div class="flex items-center gap-3">
		<span
			class="w-8 h-8 flex-shrink-0 flex items-center justify-center rounded-full text-sm font-bold tabular-nums {rubber.result
				? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300'
				: 'bg-gray-100 text-gray-600 dark:bg-slate-700 dark:text-gray-300'}"
		>
			{rubber.number}
		</span>

		<div class="flex-1 min-w-0 space-y-1">
			{#each sides as { side, labels, text, won, games } (side)}
				<div
					class="flex items-center justify-between gap-2 text-sm {won
						? 'font-bold text-gray-900 dark:text-white'
						: 'text-gray-700 dark:text-gray-300'}"
					data-testid="rubber-{side}"
				>
					<div class="flex items-center gap-2 min-w-0">
						<span class="w-10 flex-shrink-0 text-xs font-semibold text-gray-400 dark:text-gray-500">{labels}</span>
						<span class="truncate">{text}</span>
						{#if won}<Check size={14} class="text-emerald-600 dark:text-emerald-400 flex-shrink-0" />{/if}
					</div>
					{#if games !== null}<span class="tabular-nums">{games}</span>{/if}
				</div>
			{/each}
		</div>

		<div class="w-14 flex-shrink-0 text-right">
			{#if rubber.running}
				<span class="block text-[10px] uppercase tracking-wide text-gray-400 dark:text-gray-500">H – A</span>
				<span class="text-sm font-semibold tabular-nums text-gray-900 dark:text-white" data-testid="running">
					{rubber.running.home}–{rubber.running.away}
				</span>
			{:else}
				<span class="text-xs font-medium text-emerald-700 dark:text-emerald-400">Enter</span>
			{/if}
		</div>
	</div>

	{#if rubber.result}
		<p class="mt-2 pl-11 text-xs text-gray-500 dark:text-gray-400 tabular-nums" data-testid="rubber-games">
			{formatGames(rubber.result)}
		</p>
	{/if}
</button>
