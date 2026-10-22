<!-- Teams and players for a team match card, for creating it or correcting the details -->
<script lang="ts">
	import { Loader2 } from 'lucide-svelte';
	import type { TeamMatchDetails } from '$lib/types/teamMatch';
	import { AWAY_LABELS, HOME_LABELS } from '$lib/types/teamMatch';

	let {
		initial,
		submitLabel,
		busy = false,
		error = null,
		onSubmit,
		onCancel
	}: {
		initial: TeamMatchDetails;
		submitLabel: string;
		busy?: boolean;
		error?: string | null;
		onSubmit: (body: TeamMatchDetails) => void;
		onCancel?: () => void;
	} = $props();

	// The form edits its own copy; the initial values are only a starting point
	const start = $state.snapshot(initial);
	let title = $state(start.title ?? '');
	let matchDate = $state(start.match_date ?? '');
	let homeTeam = $state(start.home_team);
	let awayTeam = $state(start.away_team);
	let homePlayers = $state([...start.home_players]);
	let awayPlayers = $state([...start.away_players]);

	function submit(e: SubmitEvent) {
		e.preventDefault();
		onSubmit({
			title: title.trim() || null,
			match_date: matchDate || null,
			home_team: homeTeam,
			away_team: awayTeam,
			home_players: homePlayers,
			away_players: awayPlayers
		});
	}

	const inputClass =
		'w-full px-4 py-3 rounded-lg bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-600 focus:ring-2 focus:ring-emerald-500 outline-none text-gray-900 dark:text-white transition-all disabled:opacity-50';
	const labelClass = 'block text-sm font-medium text-gray-700 dark:text-gray-300';
</script>

{#snippet team(side: 'home' | 'away', heading: string, labels: readonly string[], players: string[])}
	<fieldset class="space-y-3" disabled={busy}>
		<legend class="text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1">{heading}</legend>
		<div class="space-y-2">
			<label for="{side}-team" class={labelClass}>Team name</label>
			{#if side === 'home'}
				<input id="home-team" type="text" bind:value={homeTeam} maxlength="60" required class={inputClass} />
			{:else}
				<input id="away-team" type="text" bind:value={awayTeam} maxlength="60" required class={inputClass} />
			{/if}
		</div>
		{#each labels as label, i (label)}
			<div class="flex items-center gap-3">
				<label
					for="{side}-player-{label}"
					class="w-10 h-10 flex-shrink-0 flex items-center justify-center rounded-lg bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 font-bold"
					title="Player {label}"
				>
					{label}
				</label>
				<input
					id="{side}-player-{label}"
					type="text"
					bind:value={players[i]}
					aria-label="{heading} player {label}"
					placeholder="Player {label}"
					maxlength="60"
					required
					class={inputClass}
				/>
			</div>
		{/each}
	</fieldset>
{/snippet}

<form onsubmit={submit} class="space-y-6">
	<div class="grid grid-cols-1 sm:grid-cols-[1fr_12rem] gap-4">
		<div class="space-y-2">
			<label for="match-title" class={labelClass}>Title <span class="font-normal text-gray-400">(optional)</span></label>
			<input
				id="match-title"
				type="text"
				bind:value={title}
				placeholder="Division 3"
				maxlength="100"
				disabled={busy}
				class={inputClass}
			/>
		</div>
		<div class="space-y-2">
			<label for="match-date" class={labelClass}>Date <span class="font-normal text-gray-400">(optional)</span></label>
			<input id="match-date" type="date" bind:value={matchDate} disabled={busy} class={inputClass} />
		</div>
	</div>

	<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
		{@render team('home', 'Home', HOME_LABELS, homePlayers)}
		{@render team('away', 'Away', AWAY_LABELS, awayPlayers)}
	</div>

	<p class="text-sm text-gray-600 dark:text-gray-400">
		Players are listed as on the match card: A, B, C play X, Y, Z in 9 singles, and rubber 7 is the doubles.
	</p>

	{#if error}
		<div class="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900/30 rounded-lg" role="alert">
			<p class="text-sm text-red-700 dark:text-red-400">{error}</p>
		</div>
	{/if}

	<div class="flex flex-col-reverse sm:flex-row gap-3 sm:justify-end">
		{#if onCancel}
			<button
				type="button"
				onclick={onCancel}
				disabled={busy}
				class="px-6 py-3 text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-slate-700 font-medium rounded-xl disabled:opacity-50"
			>
				Cancel
			</button>
		{/if}
		<button
			type="submit"
			disabled={busy}
			class="flex items-center justify-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-lg shadow-emerald-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
		>
			{#if busy}<Loader2 size={20} class="animate-spin" />{/if}
			{submitLabel}
		</button>
	</div>
</form>
