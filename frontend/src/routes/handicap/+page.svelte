<script lang="ts">
    let handicap1: number | null = null;
    let handicap2: number | null = null;
    let startingScorePlayer1 = 0;
    let startingScorePlayer2 = 0;
    let playToScore = 11;
    let output = '';

    function calculateScores() {
        if (handicap1 === null || handicap2 === null || isNaN(handicap1) || isNaN(handicap2)) {
            output = 'Please enter valid handicaps for both players.';
            startingScorePlayer1 = 0;
            startingScorePlayer2 = 0;
            playToScore = 11;
            return;
        }

        let h1 = handicap1;
        let h2 = handicap2;

        if (h1 < 0 && h2 < 0) {
            // Minus v Minus: deduct one handicap from the other and play to 11 plus difference.
            let difference = Math.abs(h1 - h2);
            startingScorePlayer1 = h1 > h2 ? 0 : difference;
            startingScorePlayer2 = h1 < h2 ? 0 : difference;
            playToScore = 11 + difference;
            output = `Minus v Minus: Start at ${startingScorePlayer1}-${startingScorePlayer2} and play to ${playToScore}`;
        } else if (h1 >= 0 && h2 >= 0) {
            // Plus v Plus: deduct one handicap from the other and play to 11.
            let difference = Math.abs(h1 - h2);
            startingScorePlayer1 = h1 < h2 ? 0 : difference;
            startingScorePlayer2 = h1 > h2 ? 0 : difference;
            playToScore = 11; // Reset playToScore for this case
            output = `Plus v Plus: Start at ${startingScorePlayer1}-${startingScorePlayer2} and play to 11`;
        } else { // (h1 < 0 && h2 >= 0) || (h1 >= 0 && h2 < 0) - Minus v Plus
            // Minus v Plus: add the plus to the minus handicap and play to 11 plus the minus handicap.
            let plusHandicap = Math.max(h1, h2);
            let minusHandicap = Math.abs(Math.min(h1, h2));
            let total = minusHandicap + plusHandicap;
            startingScorePlayer1 = h1 < h2 ? 0 : total;
            startingScorePlayer2 = h1 > h2 ? 0 : total;
            playToScore = 11 + minusHandicap; // Use absolute value
            output = `Minus v Plus: Start at ${startingScorePlayer1}-${startingScorePlayer2} and play to ${playToScore}`;
        }

        // Always require 2-point difference to win.
        output += `<br>The winner must win by at least 2 points.`;
    }
</script>

<div class="container">
    <h1>Handicap Scoring Calculator</h1>
    <label for="handicap1">Player 1 Handicap:</label>
    <input type="number" id="handicap1" placeholder="Enter handicap" bind:value={handicap1} /><br/>

    <label for="handicap2">Player 2 Handicap:</label>
    <input type="number" id="handicap2" placeholder="Enter handicap" bind:value={handicap2} /><br/>

    <button on:click={calculateScores}>Calculate Scores</button>

    <div class="output">
        {@html output}
    </div>
</div>

<style>
    .container {
        max-width: 500px;
        margin: 0 auto;
        text-align: center;
    }
    input {
        padding: 5px;
        margin: 10px;
        width: 100px;
    }
    button {
        padding: 10px 20px;
        margin-top: 20px;
        cursor: pointer;
    }
    .output {
        margin-top: 20px;
    }
</style>
