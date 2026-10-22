<!-- A team match card: two teams of three, 10 rubbers, a running score -->
<script lang="ts">
	import { page } from '$app/stores';
	import { ArrowLeft, Link, Pencil, RefreshCw } from 'lucide-svelte';
	import Notification from '$lib/components/availability/Notification.svelte';
	import RubberCard from '$lib/components/teamMatch/RubberCard.svelte';
	import RubberDialog from '$lib/components/teamMatch/RubberDialog.svelte';
	import TeamMatchForm from '$lib/components/teamMatch/TeamMatchForm.svelte';
	import { clearRubber, getTeamMatch, recordRubber, updateTeamMatch } from '$lib/api/teamMatch';
	import type { RubberInput, RubberView, TeamMatchDetails, TeamMatchView } from '$lib/types/teamMatch';
	import { outcomeText, statusText } from '$lib/teamMatch/card';

	const matchId = $page.params.id ?? '';

	let view = $state<TeamMatchView | null>(null);
	let loading = $state(true);
	let notFound = $state(false);

	let editing = $state(false);
	let busy = $state(false);
	let formError = $state<string | null>(null);

	let openRubber = $state<RubberView | null>(null);
	let savingRubber = $state(false);
	let rubberError = $state<string | null>(null);

	let error = $state<string | null>(null);
	let successMessage = $state<string | null>(null);

	const match = $derived(view?.match ?? null);
	const outcome = $derived(view ? outcomeText(view) : null);

	$effect(() => {
		load();
		// Pick up rubbers entered on other phones when this one comes back to the page
		const onVisible = () => document.visibilityState === 'visible' && view && load(true);
		document.addEventListener('visibilitychange', onVisible);
		return () => document.removeEventListener('visibilitychange', onVisible);
	});

	async function load(quiet = false) {
		if (!quiet) loading = true;
		try {
			view = await getTeamMatch(matchId);
			notFound = false;
		} catch (err) {
			const message = err instanceof Error ? err.message : 'Failed to load the match';
			if (!view) notFound = message === 'Team match not found';
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

	async function saveDetails(body: TeamMatchDetails) {
		busy = true;
		formError = null;
		try {
			view = await updateTeamMatch(matchId, body);
			editing = false;
			showSuccess('Details saved');
		} catch (err) {
			formError = err instanceof Error ? err.message : 'Failed to save the details';
		} finally {
			busy = false;
		}
	}

	function open(rubber: RubberView) {
		rubberError = null;
		openRubber = rubber;
	}

	async function saveRubber(input: RubberInput) {
		if (!openRubber) return;
		savingRubber = true;
		rubberError = null;
		try {
			view = await recordRubber(matchId, openRubber.number, input);
			showSuccess(`Rubber ${openRubber.number} saved`);
			openRubber = null;
		} catch (err) {
			rubberError = err instanceof Error ? err.message : 'Failed to save the rubber';
		} finally {
			savingRubber = false;
		}
	}

	async function removeRubber() {
		if (!openRubber) return;
		savingRubber = true;
		rubberError = null;
		try {
			view = await clearRubber(matchId, openRubber.number);
			showSuccess(`Rubber ${openRubber.number} cleared`);
			openRubber = null;
		} catch (err) {
			rubberError = err instanceof Error ? err.message : 'Failed to clear the rubber';
		} finally {
			savingRubber = false;
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

	function formatDate(date: string): string {
		return new Date(`${date}T00:00:00`).toLocaleDateString(undefined, {
			weekday: 'short',
			day: 'numeric',
			month: 'short',
			year: 'numeric'
		});
	}

	const statusStyles = {
		not_started: 'bg-gray-100 text-gray-700 dark:bg-slate-700 dark:text-gray-300',
		in_progress: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300',
		completed: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300'
	};
</script>

<div class="animate-fadeIn max-w-3xl mx-auto">
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
	{:else if notFound || !view || !match}
		<div class="max-w-md mx-auto text-center py-16" data-testid="not-found">
			<h1 class="text-2xl font-bold text-gray-900 dark:text-white mb-2">Match not found</h1>
			<p class="text-gray-600 dark:text-gray-400 mb-6">Check the link, or ask whoever set it up to send it again.</p>
			<a href="/tournament" class="text-emerald-700 dark:text-emerald-400 font-medium hover:underline">Go to Tournaments</a>
		</div>
	{:else}
		<!-- Header -->
		<div class="flex flex-wrap items-center justify-between gap-2 mb-4">
			<div class="flex items-center gap-2 flex-wrap min-w-0 text-sm text-gray-600 dark:text-gray-400">
				{#if match.title}<span class="font-semibold text-gray-900 dark:text-white">{match.title}</span>{/if}
				{#if match.match_date}<span>{formatDate(match.match_date)}</span>{/if}
				<span class="px-2.5 py-1 text-xs font-semibold rounded-full {statusStyles[view.status]}" data-testid="status">
					{statusText(view)}
				</span>
			</div>
			<div class="flex gap-2 flex-shrink-0">
				<button
					onclick={copyLink}
					class="flex items-center gap-2 px-3 py-2.5 text-sm font-medium rounded-lg bg-gray-200 hover:bg-gray-300 text-gray-800 dark:bg-slate-700 dark:hover:bg-slate-600 dark:text-gray-100"
				>
					<Link size={16} /> Copy link
				</button>
				<button
					onclick={() => ((editing = !editing), (formError = null))}
					aria-label="Edit details"
					class="p-2.5 rounded-lg bg-gray-200 hover:bg-gray-300 text-gray-800 dark:bg-slate-700 dark:hover:bg-slate-600 dark:text-gray-100"
				>
					<Pencil size={16} />
				</button>
				<button
					onclick={() => load(true)}
					aria-label="Refresh"
					class="p-2.5 rounded-lg bg-gray-200 hover:bg-gray-300 text-gray-800 dark:bg-slate-700 dark:hover:bg-slate-600 dark:text-gray-100"
				>
					<RefreshCw size={16} />
				</button>
			</div>
		</div>

		<!-- Scoreboard -->
		<div class="bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 shadow-sm p-4 sm:p-6 mb-6">
			<div class="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
				<div class="min-w-0">
					<p class="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Home</p>
					<h1 class="text-base sm:text-2xl font-extrabold text-gray-900 dark:text-white break-words leading-tight">{match.home_team}</h1>
				</div>
				<p class="text-3xl sm:text-5xl font-extrabold tabular-nums text-gray-900 dark:text-white" data-testid="score">
					{view.score.home}<span class="text-gray-300 dark:text-slate-600 mx-1">–</span>{view.score.away}
				</p>
				<div class="min-w-0 text-right">
					<p class="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Away</p>
					<h2 class="text-base sm:text-2xl font-extrabold text-gray-900 dark:text-white break-words leading-tight">{match.away_team}</h2>
				</div>
			</div>
			{#if outcome}
				<p
					class="mt-4 text-center text-base font-bold {view.outcome === 'draw'
						? 'text-amber-700 dark:text-amber-400'
						: 'text-emerald-700 dark:text-emerald-400'}"
					data-testid="outcome"
				>
					{outcome}
				</p>
			{/if}

			<!-- Players and their singles wins, the card's "Won" column -->
			<div class="mt-5 grid grid-cols-2 gap-4 text-sm" data-testid="players">
				{#each [view.home_players, view.away_players] as players, i (i)}
					<ul class="space-y-1.5">
						{#each players as player (player.label)}
							<li class="flex items-center gap-2 min-w-0">
								<span class="w-6 h-6 flex-shrink-0 flex items-center justify-center rounded bg-gray-100 dark:bg-slate-700 text-xs font-bold text-gray-600 dark:text-gray-300">
									{player.label}
								</span>
								<span class="truncate text-gray-800 dark:text-gray-200">{player.name}</span>
								<span class="ml-auto flex-shrink-0 tabular-nums text-xs text-gray-500 dark:text-gray-400" title="Singles won">
									{player.won} won
								</span>
							</li>
						{/each}
					</ul>
				{/each}
			</div>
		</div>

		{#if editing}
			<div class="bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 p-4 sm:p-6 mb-6">
				<TeamMatchForm
					initial={match}
					submitLabel="Save details"
					{busy}
					error={formError}
					onSubmit={saveDetails}
					onCancel={() => (editing = false)}
				/>
			</div>
		{/if}

		<h2 class="text-lg font-bold text-gray-900 dark:text-white mb-3">Rubbers</h2>
		<div class="space-y-2 sm:space-y-3" data-testid="rubbers">
			{#each view.rubbers as rubber (rubber.number)}
				<RubberCard {rubber} {match} onOpen={open} />
			{/each}
		</div>
	{/if}
</div>

{#if openRubber && match}
	{#key openRubber.number}
		<RubberDialog
			rubber={openRubber}
			{match}
			saving={savingRubber}
			error={rubberError}
			onSave={saveRubber}
			onClear={removeRubber}
			onCancel={() => (openRubber = null)}
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
