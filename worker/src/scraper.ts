import { parse } from 'node-html-parser';
import type { ScrapedTeamData, ScrapedFixture } from './types';

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
 * Row class ELTTL puts on every entry of the "Team Members" table
 */
const MEMBER_ROW_CLASS = 'TeamMembers';

/**
 * Heading row that separates the current squad from players who have left.
 * Everything after it in the document belongs to former members.
 */
const FORMER_MEMBERS_HEADING = /^former\s+members?$/i;

/**
 * Extract the active players/squad from HTML
 *
 * ELTTL lists the current squad and then, under a "Former Members" heading row,
 * everyone who has left the team. Both groups use the same markup, so the
 * document order of the heading is what separates them. Players listed after it
 * are ignored so that only the active squad is imported.
 */
function extractPlayers(root: any): string[] {
  // Names found inside team member rows - the authoritative squad list
  const memberNames: Set<string> = new Set();
  // Names found elsewhere on the page (e.g. team secretary), used only as a
  // fallback when the page has no team member rows at all
  const otherNames: Set<string> = new Set();
  let reachedFormerMembers = false;

  const visit = (node: any, inMemberRow: boolean): void => {
    // Only elements carry the tags, classes and links we look at
    if (reachedFormerMembers || node.nodeType !== 1) return;

    if (FORMER_MEMBERS_HEADING.test(node.text.trim())) {
      reachedFormerMembers = true;
      return;
    }

    const name = extractPlayerName(node);
    if (name) {
      (inMemberRow ? memberNames : otherNames).add(name);
      return;
    }

    const isMemberRow = inMemberRow ||
      (node.tagName === 'TR' && node.classList?.contains(MEMBER_ROW_CLASS));

    for (const child of node.childNodes) {
      visit(child, isMemberRow);
    }
  };

  visit(root, false);

  const players = memberNames.size > 0 ? memberNames : otherNames;

  if (players.size === 0) {
    throw new Error('No players found in HTML');
  }

  return Array.from(players);
}

/**
 * Return the player name for a link to an ELTTL person, or undefined if the
 * node is not such a link
 */
function extractPlayerName(node: any): string | undefined {
  if (node.tagName !== 'A') return undefined;

  const href = node.getAttribute('href') || '';
  if (!href.includes('/people/view/')) return undefined;

  const name = node.text.trim();
  // Filter out empty names and common non-player text
  if (!name || name.match(/^(more|view|edit|details?)$/i)) return undefined;

  return name;
}
