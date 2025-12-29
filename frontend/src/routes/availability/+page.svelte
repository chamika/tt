<!-- Availability Tracker Landing Page -->
<script lang="ts">
	import { Calendar } from 'lucide-svelte';
</script>

<div class="animate-fadeIn">
	<div class="text-center mb-12">
		<div class="inline-flex items-center justify-center p-4 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-2xl mb-6">
			<Calendar size={48} />
		</div>
		<h2 class="text-4xl font-extrabold text-gray-900 dark:text-white mb-4">
			ELTTL Availability Tracker
		</h2>
		<p class="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto mb-8">
			Coordinate your ELTTL league matches with your team. Track player availability and manage final selections effortlessly.
		</p>
		
		<a
			href="/availability/new"
			class="inline-block px-8 py-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-lg shadow-emerald-500/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
		>
			Import Your Team
		</a>
	</div>

	<div class="max-w-4xl mx-auto">
		<h3 class="text-2xl font-bold text-gray-900 dark:text-white mb-6 text-center">
			How It Works
		</h3>
		
		<div class="grid grid-cols-1 md:grid-cols-3 gap-6">
			<div class="bg-white dark:bg-slate-800 p-6 rounded-xl border border-gray-200 dark:border-slate-700">
				<div class="w-12 h-12 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-lg flex items-center justify-center text-2xl font-bold mb-4">
					1
				</div>
				<h4 class="text-lg font-bold text-gray-900 dark:text-white mb-2">
					Import Team
				</h4>
				<p class="text-gray-600 dark:text-gray-400">
					Enter your ELTTL team URL to automatically import fixtures and squad members.
				</p>
			</div>

			<div class="bg-white dark:bg-slate-800 p-6 rounded-xl border border-gray-200 dark:border-slate-700">
				<div class="w-12 h-12 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-lg flex items-center justify-center text-2xl font-bold mb-4">
					2
				</div>
				<h4 class="text-lg font-bold text-gray-900 dark:text-white mb-2">
					Track Availability
				</h4>
				<p class="text-gray-600 dark:text-gray-400">
					Players mark their availability for each match. See who's available at a glance.
				</p>
			</div>

			<div class="bg-white dark:bg-slate-800 p-6 rounded-xl border border-gray-200 dark:border-slate-700">
				<div class="w-12 h-12 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-lg flex items-center justify-center text-2xl font-bold mb-4">
					3
				</div>
				<h4 class="text-lg font-bold text-gray-900 dark:text-white mb-2">
					Select Team
				</h4>
				<p class="text-gray-600 dark:text-gray-400">
					Choose exactly 3 players for each match. Track selection statistics over the season.
				</p>
			</div>
		</div>
	</div>
</div>
