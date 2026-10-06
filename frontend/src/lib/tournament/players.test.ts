import { describe, it, expect } from 'vitest';
import { buildPlayerInputs, parsePlayerList, rowsFromPlayers } from './players';

describe('parsePlayerList', () => {
  it('reads one player per line, with an optional value after a comma or tab', () => {
    expect(parsePlayerList('Alice Anderson, -5\nBob Brown\t3\n\n  Charlie Chen  \nPlayer 2')).toEqual([
      { name: 'Alice Anderson', value: '-5' },
      { name: 'Bob Brown', value: '3' },
      { name: 'Charlie Chen', value: '' },
      { name: 'Player 2', value: '' }
    ]);
  });

  it('handles Windows line endings', () => {
    expect(parsePlayerList('A, 1\r\nB, 2').map(r => r.name)).toEqual(['A', 'B']);
  });
});

describe('buildPlayerInputs', () => {
  it('sends values as rankings in ranking mode, blank as no ranking', () => {
    expect(
      buildPlayerInputs(
        [
          { name: ' Ann ', value: '1' },
          { name: 'Bob', value: '' },
          { name: '', value: '7' }
        ],
        'ranking'
      )
    ).toEqual({
      players: [
        { name: 'Ann', ranking: 1 },
        { name: 'Bob', ranking: null }
      ],
      error: null
    });
  });

  it('sends values as handicaps in handicap mode', () => {
    expect(buildPlayerInputs([{ name: 'Ann', value: '-10' }], 'handicap').players).toEqual([
      { name: 'Ann', handicap: -10 }
    ]);
  });

  it('rejects a value that is not a whole number', () => {
    expect(buildPlayerInputs([{ name: 'Ann', value: '2.5' }], 'handicap')).toEqual({
      players: null,
      error: 'Handicap for Ann must be a whole number'
    });
  });
});

describe('rowsFromPlayers', () => {
  it('shows the value for the mode', () => {
    const players = [
      { name: 'Ann', ranking: 1, handicap: null },
      { name: 'Bob', ranking: null, handicap: -3 }
    ];
    expect(rowsFromPlayers(players, 'ranking')).toEqual([
      { name: 'Ann', value: '1' },
      { name: 'Bob', value: '' }
    ]);
    expect(rowsFromPlayers(players, 'handicap')[1]).toEqual({ name: 'Bob', value: '-3' });
  });
});
