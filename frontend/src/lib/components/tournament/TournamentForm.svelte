<!-- Tournament settings and players, for creating a tournament or editing a draft -->
<script lang="ts">
	import { Loader2 } from 'lucide-svelte';
	import type {
		CreateTournamentRequest,
		ScoreMode,
		SeedingMode,
		TournamentFormat,
		TournamentSettings
	} from '$lib/types/tournament';
	import { BEST_OF_OPTIONS, MAX_GROUPS } from '$lib/types/tournament';
	import { FORMAT_LABELS, SCORE_MODE_LABELS, SEEDING_LABELS } from '$lib/tournament/labels';
	import { groupSizes, knockoutSummary } from '$lib/tournament/bracketLayout';
	import { buildPlayerInputs, type PlayerRow } from '$lib/tournament/players';
	import PlayerListEditor from './PlayerListEditor.svelte';

	let {
		initialSettings,
		initialRows,
		submitLabel,
		busy = false,
		error = null,
		onSubmit,
		onCancel
	}: {
		initialSettings: TournamentSettings;
		initialRows: PlayerRow[];
		submitLabel: string;
		busy?: boolean;
		error?: string | null;
		onSubmit: (body: CreateTournamentRequest) => void;
		onCancel?: () => void;
	} = $props();

	// The form edits its own copy; the initial values are only a starting point
	const start = $state.snapshot({ settings: initialSettings, rows: initialRows });
	let name = $state(start.settings.name);
	let format = $state<TournamentFormat>(start.settings.format);
	let seedingMode = $state<SeedingMode>(start.settings.seeding_mode);
	let scoreMode = $state<ScoreMode>(start.settings.score_mode);
	let bestOf = $state(start.settings.best_of);
	let groupCount = $state<number>(start.settings.group_count ?? 2);
	let advancePerGroup = $state<number>(start.settings.advance_per_group ?? 2);
	let rows = $state<PlayerRow[]>(start.rows);
	let formError = $state<string | null>(null);

	const playerCount = $derived(rows.filter((r) => r.name.trim()).length);
	const summary = $derived(
		knockoutSummary(format, playerCount, format === 'groups' ? groupCount : null, format === 'groups' ? advancePerGroup : null)
	);
	const sizes = $derived(
		format === 'groups' && groupCount >= 1 && playerCount >= groupCount ? groupSizes(playerCount, groupCount) : []
	);

	const formatHelp: Record<TournamentFormat, string> = {
		knockout: 'Single elimination from the first match',
		groups: 'Round-robin groups, then the top players play a knockout'
	};
	const seedingHelp: Record<SeedingMode, string> = {
		ranking: 'Seeded by ranking; games played off scratch',
		handicap: 'Seeded by handicap; every match shows starting scores'
	};
	const scoreHelp: Record<ScoreMode, string> = {
		points: 'Every game, e.g. 11-7 9-11 11-5. Best for tie-breaks',
		games: 'Games won, e.g. 3-1',
		winner: 'Just who won. Ties may need ordering by hand'
	};

	function submit(e: SubmitEvent) {
		e.preventDefault();
		const built = buildPlayerInputs(rows, seedingMode);
		if (built.error !== null) {
			formError = built.error;
			return;
		}
		formError = null;
		onSubmit({
			name,
			format,
			seeding_mode: seedingMode,
			score_mode: scoreMode,
			best_of: bestOf,
			group_count: format === 'groups' ? groupCount : null,
			advance_per_group: format === 'groups' ? advancePerGroup : null,
			players: built.players
		});
	}

	const inputClass =
		'w-full px-4 py-3 rounded-lg bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-600 focus:ring-2 focus:ring-emerald-500 outline-none text-gray-900 dark:text-white transition-all disabled:opacity-50';

	function optionClass(selected: boolean): string {
		return `block w-full text-left p-3 rounded-lg border transition-colors cursor-pointer ${
			selected
				? 'border-emerald-600 bg-emerald-50 dark:border-emerald-400 dark:bg-emerald-900/20'
				: 'border-gray-200 hover:bg-gray-50 dark:border-slate-600 dark:hover:bg-slate-700/50'
		}`;
	}
</script>

{#snippet choice(
	legend: string,
	group: string,
	options: string[],
	labels: Record<string, string>,
	help: Record<string, string>,
	selected: string,
	select: (value: string) => void
)}
	<fieldset class="space-y-2" disabled={busy}>
		<legend class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{legend}</legend>
		<div class="grid grid-cols-1 gap-2 {options.length === 3 ? 'sm:grid-cols-3' : 'sm:grid-cols-2'}">
			{#each options as option (option)}
				<label class={optionClass(selected === option)}>
					<input
						type="radio"
						name={group}
						value={option}
						checked={selected === option}
						onchange={() => select(option)}
						class="sr-only"
					/>
					<span class="block text-sm font-semibold text-gray-900 dark:text-white">{labels[option]}</span>
					<span class="block text-xs text-gray-500 dark:text-gray-400 mt-0.5">{help[option]}</span>
				</label>
			{/each}
		</div>
	</fieldset>
{/snippet}

<form onsubmit={submit} class="space-y-6">
	<div class="space-y-2">
		<label for="tournament-name" class="block text-sm font-medium text-gray-700 dark:text-gray-300">Name</label>
		<input
			id="tournament-name"
			type="text"
			bind:value={name}
			placeholder="Club Championship 2026"
			maxlength="100"
			required
			disabled={busy}
			class={inputClass}
		/>
	</div>

	{@render choice('Format', 'format', ['knockout', 'groups'], FORMAT_LABELS, formatHelp, format, (v) => (format = v as TournamentFormat))}

	{#if format === 'groups'}
		<div class="grid grid-cols-2 gap-4">
			<div class="space-y-2">
				<label for="group-count" class="block text-sm font-medium text-gray-700 dark:text-gray-300">Groups</label>
				<input
					id="group-count"
					type="number"
					inputmode="numeric"
					min="1"
					max={MAX_GROUPS}
					bind:value={groupCount}
					disabled={busy}
					class={inputClass}
				/>
			</div>
			<div class="space-y-2">
				<label for="advance" class="block text-sm font-medium text-gray-700 dark:text-gray-300">Qualify from each</label>
				<input
					id="advance"
					type="number"
					inputmode="numeric"
					min="1"
					bind:value={advancePerGroup}
					disabled={busy}
					class={inputClass}
				/>
			</div>
		</div>
	{/if}

	{@render choice(
		'Seeding',
		'seeding',
		['ranking', 'handicap'],
		SEEDING_LABELS,
		seedingHelp,
		seedingMode,
		(v) => (seedingMode = v as SeedingMode)
	)}

	{@render choice(
		'Results to enter',
		'score-mode',
		['points', 'games', 'winner'],
		SCORE_MODE_LABELS,
		scoreHelp,
		scoreMode,
		(v) => (scoreMode = v as ScoreMode)
	)}

	<div class="space-y-2">
		<label for="best-of" class="block text-sm font-medium text-gray-700 dark:text-gray-300">Matches are best of</label>
		<select id="best-of" bind:value={bestOf} disabled={busy} class={inputClass}>
			{#each BEST_OF_OPTIONS as option (option)}
				<option value={option}>{option} game{option === 1 ? '' : 's'}</option>
			{/each}
		</select>
	</div>

	<PlayerListEditor bind:rows mode={seedingMode} disabled={busy} />

	{#if summary || sizes.length > 0}
		<p class="text-sm text-gray-600 dark:text-gray-400" data-testid="draw-summary">
			{#if sizes.length > 0}Groups of {sizes.join(', ')}. {/if}{#if summary}Knockout: {summary}.{/if}
		</p>
	{/if}

	{#if formError || error}
		<div class="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900/30 rounded-lg" role="alert">
			<p class="text-sm text-red-700 dark:text-red-400">{formError ?? error}</p>
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
