import { describe, it, expect } from 'vitest';
import { matchHandicap } from './handicap';

describe('matchHandicap', () => {
  it('plays off scratch in a ranking tournament, whatever the handicaps', () => {
    expect(matchHandicap('ranking', -10, 10)).toEqual({ start_a: 0, start_b: 0, play_to: 11, warning: null });
    expect(matchHandicap('ranking', null, null)).toEqual({ start_a: 0, start_b: 0, play_to: 11, warning: null });
  });

  it.each([
    // [handicap A, handicap B, start A, start B, play to]
    ['minus v minus', -10, -5, 0, 5, 16],
    ['minus v minus, reversed', -5, -10, 5, 0, 16],
    ['plus v plus', 5, 10, 0, 5, 11],
    ['plus v plus, reversed', 10, 5, 5, 0, 11],
    ['minus v plus', -5, 10, 0, 15, 16],
    ['plus v minus', 10, -5, 15, 0, 16],
    ['equal minus', -5, -5, 0, 0, 11],
    ['equal plus', 5, 5, 0, 0, 11],
    ['both scratch', 0, 0, 0, 0, 11],
    ['scratch v plus', 0, 3, 0, 3, 11],
    ['scratch v minus', 0, -3, 3, 0, 14]
  ])('%s (%i v %i) starts %i-%i and plays to %i', (_, a, b, startA, startB, playTo) => {
    expect(matchHandicap('handicap', a as number, b as number)).toEqual({
      start_a: startA,
      start_b: startB,
      play_to: playTo,
      warning: null
    });
  });

  it('gives the same pairing either way round, mirrored', () => {
    for (let a = -15; a <= 15; a += 3) {
      for (let b = -15; b <= 15; b += 4) {
        const forward = matchHandicap('handicap', a, b);
        const reverse = matchHandicap('handicap', b, a);
        expect([reverse.start_a, reverse.start_b, reverse.play_to]).toEqual([
          forward.start_b,
          forward.start_a,
          forward.play_to
        ]);
      }
    }
  });

  it('warns when a starting score reaches the play-to score', () => {
    const result = matchHandicap('handicap', -10, 15);
    expect(result).toMatchObject({ start_a: 0, start_b: 25, play_to: 21 });
    expect(result.warning).toBe('A player starts on 25 but games are played to 21; check the handicaps');
  });
});
