<script lang="ts">
	import { Calendar, MapPin } from "lucide-svelte";
	import type {
		Fixture,
		Player,
		AvailabilityMap,
		FinalSelectionsMap,
	} from "$lib/api/availability";

	let {
		fixture,
		players,
		availability,
		finalSelections: finalSelectionsProp = [],
		onAvailabilityChange,
		onSelectionChange,
	}: {
		fixture: Fixture;
		players: Player[];
		availability: AvailabilityMap;
		finalSelections?: string[];
		onAvailabilityChange: (playerId: string, isAvailable: boolean) => void;
		onSelectionChange: (playerIds: string[]) => void;
	} = $props();

	// Ensure finalSelections is always an array
	let finalSelections = $derived(
		Array.isArray(finalSelectionsProp) ? finalSelectionsProp : [],
	);

	// Get availability for this fixture
	function isAvailable(playerId: string): boolean {
		const key = `${fixture.id}_${playerId}`;
		return availability[key] || false;
	}

	// Check if player is in final selection
	function isSelected(playerId: string): boolean {
		return finalSelections.includes(playerId);
	}

	// Toggle player selection
	function toggleSelection(playerId: string) {
		if (isSelected(playerId)) {
			// Remove from selection
			onSelectionChange(finalSelections.filter((id) => id !== playerId));
		} else {
			// Add to selection if under 3
			if (finalSelections.length < 3) {
				onSelectionChange([...finalSelections, playerId]);
			}
		}
	}

	// Get available players count
	let availableCount = $derived(
		players.filter((p) => isAvailable(p.id)).length,
	);

	// Validation state
	let isValid = $derived(finalSelections.length === 3);
	let hasWarning = $derived(
		finalSelections.length > 0 && finalSelections.length !== 3,
	);
</script>

<div
	class="bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-gray-200 dark:border-slate-700 overflow-hidden"
>
	<!-- Card Header with match image -->
	<div
		class="h-48 bg-gradient-to-br from-blue-500 to-emerald-500 relative overflow-hidden"
	>
		<div class="absolute inset-0 opacity-20">
			<!-- Pattern overlay -->
			<div
				class="absolute inset-0"
				style="background-image: repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(255,255,255,.05) 10px, rgba(255,255,255,.05) 20px);"
			></div>
		</div>
		<div
			class="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/60 to-transparent text-white"
		>
			<div class="flex items-center gap-2 text-sm mb-1">
				<Calendar size={16} />
				<span>{fixture.day_time}</span>
			</div>
			{#if fixture.venue}
				<div class="flex items-center gap-2 text-sm opacity-90">
					<MapPin size={16} />
					<span>{fixture.venue}</span>
				</div>
			{/if}
		</div>
	</div>

	<!-- Match Details -->
	<div class="p-6">
		<div class="text-center mb-4">
			<div class="text-lg font-semibold text-gray-900 dark:text-white">
				{fixture.home_team}
			</div>
			<div class="text-sm text-gray-500 dark:text-gray-400 my-1">vs</div>
			<div class="text-lg font-semibold text-gray-900 dark:text-white">
				{fixture.away_team}
			</div>
		</div>

		<!-- Availability Section -->
		<div class="space-y-2 mb-4">
			<h4
				class="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2"
			>
				Availability ({availableCount}/{players.length})
			</h4>
			{#each players as player}
				<label
					class="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700/50 cursor-pointer transition-colors"
				>
					<input
						type="checkbox"
						checked={isAvailable(player.id)}
						onchange={(e) =>
							onAvailabilityChange(
								player.id,
								e.currentTarget.checked,
							)}
						class="w-4 h-4 text-emerald-600 bg-gray-100 border-gray-300 rounded focus:ring-emerald-500 dark:focus:ring-emerald-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
					/>
					<span
						class="text-sm text-gray-700 dark:text-gray-300 flex-1"
					>
						{player.name}
					</span>
					{#if isAvailable(player.id)}
						<span
							class="text-xs text-emerald-600 dark:text-emerald-400 font-medium"
						>
							Available
						</span>
					{/if}
				</label>
			{/each}
		</div>

		<!-- Final Selection Section -->
		<div class="border-t border-gray-200 dark:border-slate-700 pt-4">
			<div class="flex items-center justify-between mb-2">
				<h4
					class="text-sm font-semibold text-gray-700 dark:text-gray-300"
				>
					Final Selection
				</h4>
				<span
					class="text-xs px-2 py-1 rounded-full {isValid
						? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
						: hasWarning
							? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400'
							: 'bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-400'}"
				>
					{finalSelections.length}/3
				</span>
			</div>

			<div class="space-y-2">
				{#each players.filter((p) => isAvailable(p.id)) as player}
					<label
						class="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700/50 cursor-pointer transition-colors"
					>
						<input
							type="checkbox"
							checked={isSelected(player.id)}
							disabled={!isSelected(player.id) &&
								finalSelections.length >= 3}
							onchange={() => toggleSelection(player.id)}
							class="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
						/>
						<span
							class="text-sm text-gray-700 dark:text-gray-300 flex-1"
						>
							{player.name}
						</span>
						{#if isSelected(player.id)}
							<span
								class="text-xs text-blue-600 dark:text-blue-400 font-medium"
							>
								Selected
							</span>
						{/if}
					</label>
				{/each}
			</div>

			{#if hasWarning}
				<div
					class="mt-3 p-2 rounded-lg bg-yellow-50 dark:bg-yellow-900/10 border border-yellow-200 dark:border-yellow-900/20"
				>
					<p class="text-xs text-yellow-700 dark:text-yellow-500">
						{#if finalSelections.length < 3}
							⚠️ Please select {3 - finalSelections.length} more player{3 -
								finalSelections.length >
							1
								? "s"
								: ""}
						{:else}
							⚠️ Too many players selected. Maximum is 3.
						{/if}
					</p>
				</div>
			{/if}
		</div>
	</div>
</div>
