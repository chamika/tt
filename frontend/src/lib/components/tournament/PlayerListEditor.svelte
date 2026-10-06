<!-- Players for a tournament: type them in, paste a list, or take the names from an availability team -->
<script lang="ts">
	import { ClipboardPaste, Loader2, Plus, Trash2, Users } from 'lucide-svelte';
	import type { SeedingMode } from '$lib/types/tournament';
	import { MAX_PLAYERS } from '$lib/types/tournament';
	import { parsePlayerList, type PlayerRow } from '$lib/tournament/players';
	import { getTeamData } from '$lib/api/availability';

	let {
		rows = $bindable(),
		mode,
		disabled = false
	}: {
		rows: PlayerRow[];
		mode: SeedingMode;
		disabled?: boolean;
	} = $props();

	let pasteOpen = $state(false);
	let pasteText = $state('');
	let importOpen = $state(false);
	let teamLink = $state('');
	let importing = $state(false);
	let importError = $state<string | null>(null);

	const valueLabel = $derived(mode === 'ranking' ? 'Ranking' : 'Handicap');
	const valueHint = $derived(mode === 'ranking' ? '1 = best, blank = unranked' : 'lower = stronger, e.g. -5');
	const filled = $derived(rows.filter((r) => r.name.trim()).length);

	/** Add rows after the filled ones, dropping empty rows and names already listed */
	function append(newRows: PlayerRow[]) {
		const kept = rows.filter((r) => r.name.trim() || r.value.trim());
		const names = kept.map((r) => r.name.trim().toLowerCase());
		const fresh = newRows.filter((r) => {
			const key = r.name.trim().toLowerCase();
			if (!key || names.includes(key)) return false;
			names.push(key);
			return true;
		});
		rows = [...kept, ...fresh];
	}

	function addRow() {
		rows = [...rows, { name: '', value: '' }];
	}

	function removeRow(index: number) {
		rows = rows.filter((_, i) => i !== index);
	}

	function addPasted() {
		append(parsePlayerList(pasteText));
		pasteText = '';
		pasteOpen = false;
	}

	/** Accepts the tracker link (…/availability/<id>) or the id itself */
	function teamIdFrom(link: string): string | null {
		const match = link.trim().match(/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i);
		return match ? match[1] : null;
	}

	async function importTeam() {
		const teamId = teamIdFrom(teamLink);
		if (!teamId) {
			importError = 'Paste the link to an availability tracker team, e.g. …/availability/1234abcd-…';
			return;
		}
		importing = true;
		importError = null;
		try {
			const data = await getTeamData(teamId);
			append(data.players.map((p) => ({ name: p.name, value: '' })));
			teamLink = '';
			importOpen = false;
		} catch (err) {
			importError = err instanceof Error ? err.message : 'Failed to load the team';
		} finally {
			importing = false;
		}
	}

	const inputClass =
		'w-full px-3 py-2 rounded-lg bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-600 focus:ring-2 focus:ring-emerald-500 outline-none text-gray-900 dark:text-white disabled:opacity-50';
</script>

<div class="space-y-3">
	<div class="flex items-end justify-between gap-2">
		<div>
			<h3 class="text-sm font-medium text-gray-700 dark:text-gray-300">Players ({filled})</h3>
			<p class="text-xs text-gray-500 dark:text-gray-400">{valueLabel}: {valueHint}</p>
		</div>
		<div class="flex gap-1">
			<button
				type="button"
				onclick={() => ((pasteOpen = !pasteOpen), (importOpen = false))}
				{disabled}
				class="flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-md text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-slate-700"
			>
				<ClipboardPaste size={14} /> Paste list
			</button>
			<button
				type="button"
				onclick={() => ((importOpen = !importOpen), (pasteOpen = false))}
				{disabled}
				class="flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-md text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-slate-700"
			>
				<Users size={14} /> From a team
			</button>
		</div>
	</div>

	{#if pasteOpen}
		<div class="p-3 rounded-lg bg-gray-50 dark:bg-slate-900/50 border border-gray-200 dark:border-slate-700 space-y-2">
			<label for="paste-players" class="block text-xs text-gray-600 dark:text-gray-400">
				One player per line. Add a {valueLabel.toLowerCase()} after a comma, e.g. "Alice Anderson, {mode === 'ranking'
					? '1'
					: '-5'}".
			</label>
			<textarea id="paste-players" rows="5" bind:value={pasteText} class={inputClass}></textarea>
			<button
				type="button"
				onclick={addPasted}
				disabled={!pasteText.trim()}
				class="px-3 py-1.5 text-sm font-medium bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg disabled:opacity-50"
			>
				Add players
			</button>
		</div>
	{/if}

	{#if importOpen}
		<div class="p-3 rounded-lg bg-gray-50 dark:bg-slate-900/50 border border-gray-200 dark:border-slate-700 space-y-2">
			<label for="team-link" class="block text-xs text-gray-600 dark:text-gray-400">
				Link to an availability tracker team. Its squad is added by name; add rankings or handicaps after.
			</label>
			<div class="flex gap-2">
				<input id="team-link" type="text" bind:value={teamLink} placeholder="…/availability/…" class={inputClass} />
				<button
					type="button"
					onclick={importTeam}
					disabled={importing || !teamLink.trim()}
					class="flex items-center gap-1 px-3 py-1.5 text-sm font-medium bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg disabled:opacity-50 flex-shrink-0"
				>
					{#if importing}<Loader2 size={14} class="animate-spin" />{/if}
					Add names
				</button>
			</div>
			{#if importError}
				<p class="text-xs text-red-700 dark:text-red-400">{importError}</p>
			{/if}
		</div>
	{/if}

	<ol class="space-y-2">
		{#each rows as row, i (i)}
			<li class="flex items-center gap-2">
				<span class="w-6 text-right text-xs text-gray-400 tabular-nums flex-shrink-0">{i + 1}</span>
				<input
					type="text"
					bind:value={row.name}
					placeholder="Name"
					aria-label="Player {i + 1} name"
					maxlength="60"
					{disabled}
					class="{inputClass} flex-1 min-w-0"
				/>
				<input
					type="text"
					inputmode={mode === 'ranking' ? 'numeric' : 'text'}
					bind:value={row.value}
					placeholder={valueLabel}
					aria-label="Player {i + 1} {valueLabel.toLowerCase()}"
					{disabled}
					class="{inputClass} w-24 sm:w-28 text-center"
				/>
				<button
					type="button"
					onclick={() => removeRow(i)}
					{disabled}
					aria-label="Remove player {i + 1}"
					class="p-2 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 flex-shrink-0"
				>
					<Trash2 size={16} />
				</button>
			</li>
		{/each}
	</ol>

	<button
		type="button"
		onclick={addRow}
		disabled={disabled || rows.length >= MAX_PLAYERS}
		class="flex items-center gap-1 px-3 py-2 text-sm font-medium rounded-lg text-emerald-700 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-900/30 disabled:opacity-50"
	>
		<Plus size={16} /> Add player
	</button>
</div>
