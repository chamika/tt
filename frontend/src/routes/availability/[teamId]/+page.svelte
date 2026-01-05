<!-- Main Availability Tracker Page -->
<script lang="ts">
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { ArrowLeft, Users, Calendar as CalendarIcon, PencilLine, RefreshCw } from 'lucide-svelte';
	import FixtureCard from '$lib/components/availability/FixtureCard.svelte';
	import FixtureCardSkeleton from '$lib/components/availability/FixtureCardSkeleton.svelte';
	import PlayerSummaryCard from '$lib/components/availability/PlayerSummaryCard.svelte';
	import PlayerSummaryCardSkeleton from '$lib/components/availability/PlayerSummaryCardSkeleton.svelte';
	import EmptyState from '$lib/components/availability/EmptyState.svelte';
	import Notification from '$lib/components/availability/Notification.svelte';
	import { getTeamData, updateAvailability, setFinalSelection, getPlayerSummary, syncFixtures } from '$lib/api/availability';
	import type { PlayerSummary, Team, Fixture, Player, SyncResponse } from '$lib/api/availability';

	// Get teamId from URL params
	const teamId = $page.params.teamId;
	
	// Redirect if no teamId
	if (!teamId) {
		goto('/availability');
	}

	// Tab state
	type Tab = 'fixtures' | 'stats' | 'management';
	let currentTab = $state<Tab>('fixtures');

	// State for team data
	let team = $state<Team | null>(null);
	let fixtures = $state<Fixture[]>([]);
	let players = $state<Player[]>([]);
	let availability = $state<Record<string, boolean>>({});
	let finalSelections = $state<Record<string, string[]>>({});
	let playerSummaries = $state<PlayerSummary[]>([]);
	
	// Loading states
	let loadingTeamData = $state(true);
	let loadingSummaries = $state(true);
	let isSyncing = $state(false);
	let error = $state<string | null>(null);
	let successMessage = $state<string | null>(null);
	let pastFixturesEditMode = $state(false);
	
	// Sync state
	let showSyncConfirm = $state(false);
	let syncResult = $state<SyncResponse | null>(null);

	// Load team data on mount
	$effect(() => {
		loadTeamData();
	});

	async function loadTeamData() {
		if (!teamId) return;
		
		loadingTeamData = true;
		error = null;
		
		try {
			const data = await getTeamData(teamId);
			team = data.team;
			fixtures = data.fixtures;
			players = data.players;
			availability = data.availability;
			finalSelections = data.finalSelections || {};
			
			// Load summaries after team data is loaded
			await loadSummaries();
		} catch (err) {
			const errorMessage = err instanceof Error ? err.message : 'Failed to load team data';
			showError(errorMessage);
		} finally {
			loadingTeamData = false;
		}
	}

	async function loadSummaries() {
		if (!team) return;
		
		loadingSummaries = true;
		try {
			const summaries = await getPlayerSummary(team.id);
			playerSummaries = summaries || [];
		} catch (err) {
			console.error('Failed to load summaries:', err);
			playerSummaries = [];
		} finally {
			loadingSummaries = false;
		}
	}

	async function handleAvailabilityChange(fixtureId: string, playerId: string, isAvailable: boolean) {
		if (!team) return;
		
		// Optimistic update
		const key = `${fixtureId}_${playerId}`;
		availability[key] = isAvailable;

		try {
			await updateAvailability(team.id, fixtureId, playerId, isAvailable);
			// Reload summaries after availability change
			await loadSummaries();
			showSuccess('Availability updated successfully');
		} catch {
			// Revert on error
			availability[key] = !isAvailable;
			showError('Failed to update availability');
		}
	}

	async function handleSelectionChange(fixtureId: string, playerIds: string[]) {
		if (!team) return;
		
		// Optimistic update
		const previousSelection = finalSelections[fixtureId] || [];
		finalSelections[fixtureId] = playerIds;

		try {
			await setFinalSelection(team.id, fixtureId, playerIds);
			// Reload summaries after selection change
			await loadSummaries();
			showSuccess('Selection updated successfully');
		} catch {
			// Revert on error
			finalSelections[fixtureId] = previousSelection;
			showError('Failed to update selection');
		}
	}

	async function handleSync() {
		if (!team || isSyncing) return;
		
		showSyncConfirm = false;
		isSyncing = true;
		error = null;
		
		try {
			const result = await syncFixtures(team.id);
			syncResult = result;
			
			showSuccess(result.message);
			
			// Reload team data to show updates
			await loadTeamData();
		} catch (err) {
			const errorMessage = err instanceof Error ? err.message : 'Failed to sync fixtures';
			showError(errorMessage);
		} finally {
			isSyncing = false;
		}
	}
	
	function showError(message: string) {
		error = message;
		setTimeout(() => error = null, 5000);
	}
	
	function showSuccess(message: string) {
		successMessage = message;
		setTimeout(() => successMessage = null, 3000);
	}

	// Separate past and future fixtures
	let pastFixtures = $derived(fixtures.filter((f: Fixture) => f.is_past === 1));
	let futureFixtures = $derived(fixtures.filter((f: Fixture) => f.is_past === 0));
</script>

<div class="animate-fadeIn">
	<!-- Header -->
	<div class="mb-6 sm:mb-8">
		<a
			href="/availability"
			class="flex items-center text-sm text-gray-500 hover:text-emerald-600 dark:text-gray-400 dark:hover:text-emerald-400 mb-3 sm:mb-4 transition-colors"
		>
			<ArrowLeft size={16} class="mr-2" />
			Back to Availability
		</a>

		{#if loadingTeamData}
			<div class="animate-pulse">
				<div class="h-8 sm:h-10 bg-gray-200 dark:bg-slate-700 rounded w-64 mb-2"></div>
				<div class="h-6 bg-gray-200 dark:bg-slate-700 rounded w-48"></div>
			</div>
		{:else if team}
			<div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
				<div>
					<h1 class="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-gray-900 dark:text-white mb-1 sm:mb-2">
						{team.name}
					</h1>
					<p class="text-base sm:text-lg text-gray-600 dark:text-gray-400">
						Season Availability Tracker
					</p>
				</div>
				<div class="flex items-center gap-3 sm:gap-4 text-xs sm:text-sm text-gray-600 dark:text-gray-400">
					<div class="flex items-center gap-2">
						<CalendarIcon size={18} class="sm:w-5 sm:h-5" />
						<span>{fixtures.length} fixtures</span>
					</div>
					<div class="flex items-center gap-2">
						<Users size={18} class="sm:w-5 sm:h-5" />
						<span>{players.length} players</span>
					</div>
				</div>
			</div>
		{/if}
	</div>

	<!-- Tabs -->
	<div class="mb-6 sm:mb-8">
		<div class="border-b border-gray-200 dark:border-slate-700">
			<nav class="flex gap-4 sm:gap-8" aria-label="Tabs">
				<button
					onclick={() => currentTab = 'fixtures'}
					class="py-3 px-1 border-b-2 font-medium text-sm transition-colors {currentTab === 'fixtures'
						? 'border-emerald-600 text-emerald-600 dark:border-emerald-400 dark:text-emerald-400'
						: 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'}"
				>
					Fixtures
				</button>
				<button
					onclick={() => currentTab = 'stats'}
					class="py-3 px-1 border-b-2 font-medium text-sm transition-colors {currentTab === 'stats'
						? 'border-emerald-600 text-emerald-600 dark:border-emerald-400 dark:text-emerald-400'
						: 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'}"
				>
					Stats
				</button>
				<button
					onclick={() => currentTab = 'management'}
					class="py-3 px-1 border-b-2 font-medium text-sm transition-colors {currentTab === 'management'
						? 'border-emerald-600 text-emerald-600 dark:border-emerald-400 dark:text-emerald-400'
						: 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'}"
				>
					Management
				</button>
			</nav>
		</div>
	</div>

	<!-- Tab Content -->
	{#if currentTab === 'fixtures'}
		<!-- Future Fixtures -->
		{#if loadingTeamData}
			<div class="mb-8 sm:mb-12">
				<h2 class="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-4 sm:mb-6">
					Upcoming Fixtures
				</h2>
				<div class="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6">
					<!-- eslint-disable-next-line @typescript-eslint/no-unused-vars -->
					{#each Array(3) as _, i (i)}
						<FixtureCardSkeleton />
					{/each}
				</div>
			</div>
		{:else if futureFixtures.length > 0}
			<div class="mb-8 sm:mb-12">
				<h2 class="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-4 sm:mb-6">
					Upcoming Fixtures
				</h2>
				<div class="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6">
					{#each futureFixtures as fixture (fixture.id)}
						<FixtureCard
							{fixture}
							{players}
							{availability}
							finalSelections={finalSelections[fixture.id] || []}
							onAvailabilityChange={(playerId, isAvailable) => 
								handleAvailabilityChange(fixture.id, playerId, isAvailable)
							}
							onSelectionChange={(playerIds) => 
								handleSelectionChange(fixture.id, playerIds)
							}
						/>
					{/each}
				</div>
			</div>
		{:else}
			<div class="mb-8 sm:mb-12">
				<h2 class="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-4 sm:mb-6">
					Upcoming Fixtures
				</h2>
				<EmptyState
					title="No upcoming fixtures"
					message="There are no upcoming fixtures scheduled at this time."
				/>
			</div>
		{/if}

		<!-- Past Fixtures -->
		{#if loadingTeamData}
			<div>
				<h2 class="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-4 sm:mb-6">
					Past Fixtures
				</h2>
				<div class="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6">
					<!-- eslint-disable-next-line @typescript-eslint/no-unused-vars -->
					{#each Array(2) as _, i (i)}
						<FixtureCardSkeleton />
					{/each}
				</div>
			</div>
		{:else if pastFixtures.length > 0}
			<div>
				<div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-0 mb-4 sm:mb-6">
					<h2 class="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
						Past Fixtures
					</h2>
					<button
						onclick={() => pastFixturesEditMode = !pastFixturesEditMode}
						class="flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors {pastFixturesEditMode
							? 'bg-emerald-600 hover:bg-emerald-700 text-white'
							: 'bg-gray-200 dark:bg-slate-700 hover:bg-gray-300 dark:hover:bg-slate-600 text-gray-700 dark:text-gray-300'}"
					>
						<PencilLine size={16} />
						{pastFixturesEditMode ? 'Done Editing' : 'Edit'}
					</button>
				</div>
				<div class="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6 {pastFixturesEditMode ? '' : 'opacity-75'}">
					{#each pastFixtures as fixture (fixture.id)}
						<FixtureCard
							{fixture}
							{players}
							{availability}
							finalSelections={finalSelections[fixture.id] || []}
							onAvailabilityChange={pastFixturesEditMode
								? (playerId, isAvailable) => handleAvailabilityChange(fixture.id, playerId, isAvailable)
								: () => {}}
							onSelectionChange={pastFixturesEditMode
								? (playerIds) => handleSelectionChange(fixture.id, playerIds)
								: () => {}}
							disabled={!pastFixturesEditMode}
						/>
					{/each}
				</div>
			</div>
		{:else}
			<div>
				<h2 class="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-4 sm:mb-6">
					Past Fixtures
				</h2>
				<EmptyState
					title="No past fixtures"
					message="There are no past fixtures recorded yet."
				/>
			</div>
		{/if}
	{:else if currentTab === 'stats'}
		<!-- Player Summary Section -->
		{#if loadingTeamData || loadingSummaries}
			<div>
				<h2 class="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-4 sm:mb-6">
					Season Stats Summary
				</h2>
				<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
					<!-- eslint-disable-next-line @typescript-eslint/no-unused-vars -->
					{#each Array(players.length || 3) as _, i (i)}
						<PlayerSummaryCardSkeleton />
					{/each}
				</div>
			</div>
		{:else if playerSummaries.length > 0}
			<div>
				<h2 class="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-4 sm:mb-6">
					Season Stats Summary
				</h2>
				<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
					{#each playerSummaries as summary (summary.playerId)}
						<PlayerSummaryCard {summary} />
					{/each}
				</div>
			</div>
		{:else}
			<EmptyState
				title="No statistics available"
				message="Statistics will be available once fixtures and selections are recorded."
			/>
		{/if}
	{:else if currentTab === 'management'}
		<!-- Management Section -->
		<div class="max-w-2xl">
			<h2 class="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-4">
				Fixture Management
			</h2>
			<p class="text-gray-600 dark:text-gray-400 mb-6">
				Sync your fixtures with the latest data from ELTTL. This will update any rescheduled fixtures and add new ones.
			</p>

			<div class="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700 p-6">
				<h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-3">
					Sync Fixtures from ELTTL
				</h3>
				<p class="text-sm text-gray-600 dark:text-gray-400 mb-4">
					This will fetch the current fixtures from ELTTL and update any date changes. If a fixture date has changed, the availability and selections will be cleared for that fixture.
				</p>

				{#if syncResult}
					<div class="mb-4 p-4 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-lg">
						<h4 class="font-medium text-emerald-900 dark:text-emerald-100 mb-2">Last Sync Results:</h4>
						<ul class="text-sm text-emerald-800 dark:text-emerald-200 space-y-1">
							<li>✓ {syncResult.fixtures_updated} fixture(s) updated</li>
							<li>✓ {syncResult.fixtures_new} new fixture(s) added</li>
							<li>✓ {syncResult.fixtures_unchanged} fixture(s) unchanged</li>
						</ul>
					</div>
				{/if}

				<button
					onclick={() => showSyncConfirm = true}
					disabled={isSyncing}
					class="flex items-center justify-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-400 text-white font-medium rounded-lg transition-colors disabled:cursor-not-allowed"
				>
					{#if isSyncing}
						<RefreshCw size={18} class="animate-spin" />
						Syncing...
					{:else}
						<RefreshCw size={18} />
						Sync Fixtures
					{/if}
				</button>
			</div>
		</div>
	{/if}
</div>

<!-- Sync Confirmation Dialog -->
{#if showSyncConfirm}
	<div class="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" role="presentation" onclick={() => showSyncConfirm = false} onkeydown={(e) => e.key === 'Escape' && (showSyncConfirm = false)}>
		<div class="bg-white dark:bg-slate-800 rounded-lg max-w-md w-full p-6" role="dialog" aria-modal="true" tabindex="-1" onclick={(e) => e.stopPropagation()} onkeydown={(e) => { if (e.key !== 'Escape') e.stopPropagation(); }}>
			<h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-3">
				Confirm Fixture Sync
			</h3>
			<p class="text-gray-600 dark:text-gray-400 mb-6">
				Are you sure you want to sync fixtures from ELTTL? Any fixtures with changed dates will have their availability and selections cleared.
			</p>
			<div class="flex gap-3 justify-end">
				<button
					onclick={() => showSyncConfirm = false}
					class="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
				>
					Cancel
				</button>
				<button
					onclick={handleSync}
					class="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors"
				>
					Sync Now
				</button>
			</div>
		</div>
	</div>
{/if}

<!-- Notifications - Fixed position at top right -->
<div class="fixed top-4 right-4 z-50 max-w-md w-full px-4 pointer-events-none">
	<div class="pointer-events-auto">
		{#if error}
			<div class="mb-3">
				<Notification type="error" message={error} onDismiss={() => error = null} />
			</div>
		{/if}
		
		{#if successMessage}
			<div class="mb-3">
				<Notification type="success" message={successMessage} onDismiss={() => successMessage = null} />
			</div>
		{/if}
	</div>
</div>
