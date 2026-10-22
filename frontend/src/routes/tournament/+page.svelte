<!-- Tournament Brackets Landing Page -->
<script lang="ts">
	import { goto } from '$app/navigation';
	import { Trophy, Users } from 'lucide-svelte';
	import { pathForLink } from '$lib/tournament/links';

	let link = $state('');
	let linkError = $state<string | null>(null);

	function openTournament(e: SubmitEvent) {
		e.preventDefault();
		const path = pathForLink(link);
		if (!path) {
			linkError = 'Paste the link you were sent, e.g. …/tournament/1234abcd-… or …/team-match/1234abcd-…';
			return;
		}
		goto(path);
	}

	const steps = [
		{
			title: 'Set up',
			text: 'Choose a knockout or groups, seeding by ranking or handicap, and type in the players.'
		},
		{
			title: 'Check the draw',
			text: 'Review seeds, groups and the bracket. Re-draw or edit until it looks right, then start.'
		},
		{
			title: 'Share and play',
			text: 'Share the link. Anyone can enter results on their phone, and winners move on automatically.'
		}
	];
</script>

<div class="animate-fadeIn">
	<div class="text-center mb-12">
		<div class="inline-flex items-center justify-center p-4 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-2xl mb-6">
			<Trophy size={48} />
		</div>
		<h2 class="text-4xl font-extrabold text-gray-900 dark:text-white mb-4">Tournament Brackets</h2>
		<p class="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto mb-8">
			Run a club tournament: a straight knockout, or groups feeding into quarter-finals, semi-finals and a final.
			Seed by ranking, or by handicap with starting scores worked out for every match.
		</p>

		<a
			href="/tournament/new"
			class="inline-block px-8 py-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-lg shadow-emerald-500/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
		>
			Create a Tournament
		</a>

		<form onsubmit={openTournament} class="max-w-md mx-auto mt-6 flex gap-2">
			<label for="tournament-link" class="sr-only">Tournament or match link</label>
			<input
				id="tournament-link"
				type="text"
				bind:value={link}
				placeholder="Or paste a tournament or match link"
				class="flex-1 min-w-0 px-4 py-2 rounded-lg bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-600 focus:ring-2 focus:ring-emerald-500 outline-none text-gray-900 dark:text-white"
			/>
			<button
				type="submit"
				disabled={!link.trim()}
				class="px-4 py-2 text-sm font-medium rounded-lg bg-gray-200 hover:bg-gray-300 text-gray-800 dark:bg-slate-700 dark:hover:bg-slate-600 dark:text-gray-100 disabled:opacity-50"
			>
				Open
			</button>
		</form>
		{#if linkError}
			<p class="mt-2 text-sm text-red-700 dark:text-red-400">{linkError}</p>
		{/if}
	</div>

	<div class="max-w-4xl mx-auto">
		<h3 class="text-2xl font-bold text-gray-900 dark:text-white mb-6 text-center">How It Works</h3>
		<div class="grid grid-cols-1 md:grid-cols-3 gap-6">
			{#each steps as step, i (step.title)}
				<div class="bg-white dark:bg-slate-800 p-6 rounded-xl border border-gray-200 dark:border-slate-700">
					<div class="w-12 h-12 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-lg flex items-center justify-center text-2xl font-bold mb-4">
						{i + 1}
					</div>
					<h4 class="text-lg font-bold text-gray-900 dark:text-white mb-2">{step.title}</h4>
					<p class="text-gray-600 dark:text-gray-400">{step.text}</p>
				</div>
			{/each}
		</div>
	</div>

	<div class="max-w-4xl mx-auto mt-12" data-testid="team-match-entry">
		<div class="bg-white dark:bg-slate-800 p-6 sm:p-8 rounded-2xl border border-gray-200 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center gap-5">
			<div class="p-3 self-start bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-xl">
				<Users size={32} />
			</div>
			<div class="flex-1">
				<h3 class="text-xl font-bold text-gray-900 dark:text-white mb-1">Team Match Card</h3>
				<p class="text-gray-600 dark:text-gray-400">
					A league-style match between two teams of three, scored like the league match card: 9 singles and a doubles,
					each best of 5, with a running score. Enter rubbers from any phone as the tables finish.
				</p>
			</div>
			<a
				href="/team-match/new"
				class="flex-shrink-0 text-center px-6 py-3 bg-white hover:bg-emerald-50 text-emerald-700 border-2 border-emerald-600 font-bold rounded-xl dark:bg-slate-800 dark:hover:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-500 transition-colors"
			>
				Create a Team Match
			</a>
		</div>
	</div>
</div>
