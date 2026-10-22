const UUID = /([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i;

/**
 * Where a pasted link should open: a team match card if it is one, otherwise a
 * tournament. The id alone can't tell them apart, so the path decides.
 */
export function pathForLink(link: string): string | null {
  const id = link.trim().match(UUID)?.[1];
  if (!id) return null;
  return /team-match\//i.test(link) ? `/team-match/${id}` : `/tournament/${id}`;
}
