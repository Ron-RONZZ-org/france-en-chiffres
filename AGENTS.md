# AGENTS.md — France en Chiffres

## Project Overview

**France en Chiffres** is an animated educational website that tells the story of France — its history, culture, geography, and current affairs — through a statistical lens ("history in numbers"). Built with a minimal tech stack for maximum visual impact.

The site uses Astro (static site generator) with Tailwind CSS for styling, and a graduated approach to animation — vanilla JS for simple effects, GSAP for cinematic timelines and scroll-driven narratives, D3 for complex data visualizations.

---

## IMPORTANT: Language and Naming Conventions

- **Content language**: French (French text, French number formatting)
- **Code language**: English (variable names, comments, commit messages)
- **Filenames**: kebab-case for all files (e.g., `france-map.astro`, `global.css`)
- **CSS**: Tailwind utility classes for layout and styling. Hand-written CSS only for complex animations or component-specific overrides that Tailwind can't express cleanly.

## IMPORTANT: grammatical conventions and writing style guide

See [grammar-AGENTS.md](grammar-AGENTS.md)
---

## Tech Stack

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| Framework | **Astro 5** | Zero JS by default, multi-page, Markdown content, static output |
| Styling | **Tailwind CSS** | Utility-first, fast iteration, consistent design tokens. Hand-written CSS only for complex animations. |
| Simple animations | **Vanilla JS** | IntersectionObserver, requestAnimationFrame, View Transitions API |
| Cinematic timelines | **GSAP + ScrollTrigger** | Pin sections, scrub animations, staggered reveals — use for the history timeline |
| Complex data viz | **D3.js** | Population pyramids, bump charts, choropleth maps — use for pages where data relationships are non-trivial |
| Deployment | **GitHub Pages** ([france-stats.org](https://france-stats.org/)) | `npm run build` → GitHub Actions workflow → `gh-pages` branch with custom domain |

### Core Principle — Graduated Tool Selection

> **Use the simplest tool that achieves the effect. Escalate only when the simpler tool becomes the bottleneck.**

```
Animation complexity          → Tool
──────────────────────────────────────────────────
Fade-in, slide-up on scroll   → CSS transitions + IntersectionObserver
Animated counters, simple SVG → Vanilla JS (requestAnimationFrame)
Pinned sections, scrub,       → GSAP + ScrollTrigger
  staggered timelines
Complex data visualizations   → D3.js (bump charts, choropleths,
  (interactive, animated)       population pyramids, sankey diagrams)
Interactive geo-referenced   → Leaflet + OSM tiles
  maps with tile layers

```
---

## Project Structure

```
france-en-chiffres/
├── public/                  # Static assets (images, fonts, favicon, SVGs)
│   └── France_departements.svg  # Source SVG for France territory outlines
├── templates/               # Editorial templates for content creators
│   ├── event-template.md    # Blank event template (no comments)
│   ├── era-template.md      # Blank era template (no comments)
│   ├── event-example.md     # Event with dummy content
│   └── era-example.md       # Era with dummy content
├── src/
│   ├── content/             # Astro Content Collections (Zod-validated)
│   │   ├── config.ts        # Zod schemas for all collections
│   │   ├── eras/            # One .md per era (id, title, color, start, end, description; period auto-inferred via .transform())
│   │   ├── events/          # One .md per event (id, start, end, title, description, mediaIds; yearDisplay auto-inferred)
│   │   ├── sources/         # CSL-JSON source files (ISO 690-compatible)
│   │   ├── media/           # Media metadata (.json) + media files (.svg, rasters)
│   │   ├── countries/       # Country profiles (.md, auto-generated from build pipeline)
│   │   └── figures/         # Chart figure data (.json) with Zod-discriminated union per type (line, bar, population-pyramid, bump, choropleth, comparison, sankey)
│   ├── pages/               # Route pages (index, history, culture, ...)
│   │   ├── bibliography.astro           # Aggregated sources listing
│   │   ├── bibliography/[id].astro      # Per-source page (auto-generated)
│   │   ├── evenements/[slug].astro      # Per-event article page (auto-generated)
│   │   ├── periodes/[slug].astro        # Per-era page (auto-generated)
│   │   ├── monde/
│   │   │   ├── index.astro              # «La France dans le monde» — section landing page
│   │   │   ├── carte-interactive.astro  # Leaflet world map with thematic layers
│   │   │   └── pays/[slug].astro        # Per-country profile page (auto-generated)
│   │   └── geography/
│   │       ├── departements-francais.astro  # Artistic SVG department map
│   │       └── carte-interactive.astro      # Leaflet-based interactive layers map
│   ├── components/          # Reusable Astro/HTML components
│   │   ├── InteractiveFranceMap.astro  # Department-level interactive map
│   │   ├── InteractiveDataMap.astro    # Leaflet-based geo map with layers
│   │   ├── WorldDataMap.astro          # Leaflet world map (HDI, density layers, fullscreen)
│   │   ├── Timeline.astro
│   │   ├── TimelineEvent.astro
│   │   ├── TimelineEra.astro
│   │   ├── EraEventCard.astro          # Lightweight event card for era detail pages
│   │   ├── MediaFigure.astro          # <figure> with caption, credit, license
│   │   ├── Figure.astro               # Base figure shell (used by MediaFigure + ChartFigure)
│   │   ├── ChartFigure.astro          # Data-driven chart figure with prerendered SVG
│   │   └── ...
│   ├── layouts/             # Page layout wrappers (Base.astro)
│   ├── data/                # Data utilities + non-content JSON files
│   │   ├── history.ts               # Aggregation layer: loads eras + events, matches by year
│   │   ├── sources.ts               # Async source lookup via getCollection('sources')
│   │   ├── media.ts                 # Async media resolver via getCollection('media') + import.meta.glob
│   │   ├── figures.ts               # Async figure (chart) resolver via getCollection('figures')
│   │   ├── france.json
│   │   ├── france-map-data.json       # Extracted SVG paths for FranceMap
│   │   ├── france-departments.json    # Individual department paths (96 depts)
│   │   ├── countries.ts              # Aggregation layer: loads country profiles + GeoJSON data
│   │   └── geo/                      # Build-time geo data for interactive maps
│   │       ├── departements.geojson  # France department boundaries
│   │       └── world-countries.json  # World country boundaries + HDI/population data
│   ├── scripts/             # Build-time helper scripts
│   │   ├── extract-france-map.js # Parse France_departements.svg → data JSON
│   │   ├── fetch-world-data.js  # Download NE 110m, UNDP, World Bank → world-countries.json
│   │   └── charts/
│   │       └── render-svg.js     # DOM-free D3 chart → SVG renderer (d3-scale, d3-shape)
│   ├── tests/               # Automated validation tests
│   │   ├── france-map.test.cjs
│   │   ├── sources.test.cjs           # CSL-JSON + era + event validation
│   │   ├── media.test.cjs             # Media asset validation
│   │   └── figures.test.cjs           # Chart figure validation
│   ├── plugins/              # Remark/rehype build-time plugins
│   │   ├── remark-citation-links.js  # [source:id] → citation superscript
│   │   └── remark-figure-embed.js    # [media:id] / [chart:id] → rendered figure HTML
│   └── styles/              # Global CSS
├── AGENTS.md                # This file
├── astro.config.mjs
└── package.json
```

---

## Coding Guidelines

1. **All pages are static** — no SSR, no API routes. Data lives in `src/data/*.json`.
2. **Client JS is opt-in** — a page should work (content visible) with JS disabled. Animations enhance, they don't gate.
3. **One script per page** — bundle all client JS into a single `<script>` per page. No import maps, no code splitting.
4. **Use data attributes** to pass server data to client scripts (`data-value`, `data-target`). No inline JSON blobs.
5. **Animations use `prefers-reduced-motion`** — respect user accessibility settings.
6. **Every stat must cite its source** — use `sourceId` referencing a CSL-JSON file in `src/content/sources/`. The build system resolves it to a hyperlinked citation and generates a bibliography page. Never use inline `source` text.
7. **Every image needs caption, credit, and license** — register media in `src/content/media/` as a JSON file with a unique `id`, reference via `mediaId` in data files, render with `<MediaFigure>`. All media files (SVG, jpg, png, etc.) live alongside their metadata in `src/content/media/`.
8. **Responsive before fancy** — layout must work at 320px before adding any animation.
9. **Content Collections** — all content data (eras, events, sources, media) lives in `src/content/` as Astro Content Collections with Zod schemas in `src/content/config.ts`. Data validation happens at build time. Aggregation layers reside in `src/data/*.ts`.
10. **Era–event matching by year range** — events are automatically matched to eras by `start`/`end` year containment (see `src/data/history.ts`). When a year is shared by adjacent eras (e.g., 1789), the event is assigned to the era whose `start` matches that year. Editors add an event file to `content/events/` without specifying which era it belongs to. Each era has a dedicated page at `/periodes/[slug]` (auto-generated from `content/eras/`). On the timeline page, era titles link to these internal pages and descriptions are displayed inline.

---

## Content Writing Guidelines

### Reference and Source Citation

Every fact in event content must be backed by a reliable source. The project uses a structured citation system with CSL-JSON files.

1. **Search for reliable references**
   - Prioritise academic journals and reliable scientific sites
   - Avoid unverified, low-quality content
   - Must not invent fictitious sources — use web search
   - If no source found to support a claim, signal to the user

2. **Create the source file** in `src/content/sources/<id>.json` with valid CSL-JSON schema
   - The source `id` must be unique and kebab-case (e.g., `larousse-2023`)

3. **Cite the source inline** in the event markdown file with `[source:{source-id}]`
   - Example: `La bataille de Marignan eut lieu en 1515 [source:larousse-2023]`
     - PARAMOUNT to leave a space between last word of sentence and `[source: xxx]`

4. **If the passage contains factual errors** (wrong year, names, etc.), rewrite the concerned sections according to the sources found

### Registering Media Assets

Every image must be registered in `src/content/media/` before it can be used. Use the scaffold script:

```bash
# ID derived from filename (normalized)
npm run new:media -- ~/Downloads/Château-versailles.jpg

# Explicit ID
npm run new:media -- versailles ~/Downloads/Château-versailles.jpg
```

The script:
1. Copies the file into `src/content/media/<id>.<ext>`
2. Creates a JSON metadata file from the template
3. Opens the JSON in `$EDITOR` for you to fill in `alt` (required), `caption`, `credit`, and `sourceId`
4. Auto-detects dimensions for raster images (PNG, JPG, etc.) if `identify` (ImageMagick) is available

**ID normalization** when derived from filename: NFD-decompose → strip diacritics → lowercase → `[^a-z0-9]+` → `-` → trim dashes.

### Inline Media and Charts

Embed media and charts in event Markdown body text:

```md
{Texte avant}

[media:versailles-chateau]

{Texte après}
```

```md
{Texte avant}

[chart:population-evolution]

{Texte après}
```

As seen, `chart` and `media` should be their own paragraphs.

- `[media:id]` — embeds a registered media asset (image) with full caption/credit/license. Use `npm run new:media` to register first.
- `[chart:id]` — embeds a data-driven chart (prerendered to inline SVG). Chart definitions live in `src/content/figures/<id>.json`. Use `npm run new:figure` to create.
- All figures are rendered server-side at build time — zero client JS required.

### Creating Chart Figures

```bash
npm run new:figure -- <kebab-case-id> <type>
# Example:
npm run new:figure -- population-evolution line
```

Supported types: `line`, `bar`, `population-pyramid`, `bump`, `choropleth`, `comparison`, `sankey`

Chart data is structured JSON with a Zod-discriminated union per type. The D3 renderer (`src/scripts/charts/render-svg.js`) uses only DOM-free modules (`d3-scale`, `d3-shape`, `d3-array`) to generate SVG at build time.

See also **Coding Guidelines** rule 6 (stat must cite its source via `sourceId`).

### Article Mini-Timeline (Gantt)

Each event article can display a **mini-timeline** at the top — a Gantt-style bar chart showing key sub-events within the article's timeframe, with clickable bars that scroll to the corresponding section.

**To add a mini-timeline:**

1. Add a `timeline:` array to the event's YAML frontmatter. Each entry has:
   - `id` — kebab-case identifier (used as anchor link target)
   - `title` — short display text on the bar
   - `start` — start year (number, may equal `end` for point events)
   - `end` — end year (number)
   - `sectionId` — (optional) overrides the anchor target; defaults to `id`

2. Add the matching `{#id}` suffix to the corresponding heading in the body:

```yaml
---
id: mon-evenement
start: 1789
end: 1799
timeline:
  - id: prise-bastille
    title: Prise de la Bastille
    start: 1789
    end: 1789
  - id: terreur
    title: La Terreur
    start: 1793
    end: 1794
---
```

```markdown
### La prise de la Bastille (14 juillet 1789) {#prise-bastille}

### La Terreur (1793–1794) {#terreur}
```

**Behaviour:**
- Clicking a bar scrolls to the section (smooth scroll with JS, instant jump without)
- The active bar is highlighted as the reader scrolls through the article (IntersectionObserver)
- Overlapping time ranges are automatically stacked on separate tracks
- Point events (start === end) render as narrow markers
- The component renders only when `timeline` entries exist — articles without it are unaffected

**Guidelines:**
- Only chronological sections should become timeline entries — skip intros, epilogues, and purely analytical/thematic sections
- The `start` and `end` values can be year-precise or month/year-precise (parsed as number)
- The `{#id}` suffix goes on the same line as the heading, separated by a space
- Existing articles with `timeline` frontmatter: see `src/content/events/la-revolution-francaise.md` for a complete example

---

## Editorial Workflow

Content creators can scaffold new content files using the helper scripts:

```bash
# Event (with year — prefills start/end)
npm run new:event -- <kebab-case-id> <year>

# Event (without year — start/end left blank)
npm run new:event -- <kebab-case-id>

# Era (requires start and end years)
npm run new:era -- <kebab-case-id> <start-year> <end-year>

# Media asset (image — ID derived from filename if omitted)
npm run new:media -- <source-file>
# or with explicit ID:
npm run new:media -- <kebab-case-id> <source-file>

# Chart figure (type: line, bar, population-pyramid, bump, ...)
npm run new:figure -- <kebab-case-id> <type>
```

**Examples:**
```bash
npm run new:event -- bataille-de-marignan 1515
npm run new:era -- restauration 1814 1848
npm run new:media -- ~/Downloads/Château-versailles.jpg
npm run new:figure -- population-evolution line
```

The scripts:
1. Copy the appropriate template from `templates/` to the target directory
2. Prefill the `id:` field with the provided slug
3. Prefill metadata fields (start/end for events, type for figures)
4. Open the new file in `$EDITOR` (defaults to `vim`)

Direct invocation is also possible:
```bash
bash scripts/new-event.sh mon-evenement 1789
bash scripts/new-era.sh mon-ere -500 0
bash scripts/new-media.sh mon-image ~/Downloads/image.jpg
bash scripts/new-figure.sh population-evolution line
bash scripts/new-figure.sh population-evolution line
```

---

## Animation Patterns

| Pattern | Implementation | When |
|---------|---------------|------|
| Number counters | IntersectionObserver + requestAnimationFrame | Always |
| SVG draw-on-scroll | `stroke-dasharray`/`stroke-dashoffset` animation | Always |
| Scroll reveals | IntersectionObserver adding `.is-visible` class | Simple sections |
| Pin section + scrub | GSAP ScrollTrigger (`pin: true`, `scrub: 1`) | History timeline, comparison sliders |
| Staggered reveals | GSAP `.fromTo()` with `stagger` | Timeline entries, card grids |
| Page transitions | CSS `@view-transition` API | Standard, no JS |
| Data-driven SVG | D3.js data joins + transitions | Population pyramid, bump chart, choropleth |
| Map highlighting | SVG region fills with CSS transitions on hover | Geography page |
| Interactive map layers | Leaflet with GeoJSON overlays + layer controls | Interactive data map |
| Tooltip / popover | **Tippy.js** — via `data-*` attributes or JS instantiation | Hover descriptions, layer info, department names |

---

## What to Avoid

### Banned (always)
- ❌ **React, Vue, Svelte** — no client-side component frameworks. Astro's island architecture + vanilla JS covers all needs.
- ❌ **Framer Motion** — React-only. If you need a React animation library, you're using the wrong approach.
- ❌ **Client-side routing** — use multi-page Astro + CSS View Transitions API. No React Router, no Vue Router.
- ❌ **Tracking, analytics, cookies** — educational site, no business need, no user data collection.

### Allowed with justification (opt-in, per-page)
- ✅ **GSAP + ScrollTrigger** — for pinned sections, scrub animations, staggered timelines where vanilla JS would require 3x+ the code.
- ✅ **D3.js** — for complex data visualizations (bump charts, choropleths, population pyramids, sankey diagrams). Not for simple bar charts or counters.
- ✅ **Leaflet** — for interactive geo-referenced maps with tile base maps, multiple overlay layers (choropleth, GeoJSON), and built-in zoom/pan. Use for the `/geographie/carte-interactive/` page. Not for artistic/ornamental SVG maps.
- ✅ **Tippy.js** — for tooltips, popovers, and hover descriptions. Already a dependency and used across multiple pages (department map, timeline, interactive map). Use via `data-*` attributes or direct JS instantiation. Prefer Tippy over custom tooltip implementations for consistency.
- ✅ **TypeScript** — optional. Use `.ts` files if you want type safety in data processing logic. Page components can stay `.astro` with frontmatter types.

### Preference

- ⚠️ **External fonts** — allowed with proper loading strategy (`preconnect` + `font-display: swap`). Prefer self-hosting for reliability.
- ⚠️ **Tailwind CSS** — this is the **default** styling approach. Hand-written CSS is also fine for complex animations where Tailwind's utility model doesn't express the intent clearly.

---

## Commit Message Format

[Conventional Commits](https://www.conventionalcommits.org/):
- `feat:` — new page, new component, new animation
- `fix:` — bug fix, accessibility fix, layout fix
- `docs:` — AGENTS.md, comments, documentation
- `chore:` — build config, package updates
- `refactor:` — code restructuring without behavior change
- `style:` — CSS-only changes

---

## Module-Level AGENTS Files

This project is a single module. If submodules are added later (e.g., a data pipeline or API), create `AGENTS-[module].md` in each submodule directory according to [template](https://raw.githubusercontent.com/Rong-Zhou-FR/ronAI/refs/heads/main/context-files/AGENTS-module-template.md).

```
Root AGENTS.md (global rules)
    │
    └── (future) src/tools/AGENTS.md (local rules)
```
