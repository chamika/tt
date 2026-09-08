<!-- Dry-run report shown before a fixture sync is applied -->
<script lang="ts">
	import { AlertTriangle, Minus, Plus, RefreshCw } from 'lucide-svelte';
	import type { SyncPlan } from '$lib/types/availability';

	let {
		plan,
		applying = false,
		onCancel,
		onApply
	}: {
		plan: SyncPlan;
		applying?: boolean;
		onCancel: () => void;
		onApply: () => void;
	} = $props();

	const hasChanges = $derived(
		plan.new.length > 0 || plan.updated.length > 0 || plan.deleted.length > 0
	);

	// Deletions and reschedules both destroy availability and selections, so the
	// user needs to see how much of it is at stake before approving
	const deletionsWithData = $derived(
		plan.deleted.filter((f) => f.available_count > 0 || f.selected_count > 0).length
	);

	function dataWarning(availableCount: number, selectedCount: number): string | null {
		const parts: string[] = [];
		if (availableCount > 0) parts.push(`${availableCount} available`);
		if (selectedCount > 0) parts.push(`${selectedCount} selected`);
		return parts.length > 0 ? parts.join(', ') : null;
	}

	function close() {
		if (!applying) onCancel();
	}
</script>

<div
	class="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
	role="presentation"
	onclick={close}
	onkeydown={(e) => e.key === 'Escape' && close()}
>
	<div
		class="bg-white dark:bg-slate-800 rounded-lg max-w-lg w-full max-h-[85vh] flex flex-col p-6"
		role="dialog"
		aria-modal="true"
		aria-labelledby="sync-preview-title"
		tabindex="-1"
		onclick={(e) => e.stopPropagation()}
		onkeydown={(e) => {
			if (e.key !== 'Escape') e.stopPropagation();
		}}
	>
		<h3 id="sync-preview-title" class="text-lg font-semibold text-gray-900 dark:text-white mb-3">
			Sync Preview
		</h3>

		{#if !hasChanges}
			<p class="text-gray-600 dark:text-gray-400 mb-6">
				Everything is already up to date. ELTTL lists the same
				{plan.unchanged_count} fixture{plan.unchanged_count === 1 ? '' : 's'} you already have.
			</p>
			<div class="flex justify-end">
				<button
					onclick={onCancel}
					class="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors"
				>
					Close
				</button>
			</div>
		{:else}
			<p class="text-gray-600 dark:text-gray-400 mb-4 text-sm">
				These changes have not been applied yet. Review them and choose whether to continue.
			</p>

			<div class="flex-1 overflow-y-auto -mx-1 px-1 space-y-4">
				{#if plan.new.length > 0}
					<section>
						<h4 class="font-medium text-gray-900 dark:text-white mb-2 text-sm">
							{plan.new.length} new fixture{plan.new.length === 1 ? '' : 's'}
						</h4>
						<ul class="space-y-1.5">
							{#each plan.new as fixture (`${fixture.home_team}|${fixture.away_team}`)}
								<li class="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300">
									<Plus
										size={16}
										class="flex-shrink-0 mt-0.5 text-emerald-600 dark:text-emerald-400"
									/>
									<span>
										<span class="font-medium">{fixture.day_time}</span>
										<span class="text-gray-500 dark:text-gray-400">
											— {fixture.home_team} v {fixture.away_team}
										</span>
									</span>
								</li>
							{/each}
						</ul>
					</section>
				{/if}

				{#if plan.updated.length > 0}
					<section>
						<h4 class="font-medium text-gray-900 dark:text-white mb-2 text-sm">
							{plan.updated.length} rescheduled
						</h4>
						<ul class="space-y-1.5">
							{#each plan.updated as fixture (fixture.id)}
								{@const warning = dataWarning(fixture.available_count, fixture.selected_count)}
								<li class="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300">
									<RefreshCw
										size={16}
										class="flex-shrink-0 mt-0.5 text-amber-600 dark:text-amber-400"
									/>
									<span>
										<span class="font-medium">{fixture.home_team} v {fixture.away_team}</span>
										<span class="block text-gray-500 dark:text-gray-400">
											{fixture.old_day_time} → {fixture.new_day_time}
										</span>
										{#if warning}
											<span class="block text-amber-700 dark:text-amber-400 text-xs">
												Clears {warning}
											</span>
										{/if}
									</span>
								</li>
							{/each}
						</ul>
					</section>
				{/if}

				{#if plan.deleted.length > 0}
					<section>
						<h4 class="font-medium text-gray-900 dark:text-white mb-2 text-sm">
							{plan.deleted.length} to delete
							<span class="font-normal text-gray-500 dark:text-gray-400">
								— no longer listed on ELTTL
							</span>
						</h4>
						{#if deletionsWithData > 0}
							<p
								class="mb-2 flex items-start gap-2 text-xs text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-md p-2"
							>
								<AlertTriangle size={14} class="flex-shrink-0 mt-0.5" />
								<span>
									{deletionsWithData} of these already have availability or selections recorded. Deleting
									them removes that data permanently.
								</span>
							</p>
						{/if}
						<ul class="space-y-1.5">
							{#each plan.deleted as fixture (fixture.id)}
								{@const warning = dataWarning(fixture.available_count, fixture.selected_count)}
								<li class="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300">
									<Minus size={16} class="flex-shrink-0 mt-0.5 text-red-600 dark:text-red-400" />
									<span>
										<span class="font-medium">{fixture.day_time}</span>
										<span class="text-gray-500 dark:text-gray-400">
											— {fixture.home_team} v {fixture.away_team}
										</span>
										{#if warning}
											<span
												class="block text-red-700 dark:text-red-400 text-xs inline-flex items-center gap-1"
											>
												<AlertTriangle size={12} />
												{warning}
											</span>
										{/if}
									</span>
								</li>
							{/each}
						</ul>
					</section>
				{/if}

				<p class="text-sm text-gray-500 dark:text-gray-400">
					{plan.unchanged_count} fixture{plan.unchanged_count === 1 ? '' : 's'} unchanged
				</p>
			</div>

			<div class="flex gap-3 justify-end pt-4 mt-2 border-t border-gray-200 dark:border-slate-700">
				<button
					onclick={onCancel}
					disabled={applying}
					class="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
				>
					Cancel
				</button>
				<button
					onclick={onApply}
					disabled={applying}
					class="flex items-center gap-2 px-4 py-2 text-white rounded-lg transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed {plan
						.deleted.length > 0
						? 'bg-red-600 hover:bg-red-700'
						: 'bg-emerald-600 hover:bg-emerald-700'}"
				>
					{#if applying}
						<RefreshCw size={16} class="animate-spin" />
						Applying...
					{:else}
						Apply Changes
					{/if}
				</button>
			</div>
		{/if}
	</div>
</div>
