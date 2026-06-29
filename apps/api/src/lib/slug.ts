/** Convert a name to a URL-safe slug. */
export function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);
}

/**
 * Produce a slug unique among existing slugs by appending a numeric suffix.
 */
export function uniqueSlug(base: string, existing: Set<string>): string {
  const root = slugify(base) || 'workspace';
  if (!existing.has(root)) return root;
  let suffix = 2;
  while (existing.has(`${root}-${suffix}`)) suffix += 1;
  return `${root}-${suffix}`;
}
