
import { describe, it, expect } from 'vitest';
import { calculateScores } from './scoreCalculator';

describe('calculateScores', () => {
    it('should return error message for invalid inputs', () => {
        let result = calculateScores(null, 5);
        expect(result.output).toBe('Please enter valid handicaps for both players.');

        result = calculateScores(5, null);
        expect(result.output).toBe('Please enter valid handicaps for both players.');

        result = calculateScores(NaN, 5);
        expect(result.output).toBe('Please enter valid handicaps for both players.');
    });

    describe('Minus v Minus', () => {
        it('should calculate correctly when h1 < h2 both negative', () => {
            // H1 = -10, H2 = -5
            // Difference = 5
            // h1 < h2 -> P1 starts at 0, P2 starts at 5
            // playTo = 11 + 5 = 16
            const result = calculateScores(-10, -5);
            expect(result.startingScorePlayer1).toBe(0);
            expect(result.startingScorePlayer2).toBe(5);
            expect(result.playToScore).toBe(16);
            expect(result.output).toContain('Minus v Minus');
        });

        it('should calculate correctly when h1 > h2 both negative', () => {
            // H1 = -5, H2 = -10
            // Difference = 5
            // h1 > h2 -> P1 starts at 5, P2 starts at 0
            // playTo = 11 + 5 = 16
            const result = calculateScores(-5, -10);
            expect(result.startingScorePlayer1).toBe(5);
            expect(result.startingScorePlayer2).toBe(0);
            expect(result.playToScore).toBe(16);
            expect(result.output).toContain('Minus v Minus');
        });
    });

    describe('Plus v Plus', () => {
        it('should calculate correctly when h1 < h2 both positive', () => {
            // H1 = 5, H2 = 10
            // Difference = 5
            // h1 < h2 -> P1 starts at 0, P2 starts at 5
            // playTo = 11
            const result = calculateScores(5, 10);
            expect(result.startingScorePlayer1).toBe(0);
            expect(result.startingScorePlayer2).toBe(5);
            expect(result.playToScore).toBe(11);
            expect(result.output).toContain('Plus v Plus');
        });

        it('should calculate correctly when h1 > h2 both positive', () => {
            // H1 = 10, H2 = 5
            // Difference = 5
            // h1 > h2 -> P1 starts at 5, P2 starts at 0
            // playTo = 11
            const result = calculateScores(10, 5);
            expect(result.startingScorePlayer1).toBe(5);
            expect(result.startingScorePlayer2).toBe(0);
            expect(result.playToScore).toBe(11);
            expect(result.output).toContain('Plus v Plus');
        });
    });

    describe('Minus v Plus', () => {
        it('should calculate correctly when h1 is minus and h2 is plus', () => {
            // H1 = -5, H2 = 10
            // PlusHandicap = 10, MinusHandicap = 5
            // Total = 15
            // h1 < h2 -> P1 starts at 0, P2 starts at 15
            // playTo = 11 + 5 = 16
            const result = calculateScores(-5, 10);
            expect(result.startingScorePlayer1).toBe(0);
            expect(result.startingScorePlayer2).toBe(15); // Logic says: startingScorePlayer1 = h1 < h2 ? 0 : total; h1(-5) < h2(10) is true, so P1=0, P2=total(15)
            expect(result.playToScore).toBe(16);
            expect(result.output).toContain('Minus v Plus');
        });

        it('should calculate correctly when h1 is plus and h2 is minus', () => {
            // H1 = 10, H2 = -5
            // PlusHandicap = 10, MinusHandicap = 5
            // Total = 15
            // h1 > h2 -> P1 starts at 15, P2 starts at 0
            // playTo = 11 + 5 = 16
            const result = calculateScores(10, -5);
            expect(result.startingScorePlayer1).toBe(15);
            expect(result.startingScorePlayer2).toBe(0);
            expect(result.playToScore).toBe(16);
            expect(result.output).toContain('Minus v Plus');
        });
    });
});
