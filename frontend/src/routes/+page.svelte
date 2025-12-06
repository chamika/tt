<script lang="ts">
	import ToolCard from "$lib/components/ToolCard.svelte";
	import { Trophy } from "lucide-svelte";
</script>

<div class="animate-fadeIn">
	<div class="text-center mb-12">
		<h2 class="text-4xl font-extrabold text-gray-900 dark:text-white mb-4">
			Ready to Play
		</h2>
		<p class="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
			Select a tool below to manage your matches, calculate scores, and
			track progress.
		</p>
	</div>

	<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
		<ToolCard
			title="Handicap Calculator"
			description="Fairly match players of different skill levels by calculating starting scores based on handicap points."
			icon="Calculator"
			href="/handicap"
		/>

		<ToolCard
			title="ELTTL Availability Tracker"
			description="Coordinate your ELTTL league matches with you team."
			icon="Calendar"
			href="/availability"
			disabled={true}
			badge="Coming Soon"
		/>

		<ToolCard
			title="Tournament Brackets"
			description="Generate single or double elimination brackets for your local club tournaments."
			icon={Trophy}
			href="/"
			disabled={true}
			badge="Planned"
		/>
	</div>
</div>
