import { describe, it, expect } from 'vitest';
import type { Rubber, TeamMatchView } from '$lib/types/teamMatch';
import { formatGames, outcomeText, pairOptions, sideText, statusText } from './card';
import { pathForLink } from '../tournament/links';

function view(overrides: Partial<TeamMatchView>): TeamMatchView {
  return {
    match: {
      id: 'tm',
      title: null,
      match_date: null,
      home_team: 'Hornets',
      away_team: 'Wasps',
      home_players: ['Ann', 'Bea', 'Cat'],
      away_players: ['Xan', 'Yaz', 'Zoe'],
      created_at: 0,
      updated_at: 0
    },
    home_players: [],
    away_players: [],
    rubbers: Array.from({ length: 10 }, (_, i) => ({
      number: i + 1,
      is_doubles: i === 6,
      home: { labels: [], names: [] },
      away: { labels: [], names: [] },
      result: null,
      running: null
    })),
    score: { home: 0, away: 0 },
    played: 0,
    status: 'not_started',
    outcome: null,
    ...overrides
  };
}

describe('pairOptions', () => {
  it('lists every pair of the three players', () => {
    expect(pairOptions(['A', 'B', 'C'])).toEqual(['AB', 'AC', 'BC']);
    expect(pairOptions(['X', 'Y', 'Z'])).toEqual(['XY', 'XZ', 'YZ']);
  });
});

describe('formatGames', () => {
  it('writes home first, like the card', () => {
    const rubber = { game_scores: [{ a: 11, b: 7 }, { a: 9, b: 11 }, { a: 12, b: 10 }] } as Rubber;
    expect(formatGames(rubber)).toBe('11-7, 9-11, 12-10');
  });
});

describe('sideText', () => {
  it('names singles and doubles players, or the team before the doubles is entered', () => {
    expect(sideText({ labels: ['A'], names: ['Ann'] }, 'Hornets')).toBe('Ann');
    expect(sideText({ labels: ['A', 'C'], names: ['Ann', 'Cat'] }, 'Hornets')).toBe('Ann & Cat');
    expect(sideText({ labels: [], names: [] }, 'Hornets')).toBe('Hornets');
  });
});

describe('outcomeText and statusText', () => {
  it('says nothing until the match is complete', () => {
    expect(outcomeText(view({ status: 'in_progress', played: 4, score: { home: 3, away: 1 } }))).toBeNull();
    expect(statusText(view({ status: 'in_progress', played: 4 }))).toBe('4 of 10 played');
    expect(statusText(view({}))).toBe('Not started');
  });

  it('names the winner with their score first, or the draw', () => {
    const done = { status: 'completed' as const, played: 10 };
    expect(outcomeText(view({ ...done, outcome: 'home', score: { home: 6, away: 4 } }))).toBe('Hornets win 6–4');
    expect(outcomeText(view({ ...done, outcome: 'away', score: { home: 3, away: 7 } }))).toBe('Wasps win 7–3');
    expect(outcomeText(view({ ...done, outcome: 'draw', score: { home: 5, away: 5 } }))).toBe('Draw 5–5');
    expect(statusText(view(done))).toBe('Completed');
  });
});

describe('pathForLink', () => {
  const id = '1234abcd-1234-4abc-8def-1234567890ab';
  it('opens team match links as team matches and anything else as a tournament', () => {
    expect(pathForLink(`https://tabletennis.pages.dev/team-match/${id}`)).toBe(`/team-match/${id}`);
    expect(pathForLink(`https://tabletennis.pages.dev/tournament/${id}`)).toBe(`/tournament/${id}`);
    expect(pathForLink(`  ${id} `)).toBe(`/tournament/${id}`);
    expect(pathForLink('not a link')).toBeNull();
  });
});
