<!-- Main Availability Tracker Page -->
<script lang="ts">
	import { ArrowLeft, Users, Calendar as CalendarIcon, PencilLine } from 'lucide-svelte';
	import type { PageData } from './$types';
	import FixtureCard from '$lib/components/availability/FixtureCard.svelte';
	import FixtureCardSkeleton from '$lib/components/availability/FixtureCardSkeleton.svelte';
	import PlayerSummaryCard from '$lib/components/availability/PlayerSummaryCard.svelte';
	import PlayerSummaryCardSkeleton from '$lib/components/availability/PlayerSummaryCardSkeleton.svelte';
	import EmptyState from '$lib/components/availability/EmptyState.svelte';
	import Notification from '$lib/components/availability/Notification.svelte';
	import { updateAvailability, setFinalSelection, getPlayerSummary } from '$lib/api/availability';
	import type { PlayerSummary } from '$lib/api/availability';

	let { data }: { data: PageData } = $props();

	// Local state for optimistic updates
	let availability = $state({ ...data.availability });
	let finalSelections = $state<Record<string, string[]>>({ ...(data.finalSelections || {}) });
	let playerSummaries = $state<PlayerSummary[]>([]);
	let loading = $state(false);
	let loadingSummaries = $state(true);
	let error = $state<string | null>(null);
	let successMessage = $state<string | null>(null);
	let pastFixturesEditMode = $state(false);

	// Load player summaries
	$effect(() => {
		loadSummaries();
	});

	async function loadSummaries() {
		loadingSummaries = true;
		try {
			const summaries = await getPlayerSummary(data.team.id);
			playerSummaries = summaries || [];
		} catch (err) {
			console.error('Failed to load summaries:', err);
			playerSummaries = [];
		} finally {
			loadingSummaries = false;
		}
	}

	async function handleAvailabilityChange(fixtureId: string, playerId: string, isAvailable: boolean) {
		// Optimistic update
		const key = `${fixtureId}_${playerId}`;
		availability[key] = isAvailable;

		try {
			await updateAvailability(data.team.id, fixtureId, playerId, isAvailable);
			// Reload summaries after availability change
			await loadSummaries();
			showSuccess('Availability updated successfully');
		} catch (err) {
			// Revert on error
			availability[key] = !isAvailable;
			showError('Failed to update availability');
		}
	}

	async function handleSelectionChange(fixtureId: string, playerIds: string[]) {
		// Optimistic update
		const previousSelection = finalSelections[fixtureId] || [];
		finalSelections[fixtureId] = playerIds;

		try {
			await setFinalSelection(data.team.id, fixtureId, playerIds);
			// Reload summaries after selection change
			await loadSummaries();
			showSuccess('Selection updated successfully');
		} catch (err) {
			// Revert on error
			finalSelections[fixtureId] = previousSelection;
			showError('Failed to update selection');
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
	let pastFixtures = $derived(data.fixtures.filter((f: any) => f.is_past === 1));
	let futureFixtures = $derived(data.fixtures.filter((f: any) => f.is_past === 0));
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

		<div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
			<div>
				<h1 class="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-gray-900 dark:text-white mb-1 sm:mb-2">
					{data.team.name}
				</h1>
				<p class="text-base sm:text-lg text-gray-600 dark:text-gray-400">
					Season Availability Tracker
				</p>
			</div>
			<div class="flex items-center gap-3 sm:gap-4 text-xs sm:text-sm text-gray-600 dark:text-gray-400">
				<div class="flex items-center gap-2">
					<CalendarIcon size={18} class="sm:w-5 sm:h-5" />
					<span>{data.fixtures.length} fixtures</span>
				</div>
				<div class="flex items-center gap-2">
					<Users size={18} class="sm:w-5 sm:h-5" />
					<span>{data.players.length} players</span>
				</div>
			</div>
		</div>
	</div>

	{#if error}
		<div class="mb-6">
			<Notification type="error" message={error} onDismiss={() => error = null} />
		</div>
	{/if}
	
	{#if successMessage}
		<div class="mb-6">
			<Notification type="success" message={successMessage} onDismiss={() => successMessage = null} />
		</div>
	{/if}

	<!-- Player Summary Section -->
	{#if loadingSummaries}
		<div class="mb-8 sm:mb-12">
			<h2 class="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-4 sm:mb-6">
				Season Stats Summary
			</h2>
			<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
				{#each Array(data.players.length) as _}
					<PlayerSummaryCardSkeleton />
				{/each}
			</div>
		</div>
	{:else if playerSummaries.length > 0}
		<div class="mb-8 sm:mb-12">
			<h2 class="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-4 sm:mb-6">
				Season Stats Summary
			</h2>
			<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
				{#each playerSummaries as summary}
					<PlayerSummaryCard {summary} />
				{/each}
			</div>
		</div>
	{/if}

	<!-- Future Fixtures -->
	{#if futureFixtures.length > 0}
		<div class="mb-8 sm:mb-12">
			<h2 class="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-4 sm:mb-6">
				Upcoming Fixtures
			</h2>
			<div class="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6">
				{#each futureFixtures as fixture}
					<FixtureCard
						{fixture}
						players={data.players}
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
	{#if pastFixtures.length > 0}
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
				{#each pastFixtures as fixture}
					<FixtureCard
						{fixture}
						players={data.players}
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
</div>
