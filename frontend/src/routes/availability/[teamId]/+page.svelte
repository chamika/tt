<!-- Main Availability Tracker Page -->
<script lang="ts">
	import { ArrowLeft, Users, Calendar as CalendarIcon, PencilLine } from 'lucide-svelte';
	import type { PageData } from './$types';
	import FixtureCard from '$lib/components/availability/FixtureCard.svelte';
	import PlayerSummaryCard from '$lib/components/availability/PlayerSummaryCard.svelte';
	import { updateAvailability, setFinalSelection, getPlayerSummary } from '$lib/api/availability';
	import type { PlayerSummary } from '$lib/api/availability';

	let { data }: { data: PageData } = $props();

	// Local state for optimistic updates
	let availability = $state({ ...data.availability });
	let finalSelections = $state<Record<string, string[]>>({ ...(data.finalSelections || {}) });
	let playerSummaries = $state<PlayerSummary[]>([]);
	let loading = $state(false);
	let error = $state<string | null>(null);
	let pastFixturesEditMode = $state(false);

	// Load player summaries
	$effect(() => {
		loadSummaries();
	});

	async function loadSummaries() {
		try {
			const summaries = await getPlayerSummary(data.team.id);
			playerSummaries = summaries || [];
		} catch (err) {
			console.error('Failed to load summaries:', err);
			playerSummaries = [];
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
		} catch (err) {
			// Revert on error
			availability[key] = !isAvailable;
			error = 'Failed to update availability';
			setTimeout(() => error = null, 3000);
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
		} catch (err) {
			// Revert on error
			finalSelections[fixtureId] = previousSelection;
			error = 'Failed to update selection';
			setTimeout(() => error = null, 3000);
		}
	}

	// Separate past and future fixtures
	let pastFixtures = $derived(data.fixtures.filter(f => f.is_past === 1));
	let futureFixtures = $derived(data.fixtures.filter(f => f.is_past === 0));
</script>

<div class="animate-fadeIn">
	<!-- Header -->
	<div class="mb-8">
		<a
			href="/availability"
			class="flex items-center text-sm text-gray-500 hover:text-emerald-600 dark:text-gray-400 dark:hover:text-emerald-400 mb-4 transition-colors"
		>
			<ArrowLeft size={16} class="mr-2" />
			Back to Availability
		</a>

		<div class="flex items-center justify-between">
			<div>
				<h1 class="text-4xl font-extrabold text-gray-900 dark:text-white mb-2">
					{data.team.name}
				</h1>
				<p class="text-lg text-gray-600 dark:text-gray-400">
					Season Availability Tracker
				</p>
			</div>
			<div class="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
				<div class="flex items-center gap-2">
					<CalendarIcon size={20} />
					<span>{data.fixtures.length} fixtures</span>
				</div>
				<div class="flex items-center gap-2">
					<Users size={20} />
					<span>{data.players.length} players</span>
				</div>
			</div>
		</div>
	</div>

	{#if error}
		<div class="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900/30 rounded-lg">
			<p class="text-sm text-red-700 dark:text-red-400">{error}</p>
		</div>
	{/if}

	<!-- Player Summary Section -->
	{#if playerSummaries.length > 0}
		<div class="mb-12">
			<h2 class="text-2xl font-bold text-gray-900 dark:text-white mb-6">
				Season Stats Summary
			</h2>
			<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
				{#each playerSummaries as summary}
					<PlayerSummaryCard {summary} />
				{/each}
			</div>
		</div>
	{/if}

	<!-- Future Fixtures -->
	{#if futureFixtures.length > 0}
		<div class="mb-12">
			<h2 class="text-2xl font-bold text-gray-900 dark:text-white mb-6">
				Upcoming Fixtures
			</h2>
			<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
	{/if}

	<!-- Past Fixtures -->
	{#if pastFixtures.length > 0}
		<div>
			<div class="flex items-center justify-between mb-6">
				<h2 class="text-2xl font-bold text-gray-900 dark:text-white">
					Past Fixtures
				</h2>
				<button
					onclick={() => pastFixturesEditMode = !pastFixturesEditMode}
					class="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors {pastFixturesEditMode
						? 'bg-emerald-600 hover:bg-emerald-700 text-white'
						: 'bg-gray-200 dark:bg-slate-700 hover:bg-gray-300 dark:hover:bg-slate-600 text-gray-700 dark:text-gray-300'}"
				>
					<PencilLine size={16} />
					{pastFixturesEditMode ? 'Done Editing' : 'Edit'}
				</button>
			</div>
			<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 {pastFixturesEditMode ? '' : 'opacity-75'}">
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
	{/if}
</div>
