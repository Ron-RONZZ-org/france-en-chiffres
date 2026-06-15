# Architecture Decision: Interactive France Department Map

## Decision Context
Feature request to add interactive department map (hover highlighting + tooltip) to the "France en Chiffres" site.

## Key Decisions

### Page Placement: Geography page (`/geography`)
- AGENTS.md maps "Map highlighting" to the geography page
- Hero `FranceMap.astro` has a drawing animation (single merged outline) — different concern
- Geography page is currently a placeholder stub (3.4KB)

### Data Extraction: Split approach
- **Paths**: `src/data/france-departments.json` (~120-150KB) — geometry only
- **Names**: `src/data/france-department-names.json` (~3KB) — number→name mapping
- Extend existing `src/scripts/extract-france-map.js` to parse department `<path>` elements from the SVG's `<g id="Départements_Métropolitains">`

### Tooltip: Progressive enhancement
- **Baseline**: Native SVG `<title>` element per path — works with JS disabled
- **Enhanced**: Vanilla JS script (single `<script>` block per page) for styled tooltip
- CSS-only tooltips not viable for SVG path positioning

### Component: New `FranceDepartmentsMap.astro`
- Separate from `FranceMap.astro` (hero component)
- Keeps both files under 500 lines (AGENTS.md constraint)
- Handles ~95 metropolitan department paths + DOM-COM insets

### Performance: Inline at build time
- Astro imports JSON → inlines paths into HTML
- ~150KB raw → ~30-40KB gzipped
- Acceptable for a dedicated data page

## Implementation Phases
1. Data extraction script + static map rendering
2. Vanilla JS tooltip enhancement
3. Responsive polish + accessibility
