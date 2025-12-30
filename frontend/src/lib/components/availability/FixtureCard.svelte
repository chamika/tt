<script lang="ts">
	import { Calendar, MapPin, Plus, X } from "lucide-svelte";
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
		disabled = false,
	}: {
		fixture: Fixture;
		players: Player[];
		availability: AvailabilityMap;
		finalSelections?: string[];
		onAvailabilityChange: (playerId: string, isAvailable: boolean) => void;
		onSelectionChange: (playerIds: string[]) => void;
		disabled?: boolean;
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
	class="bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-gray-200 dark:border-slate-700 overflow-hidden transition-all hover:shadow-xl"
>
	<!-- Card Header with match details -->
	<div
		class="h-40 bg-gradient-to-br from-blue-500 to-emerald-500 relative overflow-hidden"
	>
		<div class="absolute inset-0 opacity-20">
			<!-- Pattern overlay -->
			<div
				class="absolute inset-0"
				style="background-image: repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(255,255,255,.05) 10px, rgba(255,255,255,.05) 20px);"
			></div>
		</div>
		<div class="absolute inset-0 p-4 flex flex-col text-white">
			<!-- Match Teams (centered) -->
			<div class="flex-1 flex items-center justify-center">
				<div class="text-center">
					<div class="text-lg font-bold leading-tight mb-1">
						{fixture.home_team}
					</div>
					<div class="text-xs font-semibold opacity-90 mb-1">vs</div>
					<div class="text-lg font-bold leading-tight">
						{fixture.away_team}
					</div>
				</div>
			</div>
			
			<!-- Bottom row: Date (left) and Venue (right) -->
			<div class="flex items-end justify-between gap-4 text-sm">
				<!-- Date & Time -->
				<div class="flex items-center gap-2 font-medium">
					<Calendar size={16} class="flex-shrink-0" />
					<span>{fixture.day_time}</span>
				</div>
				
				<!-- Venue -->
				{#if fixture.venue}
					<div class="flex items-center gap-2 opacity-90">
						<MapPin size={16} class="flex-shrink-0" />
						<span class="truncate">{fixture.venue}</span>
					</div>
				{/if}
			</div>
		</div>
	</div>

	<!-- Content -->
	<div class="p-6">

		<!-- Availability Section -->
		<div class="space-y-2 mb-6">
			<h4
				class="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3"
			>
				Availability ({availableCount}/{players.length})
			</h4>
			{#each players as player}
				<div
					class="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors min-h-[44px]"
				>
					<label class="flex items-center gap-3 flex-1 cursor-pointer">
						<input
							type="checkbox"
							checked={isAvailable(player.id)}
							disabled={isSelected(player.id) || disabled}
							onchange={(e) =>
								onAvailabilityChange(
									player.id,
									e.currentTarget.checked,
								)}
							class="w-4 h-4 text-emerald-600 bg-gray-100 border-gray-300 rounded focus:ring-emerald-500 dark:focus:ring-emerald-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
						/>
						<span
							class="text-sm text-gray-700 dark:text-gray-300"
						>
							{player.name}
						</span>
					</label>
					<!-- Reserve space for button to maintain consistent spacing -->
					<div class="w-9 flex-shrink-0">
						{#if isAvailable(player.id)}
							<button
								type="button"
								onclick={() => toggleSelection(player.id)}
								disabled={disabled || (!isSelected(player.id) &&
									finalSelections.length >= 3)}
								class="p-1.5 rounded-md transition-colors w-full {isSelected(
									player.id,
								)
									? 'bg-red-600 hover:bg-red-700 text-white'
									: 'bg-green-600 hover:bg-green-700 text-white'} disabled:opacity-50 disabled:cursor-not-allowed"
								title={isSelected(player.id) ? 'Remove from selection' : 'Add to selection'}
							>
								{#if isSelected(player.id)}
									<X size={16} class="mx-auto" />
								{:else}
									<Plus size={16} class="mx-auto" />
								{/if}
							</button>
						{/if}
					</div>
				</div>
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
				{#if finalSelections.length > 0}
					{#each players.filter((p) => isSelected(p.id)) as player}
						<div
							class="flex items-center gap-3 p-2 rounded-lg bg-blue-50 dark:bg-blue-900/20"
						>
							<span
								class="text-sm text-gray-700 dark:text-gray-300 flex-1"
							>
								{player.name}
							</span>
							<span
								class="text-xs text-blue-600 dark:text-blue-400 font-medium"
							>
								Selected
							</span>
						</div>
					{/each}
				{:else}
					<div
						class="text-sm text-gray-500 dark:text-gray-400 text-center py-4"
					>
						No players selected yet
					</div>
				{/if}
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
