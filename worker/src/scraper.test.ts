import { describe, it, expect, vi, beforeEach } from 'vitest';
import { scrapeELTTLTeam } from './scraper';

// Mock HTML samples
const mockValidHTML = `
<!DOCTYPE html>
<html>
<head><title>Test Team IV (TT4) - ELTTL</title></head>
<body>
  <h1>Test Team IV (TT4)</h1>
  
  <h2>Team Members</h2>
  <ul>
    <li><a href="/people/view/1051">Player A</a></li>
    <li><a href="/people/view/1056">Player B</a></li>
    <li><a href="/people/view/209">Player C</a></li>
    <li><a href="/people/view/1267">Player D</a></li>
    <li><a href="/people/view/1053">Player E</a></li>
  </ul>
  
  <h2>Fixture List</h2>
  <table>
    <thead>
      <tr>
        <th>Date</th>
        <th>Time</th>
        <th>Home</th>
        <th>Score</th>
        <th>Away</th>
        <th>Notes</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>Sep 16</td>
        <td>Tue 18:45</td>
        <td>Opposition Team A</td>
        <td>1 - 9</td>
        <td>Test Team IV</td>
        <td></td>
      </tr>
      <tr>
        <td>Sep 24</td>
        <td>Wed 18:45</td>
        <td>Test Team IV</td>
        <td>8 - 2</td>
        <td>Opposition Team B</td>
        <td></td>
      </tr>
      <tr>
        <td>Sep 29</td>
        <td>Mon 18:30</td>
        <td>Opposition Team C @ VENUE1</td>
        <td>4 - 6</td>
        <td>Test Team IV</td>
        <td></td>
      </tr>
      <tr>
        <td>Oct 06</td>
        <td>-- Oct 12</td>
        <td>FREE WEEK - no match scheduled</td>
        <td></td>
        <td></td>
        <td></td>
      </tr>
      <tr>
        <td>Jan 7</td>
        <td>Wed 18:45</td>
        <td>Test Team IV</td>
        <td></td>
        <td>Opposition Team D</td>
        <td>Rescheduled</td>
      </tr>
    </tbody>
  </table>
</body>
</html>
`;

const mockNoPlayersHTML = `
<!DOCTYPE html>
<html>
<head><title>Test Team - ELTTL</title></head>
<body>
  <h1>Test Team</h1>
  <h2>Team Members</h2>
  <p>No players available</p>
  <h2>Fixture List</h2>
  <table>
    <tr>
      <td>Sep 16</td>
      <td>Tue 18:45</td>
      <td>Home Team</td>
      <td>1 - 9</td>
      <td>Away Team</td>
    </tr>
  </table>
</body>
</html>
`;

const mockNoFixturesHTML = `
<!DOCTYPE html>
<html>
<head><title>Test Team - ELTTL</title></head>
<body>
  <h1>Test Team</h1>
  <h2>Team Members</h2>
  <ul>
    <li><a href="/people/view/1">Player One</a></li>
    <li><a href="/people/view/2">Player Two</a></li>
  </ul>
  <h2>Fixture List</h2>
  <p>No fixtures scheduled</p>
</body>
</html>
`;

// Mirrors the markup ELTTL uses on a real team page: the squad and the players
// who have left share the same row markup, separated only by a heading row.
// Note the unclosed <tr> on the heading row - that is how ELTTL emits it.
const mockHTMLWithFormerMembers = `
<!DOCTYPE html>
<html>
<body>
  <h1>Penicuik III (Pen. 3)</h1>

  <div class="field">
    <label for="teamCaptainList">Team Secretary</label>
    <span id="teamCaptainList">
      <a href="https://elttl.interactive.co.uk/people/view/999">Non Playing Secretary</a>
    </span>
  </div>

  <h2>Team Members</h2>
  <table id="teamMembers">
    <tbody>
      <tr id="member1174" class="TeamMembers">
        <td id="memberName1174" class="Name"><span><a href="https://elttl.interactive.co.uk/people/view/1056">Active One</a></span></td>
      </tr>
      <tr id="member829" class="TeamMembers">
        <td id="memberName829" class="Name"><span><a href="https://elttl.interactive.co.uk/people/view/209">Active Two</a></span></td>
      </tr>
      <tr><th>Former Members</th><tr>
      <tr id="member763" class="TeamMembers">
        <td id="memberName763" class="Name"><span><a href="https://elttl.interactive.co.uk/people/view/143">Former One</a></span></td>
      </tr>
      <tr id="member842" class="TeamMembers">
        <td id="memberName842" class="Name"><span><a href="https://elttl.interactive.co.uk/people/view/777">Former Two</a></span></td>
      </tr>
    </tbody>
  </table>

  <h2>Fixture List</h2>
  <table id="fixtureTable">
    <tr>
      <td>Sep 16</td>
      <td>Tue 18:45</td>
      <td>Opposition Team A</td>
      <td>1 - 9</td>
      <td>Penicuik III</td>
    </tr>
  </table>
</body>
</html>
`;

describe('scrapeELTTLTeam', () => {
  beforeEach(() => {
    // Reset all mocks before each test
    vi.resetAllMocks();
  });

  it('should successfully scrape team data from valid HTML', async () => {
    // Mock fetch
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      text: async () => mockValidHTML
    } as Response);

    const result = await scrapeELTTLTeam('https://elttl.interactive.co.uk/teams/view/839');

    // Verify team name extraction
    expect(result.teamName).toBe('Test Team IV');

    // Verify players extraction
    expect(result.players).toHaveLength(5);
    expect(result.players).toContain('Player A');
    expect(result.players).toContain('Player B');
    expect(result.players).toContain('Player C');
    expect(result.players).toContain('Player D');
    expect(result.players).toContain('Player E');

    // Verify fixtures extraction
    expect(result.fixtures).toHaveLength(4); // 4 valid fixtures (excluding FREE WEEK)
    
    // Check first fixture
    expect(result.fixtures[0]).toEqual({
      date: 'Sep 16',
      time: 'Tue 18:45',
      homeTeam: 'Opposition Team A',
      awayTeam: 'Test Team IV',
      venue: undefined
    });

    // Check fixture with venue
    expect(result.fixtures[2]).toEqual({
      date: 'Sep 29',
      time: 'Mon 18:30',
      homeTeam: 'Opposition Team C @ VENUE1',
      awayTeam: 'Test Team IV',
      venue: 'VENUE1'
    });
  });

  it('should extract team name without parenthetical code', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      text: async () => mockValidHTML
    } as Response);

    const result = await scrapeELTTLTeam('https://elttl.interactive.co.uk/teams/view/839');
    
    // Should be "Test Team IV" not "Test Team IV (TT4)"
    expect(result.teamName).toBe('Test Team IV');
    expect(result.teamName).not.toContain('TT4');
    expect(result.teamName).not.toContain('(');
  });

  it('should filter out FREE WEEK and invalid fixture rows', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      text: async () => mockValidHTML
    } as Response);

    const result = await scrapeELTTLTeam('https://elttl.interactive.co.uk/teams/view/839');
    
    // Should not include the FREE WEEK row
    const freeWeekFixture = result.fixtures.find(f => f.homeTeam.includes('FREE WEEK'));
    expect(freeWeekFixture).toBeUndefined();

    // All fixtures should have valid date format
    result.fixtures.forEach(fixture => {
      expect(fixture.date).toMatch(/^[A-Z][a-z]{2} \d{1,2}$/);
    });
  });

  it('should extract venue from team name with @ symbol', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      text: async () => mockValidHTML
    } as Response);

    const result = await scrapeELTTLTeam('https://elttl.interactive.co.uk/teams/view/839');
    
    const venueFixture = result.fixtures.find(f => f.homeTeam.includes('@ VENUE1'));
    expect(venueFixture).toBeDefined();
    expect(venueFixture?.venue).toBe('VENUE1');
  });

  it('should throw error when fetch fails', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 404
    } as Response);

    await expect(
      scrapeELTTLTeam('https://elttl.interactive.co.uk/teams/view/999')
    ).rejects.toThrow('Failed to scrape ELTTL team');
  });

  it('should throw error when no players found', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      text: async () => mockNoPlayersHTML
    } as Response);

    await expect(
      scrapeELTTLTeam('https://elttl.interactive.co.uk/teams/view/123')
    ).rejects.toThrow('No players found in HTML');
  });

  it('should throw error when no fixtures found', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      text: async () => mockNoFixturesHTML
    } as Response);

    await expect(
      scrapeELTTLTeam('https://elttl.interactive.co.uk/teams/view/123')
    ).rejects.toThrow('No fixtures found in HTML');
  });

  it('should handle network errors', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

    await expect(
      scrapeELTTLTeam('https://elttl.interactive.co.uk/teams/view/839')
    ).rejects.toThrow('Failed to scrape ELTTL team');
  });

  it('should not include duplicate players', async () => {
    const htmlWithDuplicates = `
      <!DOCTYPE html>
      <html>
      <body>
        <h1>Test Team</h1>
        <ul>
          <li><a href="/people/view/1">Player One</a></li>
          <li><a href="/people/view/1">Player One</a></li>
          <li><a href="/people/view/2">Player Two</a></li>
        </ul>
        <table>
          <tr>
            <td>Sep 16</td>
            <td>Tue 18:45</td>
            <td>Home</td>
            <td>1-9</td>
            <td>Away</td>
          </tr>
        </table>
      </body>
      </html>
    `;

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      text: async () => htmlWithDuplicates
    } as Response);

    const result = await scrapeELTTLTeam('https://elttl.interactive.co.uk/teams/view/123');
    
    expect(result.players).toHaveLength(2);
    expect(result.players.filter(p => p === 'Player One')).toHaveLength(1);
  });

  it('should handle fixtures with and without scores', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      text: async () => mockValidHTML
    } as Response);

    const result = await scrapeELTTLTeam('https://elttl.interactive.co.uk/teams/view/839');
    
    // Should include both past fixtures (with scores) and future fixtures (without scores)
    const pastFixture = result.fixtures.find(f => f.date === 'Sep 16');
    const futureFixture = result.fixtures.find(f => f.date === 'Jan 7');
    
    expect(pastFixture).toBeDefined();
    expect(futureFixture).toBeDefined();
  });

  it('should only include active members and ignore former members', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      text: async () => mockHTMLWithFormerMembers
    } as Response);

    const result = await scrapeELTTLTeam('https://elttl.interactive.co.uk/teams/view/871');

    expect(result.players).toEqual(['Active One', 'Active Two']);
    expect(result.players).not.toContain('Former One');
    expect(result.players).not.toContain('Former Two');
  });

  it('should ignore people linked outside the team members table', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      text: async () => mockHTMLWithFormerMembers
    } as Response);

    const result = await scrapeELTTLTeam('https://elttl.interactive.co.uk/teams/view/871');

    // The team secretary is a separate field, not a squad member
    expect(result.players).not.toContain('Non Playing Secretary');
  });

  it('should throw error when every member is a former member', async () => {
    const htmlWithOnlyFormerMembers = `
      <!DOCTYPE html>
      <html>
      <body>
        <h1>Test Team</h1>
        <table id="teamMembers">
          <tbody>
            <tr><th>Former Members</th><tr>
            <tr id="member763" class="TeamMembers">
              <td class="Name"><a href="/people/view/143">Former One</a></td>
            </tr>
          </tbody>
        </table>
        <table>
          <tr>
            <td>Sep 16</td>
            <td>Tue 18:45</td>
            <td>Home</td>
            <td>1-9</td>
            <td>Away</td>
          </tr>
        </table>
      </body>
      </html>
    `;

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      text: async () => htmlWithOnlyFormerMembers
    } as Response);

    await expect(
      scrapeELTTLTeam('https://elttl.interactive.co.uk/teams/view/871')
    ).rejects.toThrow('No players found in HTML');
  });

  it('should validate date format correctly', async () => {
    const htmlWithInvalidDates = `
      <!DOCTYPE html>
      <html>
      <body>
        <h1>Test Team</h1>
        <ul>
          <li><a href="/people/view/1">Player One</a></li>
        </ul>
        <table>
          <tr>
            <td>Sep 16</td>
            <td>Tue 18:45</td>
            <td>Home</td>
            <td>-</td>
            <td>Away</td>
          </tr>
          <tr>
            <td>Invalid Date</td>
            <td>Wed 18:45</td>
            <td>Home</td>
            <td>-</td>
            <td>Away</td>
          </tr>
          <tr>
            <td>Oct 24</td>
            <td>Fri 19:00</td>
            <td>Home2</td>
            <td>-</td>
            <td>Away2</td>
          </tr>
        </table>
      </body>
      </html>
    `;

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      text: async () => htmlWithInvalidDates
    } as Response);

    const result = await scrapeELTTLTeam('https://elttl.interactive.co.uk/teams/view/123');
    
    // Should only include fixtures with valid date format
    expect(result.fixtures).toHaveLength(2);
    expect(result.fixtures.find(f => f.homeTeam === 'Home')).toBeDefined();
    expect(result.fixtures.find(f => f.homeTeam === 'Home2')).toBeDefined();
  });
});
