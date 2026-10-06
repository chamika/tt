<!-- The knockout: one column per round on wide screens, one round at a time on phones -->
<script lang="ts">
	import type { Match, TournamentView } from '$lib/types/tournament';
	import { bracketColumns } from '$lib/tournament/bracketLayout';
	import MatchCard from './MatchCard.svelte';

	let {
		view,
		onOpen
	}: {
		view: TournamentView;
		onOpen?: (match: Match) => void;
	} = $props();

	const columns = $derived(bracketColumns(view));

	// On phones, open on the round being played: the first with a match ready,
	// otherwise the last one with a result, otherwise the first
	function currentRound(): number {
		const ready = columns.find((c) => c.matches.some((m) => m.status === 'ready'));
		if (ready) return ready.round.round;
		const played = [...columns].reverse().find((c) => c.matches.some((m) => m.status === 'completed'));
		return played?.round.round ?? columns[0]?.round.round ?? 1;
	}

	let selectedRound = $state<number | null>(null);
	const shownRound = $derived(selectedRound ?? currentRound());
	const shownColumn = $derived(columns.find((c) => c.round.round === shownRound));
</script>

<!-- Phones: round selector -->
<div class="md:hidden">
	<div class="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1" role="tablist" aria-label="Rounds">
		{#each columns as column (column.round.round)}
			<button
				role="tab"
				aria-selected={shownRound === column.round.round}
				onclick={() => (selectedRound = column.round.round)}
				class="px-3 py-1.5 text-sm font-medium rounded-full whitespace-nowrap transition-colors {shownRound ===
				column.round.round
					? 'bg-emerald-600 text-white'
					: 'bg-gray-100 text-gray-700 dark:bg-slate-800 dark:text-gray-300'}"
			>
				{column.round.name}
			</button>
		{/each}
	</div>
	{#if shownColumn}
		<div class="mt-3 space-y-3">
			{#each shownColumn.matches as match (match.id)}
				<MatchCard {match} {view} {onOpen} />
			{/each}
		</div>
	{/if}
</div>

<!-- Wide screens: every round side by side; each match sits level with the two that feed it -->
<div class="hidden md:flex gap-6 overflow-x-auto pb-4" data-testid="bracket-columns">
	{#each columns as column (column.round.round)}
		<div class="flex flex-col min-w-[15rem] w-60 flex-shrink-0">
			<h3 class="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-3 text-center">
				{column.round.name}
			</h3>
			<div class="flex flex-col justify-around flex-1 gap-4">
				{#each column.matches as match (match.id)}
					<MatchCard {match} {view} {onOpen} compact />
				{/each}
			</div>
		</div>
	{/each}
</div>
