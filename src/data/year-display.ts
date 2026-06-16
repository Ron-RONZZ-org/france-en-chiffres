/**
 * year-display.ts — Auto-inference of yearDisplay from start/end years.
 *
 * When an event's yearDisplay is omitted from frontmatter, this function
 * generates a French-language display string based on start/end:
 *   - Single year CE:  "1789"
 *   - Single year BCE: "450 000 av. J.-C."
 *   - Range CE:        "1914 à 1918"
 *   - Range BCE:       "17 000 à 15 000 av. J.-C."
 *   - Crossing:        "50 av. J.-C. à 50"
 */

/**
 * Format an absolute year with French thousands separator (space).
 * e.g., 450000 -> "450 000", 1789 -> "1 789"
 */
export function formatFrenchNumber(n: number): string {
  const abs = Math.abs(n);
  const parts: string[] = [];
  let s = abs.toString();
  while (s.length > 3) {
    parts.unshift(s.slice(-3));
    s = s.slice(0, -3);
  }
  if (s.length > 0) parts.unshift(s);
  return parts.join(' ');
}

/**
 * Auto-infer yearDisplay from start/end year range.
 * Returns a French-format string suitable for the yearDisplay field.
 */
export function autoInferYearDisplay(start: number, end: number): string {
  if (start === end) {
    // Single year
    if (start < 0) {
      return `${formatFrenchNumber(start)} av. J.-C.`;
    }
    return formatFrenchNumber(start);
  }

  // Year range
  if (start < 0 && end < 0) {
    // Both BCE
    return `${formatFrenchNumber(start)} à ${formatFrenchNumber(end)} av. J.-C.`;
  }

  if (start < 0 && end >= 0) {
    // Crossing BCE/CE boundary
    return `${formatFrenchNumber(start)} av. J.-C. à ${formatFrenchNumber(end)}`;
  }

  // Both CE
  return `${formatFrenchNumber(start)} à ${formatFrenchNumber(end)}`;
}
