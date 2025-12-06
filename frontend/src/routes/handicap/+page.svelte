<script lang="ts">
	import { ArrowLeft, Calculator, Trophy, Info } from "lucide-svelte";
	import { calculateScores as calcScores } from "$lib/handicap/scoreCalculator";

	let handicap1: number | null = null;
	let handicap2: number | null = null;
	let output = "";

	function calculateScores() {
		const result = calcScores(handicap1, handicap2);
		output = result.output;
	}
</script>

<div class="max-w-2xl mx-auto animate-fadeIn">
	<a
		href="/"
		class="flex items-center text-sm text-gray-500 hover:text-emerald-600 dark:text-gray-400 dark:hover:text-emerald-400 mb-6 transition-colors"
	>
		<ArrowLeft size={16} class="mr-2" />
		Back to Tools
	</a>

	<div
		class="bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-gray-200 dark:border-slate-700 overflow-hidden"
	>
		<div
			class="p-6 border-b border-gray-100 dark:border-slate-700 bg-gray-50 dark:bg-slate-800/50"
		>
			<div class="flex items-center gap-3">
				<div
					class="p-2 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 rounded-lg"
				>
					<Calculator size={24} />
				</div>
				<h2 class="text-2xl font-bold text-gray-900 dark:text-white">
					Handicap Calculator
				</h2>
			</div>
		</div>

		<div class="p-6 space-y-6">
			<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
				<div class="space-y-2">
					<label
						class="block text-sm font-medium text-gray-700 dark:text-gray-300"
						for="handicap1">Player 1 Handicap</label
					>
					<input
						type="number"
						id="handicap1"
						bind:value={handicap1}
						placeholder="Enter handicap"
						class="w-full px-4 py-3 rounded-lg bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-600 focus:ring-2 focus:ring-emerald-500 outline-none text-gray-900 dark:text-white transition-all"
					/>
				</div>
				<div class="space-y-2">
					<label
						class="block text-sm font-medium text-gray-700 dark:text-gray-300"
						for="handicap2">Player 2 Handicap</label
					>
					<input
						type="number"
						id="handicap2"
						bind:value={handicap2}
						placeholder="Enter handicap"
						class="w-full px-4 py-3 rounded-lg bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-600 focus:ring-2 focus:ring-emerald-500 outline-none text-gray-900 dark:text-white transition-all"
					/>
				</div>
			</div>

			<button
				on:click={calculateScores}
				class="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-lg shadow-emerald-500/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
			>
				Calculate Scores
			</button>

			{#if output}
				<div
					class="mt-6 p-6 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-700 text-center animate-slideUp"
				>
					<div
						class="inline-flex items-center justify-center p-3 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full mb-3"
					>
						<Trophy size={24} />
					</div>
					<p class="text-gray-600 dark:text-gray-400 font-medium">
						{output}
					</p>
				</div>
			{/if}

			<div
				class="flex items-start gap-2 p-4 rounded-lg bg-yellow-50 dark:bg-yellow-900/10 border border-yellow-100 dark:border-yellow-900/20"
			>
				<div
					class="text-yellow-600 dark:text-yellow-500 mt-0.5 flex-shrink-0"
				>
					<Info size={18} />
				</div>
				<p class="text-sm text-yellow-700 dark:text-yellow-500">
					<strong>Plus v Plus:</strong> Deduct one handicap from the
					other and play to 11.<br />
					<strong>Minus v Minus:</strong> Deduct one handicap from the
					other and play to 11 plus difference.<br />
					<strong>Minus v Plus:</strong> Add the plus to the minus
					handicap and play to 11 plus the minus handicap.<br />
					The winner must win by at least 2 points.
				</p>
			</div>
		</div>
	</div>
</div>
