import { parse } from 'node-html-parser';
import type { ScrapedTeamData, ScrapedFixture } from './types';
import { parseMatchDate } from './utils';

/**
 * Scrape team data from ELTTL team page
 * @param url ELTTL team URL (e.g., https://elttl.interactive.co.uk/teams/view/839)
 * @returns Scraped team data including name, fixtures, and players
 */
export async function scrapeELTTLTeam(url: string): Promise<ScrapedTeamData> {
  try {
    // Fetch the HTML from ELTTL
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch ELTTL page: ${response.status}`);
    }

    const html = await response.text();
    const root = parse(html);

    // Extract team name
    const teamName = extractTeamName(root);
    
    // Extract fixtures
    const fixtures = extractFixtures(root);
    
    // Extract players/squad
    const players = extractPlayers(root);

    return {
      teamName,
      fixtures,
      players
    };
  } catch (error) {
    throw new Error(`Failed to scrape ELTTL team: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Extract team name from HTML
 */
function extractTeamName(root: any): string {
  // ELTTL uses h1 for team name in format "Penicuik IV (PTTC4)"
  const h1 = root.querySelector('h1');
  if (h1) {
    const fullName = h1.text.trim();
    // Extract just the team name before any parentheses
    const teamName = fullName.split('(')[0].trim();
    if (teamName) return teamName;
  }

  throw new Error('Could not find team name');
}

/**
 * Extract fixtures from HTML table
 */
function extractFixtures(root: any): ScrapedFixture[] {
  const fixtures: ScrapedFixture[] = [];

  // ELTTL fixture table has columns: Date | Time | Home | Score | Away | ... 
  const tables = root.querySelectorAll('table');
  
  for (const table of tables) {
    const rows = table.querySelectorAll('tr');
    
    for (const row of rows) {
      const cells = row.querySelectorAll('td');
      
      // ELTTL fixture rows have at least 5 columns
      if (cells.length >= 5) {
        const date = cells[0]?.text.trim() || '';
        const time = cells[1]?.text.trim() || '';
        const homeTeam = cells[2]?.text.trim() || '';
        const awayTeam = cells[4]?.text.trim() || '';

        // Skip rows with "--" (breaks/free weeks) or empty data
        // Valid dates match pattern "Sep 16", "Jan 7", etc.
        if (date && time && homeTeam && awayTeam && 
            !date.includes('--') && !time.includes('--') &&
            date.match(/^[A-Z][a-z]{2} \d{1,2}$/)) {
          
          fixtures.push({
            date,
            time,
            homeTeam,
            awayTeam,
            venue: extractVenue(homeTeam) || extractVenue(awayTeam)
          });
        }
      }
    }
  }

  if (fixtures.length === 0) {
    throw new Error('No fixtures found in HTML');
  }

  return fixtures;
}

/**
 * Extract venue from team name if it contains @ symbol
 * Example: "Murrayfield IX @ GYLE" -> "GYLE"
 */
function extractVenue(teamName: string): string | undefined {
  const venueMatch = teamName.match(/@\s*(.+)$/);
  return venueMatch ? venueMatch[1].trim() : undefined;
}

/**
 * Extract players/squad from HTML
 */
function extractPlayers(root: any): string[] {
  const players: Set<string> = new Set();

  // ELTTL lists players as links to /people/view/
  const peopleLinks = root.querySelectorAll('a[href*="/people/view/"]');
  
  for (const link of peopleLinks) {
    const name = link.text.trim();
    // Filter out empty names and common non-player text
    if (name && name.length > 0 && !name.match(/^(more|view|edit|details?)$/i)) {
      players.add(name);
    }
  }

  if (players.size === 0) {
    throw new Error('No players found in HTML');
  }

  return Array.from(players);
}
