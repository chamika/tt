<!-- A tournament: draw, groups, bracket and results -->
<script lang="ts">
	import { page } from '$app/stores';
	import { ArrowLeft, Crown, Link, Loader2, Pencil, Play, RefreshCw, Shuffle } from 'lucide-svelte';
	import Notification from '$lib/components/availability/Notification.svelte';
	import BracketView from '$lib/components/tournament/BracketView.svelte';
	import GroupTable from '$lib/components/tournament/GroupTable.svelte';
	import MatchCard from '$lib/components/tournament/MatchCard.svelte';
	import ResultDialog from '$lib/components/tournament/ResultDialog.svelte';
	import TournamentForm from '$lib/components/tournament/TournamentForm.svelte';
	import {
		clearResult,
		getTournament,
		orderGroup,
		recordResult,
		startTournament,
		updateTournament
	} from '$lib/api/tournament';
	import type { CreateTournamentRequest, Match, ResultInput, TournamentView } from '$lib/types/tournament';
	import { matchLists } from '$lib/tournament/bracketLayout';
	import { FORMAT_LABELS, SCORE_MODE_LABELS, SEEDING_LABELS, STATUS_LABELS } from '$lib/tournament/labels';
	import { rowsFromPlayers } from '$lib/tournament/players';

	const tournamentId = $page.params.id ?? '';

	type Tab = 'draw' | 'groups' | 'bracket' | 'matches';

	let view = $state<TournamentView | null>(null);
	let loading = $state(true);
	let notFound = $state(false);
	let tab = $state<Tab | null>(null);

	let editing = $state(false);
	let confirmingStart = $state(false);
	let busy = $state(false);
	let formError = $state<string | null>(null);

	let openMatch = $state<Match | null>(null);
	let savingResult = $state(false);
	let resultError = $state<string | null>(null);
	let orderingGroup = $state<number | null>(null);

	let error = $state<string | null>(null);
	let successMessage = $state<string | null>(null);

	const tournament = $derived(view?.tournament ?? null);
	const isDraft = $derived(tournament?.status === 'draft');
	const playersById = $derived(new Map((view?.players ?? []).map((p) => [p.id, p])));
	const champion = $derived(view?.champion_id ? playersById.get(view.champion_id) : undefined);
	const lists = $derived(view ? matchLists(view) : null);
	const tabs = $derived<{ id: Tab; label: string }[]>([
		{ id: 'draw', label: 'Draw' },
		...(tournament?.format === 'groups' ? [{ id: 'groups' as Tab, label: 'Groups' }] : []),
		{ id: 'bracket', label: 'Bracket' },
		{ id: 'matches', label: 'Matches' }
	]);
	// Until someone picks a tab: the draw while it's a draft, the bracket once it's won, otherwise matches
	const currentTab = $derived<Tab>(
		tab ?? (isDraft ? 'draw' : tournament?.status === 'completed' ? 'bracket' : 'matches')
	);

	$effect(() => {
		load();
		// Pick up results entered on other phones when this one comes back to the page
		const onVisible = () => document.visibilityState === 'visible' && view && load(true);
		document.addEventListener('visibilitychange', onVisible);
		return () => document.removeEventListener('visibilitychange', onVisible);
	});

	async function load(quiet = false) {
		if (!quiet) loading = true;
		try {
			view = await getTournament(tournamentId);
			notFound = false;
		} catch (err) {
			const message = err instanceof Error ? err.message : 'Failed to load tournament';
			if (!view) notFound = message === 'Tournament not found';
			if (!notFound) showError(message);
		} finally {
			loading = false;
		}
	}

	function showError(message: string) {
		error = message;
		setTimeout(() => (error = null), 5000);
	}

	function showSuccess(message: string) {
		successMessage = message;
		setTimeout(() => (successMessage = null), 3000);
	}

	function requestBody(): CreateTournamentRequest | null {
		if (!view) return null;
		const t = view.tournament;
		return {
			name: t.name,
			format: t.format,
			seeding_mode: t.seeding_mode,
			score_mode: t.score_mode,
			best_of: t.best_of,
			group_count: t.group_count,
			advance_per_group: t.advance_per_group,
			players: view.players.map((p) => ({ name: p.name, ranking: p.ranking, handicap: p.handicap }))
		};
	}

	async function saveDraft(body: CreateTournamentRequest) {
		busy = true;
		formError = null;
		try {
			view = await updateTournament(tournamentId, body);
			editing = false;
			showSuccess('Draw updated');
		} catch (err) {
			formError = err instanceof Error ? err.message : 'Failed to update the draw';
		} finally {
			busy = false;
		}
	}

	async function redraw() {
		const body = requestBody();
		if (!body) return;
		busy = true;
		try {
			view = await updateTournament(tournamentId, body);
			showSuccess('Draw made again');
		} catch (err) {
			showError(err instanceof Error ? err.message : 'Failed to re-draw');
		} finally {
			busy = false;
		}
	}

	async function start() {
		busy = true;
		try {
			view = await startTournament(tournamentId);
			confirmingStart = false;
			tab = 'matches';
			showSuccess('Tournament started. Share the link so everyone can follow and enter results');
		} catch (err) {
			showError(err instanceof Error ? err.message : 'Failed to start the tournament');
		} finally {
			busy = false;
		}
	}

	function openResult(match: Match) {
		resultError = null;
		openMatch = match;
	}

	async function saveResult(result: ResultInput) {
		if (!openMatch) return;
		savingResult = true;
		resultError = null;
		try {
			view = await recordResult(tournamentId, openMatch.id, result);
			showSuccess(`${openMatch.label} result saved`);
			openMatch = null;
		} catch (err) {
			resultError = err instanceof Error ? err.message : 'Failed to save the result';
		} finally {
			savingResult = false;
		}
	}

	async function removeResult() {
		if (!openMatch) return;
		savingResult = true;
		resultError = null;
		try {
			view = await clearResult(tournamentId, openMatch.id);
			showSuccess(`${openMatch.label} result cleared`);
			openMatch = null;
		} catch (err) {
			resultError = err instanceof Error ? err.message : 'Failed to clear the result';
		} finally {
			savingResult = false;
		}
	}

	async function saveGroupOrder(groupIndex: number, playerIds: string[]) {
		orderingGroup = groupIndex;
		try {
			view = await orderGroup(tournamentId, groupIndex, playerIds);
			showSuccess('Group order saved');
		} catch (err) {
			showError(err instanceof Error ? err.message : 'Failed to save the order');
		} finally {
			orderingGroup = null;
		}
	}

	async function copyLink() {
		try {
			await navigator.clipboard.writeText(window.location.href);
			showSuccess('Link copied');
		} catch {
			showError('Copy the link from the address bar instead');
		}
	}

	const statusStyles = {
		draft: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
		in_progress: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300',
		completed: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300'
	};
</script>

<div class="animate-fadeIn">
	<a
		href="/tournament"
		class="flex items-center text-sm text-gray-500 hover:text-emerald-600 dark:text-gray-400 dark:hover:text-emerald-400 mb-4 transition-colors"
	>
		<ArrowLeft size={16} class="mr-2" />
		Back to Tournaments
	</a>

	{#if loading && !view}
		<div class="animate-pulse">
			<div class="h-10 bg-gray-200 dark:bg-slate-700 rounded w-64 mb-3"></div>
			<div class="h-6 bg-gray-200 dark:bg-slate-700 rounded w-48"></div>
		</div>
	{:else if notFound || !view || !tournament}
		<div class="max-w-md mx-auto text-center py-16" data-testid="not-found">
			<h1 class="text-2xl font-bold text-gray-900 dark:text-white mb-2">Tournament not found</h1>
			<p class="text-gray-600 dark:text-gray-400 mb-6">Check the link, or ask the organiser to send it again.</p>
			<a href="/tournament" class="text-emerald-700 dark:text-emerald-400 font-medium hover:underline">Go to Tournaments</a>
		</div>
	{:else}
		<!-- Header -->
		<div class="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
			<div class="min-w-0">
				<div class="flex items-center gap-3 flex-wrap">
					<h1 class="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-gray-900 dark:text-white break-words">
						{tournament.name}
					</h1>
					<span class="px-2.5 py-1 text-xs font-semibold rounded-full {statusStyles[tournament.status]}" data-testid="status">
						{STATUS_LABELS[tournament.status]}
					</span>
				</div>
				<p class="mt-2 text-sm text-gray-600 dark:text-gray-400">
					{FORMAT_LABELS[tournament.format]} · {SEEDING_LABELS[tournament.seeding_mode]} seeding ·
					{SCORE_MODE_LABELS[tournament.score_mode]} · Best of {tournament.best_of} · {view.players.length} players
				</p>
			</div>
			<div class="flex gap-2 flex-shrink-0">
				<button
					onclick={copyLink}
					class="flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg bg-gray-200 hover:bg-gray-300 text-gray-800 dark:bg-slate-700 dark:hover:bg-slate-600 dark:text-gray-100"
				>
					<Link size={16} /> Copy link
				</button>
				<button
					onclick={() => load(true)}
					aria-label="Refresh"
					class="p-2 rounded-lg bg-gray-200 hover:bg-gray-300 text-gray-800 dark:bg-slate-700 dark:hover:bg-slate-600 dark:text-gray-100"
				>
					<RefreshCw size={16} />
				</button>
			</div>
		</div>

		{#if champion}
			<div class="mb-6 p-4 sm:p-5 rounded-xl bg-gradient-to-r from-amber-100 to-yellow-50 border border-amber-200 dark:from-amber-950 dark:to-slate-900 dark:border-amber-800 flex items-center gap-3" data-testid="champion">
				<Crown size={28} class="text-amber-600 dark:text-amber-400 flex-shrink-0" />
				<div>
					<p class="text-xs font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-400">Champion</p>
					<p class="text-xl font-bold text-gray-900 dark:text-white">{champion.name}</p>
				</div>
			</div>
		{/if}

		<!-- Tabs -->
		<div class="mb-6 border-b border-gray-200 dark:border-slate-700">
			<nav class="flex gap-4 sm:gap-8 overflow-x-auto" aria-label="Tabs">
				{#each tabs as { id, label } (id)}
					<button
						onclick={() => (tab = id)}
						aria-current={currentTab === id ? 'page' : undefined}
						class="py-3 px-1 border-b-2 font-medium text-sm whitespace-nowrap transition-colors {currentTab === id
							? 'border-emerald-600 text-emerald-600 dark:border-emerald-400 dark:text-emerald-400'
							: 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'}"
					>
						{label}
					</button>
				{/each}
			</nav>
		</div>

		{#if currentTab === 'draw'}
			{#if isDraft}
				<div class="mb-6 p-4 rounded-xl bg-amber-50 border border-amber-200 dark:bg-amber-950 dark:border-amber-800">
					<p class="text-sm text-amber-900 dark:text-amber-100">
						This draw is a draft. Check the seeds{tournament.format === 'groups' ? ', groups' : ''} and bracket, then start the
						tournament. Once it starts the draw is locked and results can be entered.
					</p>
					{#if !editing}
						<div class="mt-3 flex flex-wrap gap-2">
							{#if confirmingStart}
								<span class="self-center text-sm font-medium text-amber-900 dark:text-amber-100">Lock the draw and start?</span>
								<button
									onclick={start}
									disabled={busy}
									class="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg disabled:opacity-50"
								>
									{#if busy}<Loader2 size={16} class="animate-spin" />{:else}<Play size={16} />{/if}
									Yes, start
								</button>
								<button
									onclick={() => (confirmingStart = false)}
									disabled={busy}
									class="px-4 py-2 text-sm text-gray-700 hover:bg-amber-100 dark:text-gray-300 dark:hover:bg-amber-900/40 rounded-lg"
								>
									Cancel
								</button>
							{:else}
								<button
									onclick={() => (confirmingStart = true)}
									disabled={busy}
									class="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg disabled:opacity-50"
								>
									<Play size={16} /> Start tournament
								</button>
								<button
									onclick={() => ((editing = true), (formError = null))}
									disabled={busy}
									class="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-white hover:bg-gray-50 text-gray-800 border border-gray-200 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-gray-100 dark:border-slate-600 rounded-lg disabled:opacity-50"
								>
									<Pencil size={16} /> Edit
								</button>
								<button
									onclick={redraw}
									disabled={busy}
									title="Draws equal and blank {tournament.seeding_mode === 'ranking' ? 'rankings' : 'handicaps'} again"
									class="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-white hover:bg-gray-50 text-gray-800 border border-gray-200 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-gray-100 dark:border-slate-600 rounded-lg disabled:opacity-50"
								>
									{#if busy}<Loader2 size={16} class="animate-spin" />{:else}<Shuffle size={16} />{/if}
									Re-draw
								</button>
							{/if}
						</div>
					{/if}
				</div>
			{/if}

			{#if editing}
				<div class="max-w-2xl bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 p-6">
					<TournamentForm
						initialSettings={tournament}
						initialRows={rowsFromPlayers(view.players, tournament.seeding_mode)}
						submitLabel="Save and re-draw"
						{busy}
						error={formError}
						onSubmit={saveDraft}
						onCancel={() => (editing = false)}
					/>
				</div>
			{:else}
				<div class="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 overflow-hidden max-w-2xl">
					<div class="overflow-x-auto">
						<table class="w-full text-sm" data-testid="seed-table">
							<thead class="text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-slate-800/50">
								<tr class="text-left">
									<th class="pl-4 pr-2 py-2 font-medium w-14">Seed</th>
									<th class="px-2 py-2 font-medium">Player</th>
									<th class="px-2 py-2 font-medium text-center">
										{tournament.seeding_mode === 'ranking' ? 'Ranking' : 'Handicap'}
									</th>
									{#if tournament.format === 'groups'}
										<th class="px-2 pr-4 py-2 font-medium text-center">Group</th>
									{/if}
								</tr>
							</thead>
							<tbody>
								{#each view.players as player (player.id)}
									{@const value = tournament.seeding_mode === 'ranking' ? player.ranking : player.handicap}
									<tr class="border-t border-gray-100 dark:border-slate-700">
										<td class="pl-4 pr-2 py-2 tabular-nums text-gray-500 dark:text-gray-400">{player.seed}</td>
										<td class="px-2 py-2 text-gray-900 dark:text-white max-w-[14rem] truncate">{player.name}</td>
										<td class="px-2 py-2 text-center tabular-nums text-gray-700 dark:text-gray-300">
											{value === null ? '–' : value > 0 && tournament.seeding_mode === 'handicap' ? `+${value}` : value}
										</td>
										{#if tournament.format === 'groups'}
											<td class="px-2 pr-4 py-2 text-center text-gray-700 dark:text-gray-300">
												{player.group_index === null ? '' : String.fromCharCode(65 + player.group_index)}
											</td>
										{/if}
									</tr>
								{/each}
							</tbody>
						</table>
					</div>
				</div>
			{/if}
		{:else if currentTab === 'groups'}
			<div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
				{#each view.groups as group (group.index)}
					<div class="space-y-3">
						<GroupTable
							{group}
							{view}
							saving={orderingGroup === group.index}
							onOrder={(ids) => saveGroupOrder(group.index, ids)}
						/>
						<details class="group">
							<summary class="cursor-pointer text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-emerald-700 dark:hover:text-emerald-400">
								{group.name} matches
							</summary>
							<div class="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
								{#each view.matches.filter((m) => m.stage === 'group' && m.group_index === group.index) as match (match.id)}
									<MatchCard {match} {view} compact onOpen={openResult} />
								{/each}
							</div>
						</details>
					</div>
				{/each}
			</div>
		{:else if currentTab === 'bracket'}
			<BracketView {view} onOpen={openResult} />
		{:else if lists}
			{#if isDraft}
				<p class="mb-6 text-sm text-gray-600 dark:text-gray-400">Results can be entered once the tournament starts.</p>
			{/if}
			{#each [{ title: 'Up next', matches: lists.ready, id: 'ready' }, { title: 'Results', matches: lists.completed, id: 'completed' }, { title: 'Waiting for players', matches: lists.pending, id: 'pending' }] as section (section.id)}
				{#if section.matches.length > 0}
					<section class="mb-8" data-testid="matches-{section.id}">
						<h2 class="text-lg sm:text-xl font-bold text-gray-900 dark:text-white mb-4">
							{section.title} <span class="text-gray-400 font-normal">({section.matches.length})</span>
						</h2>
						<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
							{#each section.matches as match (match.id)}
								<MatchCard {match} {view} onOpen={openResult} />
							{/each}
						</div>
					</section>
				{/if}
			{/each}
		{/if}
	{/if}
</div>

{#if openMatch && view}
	{#key openMatch.id}
		<ResultDialog
			match={openMatch}
			{view}
			saving={savingResult}
			error={resultError}
			onSave={saveResult}
			onClear={removeResult}
			onCancel={() => (openMatch = null)}
		/>
	{/key}
{/if}

<!-- Notifications - Fixed position at top right -->
<div class="fixed top-24 right-0 sm:right-4 z-[60] max-w-md w-full px-4 pointer-events-none">
	<div class="pointer-events-auto">
		{#if error}
			<div class="mb-3">
				<Notification type="error" message={error} onDismiss={() => (error = null)} />
			</div>
		{/if}
		{#if successMessage}
			<div class="mb-3">
				<Notification type="success" message={successMessage} onDismiss={() => (successMessage = null)} />
			</div>
		{/if}
	</div>
</div>
