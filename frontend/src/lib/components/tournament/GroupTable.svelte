<!-- A group's standings, with the prompt to order players the tie-breaks can't separate -->
<script lang="ts">
	import { AlertTriangle, ChevronDown, ChevronUp, Loader2 } from 'lucide-svelte';
	import type { Group, TournamentView } from '$lib/types/tournament';

	let {
		group,
		view,
		saving = false,
		onOrder
	}: {
		group: Group;
		view: TournamentView;
		saving?: boolean;
		onOrder: (playerIds: string[]) => void;
	} = $props();

	const playersById = $derived(new Map(view.players.map((p) => [p.id, p])));
	const mode = $derived(view.tournament.score_mode);
	const advance = $derived(view.tournament.advance_per_group ?? 0);
	const standings = $derived(group.standings);
	const played = $derived(
		view.matches.filter((m) => m.stage === 'group' && m.group_index === group.index && m.winner_id).length
	);
	const total = $derived(view.matches.filter((m) => m.stage === 'group' && m.group_index === group.index).length);

	// The organiser's working order for an unresolved tie, reset whenever the tie changes
	let order = $derived([...(standings.unresolved_tie ?? [])]);

	function move(index: number, by: number) {
		const target = index + by;
		if (target < 0 || target >= order.length) return;
		const next = [...order];
		[next[index], next[target]] = [next[target], next[index]];
		order = next;
	}

	function nameOf(id: string): string {
		return playersById.get(id)?.name ?? 'Unknown';
	}

	function names(ids: string[]): string {
		const list = ids.map(nameOf);
		return list.length <= 2 ? list.join(' and ') : `${list.slice(0, -1).join(', ')} and ${list[list.length - 1]}`;
	}
</script>

<section
	class="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm overflow-hidden"
	data-testid="group-table"
	data-group={group.name}
>
	<div class="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-slate-700">
		<h3 class="font-bold text-gray-900 dark:text-white">{group.name}</h3>
		<span class="text-xs text-gray-500 dark:text-gray-400">
			{standings.complete ? 'Complete' : `${played} of ${total} played`}
		</span>
	</div>

	<div class="overflow-x-auto">
		<table class="w-full text-sm">
			<thead class="text-xs text-gray-500 dark:text-gray-400">
				<tr class="text-left">
					<th class="pl-4 pr-2 py-2 font-medium w-8">#</th>
					<th class="px-2 py-2 font-medium">Player</th>
					<th class="px-2 py-2 font-medium text-center" title="Played">P</th>
					<th class="px-2 py-2 font-medium text-center" title="Won">W</th>
					<th class="px-2 py-2 font-medium text-center" title="Lost">L</th>
					<th class="px-2 py-2 font-medium text-center" title="Match points: 2 for a win, 1 for a loss">Pts</th>
					{#if mode !== 'winner'}
						<th class="px-2 py-2 font-medium text-center">Games</th>
					{/if}
					{#if mode === 'points'}
						<th class="px-2 pr-4 py-2 font-medium text-center">Points</th>
					{/if}
				</tr>
			</thead>
			<tbody>
				{#each standings.rows as row (row.player_id)}
					{@const qualifies = standings.complete && !row.tied && row.position <= advance}
					<tr
						class="border-t border-gray-100 dark:border-slate-700 {qualifies
							? 'bg-emerald-50/60 dark:bg-emerald-900/10'
							: ''}"
					>
						<td class="pl-4 pr-2 py-2 tabular-nums text-gray-500 dark:text-gray-400">
							{row.position}{row.tied ? '=' : ''}
						</td>
						<td class="px-2 py-2 max-w-[10rem]">
							<div class="flex items-center gap-1.5 min-w-0">
								<span class="truncate text-gray-900 dark:text-white {qualifies ? 'font-semibold' : ''}">
									{nameOf(row.player_id)}
								</span>
								{#if qualifies}
									<span class="text-[10px] font-bold text-emerald-700 dark:text-emerald-400" title="Qualified">Q</span>
								{/if}
							</div>
						</td>
						<td class="px-2 py-2 text-center tabular-nums">{row.played}</td>
						<td class="px-2 py-2 text-center tabular-nums">{row.won}</td>
						<td class="px-2 py-2 text-center tabular-nums">{row.lost}</td>
						<td class="px-2 py-2 text-center tabular-nums font-semibold">{row.match_points}</td>
						{#if mode !== 'winner'}
							<td class="px-2 py-2 text-center tabular-nums whitespace-nowrap">{row.games_won}–{row.games_lost}</td>
						{/if}
						{#if mode === 'points'}
							<td class="px-2 pr-4 py-2 text-center tabular-nums whitespace-nowrap">{row.points_won}–{row.points_lost}</td>
						{/if}
					</tr>
				{/each}
			</tbody>
		</table>
	</div>

	{#if standings.unresolved_tie && view.tournament.status !== 'draft'}
		<div class="m-4 p-4 rounded-lg bg-amber-50 border border-amber-200 dark:bg-amber-950 dark:border-amber-800" data-testid="tie-prompt">
			<p class="flex items-start gap-2 text-sm text-amber-900 dark:text-amber-100">
				<AlertTriangle size={16} class="flex-shrink-0 mt-0.5" />
				<span>
					{names(standings.unresolved_tie)} can't be separated by the tie-break rules. Put them in order to send
					{group.name}'s qualifiers through.
				</span>
			</p>
			<ol class="mt-3 space-y-2">
				{#each order as id, i (id)}
					<li class="flex items-center gap-2 bg-white dark:bg-slate-800 rounded-lg px-3 py-2 border border-amber-200 dark:border-amber-900">
						<span class="w-5 text-sm tabular-nums text-gray-500">{i + 1}</span>
						<span class="flex-1 truncate text-sm text-gray-900 dark:text-white">{nameOf(id)}</span>
						<button
							type="button"
							onclick={() => move(i, -1)}
							disabled={i === 0 || saving}
							aria-label="Move {nameOf(id)} up"
							class="p-1 rounded hover:bg-gray-100 dark:hover:bg-slate-700 disabled:opacity-30"
						>
							<ChevronUp size={16} />
						</button>
						<button
							type="button"
							onclick={() => move(i, 1)}
							disabled={i === order.length - 1 || saving}
							aria-label="Move {nameOf(id)} down"
							class="p-1 rounded hover:bg-gray-100 dark:hover:bg-slate-700 disabled:opacity-30"
						>
							<ChevronDown size={16} />
						</button>
					</li>
				{/each}
			</ol>
			<button
				type="button"
				onclick={() => onOrder(order)}
				disabled={saving}
				class="mt-3 flex items-center gap-2 px-4 py-2 text-sm font-medium bg-amber-600 hover:bg-amber-700 text-white rounded-lg disabled:opacity-50"
			>
				{#if saving}<Loader2 size={16} class="animate-spin" />{/if}
				Save order
			</button>
		</div>
	{/if}
</section>
