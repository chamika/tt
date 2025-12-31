import { describe, it, expect, vi, beforeEach } from 'vitest';
import { scrapeELTTLTeam } from './scraper';

// Mock HTML samples
const mockValidHTML = `
<!DOCTYPE html>
<html>
<head><title>Penicuik IV (PTTC4) - ELTTL</title></head>
<body>
  <h1>Penicuik IV (PTTC4)</h1>
  
  <h2>Team Members</h2>
  <ul>
    <li><a href="/people/view/1051">Aidan Craig</a></li>
    <li><a href="/people/view/1056">Chamika Diyunugalge</a></li>
    <li><a href="/people/view/209">Ian Hislop</a></li>
    <li><a href="/people/view/1267">Jay Jayalath</a></li>
    <li><a href="/people/view/1053">Patrick Shanks</a></li>
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
        <td>Corstorphine III</td>
        <td>1 - 9</td>
        <td>Penicuik IV</td>
        <td></td>
      </tr>
      <tr>
        <td>Sep 24</td>
        <td>Wed 18:45</td>
        <td>Penicuik IV</td>
        <td>8 - 2</td>
        <td>Edinburgh University V</td>
        <td></td>
      </tr>
      <tr>
        <td>Sep 29</td>
        <td>Mon 18:30</td>
        <td>Murrayfield IX @ GYLE</td>
        <td>4 - 6</td>
        <td>Penicuik IV</td>
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
        <td>Penicuik IV</td>
        <td></td>
        <td>Corstorphine II</td>
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
    expect(result.teamName).toBe('Penicuik IV');

    // Verify players extraction
    expect(result.players).toHaveLength(5);
    expect(result.players).toContain('Aidan Craig');
    expect(result.players).toContain('Chamika Diyunugalge');
    expect(result.players).toContain('Ian Hislop');
    expect(result.players).toContain('Jay Jayalath');
    expect(result.players).toContain('Patrick Shanks');

    // Verify fixtures extraction
    expect(result.fixtures).toHaveLength(4); // 4 valid fixtures (excluding FREE WEEK)
    
    // Check first fixture
    expect(result.fixtures[0]).toEqual({
      date: 'Sep 16',
      time: 'Tue 18:45',
      homeTeam: 'Corstorphine III',
      awayTeam: 'Penicuik IV',
      venue: undefined
    });

    // Check fixture with venue
    expect(result.fixtures[2]).toEqual({
      date: 'Sep 29',
      time: 'Mon 18:30',
      homeTeam: 'Murrayfield IX @ GYLE',
      awayTeam: 'Penicuik IV',
      venue: 'GYLE'
    });
  });

  it('should extract team name without parenthetical code', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      text: async () => mockValidHTML
    } as Response);

    const result = await scrapeELTTLTeam('https://elttl.interactive.co.uk/teams/view/839');
    
    // Should be "Penicuik IV" not "Penicuik IV (PTTC4)"
    expect(result.teamName).toBe('Penicuik IV');
    expect(result.teamName).not.toContain('PTTC4');
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
    
    const venueFixture = result.fixtures.find(f => f.homeTeam.includes('@ GYLE'));
    expect(venueFixture).toBeDefined();
    expect(venueFixture?.venue).toBe('GYLE');
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
