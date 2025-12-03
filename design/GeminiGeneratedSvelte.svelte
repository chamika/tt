<script>
  import { onMount } from 'svelte';
  // Assuming lucide-svelte is available in the environment
  import { Moon, Sun, Table2, Calendar, ArrowLeft, Calculator, Trophy, Info } from 'lucide-svelte';

  // --- State ---
  let darkMode = false;
  let currentView = 'home'; // 'home' | 'calculator'

  // Calculator State
  let playerA = '';
  let playerB = '';
  let result = null;

  // --- Effects ---

  // Handle Dark Mode toggle
  $: {
    if (typeof document !== 'undefined') {
      if (darkMode) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    }
  }

  // --- Logic ---

  function toggleTheme() {
    darkMode = !darkMode;
  }

  function calculateHandicap() {
    const ratingA = parseInt(playerA) || 0;
    const ratingB = parseInt(playerB) || 0;

    // Simple logic: 1 point for every 50 points difference, capped at 7
    const diff = Math.abs(ratingA - ratingB);
    const points = Math.min(Math.floor(diff / 50), 7);

    const strongerPlayer = ratingA > ratingB ? 'Player A' : 'Player B';
    const weakerPlayer = ratingA > ratingB ? 'Player B' : 'Player A';

    result = {
      points,
      message: points === 0
        ? "Ratings are close. Play scratch (0-0)."
        : `${weakerPlayer} starts with ${points} points.`
    };
  }

  function goBack() {
    currentView = 'home';
    // Optional: reset calculator state
    // result = null;
    // playerA = '';
    // playerB = '';
  }
</script>

<div class="min-h-screen transition-colors duration-300 {darkMode ? 'dark bg-slate-900' : 'bg-gray-50'}">

  <!-- Header -->
  <header class="sticky top-0 z-50 backdrop-blur-md bg-white/80 dark:bg-slate-900/80 border-b border-gray-200 dark:border-slate-800">
    <div class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
      <button
        class="flex items-center gap-3 cursor-pointer group text-left bg-transparent border-none p-0"
        on:click={() => currentView = 'home'}
      >
        <div class="bg-gradient-to-br from-emerald-500 to-blue-600 p-2.5 rounded-xl shadow-lg shadow-emerald-500/20 group-hover:shadow-emerald-500/30 transition-all">
          <Table2 class="text-white" size={24} />
        </div>
        <div>
          <h1 class="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-400">
            Table Tennis Tools
          </h1>
          <p class="text-xs text-gray-500 dark:text-gray-400 font-medium">Player Utilities</p>
        </div>
      </button>

      <button
        on:click={toggleTheme}
        class="p-2.5 rounded-xl bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-slate-700 transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500"
        aria-label="Toggle Theme"
      >
        {#if darkMode}
          <Sun size={20} />
        {:else}
          <Moon size={20} />
        {/if}
      </button>
    </div>
  </header>

  <!-- Main Content Area -->
  <main class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">

    {#if currentView === 'home'}
      <!-- Home View -->
      <div class="animate-fadeIn">
        <div class="text-center mb-12">
          <h2 class="text-4xl font-extrabold text-gray-900 dark:text-white mb-4">
            Elevate Your Game
          </h2>
          <p class="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
            Select a tool below to manage your matches, calculate scores, and track progress.
          </p>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

          <!-- Card 1: Calculator -->
          <div
            on:click={() => currentView = 'calculator'}
            class="relative p-6 rounded-2xl border transition-all duration-300 ease-in-out group cursor-pointer hover:-translate-y-1 hover:shadow-xl dark:bg-slate-800 dark:border-slate-700 dark:hover:border-emerald-500/50 bg-white border-gray-200 hover:border-emerald-500/50 shadow-sm"
          >
            <div class="flex items-start justify-between mb-4">
              <div class="p-3 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400">
                <Calculator size={24} />
              </div>
            </div>
            <h3 class="text-xl font-bold mb-2 text-gray-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
              Handicap Calculator
            </h3>
            <p class="text-gray-600 dark:text-gray-400">
              Fairly match players of different skill levels by calculating starting scores based on rating.
            </p>
          </div>

          <!-- Card 2: Availability (Disabled) -->
          <div
            class="relative p-6 rounded-2xl border transition-all duration-300 ease-in-out group opacity-60 cursor-not-allowed dark:bg-slate-800 dark:border-slate-700 bg-white border-gray-200 shadow-sm"
          >
            <div class="flex items-start justify-between mb-4">
              <div class="p-3 rounded-lg bg-gray-100 dark:bg-slate-700">
                <Calendar size={24} />
              </div>
              <span class="px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300">
                Coming Soon
              </span>
            </div>
            <h3 class="text-xl font-bold mb-2 text-gray-900 dark:text-white transition-colors">
              Availability Tracker
            </h3>
            <p class="text-gray-600 dark:text-gray-400">
              Coordinate with your league or friends to find the best time for your next match.
            </p>
          </div>

          <!-- Card 3: Tournament (Disabled) -->
          <div
            class="relative p-6 rounded-2xl border transition-all duration-300 ease-in-out group opacity-60 cursor-not-allowed dark:bg-slate-800 dark:border-slate-700 bg-white border-gray-200 shadow-sm"
          >
            <div class="flex items-start justify-between mb-4">
              <div class="p-3 rounded-lg bg-gray-100 dark:bg-slate-700">
                <Trophy size={24} />
              </div>
              <span class="px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300">
                Planned
              </span>
            </div>
            <h3 class="text-xl font-bold mb-2 text-gray-900 dark:text-white transition-colors">
              Tournament Brackets
            </h3>
            <p class="text-gray-600 dark:text-gray-400">
              Generate single or double elimination brackets for your local club tournaments.
            </p>
          </div>

        </div>
      </div>

    {:else}
      <!-- Calculator View -->
      <div class="max-w-2xl mx-auto animate-fadeIn">
        <button
          on:click={goBack}
          class="flex items-center text-sm text-gray-500 hover:text-emerald-600 dark:text-gray-400 dark:hover:text-emerald-400 mb-6 transition-colors bg-transparent border-none cursor-pointer"
        >
          <ArrowLeft size={16} class="mr-2" />
          Back to Tools
        </button>

        <div class="bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-gray-200 dark:border-slate-700 overflow-hidden">
          <div class="p-6 border-b border-gray-100 dark:border-slate-700 bg-gray-50 dark:bg-slate-800/50">
            <div class="flex items-center gap-3">
              <div class="p-2 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 rounded-lg">
                <Calculator size={24} />
              </div>
              <h2 class="text-2xl font-bold text-gray-900 dark:text-white">Handicap Calculator</h2>
            </div>
          </div>

          <div class="p-6 space-y-6">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div class="space-y-2">
                <label for="playerA" class="block text-sm font-medium text-gray-700 dark:text-gray-300">Player A Rating</label>
                <input
                  id="playerA"
                  type="number"
                  bind:value={playerA}
                  placeholder="e.g. 1200"
                  class="w-full px-4 py-3 rounded-lg bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-600 focus:ring-2 focus:ring-emerald-500 outline-none text-gray-900 dark:text-white transition-all"
                />
              </div>
              <div class="space-y-2">
                <label for="playerB" class="block text-sm font-medium text-gray-700 dark:text-gray-300">Player B Rating</label>
                <input
                  id="playerB"
                  type="number"
                  bind:value={playerB}
                  placeholder="e.g. 1050"
                  class="w-full px-4 py-3 rounded-lg bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-600 focus:ring-2 focus:ring-emerald-500 outline-none text-gray-900 dark:text-white transition-all"
                />
              </div>
            </div>

            <button
              on:click={calculateHandicap}
              class="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-lg shadow-emerald-500/20 transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer border-none"
            >
              Calculate Handicap
            </button>

            {#if result}
              <div class="mt-6 p-6 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-700 text-center animate-slideUp">
                <div class="inline-flex items-center justify-center p-3 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full mb-3">
                  <Trophy size={24} />
                </div>
                <h3 class="text-3xl font-black text-gray-900 dark:text-white mb-2">
                  {result.points > 0 ? `Start 0 - ${result.points}` : '0 - 0'}
                </h3>
                <p class="text-gray-600 dark:text-gray-400 font-medium">
                  {result.message}
                </p>
              </div>
            {/if}

            <div class="flex items-start gap-2 p-4 rounded-lg bg-yellow-50 dark:bg-yellow-900/10 border border-yellow-100 dark:border-yellow-900/20">
              <div class="text-yellow-600 dark:text-yellow-500 mt-0.5 flex-shrink-0">
                 <Info size={18} />
              </div>
              <p class="text-sm text-yellow-700 dark:text-yellow-500">
                Calculation based on standard league rules: 1 point for every 50 rating points difference, maxing out at 7 points handicap.
              </p>
            </div>
          </div>
        </div>
      </div>
    {/if}

  </main>

  <!-- Footer -->
  <footer class="border-t border-gray-200 dark:border-slate-800 py-8 mt-auto">
    <div class="max-w-6xl mx-auto px-4 text-center">
      <p class="text-gray-500 dark:text-slate-500 text-sm">
        © {new Date().getFullYear()} Table Tennis Tools. Built for the love of the game.
      </p>
    </div>
  </footer>
</div>

<style>
  :global(body) {
    margin: 0;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
  }

  /* Animations */
  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: translateY(0); }
  }
  @keyframes slideUp {
    from { opacity: 0; transform: translateY(20px); }
    to { opacity: 1; transform: translateY(0); }
  }
  .animate-fadeIn {
    animation: fadeIn 0.5s ease-out forwards;
  }
  .animate-slideUp {
    animation: slideUp 0.4s ease-out forwards;
  }
</style>
