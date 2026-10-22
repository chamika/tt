<!-- Create Team Match -->
<script lang="ts">
	import { goto } from '$app/navigation';
	import { ArrowLeft, Users } from 'lucide-svelte';
	import TeamMatchForm from '$lib/components/teamMatch/TeamMatchForm.svelte';
	import { createTeamMatch } from '$lib/api/teamMatch';
	import type { TeamMatchDetails } from '$lib/types/teamMatch';

	// Today on this phone's clock; toISOString would give the UTC date, a day out just after midnight in summer
	const today = new Date();
	const localDate = [today.getFullYear(), today.getMonth() + 1, today.getDate()]
		.map((n) => String(n).padStart(2, '0'))
		.join('-');

	const blank: TeamMatchDetails = {
		title: null,
		match_date: localDate,
		home_team: '',
		away_team: '',
		home_players: ['', '', ''],
		away_players: ['', '', '']
	};

	let busy = $state(false);
	let error = $state<string | null>(null);

	async function create(body: TeamMatchDetails) {
		busy = true;
		error = null;
		try {
			const response = await createTeamMatch(body);
			goto(response.redirect);
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to create the match';
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
		<div class="p-4 sm:p-6 border-b border-gray-100 dark:border-slate-700 bg-gray-50 dark:bg-slate-800/50">
			<div class="flex items-center gap-3">
				<div class="p-2 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 rounded-lg">
					<Users size={24} />
				</div>
				<div>
					<h2 class="text-2xl font-bold text-gray-900 dark:text-white">New Team Match</h2>
					<p class="text-sm text-gray-500 dark:text-gray-400">Three players a side, 9 singles and a doubles.</p>
				</div>
			</div>
		</div>

		<div class="p-4 sm:p-6">
			<TeamMatchForm initial={blank} submitLabel="Create match card" {busy} {error} onSubmit={create} />
		</div>
	</div>
</div>
