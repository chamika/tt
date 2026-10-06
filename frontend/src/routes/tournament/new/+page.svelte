<!-- Create Tournament -->
<script lang="ts">
	import { goto } from '$app/navigation';
	import { ArrowLeft, Trophy } from 'lucide-svelte';
	import TournamentForm from '$lib/components/tournament/TournamentForm.svelte';
	import { createTournament } from '$lib/api/tournament';
	import type { CreateTournamentRequest, TournamentSettings } from '$lib/types/tournament';

	const defaults: TournamentSettings = {
		name: '',
		format: 'knockout',
		seeding_mode: 'ranking',
		score_mode: 'points',
		best_of: 5,
		group_count: 2,
		advance_per_group: 2
	};
	const emptyRows = Array.from({ length: 4 }, () => ({ name: '', value: '' }));

	let busy = $state(false);
	let error = $state<string | null>(null);

	async function create(body: CreateTournamentRequest) {
		busy = true;
		error = null;
		try {
			const response = await createTournament(body);
			goto(response.redirect);
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to create tournament';
			busy = false;
		}
	}
</script>

<div class="max-w-2xl mx-auto animate-fadeIn">
	<a
		href="/tournament"
		class="flex items-center text-sm text-gray-500 hover:text-emerald-600 dark:text-gray-400 dark:hover:text-emerald-400 mb-6 transition-colors"
	>
		<ArrowLeft size={16} class="mr-2" />
		Back to Tournaments
	</a>

	<div class="bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-gray-200 dark:border-slate-700 overflow-hidden">
		<div class="p-6 border-b border-gray-100 dark:border-slate-700 bg-gray-50 dark:bg-slate-800/50">
			<div class="flex items-center gap-3">
				<div class="p-2 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 rounded-lg">
					<Trophy size={24} />
				</div>
				<div>
					<h2 class="text-2xl font-bold text-gray-900 dark:text-white">New Tournament</h2>
					<p class="text-sm text-gray-500 dark:text-gray-400">You can review and change the draw before it starts.</p>
				</div>
			</div>
		</div>

		<div class="p-6">
			<TournamentForm
				initialSettings={defaults}
				initialRows={emptyRows}
				submitLabel="Create draw"
				{busy}
				{error}
				onSubmit={create}
			/>
		</div>
	</div>
</div>
