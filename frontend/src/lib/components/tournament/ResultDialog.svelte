<!-- Enter, correct or clear a match result; the fields follow the tournament's score mode -->
<script lang="ts">
	import { AlertTriangle, Loader2, Minus, Plus } from 'lucide-svelte';
	import type { GameScore, Match, ResultInput, TournamentView } from '$lib/types/tournament';
	import { describeHandicap, gamesToWin, gamesWon, initialGames } from '$lib/tournament/scores';

	let {
		match,
		view,
		saving = false,
		error = null,
		onSave,
		onClear,
		onCancel
	}: {
		match: Match;
		view: TournamentView;
		saving?: boolean;
		error?: string | null;
		onSave: (result: ResultInput) => void;
		onClear: () => void;
		onCancel: () => void;
	} = $props();

	const { score_mode: mode, best_of: bestOf } = view.tournament;
	const playersById = new Map(view.players.map((p) => [p.id, p]));
	const nameA = playersById.get(match.player_a_id ?? '')?.name ?? 'Player A';
	const nameB = playersById.get(match.player_b_id ?? '')?.name ?? 'Player B';
	const readOnly = match.locked;

	let games = $state<GameScore[]>(initialGames(match, bestOf));
	let gamesA = $state<number | null>(match.games_a);
	let gamesB = $state<number | null>(match.games_b);
	let winnerId = $state<string | null>(match.winner_id);

	const tally = $derived(gamesWon(games, match.handicap?.play_to ?? 11));

	function addGame() {
		games.push({ a: match.handicap?.start_a ?? 0, b: match.handicap?.start_b ?? 0 });
	}

	function removeGame() {
		games.pop();
	}

	function save() {
		if (mode === 'points') {
			onSave({ game_scores: games.map((g) => ({ a: Number(g.a), b: Number(g.b) })) });
		} else if (mode === 'games') {
			onSave({ games_a: Number(gamesA), games_b: Number(gamesB) });
		} else if (winnerId) {
			onSave({ winner_id: winnerId });
		}
	}

	function close() {
		if (!saving) onCancel();
	}

	const inputClass =
		'w-full px-3 py-2 rounded-lg bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-600 focus:ring-2 focus:ring-emerald-500 outline-none text-gray-900 dark:text-white text-center tabular-nums disabled:opacity-60';
</script>

<div
	class="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center sm:p-4 z-50"
	role="presentation"
	onclick={close}
	onkeydown={(e) => e.key === 'Escape' && close()}
>
	<div
		class="bg-white dark:bg-slate-800 rounded-t-2xl sm:rounded-2xl max-w-md w-full max-h-[90vh] flex flex-col p-5 sm:p-6"
		role="dialog"
		aria-modal="true"
		aria-labelledby="result-dialog-title"
		tabindex="-1"
		onclick={(e) => e.stopPropagation()}
		onkeydown={(e) => {
			if (e.key !== 'Escape') e.stopPropagation();
		}}
	>
		<p class="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
			{match.label} · {match.round_name}
		</p>
		<h3 id="result-dialog-title" class="text-lg font-semibold text-gray-900 dark:text-white mb-1">
			{nameA} v {nameB}
		</h3>
		{#if match.handicap}
			<p class="text-sm font-medium text-emerald-700 dark:text-emerald-400">
				{describeHandicap(match.handicap)} · best of {bestOf}
			</p>
		{/if}
		{#if match.handicap?.warning}
			<p class="mt-2 flex items-start gap-1.5 text-xs text-amber-700 dark:text-amber-400">
				<AlertTriangle size={14} class="flex-shrink-0 mt-px" />
				<span>{match.handicap.warning}</span>
			</p>
		{/if}

		<form
			class="mt-4 flex-1 overflow-y-auto -mx-1 px-1"
			onsubmit={(e) => {
				e.preventDefault();
				save();
			}}
		>
			{#if mode === 'points'}
				<div class="grid grid-cols-[4rem_1fr_1fr] gap-2 items-center text-sm">
					<span></span>
					<span class="text-center font-medium text-gray-700 dark:text-gray-300 truncate">{nameA}</span>
					<span class="text-center font-medium text-gray-700 dark:text-gray-300 truncate">{nameB}</span>
					{#each games as game, i (i)}
						<label for="game-{i}-a" class="text-gray-500 dark:text-gray-400">Game {i + 1}</label>
						<input
							id="game-{i}-a"
							type="number"
							inputmode="numeric"
							min="0"
							aria-label="Game {i + 1} {nameA}"
							bind:value={game.a}
							disabled={readOnly || saving}
							class={inputClass}
						/>
						<input
							type="number"
							inputmode="numeric"
							min="0"
							aria-label="Game {i + 1} {nameB}"
							bind:value={game.b}
							disabled={readOnly || saving}
							class={inputClass}
						/>
					{/each}
				</div>
				<div class="mt-3 flex items-center justify-between text-sm">
					<span class="text-gray-600 dark:text-gray-400 tabular-nums">Games {tally.a}–{tally.b}</span>
					{#if !readOnly}
						<div class="flex gap-2">
							{#if games.length > 1}
								<button
									type="button"
									onclick={removeGame}
									aria-label="Remove a game"
									class="flex items-center gap-1 px-2 py-1 rounded-md text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-slate-700"
								>
									<Minus size={14} /> Game
								</button>
							{/if}
							{#if games.length < bestOf}
								<button
									type="button"
									onclick={addGame}
									aria-label="Add a game"
									class="flex items-center gap-1 px-2 py-1 rounded-md text-emerald-700 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-900/30"
								>
									<Plus size={14} /> Game
								</button>
							{/if}
						</div>
					{/if}
				</div>
			{:else if mode === 'games'}
				<p class="text-sm text-gray-600 dark:text-gray-400 mb-3">
					Games won (first to {gamesToWin(bestOf)})
				</p>
				<div class="grid grid-cols-2 gap-3">
					<label class="space-y-1 text-sm font-medium text-gray-700 dark:text-gray-300">
						<span class="block truncate">{nameA}</span>
						<input type="number" inputmode="numeric" min="0" bind:value={gamesA} disabled={readOnly || saving} class={inputClass} />
					</label>
					<label class="space-y-1 text-sm font-medium text-gray-700 dark:text-gray-300">
						<span class="block truncate">{nameB}</span>
						<input type="number" inputmode="numeric" min="0" bind:value={gamesB} disabled={readOnly || saving} class={inputClass} />
					</label>
				</div>
			{:else}
				<p class="text-sm text-gray-600 dark:text-gray-400 mb-3">Who won?</p>
				<div class="grid grid-cols-2 gap-3" role="radiogroup" aria-label="Winner">
					{#each [[match.player_a_id, nameA], [match.player_b_id, nameB]] as [id, name] (id)}
						<button
							type="button"
							role="radio"
							aria-checked={winnerId === id}
							disabled={readOnly || saving}
							onclick={() => (winnerId = id)}
							class="px-3 py-3 rounded-lg border text-sm font-medium truncate transition-colors {winnerId === id
								? 'border-emerald-600 bg-emerald-50 text-emerald-800 dark:border-emerald-400 dark:bg-emerald-900/30 dark:text-emerald-200'
								: 'border-gray-200 text-gray-700 hover:bg-gray-50 dark:border-slate-600 dark:text-gray-300 dark:hover:bg-slate-700'}"
						>
							{name}
						</button>
					{/each}
				</div>
			{/if}

			{#if readOnly && match.lock_reason}
				<p class="mt-4 text-sm text-gray-600 dark:text-gray-400">{match.lock_reason}.</p>
			{/if}

			{#if error}
				<div class="mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900/30 rounded-lg" role="alert">
					<p class="text-sm text-red-700 dark:text-red-400">{error}</p>
				</div>
			{/if}

			<div class="mt-6 flex flex-wrap items-center justify-end gap-2">
				{#if match.status === 'completed' && !readOnly}
					<button
						type="button"
						onclick={onClear}
						disabled={saving}
						class="mr-auto px-3 py-2 text-sm text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20 rounded-lg disabled:opacity-50"
					>
						Clear result
					</button>
				{/if}
				<button
					type="button"
					onclick={close}
					disabled={saving}
					class="px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-slate-700 rounded-lg disabled:opacity-50"
				>
					{readOnly ? 'Close' : 'Cancel'}
				</button>
				{#if !readOnly}
					<button
						type="submit"
						disabled={saving || (mode === 'winner' && !winnerId)}
						class="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
					>
						{#if saving}<Loader2 size={16} class="animate-spin" />{/if}
						Save result
					</button>
				{/if}
			</div>
		</form>
	</div>
</div>
