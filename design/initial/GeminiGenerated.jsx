import React, { useState, useEffect } from 'react';
import { Moon, Sun, Table2, Calendar, ArrowLeft, Calculator, Trophy, Info } from 'lucide-react';

// --- Components ---

/**
 * Simple Card Component for the Grid
 */
const ToolCard = ({ title, description, icon: Icon, onClick, badge, disabled }) => (
  <div 
    onClick={!disabled ? onClick : undefined}
    className={`
      relative p-6 rounded-2xl border transition-all duration-300 ease-in-out group
      ${disabled ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer hover:-translate-y-1 hover:shadow-xl'}
      dark:bg-slate-800 dark:border-slate-700 dark:hover:border-emerald-500/50
      bg-white border-gray-200 hover:border-emerald-500/50 shadow-sm
    `}
  >
    <div className="flex items-start justify-between mb-4">
      <div className={`p-3 rounded-lg ${disabled ? 'bg-gray-100 dark:bg-slate-700' : 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400'}`}>
        <Icon size={24} />
      </div>
      {badge && (
        <span className="px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300">
          {badge}
        </span>
      )}
    </div>
    <h3 className="text-xl font-bold mb-2 text-gray-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
      {title}
    </h3>
    <p className="text-gray-600 dark:text-gray-400">
      {description}
    </p>
  </div>
);

/**
 * Handicap Calculator Tool View
 */
const HandicapCalculator = ({ onBack }) => {
  const [playerA, setPlayerA] = useState('');
  const [playerB, setPlayerB] = useState('');
  const [result, setResult] = useState(null);

  const calculateHandicap = () => {
    const ratingA = parseInt(playerA) || 0;
    const ratingB = parseInt(playerB) || 0;
    
    // Simple logic: 1 point for every 50 points difference, capped at 7
    const diff = Math.abs(ratingA - ratingB);
    const points = Math.min(Math.floor(diff / 50), 7);
    
    const strongerPlayer = ratingA > ratingB ? 'Player A' : 'Player B';
    const weakerPlayer = ratingA > ratingB ? 'Player B' : 'Player A';

    setResult({
      points,
      message: points === 0 
        ? "Ratings are close. Play scratch (0-0)." 
        : `${weakerPlayer} starts with ${points} points.`
    });
  };

  return (
    <div className="max-w-2xl mx-auto animate-fadeIn">
      <button 
        onClick={onBack}
        className="flex items-center text-sm text-gray-500 hover:text-emerald-600 dark:text-gray-400 dark:hover:text-emerald-400 mb-6 transition-colors"
      >
        <ArrowLeft size={16} className="mr-2" />
        Back to Tools
      </button>

      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-gray-200 dark:border-slate-700 overflow-hidden">
        <div className="p-6 border-b border-gray-100 dark:border-slate-700 bg-gray-50 dark:bg-slate-800/50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 rounded-lg">
              <Calculator size={24} />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Handicap Calculator</h2>
          </div>
        </div>

        <div className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Player A Rating</label>
              <input
                type="number"
                value={playerA}
                onChange={(e) => setPlayerA(e.target.value)}
                placeholder="e.g. 1200"
                className="w-full px-4 py-3 rounded-lg bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-600 focus:ring-2 focus:ring-emerald-500 outline-none text-gray-900 dark:text-white transition-all"
              />
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Player B Rating</label>
              <input
                type="number"
                value={playerB}
                onChange={(e) => setPlayerB(e.target.value)}
                placeholder="e.g. 1050"
                className="w-full px-4 py-3 rounded-lg bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-600 focus:ring-2 focus:ring-emerald-500 outline-none text-gray-900 dark:text-white transition-all"
              />
            </div>
          </div>

          <button
            onClick={calculateHandicap}
            className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-lg shadow-emerald-500/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            Calculate Handicap
          </button>

          {result && (
            <div className="mt-6 p-6 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-700 text-center animate-slideUp">
              <div className="inline-flex items-center justify-center p-3 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full mb-3">
                <Trophy size={24} />
              </div>
              <h3 className="text-3xl font-black text-gray-900 dark:text-white mb-2">
                {result.points > 0 ? `Start 0 - ${result.points}` : '0 - 0'}
              </h3>
              <p className="text-gray-600 dark:text-gray-400 font-medium">
                {result.message}
              </p>
            </div>
          )}
          
          <div className="flex items-start gap-2 p-4 rounded-lg bg-yellow-50 dark:bg-yellow-900/10 border border-yellow-100 dark:border-yellow-900/20">
            <Info size={18} className="text-yellow-600 dark:text-yellow-500 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-yellow-700 dark:text-yellow-500">
              Calculation based on standard league rules: 1 point for every 50 rating points difference, maxing out at 7 points handicap.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

// --- Main App Component ---

export default function App() {
  const [darkMode, setDarkMode] = useState(false);
  const [currentView, setCurrentView] = useState('home');

  // Toggle Dark Mode class on body/html
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  return (
    <div className={`min-h-screen transition-colors duration-300 ${darkMode ? 'dark bg-slate-900' : 'bg-gray-50'}`}>
      
      {/* Header */}
      <header className="sticky top-0 z-50 backdrop-blur-md bg-white/80 dark:bg-slate-900/80 border-b border-gray-200 dark:border-slate-800">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <div 
            className="flex items-center gap-3 cursor-pointer group"
            onClick={() => setCurrentView('home')}
          >
            <div className="bg-gradient-to-br from-emerald-500 to-blue-600 p-2.5 rounded-xl shadow-lg shadow-emerald-500/20 group-hover:shadow-emerald-500/30 transition-all">
              <Table2 className="text-white" size={24} />
            </div>
            <div>
              <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-400">
                Table Tennis Tools
              </h1>
              <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">Player Utilities</p>
            </div>
          </div>

          <button
            onClick={() => setDarkMode(!darkMode)}
            className="p-2.5 rounded-xl bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-slate-700 transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500"
            aria-label="Toggle Theme"
          >
            {darkMode ? <Sun size={20} /> : <Moon size={20} />}
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        
        {currentView === 'home' ? (
          <div className="animate-fadeIn">
            <div className="text-center mb-12">
              <h2 className="text-4xl font-extrabold text-gray-900 dark:text-white mb-4">
                Elevate Your Game
              </h2>
              <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
                Select a tool below to manage your matches, calculate scores, and track progress.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <ToolCard
                title="Handicap Calculator"
                description="Fairly match players of different skill levels by calculating starting scores based on rating."
                icon={Calculator}
                onClick={() => setCurrentView('calculator')}
              />
              
              <ToolCard
                title="Availability Tracker"
                description="Coordinate with your league or friends to find the best time for your next match."
                icon={Calendar}
                disabled={true}
                badge="Coming Soon"
              />
              
              {/* Added a dummy card to fill out the grid for visual balance */}
              <ToolCard
                title="Tournament Brackets"
                description="Generate single or double elimination brackets for your local club tournaments."
                icon={Trophy}
                disabled={true}
                badge="Planned"
              />
            </div>
          </div>
        ) : (
          <HandicapCalculator onBack={() => setCurrentView('home')} />
        )}

      </main>

      {/* Footer */}
      <footer className="border-t border-gray-200 dark:border-slate-800 py-8 mt-auto">
        <div className="max-w-6xl mx-auto px-4 text-center">
          <p className="text-gray-500 dark:text-slate-500 text-sm">
            © {new Date().getFullYear()} Table Tennis Tools. Built for the love of the game.
          </p>
        </div>
      </footer>

      {/* Styles for simple animations */}
      <style>{`
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
      `}</style>
    </div>
  );
}