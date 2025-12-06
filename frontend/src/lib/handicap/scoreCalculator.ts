
export interface ScoreResult {
    startingScorePlayer1: number;
    startingScorePlayer2: number;
    playToScore: number;
    output: string;
}

export function calculateScores(handicap1: number | null, handicap2: number | null): ScoreResult {
    if (handicap1 === null || handicap2 === null || isNaN(handicap1) || isNaN(handicap2)) {
        return {
            output: 'Please enter valid handicaps for both players.',
            startingScorePlayer1: 0,
            startingScorePlayer2: 0,
            playToScore: 11
        };
    }

    const h1 = handicap1;
    const h2 = handicap2;
    let startingScorePlayer1 = 0;
    let startingScorePlayer2 = 0;
    let playToScore = 11;
    let output = '';

    if (h1 < 0 && h2 < 0) {
        // Minus v Minus: deduct one handicap from the other and play to 11 plus difference.
        const difference = Math.abs(h1 - h2);
        startingScorePlayer1 = h1 > h2 ? difference : 0;
        startingScorePlayer2 = h1 < h2 ? difference : 0;
        playToScore = 11 + difference;
        output = `Minus v Minus: Start at ${startingScorePlayer1}-${startingScorePlayer2} and play to ${playToScore}`;
    } else if (h1 >= 0 && h2 >= 0) {
        // Plus v Plus: deduct one handicap from the other and play to 11.
        const difference = Math.abs(h1 - h2);
        startingScorePlayer1 = h1 < h2 ? 0 : difference;
        startingScorePlayer2 = h1 > h2 ? 0 : difference;
        playToScore = 11; // Reset playToScore for this case
        output = `Plus v Plus: Start at ${startingScorePlayer1}-${startingScorePlayer2} and play to 11`;
    } else {
        // (h1 < 0 && h2 >= 0) || (h1 >= 0 && h2 < 0) - Minus v Plus
        // Minus v Plus: add the plus to the minus handicap and play to 11 plus the minus handicap.
        const plusHandicap = Math.max(h1, h2);
        const minusHandicap = Math.abs(Math.min(h1, h2));
        const total = minusHandicap + plusHandicap;
        startingScorePlayer1 = h1 < h2 ? 0 : total;
        startingScorePlayer2 = h1 > h2 ? 0 : total;
        playToScore = 11 + minusHandicap; // Use absolute value
        output = `Minus v Plus: Start at ${startingScorePlayer1}-${startingScorePlayer2} and play to ${playToScore}`;
    }

    return {
        startingScorePlayer1,
        startingScorePlayer2,
        playToScore,
        output
    };
}
