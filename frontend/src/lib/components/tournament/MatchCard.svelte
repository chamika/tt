<!-- One match: who plays (or where they come from), the handicap, and the result -->
<script lang="ts">
	import { AlertTriangle, Check } from 'lucide-svelte';
	import type { Match, Player, TournamentView } from '$lib/types/tournament';
	import { describeHandicap, formatScore } from '$lib/tournament/scores';

	let {
		match,
		view,
		compact = false,
		onOpen
	}: {
		match: Match;
		view: TournamentView;
		compact?: boolean;
		onOpen?: (match: Match) => void;
	} = $props();

	const playersById = $derived(new Map(view.players.map((p) => [p.id, p])));
	const mode = $derived(view.tournament.score_mode);
	const isHandicap = $derived(view.tournament.seeding_mode === 'handicap');

	const sides = $derived(
		(['a', 'b'] as const).map((side) => {
			const id = side === 'a' ? match.player_a_id : match.player_b_id;
			return {
				side,
				player: id ? playersById.get(id) : undefined,
				source: side === 'a' ? match.source_a_label : match.source_b_label,
				games: side === 'a' ? match.games_a : match.games_b,
				won: match.winner_id !== null && match.winner_id === id && !match.is_bye
			};
		})
	);

	const score = $derived(mode === 'points' ? formatScore(match, mode) : '');
	// Results are only taken once the tournament has started
	const canOpen = $derived(
		onOpen !== undefined &&
			view.tournament.status !== 'draft' &&
			(match.status === 'ready' || match.status === 'completed')
	);

	const statusStyles: Record<Match['status'], string> = {
		ready: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300',
		pending: 'bg-gray-100 text-gray-600 dark:bg-slate-700 dark:text-gray-300',
		completed: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300',
		bye: 'bg-gray-100 text-gray-600 dark:bg-slate-700 dark:text-gray-300'
	};
	const statusLabels: Record<Match['status'], string> = {
		ready: 'Ready',
		pending: 'Waiting',
		completed: 'Done',
		bye: 'Bye'
	};

	function formatHandicap(player: Player): string {
		const h = player.handicap ?? 0;
		return h > 0 ? `+${h}` : String(h);
	}
</script>

<div
	class="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm {compact
		? 'p-3'
		: 'p-4'}"
	data-testid="match-card"
	data-match-label={match.label}
	data-match-status={match.status}
>
	<div class="flex items-center justify-between gap-2 mb-2">
		<span class="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 truncate">
			{match.label}{match.stage === 'group' ? ` · ${match.round_name}` : ''}
		</span>
		<span class="px-2 py-0.5 text-xs font-medium rounded-full flex-shrink-0 {statusStyles[match.status]}">
			{statusLabels[match.status]}
		</span>
	</div>

	<div class="space-y-1">
		{#each sides as { side, player, source, games, won } (side)}
			<div
				class="flex items-center justify-between gap-2 text-sm {won
					? 'font-bold text-gray-900 dark:text-white'
					: 'text-gray-700 dark:text-gray-300'}"
				data-testid="match-side-{side}"
			>
				<div class="flex items-center gap-2 min-w-0">
					<span class="w-5 text-right text-xs text-gray-400 dark:text-gray-500 flex-shrink-0">
						{player ? player.seed : ''}
					</span>
					{#if player}
						<span class="truncate">{player.name}</span>
						{#if isHandicap}
							<span class="text-xs text-gray-500 dark:text-gray-400 flex-shrink-0">({formatHandicap(player)})</span>
						{/if}
					{:else if match.is_bye && !source}
						<span class="italic text-gray-400 dark:text-gray-500">Bye</span>
					{:else}
						<span class="italic text-gray-400 dark:text-gray-500 truncate">{source ?? 'To be decided'}</span>
					{/if}
					{#if won}
						<Check size={14} class="text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
					{/if}
				</div>
				{#if games !== null && mode !== 'winner'}
					<span class="tabular-nums">{games}</span>
				{/if}
			</div>
		{/each}
	</div>

	{#if score}
		<p class="mt-2 text-xs text-gray-500 dark:text-gray-400 tabular-nums">{score}</p>
	{/if}

	{#if match.handicap && match.status !== 'bye' && (isHandicap || !compact)}
		<p class="mt-2 text-xs font-medium text-emerald-700 dark:text-emerald-400" data-testid="match-handicap">
			{describeHandicap(match.handicap)}
		</p>
	{/if}

	{#if match.handicap?.warning}
		<p class="mt-2 flex items-start gap-1.5 text-xs text-amber-700 dark:text-amber-400">
			<AlertTriangle size={14} class="flex-shrink-0 mt-px" />
			<span>{match.handicap.warning}</span>
		</p>
	{/if}

	{#if canOpen}
		<button
			onclick={() => onOpen?.(match)}
			class="mt-3 w-full py-2 text-sm font-medium rounded-lg transition-colors {match.status === 'ready'
				? 'bg-emerald-600 hover:bg-emerald-700 text-white'
				: 'bg-gray-100 hover:bg-gray-200 text-gray-700 dark:bg-slate-700 dark:hover:bg-slate-600 dark:text-gray-200'}"
		>
			{match.status === 'ready' ? 'Enter result' : match.locked ? 'View result' : 'Edit result'}
		</button>
	{/if}
</div>
