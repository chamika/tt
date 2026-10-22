<!-- Enter, correct or clear one rubber of a team match; the doubles also picks each side's pair -->
<script lang="ts">
	import { Loader2, Minus, Plus } from 'lucide-svelte';
	import type { RubberInput, RubberView, TeamMatch } from '$lib/types/teamMatch';
	import { AWAY_LABELS, BEST_OF, HOME_LABELS } from '$lib/types/teamMatch';
	import { pairOptions } from '$lib/teamMatch/card';
	import { checkGames, gamesToWin, otherSideAfterTyping, rowsWanted, type GameEntry } from '$lib/tournament/scores';
	import type { GameRules } from '../../../../../shared/tournament/gameRules';

	let {
		rubber,
		match,
		saving = false,
		error = null,
		onSave,
		onClear,
		onCancel
	}: {
		rubber: RubberView;
		match: TeamMatch;
		saving?: boolean;
		error?: string | null;
		onSave: (input: RubberInput) => void;
		onClear: () => void;
		onCancel: () => void;
	} = $props();

	// Every rubber is played off scratch
	const rules: GameRules = { start_a: 0, start_b: 0, play_to: 11, warning: null };
	const start = { a: 0, b: 0 };
	const stored = rubber.result;

	let homePair = $state(stored?.home_pair ?? '');
	let awayPair = $state(stored?.away_pair ?? '');

	const pairNames = (pair: string, labels: readonly string[], players: string[]) =>
		pair
			.split('')
			.map((l) => players[labels.indexOf(l)])
			.join(' & ');

	const nameA = $derived(
		rubber.is_doubles
			? homePair
				? pairNames(homePair, HOME_LABELS, match.home_players)
				: match.home_team
			: rubber.home.names[0]
	);
	const nameB = $derived(
		rubber.is_doubles
			? awayPair
				? pairNames(awayPair, AWAY_LABELS, match.away_players)
				: match.away_team
			: rubber.away.names[0]
	);

	let games = $state<GameEntry[]>(
		stored ? stored.game_scores.map((g) => ({ ...g })) : Array.from({ length: gamesToWin(BEST_OF) }, () => ({ ...start }))
	);
	// Boxes someone typed in. Only the others are filled in for them, and a stored
	// result being corrected counts as typed, so nothing it says is overwritten
	let typed = $state(games.map(() => ({ a: !!stored, b: !!stored })));
	// The game being typed in; what's wrong with it waits until the person moves on
	let activeRow = $state<number | null>(null);

	const checkNow = () => checkGames(games, BEST_OF, rules, { a: nameA, b: nameB });
	const check = $derived(checkNow());
	const finished = $derived(check.decidedAt !== null && check.problems.every((p) => p === null));
	const pairsChosen = $derived(!rubber.is_doubles || (homePair !== '' && awayPair !== ''));

	function enter(i: number, side: 'a' | 'b', e: Event) {
		const raw = (e.currentTarget as HTMLInputElement).valueAsNumber;
		const value = Number.isNaN(raw) ? null : raw;
		const other = side === 'a' ? 'b' : 'a';
		games[i][side] = value;
		typed[i][side] = true;
		if (!typed[i][other]) {
			games[i][other] = otherSideAfterTyping(value, start[other], rules.play_to);
		}
		settleRows();
	}

	/** Add the next game while the rubber is open; drop blank games after it's won */
	function settleRows() {
		const wanted = rowsWanted(checkNow(), BEST_OF, (i) => !typed[i].a && !typed[i].b);
		while (games.length > wanted) removeGame();
		while (games.length < wanted) addGame();
	}

	function addGame() {
		games.push({ ...start });
		typed.push({ a: false, b: false });
	}

	function removeGame() {
		games.pop();
		typed.pop();
	}

	function save() {
		onSave({
			game_scores: games.map((g) => ({ a: Number(g.a), b: Number(g.b) })),
			...(rubber.is_doubles ? { home_pair: homePair, away_pair: awayPair } : {})
		});
	}

	function close() {
		if (!saving) onCancel();
	}

	// A tap would put the caret mid-number, so take the whole value
	function selectAll(e: FocusEvent) {
		const input = e.currentTarget as HTMLInputElement;
		requestAnimationFrame(() => input.select());
	}

	// The visible area above the on-screen keyboard. iOS overlays the keyboard on
	// fixed elements instead of resizing them, so the dialog follows this instead
	let viewport = $state<{ top: number; height: number } | null>(null);
	$effect(() => {
		const vv = window.visualViewport;
		if (!vv) return;
		const update = () => (viewport = { top: vv.offsetTop, height: vv.height });
		update();
		vv.addEventListener('resize', update);
		vv.addEventListener('scroll', update);
		return () => {
			vv.removeEventListener('resize', update);
			vv.removeEventListener('scroll', update);
		};
	});

	// Keep the page behind still while the dialog scrolls on a phone
	$effect(() => {
		const previous = document.body.style.overflow;
		document.body.style.overflow = 'hidden';
		return () => {
			document.body.style.overflow = previous;
		};
	});

	const inputClass =
		'w-full px-3 py-2.5 rounded-lg bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-600 focus:ring-2 focus:ring-emerald-500 outline-none text-gray-900 dark:text-white text-center tabular-nums disabled:opacity-60';
</script>

{#snippet pairPicker(
	side: 'home' | 'away',
	team: string,
	labels: readonly string[],
	players: string[],
	selected: string,
	select: (pair: string) => void
)}
	<div>
		<p class="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 truncate">{team} pair</p>
		<div class="grid grid-cols-1 gap-1.5" role="radiogroup" aria-label="{team} pair" data-testid="pair-{side}">
			{#each pairOptions(labels) as pair (pair)}
				<button
					type="button"
					role="radio"
					aria-checked={selected === pair}
					disabled={saving}
					onclick={() => select(pair)}
					class="px-3 py-2 rounded-lg border text-sm text-left truncate transition-colors {selected === pair
						? 'border-emerald-600 bg-emerald-50 text-emerald-800 dark:border-emerald-400 dark:bg-emerald-900/30 dark:text-emerald-200'
						: 'border-gray-200 text-gray-700 hover:bg-gray-50 dark:border-slate-600 dark:text-gray-300 dark:hover:bg-slate-700'}"
				>
					<span class="font-semibold mr-1">{pair.split('').join(' & ')}</span>
					<span class="text-xs">{pairNames(pair, labels, players)}</span>
				</button>
			{/each}
		</div>
	</div>
{/snippet}

<div
	class="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center sm:p-4 z-50"
	style={viewport ? `top: ${viewport.top}px; height: ${viewport.height}px; bottom: auto` : undefined}
	role="presentation"
	onclick={close}
	onkeydown={(e) => e.key === 'Escape' && close()}
>
	<div
		class="bg-white dark:bg-slate-800 rounded-t-2xl sm:rounded-2xl max-w-md w-full max-h-[calc(100%-1.5rem)] flex flex-col p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:p-6"
		role="dialog"
		aria-modal="true"
		aria-labelledby="rubber-dialog-title"
		tabindex="-1"
		onclick={(e) => e.stopPropagation()}
		onkeydown={(e) => {
			if (e.key !== 'Escape') e.stopPropagation();
		}}
	>
		<p class="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
			Rubber {rubber.number} · {rubber.is_doubles ? 'Doubles' : `${rubber.home.labels[0]} v ${rubber.away.labels[0]}`}
		</p>
		<h3 id="rubber-dialog-title" class="text-lg font-semibold text-gray-900 dark:text-white mb-1 break-words">
			{nameA} v {nameB}
		</h3>
		<p class="text-sm text-gray-600 dark:text-gray-400">Best of {BEST_OF} · home score first</p>

		<form
			class="mt-4 flex-1 min-h-0 flex flex-col"
			onsubmit={(e) => {
				e.preventDefault();
				save();
			}}
		>
			<div class="flex-1 min-h-0 overflow-y-auto overscroll-contain -mx-1 px-1 pb-1">
				{#if rubber.is_doubles}
					<div class="grid grid-cols-2 gap-3 mb-4">
						{@render pairPicker('home', match.home_team, HOME_LABELS, match.home_players, homePair, (p) => (homePair = p))}
						{@render pairPicker('away', match.away_team, AWAY_LABELS, match.away_players, awayPair, (p) => (awayPair = p))}
					</div>
				{/if}

				<div class="grid grid-cols-[4rem_1fr_1fr] gap-2 items-center text-sm">
					<span></span>
					<span class="text-center font-medium text-gray-700 dark:text-gray-300 truncate">{nameA}</span>
					<span class="text-center font-medium text-gray-700 dark:text-gray-300 truncate">{nameB}</span>
					{#each games as game, i (i)}
						{@const problem = (typed[i].a || typed[i].b) && activeRow !== i ? check.problems[i] : null}
						<label for="game-{i}-a" class="text-gray-500 dark:text-gray-400">Game {i + 1}</label>
						{#each [['a', nameA], ['b', nameB]] as const as [side, name] (side)}
							<input
								id={side === 'a' ? `game-${i}-a` : undefined}
								type="number"
								inputmode="numeric"
								min="0"
								aria-label="Game {i + 1} {name}"
								aria-invalid={problem ? 'true' : undefined}
								aria-describedby={problem ? `game-${i}-problem` : undefined}
								value={game[side]}
								oninput={(e) => enter(i, side, e)}
								onfocus={(e) => ((activeRow = i), selectAll(e))}
								onblur={() => (activeRow = null)}
								disabled={saving}
								class="{inputClass} {problem ? 'border-red-400 dark:border-red-500' : ''}"
							/>
						{/each}
						{#if problem}
							<p id="game-{i}-problem" class="col-span-3 -mt-1 text-xs text-red-700 dark:text-red-400" data-testid="game-problem">
								{problem}
							</p>
						{/if}
					{/each}
				</div>
				<div class="mt-3 flex items-center justify-between text-sm">
					<span class="tabular-nums" data-testid="rubber-tally">
						{#if finished}
							<span class="font-semibold text-emerald-700 dark:text-emerald-400">
								{check.won.a > check.won.b ? nameA : nameB} wins {Math.max(check.won.a, check.won.b)}–{Math.min(
									check.won.a,
									check.won.b
								)}
							</span>
						{:else}
							<span class="text-gray-600 dark:text-gray-400">
								Games {check.won.a}–{check.won.b} · first to {gamesToWin(BEST_OF)}
							</span>
						{/if}
					</span>
					<div class="flex gap-2">
						{#if games.length > 1}
							<button
								type="button"
								onclick={removeGame}
								aria-label="Remove a game"
								class="flex items-center gap-1 px-3 py-2 rounded-md text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-slate-700"
							>
								<Minus size={14} /> Game
							</button>
						{/if}
						{#if games.length < BEST_OF}
							<button
								type="button"
								onclick={addGame}
								aria-label="Add a game"
								class="flex items-center gap-1 px-3 py-2 rounded-md text-emerald-700 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-900/30"
							>
								<Plus size={14} /> Game
							</button>
						{/if}
					</div>
				</div>

				{#if finished && !pairsChosen}
					<p class="mt-3 text-sm text-amber-700 dark:text-amber-400">Choose who played the doubles for each team.</p>
				{/if}

				{#if error}
					<div class="mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900/30 rounded-lg" role="alert">
						<p class="text-sm text-red-700 dark:text-red-400">{error}</p>
					</div>
				{/if}
			</div>

			<div class="pt-4 mt-2 border-t border-gray-100 dark:border-slate-700 flex flex-wrap items-center justify-end gap-2">
				{#if stored}
					<button
						type="button"
						onclick={onClear}
						disabled={saving}
						class="mr-auto px-3 py-2.5 text-sm text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20 rounded-lg disabled:opacity-50"
					>
						Clear result
					</button>
				{/if}
				<button
					type="button"
					onclick={close}
					disabled={saving}
					class="px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-slate-700 rounded-lg disabled:opacity-50"
				>
					Cancel
				</button>
				<button
					type="submit"
					disabled={saving || !finished || !pairsChosen}
					class="flex items-center gap-2 px-5 py-2.5 text-sm font-medium bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
				>
					{#if saving}<Loader2 size={16} class="animate-spin" />{/if}
					Save rubber
				</button>
			</div>
		</form>
	</div>
</div>
