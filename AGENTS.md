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
| Chart rendering | **Vega-Lite** + Vega | Declarative chart generation at build time — takes data JSON, produces centered SVG (pie, line, bar, etc.) without manual geometry |
| Runtime SVG / interactive visuals | **D3.js** | Population pyramids, bump charts, choropleth maps — for client-side interactive data joins and transitions |
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
Chart generation (build-time)  → Vega-Lite (takes data JSON, yields
  (declarative, static)          complete SVG — no manual geometry)
Complex data visualizations   → D3.js data joins for client-side
  (interactive, animated)       interactive SVG (bump, choropleth, pyramid)
Interactive geo-referenced   → Leaflet + OSM tiles
  maps with tile layers

```
---

## Project Structure

```
france-en-chiffres/
├── public/                  # Static assets (images, fonts, favicon, SVGs); media copied here by copy-media-assets.mjs
│   ├── France_departements.svg  # Source SVG for France territory outlines
│   └── media/                   # Media asset files (copied from src/content/media/ at build time)
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
│   │   ├── maps.ts                  # Map registry (TypeScript types)
│   │   ├── maps-registry.json       # Map registry for the remark plugin (build-time)
│   │   ├── widgets.ts               # Widget registry
│   │   ├── france.json
│   │   ├── france-map-data.json       # Extracted SVG paths for FranceMap
│   │   ├── france-departments.json    # Individual department paths (96 depts)
│   │   ├── countries.ts              # Aggregation layer: loads country profiles + GeoJSON data
│   │   └── geo/                      # Build-time geo data for interactive maps
│   │       ├── departements.geojson  # France department boundaries
│   │       └── world-countries.json  # World country boundaries + HDI/population data
│   ├── scripts/             # Build-time helper scripts
│   │   ├── copy-media-assets.mjs # Copy src/content/media/ binaries → public/media/
│   │   ├── extract-france-map.js # Parse France_departements.svg → data JSON
│   │   ├── fetch-world-data.js  # Download NE 110m, UNDP, World Bank → world-countries.json
│   │   └── charts/
│   │       └── render-svg.js     # Vega-Lite chart → SVG renderer (build-time, headless)
│   ├── tests/               # Automated validation tests
│   │   ├── france-map.test.cjs
│   │   ├── sources.test.cjs           # CSL-JSON + era + event validation
│   │   ├── media.test.cjs             # Media asset validation
│   │   └── figures.test.cjs           # Chart figure validation
│   ├── plugins/              # Remark/rehype build-time plugins
│   │   ├── remark-citation-links.js  # [source:id] → citation superscript
│   │   └── remark-figure-embed.js    # [media:id] / [chart:id] / [map:id] / [widget:id] → rendered HTML
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
7. **Every image needs caption, credit, and license** — register media in `src/content/media/` as a JSON file with a unique `id`, reference via `mediaId` in data files, render with `<MediaFigure>`. All media files (SVG, jpg, png, etc.) live alongside their metadata in `src/content/media/`. Media binaries are copied to `public/media/` at build time by `scripts/copy-media-assets.mjs` and served via URL (`/media/{id}.{ext}`) — not inlined as base64 data URIs, which caused OOM on large files.
8. **Responsive before fancy** — layout must work at 320px before adding any animation.
9. **Content Collections** — all content data (eras, events, sources, media) lives in `src/content/` as Astro Content Collections with Zod schemas in `src/content/config.ts`. Data validation happens at build time. Aggregation layers reside in `src/data/*.ts`.
10. **Era–event matching by year range** — events are automatically matched to eras by `start`/`end` year containment (see `src/data/history.ts`). When a year is shared by adjacent eras (e.g., 1789), the event is assigned to the era whose `start` matches that year. Editors add an event file to `content/events/` without specifying which era it belongs to. Each era has a dedicated page at `/periodes/[slug]` (auto-generated from `content/eras/`). On the timeline page, era titles link to these internal pages and descriptions are displayed inline.
11. **`.md` files are prose-only** — no raw HTML, no CSS, no JS, no custom data attributes. See [Markdown Purity Rule](#⚠️-critical-markdown-purity-rule). All interactive features go in `.astro` components.

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

### Image Search Strategy

When searching for free-licensed images to register, use the following sources in priority order.

#### 1. Paris Musées Collections (CC0 / Domaine public)

The richest source for historical French photographs — over 260 000 public domain images from 14 Paris museums. All are CC0 (no attribution required).

**Construct search URLs as follows:**

```
https://www.parismuseescollections.paris.fr/fr/recherche/image-libre/1?keywords={URL-ENCODED-KEYWORDS}&limit=50&sort=score
```

Example with `femmes tondues`:
```
https://www.parismuseescollections.paris.fr/fr/recherche/image-libre/1?keywords=femmes%20tondues&limit=50&sort=score
```

**How to download:**
1. Open the search URL in browser
2. Click on a result thumbnail
3. On the item page, scroll to see `Télécharger` button or find the IIIF manifest link in the page source
4. The IIIF manifest is at: `https://apicollections.parismusees.paris.fr/iiif/{ID}/manifest`
5. From the manifest, extract the 4K image URL (under `sequences[0].canvases[0].images[0].resource["@id"]`)
6. Download at high resolution via `curl -L -o <file> "<url>"`

All images are explicitly released as CC0 (public domain) — no attribution needed.

#### 2. Wikimedia Commons

Search via the generator API — returns direct download URLs, license metadata, dimensions, and MIME type in a single request:

```
https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrsearch={KEYWORDS}&gsrnamespace=6&gsrlimit=10&prop=imageinfo&iiprop=url|extmetadata|dimensions|mime&format=json
```

Key fields in the response per result (`query.pages.*.imageinfo[0]`):

| Field | Path | Purpose |
|-------|------|---------|
| Direct URL | `url` | Download the image |
| MIME type | `mime` | File format (image/jpeg, image/png, image/svg+xml, etc.) |
| Width/Height | `width`, `height` | Dimensions in pixels |
| File size | `size` | Bytes |
| License short name | `extmetadata.LicenseShortName.value` | e.g., "CC BY-SA 3.0", "Public domain", "CC0" |
| License URL | `extmetadata.LicenseUrl.value` | Link to license text |
| Copyrighted | `extmetadata.Copyrighted.value` | "True" or "False" |
| Attribution required | `extmetadata.AttributionRequired.value` | "true" or "false" |
| Artist | `extmetadata.Artist.value` | Creator attribution |
| Image description | `extmetadata.ImageDescription.value` | Caption text |

Filter results by license preference: prefer `LicenseShortName` matching `CC BY-SA`, `CC BY`, `Public domain`, or `CC0`; reject `Copyrighted: True` entries with non-free licenses.

To find relevant file names from a French Wikipedia article first (useful for narrowing search):
```
https://fr.wikipedia.org/w/api.php?action=query&prop=images&titles={TOPIC}&imlimit=20&format=json
```

#### 3. Pixabay (CC0)

For generic stock photography (elderly people, modern topics, office scenes) not found in historical archives. All images are CC0 — no attribution required.

**Search workflow:**

1. **Search** with the CLI script (automatic 24h caching):
   ```bash
   npm run search:pixabay -- "elderly people" --per-page 10
   npm run search:pixabay -- "french countryside" --orientation horizontal
   npm run search:pixabay -- "paris street" --image-type photo --order latest
   ```
   Use `--json` for machine-readable output.

2. **Pick a result** — key fields from `hits[]`:

   | Field | Purpose |
   |-------|---------|
   | `largeImageURL` | Best size to download (max 1280px) |
   | `imageURL` | Original full-resolution (if approved) |
   | `imageWidth` / `imageHeight` | Dimensions |
   | `imageSize` | File size in bytes |
   | `tags` | Comma-separated tags (use as caption context) |
   | `user` | Creator name |

3. **Download** — use `curl` with `--location` to follow redirects:
   ```bash
   curl -L -o /tmp/pixabay-result.jpg "https://pixabay.com/get/..."
   ```

4. **Register** as a media asset:
   ```bash
   npm run new:media -- /tmp/pixabay-result.jpg
   ```

**Notes:**
- Do **not** hotlink Pixabay URLs — always download to `public/media/` via `npm run new:media`.
- See `node scripts/search-pixabay.mjs --help` for all options.

#### 4. France Archives (francearchives.gouv.fr)

The French national archives portal — aggregates digitized archives from 1 300+ archive services nationwide (national, departmental, municipal). Covers all periods of French history (medieval to modern) across all themes: military, judicial, notarial, religious, economic, educational, cultural, etc.

**Search workflow:**

1. **Search** the general portal API:
   ```
   https://francearchives.gouv.fr/api/v0/search?q={KEYWORDS}
   ```
   Or in a browser for interactive browsing:
   ```
   https://francearchives.gouv.fr/fr/search?q={KEYWORDS}
   ```

2. **Filter to digitized images only** by adding `es_digitalized=digitized-iiif` to the URL:
   ```
   https://francearchives.gouv.fr/fr/inventaires?es_digitalized=digitized-iiif&q={KEYWORDS}
   ```
   The IIIF protocol gives access to high-resolution digital reproductions.

3. **Download the IIIF image** — from a record page, find the IIIF manifest URL (typically `https://apicollections.parismusees.paris.fr/iiif/{ID}/manifest`), then extract the image URL from `sequences[0].canvases[0].images[0].resource["@id"]` and download:
   ```bash
   curl -L -o /tmp/archive-image.jpg "<iiif-image-url>"
   ```

4. **Register** as a media asset:
   ```bash
   npm run new:media -- /tmp/archive-image.jpg
   ```

**Notes:**
- All metadata is under the [Etalab Open License 2.0](https://github.com/etalab/licence-ouverte/blob/master/LO.md) — free reuse. Check individual image pages for specific rights statements.
- The name database (`https://francearchives.gouv.fr/fr/basedenoms`) contains 303M+ personal name records (genealogy, censuses).
- SPARQL endpoint at `https://francearchives.gouv.fr/fr/requeteurnaturel` for semantic queries.
- Open data datasets (authorities, inventory metadata, statistics) on `data.culture.gouv.fr`.

### ⚠️ CRITICAL: Markdown Purity Rule

**`.md` content files must contain ONLY:**
- Prose text (French)
- `[source:id]` citation references
- `[media:id]` references (images)
- `[chart:id]` references (data charts)
- `[map:id]` references (interactive maps)
- `[widget:id]` references (non-map interactive widgets)
- YAML frontmatter (metadata)

**NEVER put in `.md` files:**
- ❌ Raw HTML tags (`<div>`, `<section>`, `<style>`, etc.) — the markdown parser strips them
- ❌ CSS or `<style>` blocks
- ❌ JavaScript or `<script>` blocks
- ❌ Custom HTML data attributes for JS hooks

**Why:** Astro's markdown pipeline strips multi-line HTML blocks, CSS, and JS silently. Use `[media:id]`, `[map:id]`, `[chart:id]`, and `[widget:id]` markers instead — these are rendered by the remark plugin at build time.

### Inline Media, Charts, Maps, and Widgets (inside `.md`)

These are the embed patterns allowed inside markdown body text:

```md
[Texte avant]

[media:versailles-chateau]

[Texte après]
```

```md
[Texte avant]

[chart:population-evolution]

[Texte après]
```

```md
[Texte avant]

[map:rev-communes]

[Texte après]
```

```md
[Texte avant]

[widget:revolution-bilan]

[Texte après]
```

**Rules:**
- All markers must be on their **own line**, separated by blank lines from surrounding paragraphs.
- `[media:id]` — embeds a registered media asset (image) with caption/credit/license. Register via `npm run new:media`.
- `[chart:id]` — embeds a data-driven chart (prerendered to inline SVG). Define in `src/content/figures/<id>.json`. Create via `npm run new:figure`.
- `[map:id]` — embeds an interactive Leaflet map container (MapShell HTML or custom layout). The map script component (Leaflet initialization JS) is rendered separately via the `maps:` frontmatter field (see [Adding Interactive Maps](#adding-interactive-maps)).
- `[widget:id]` — embeds a non-map interactive widget (placeholder slot). The widget component is rendered via the `widgets:` frontmatter field.
- All are rendered server-side at build time by `src/plugins/remark-figure-embed.js`.

### Interactive Maps (`[map:id]` + script components)

All interactive maps use a **two-part architecture**:

1. **HTML container** — generated at build time by the `remark-figure-embed.js` plugin from a `[map:id]` marker in the `.md` file. The plugin reads `src/data/maps-registry.json` to generate the container HTML (MapShell for most maps, custom HTML for Pattern C maps).
2. **Leaflet initialization script** — shipped as a script-only `.astro` component (no template/HTML, just `<script>` + `<style>`). Rendered by the page template based on the `maps:` frontmatter field.

**To add a new interactive map:**

1. **Register the map** in `src/data/maps-registry.json` (metadata for the remark plugin):
   ```json
   "my-map-id": {
     "id": "my-map-id",
     "label": "...",
     "title": "...",
     "hint": "...",
     "height": 400
   }
   ```
   Maps with non-MapShell HTML containers set `"customHtml": true` and add a `case` in `buildCustomMapFigure()`.

2. **Create the script component** in `src/components/YourMap.astro` — no template, just `<script>` and `<style>`:
   ```astro
   ---
   // YourMap.astro — Leaflet map script for ...
   // HTML container is generated by the remark plugin via [map:my-map-id] in markdown.
   ---
   <script>
     import { initMap, onViewTransition } from '../scripts/maps/shared-map';
     // ... Leaflet init code using document.getElementById('my-map-id-map')
   </script>
   <style>
     /* Component styles */
   </style>
   ```

3. **Register the script component** in `src/pages/histoire/[slug].astro`:
   ```astro
   import YourMap from '../../components/YourMap.astro';
   
   const MAP_SCRIPTS = {
     'my-map-id': YourMap,
     // ... existing maps
   };
   ```

4. **Add the marker and frontmatter** to the event `.md` file:
   ```markdown
   ---
   maps: [my-map-id]
   ---
   
   ... paragraph ...
   
   [map:my-map-id]
   ```

**Pattern C maps** (custom HTML containers — `migration`, `resources`, `first-colonial-empire`, `second-colonial-empire`, `french-algeria`): these have unique section HTML instead of MapShell. Their HTML is generated by `buildCustomMapFigure()` in the remark plugin. The script component is still script-only.

### Widgets (`[widget:id]` + post-content components)

For non-map interactive components (e.g., `RevolutionBilan` hover table), use the `widgets:` frontmatter field. The component is rendered after `<Content />`:

```yaml
---
widgets: [revolution-bilan]
---
```

Register the component in `src/pages/histoire/[slug].astro`:
```astro
const WIDGETS = {
  'revolution-bilan': RevolutionBilan,
};
```

If the widget needs to appear inline within prose, add a `[widget:id]` marker in the markdown (generates a placeholder `<div data-widget-slot="xxx">` via `buildWidgetFigure()`).

### Existing Maps Registry

| Map ID | Event | Component | Type |
|--------|-------|-----------|------|
| `prehistoric` | premiers-humains | PrehistoricSitesMap | MapShell |
| `migration` | arrivee-sapiens | MigrationMap | Custom |
| `resources` | age-de-fer | ResourceMap | Custom |
| `roman-provinces` | occupation-romaine | RomanProvincesMap | MapShell |
| `roman-waterways` | occupation-romaine | RomanWaterwaysMap | MapShell |
| `roman-cities` | occupation-romaine | RomanCitiesMap | MapShell |
| `traite-verdun` | le-moyen-age-en-France | TreatyOfVerdunMap | MapShell |
| `villes-medievales` | le-moyen-age-en-France | MedievalCitiesMap | MapShell |
| `rev-communes` | revolution-francaise | RevCommunesMap | MapShell |
| `rev-varennes` | revolution-francaise | RevVarennesMap | MapShell |
| `rev-paris` | revolution-francaise | RevParisMap | MapShell |
| `napoleon-naissance` | empire-napoleonien | NapoleonBirthplaceMap | MapShell |
| `coalition-1814` | empire-napoleonien | CoalitionCampaignMap | MapShell |
| `napoleon-exil` | empire-napoleonien | NapoleonExileMap | MapShell |
| `first-colonial-empire` | le-xixe-siecle | FirstColonialEmpireMap | Custom |
| `second-colonial-empire` | le-xixe-siecle | SecondColonialEmpireMap | Custom |
| `wwi-schlieffen` | guerres-mondiales | WWISchlieffenPlanMap | MapShell |
| `france-occupation` | guerres-mondiales | FranceOccupationMap | MapShell |
| `dday-liberation` | guerres-mondiales | DdayLiberationMap | MapShell |

### Widgets Registry

| Widget ID | Event | Component | Type |
|-----------|-------|-----------|------|
| `revolution-bilan` | revolution-francaise | RevolutionBilan | Hover table |

### Creating Chart Figures

```bash
npm run new:figure -- <kebab-case-id> <type>
# Example:
npm run new:figure -- population-evolution line
```

Supported types: `line`, `bar`, `pie`, `population-pyramid`, `bump`, `choropleth`, `comparison`, `sankey`

Chart data is structured JSON with a Zod-discriminated union per type. The Vega-Lite renderer (`src/scripts/charts/render-svg.js`) compiles the JSON spec into SVG at build time via headless Vega — no manual geometry, arc paths, or label positioning.

> **Note:** When modifying `render-svg.js`, clear both caches to force full content re-render:
> ```bash
> rm -f node_modules/.astro/data-store.json .astro/ dist/
> ```

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
| Data-driven SVG | D3.js data joins + transitions | Runtime interactive SVG (population pyramid, bump chart, choropleth) |
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
- ❌ **Raw HTML, CSS, or JavaScript in `.md` content files** — the markdown pipeline strips multi-line HTML blocks, `<style>`, and `<script>` tags. See [Markdown Purity Rule](#⚠️-critical-markdown-purity-rule). All interactive features belong in `.astro` components.
- ❌ **Hand-crafted SVG (`<path d="…">`, `<polygon points="…">`, `<circle cx="…">`, any manually computed coordinates)** — hand-drawn SVG strings are almost never correctly aligned, are impossible to maintain, and introduce visual bugs whenever the layout or data changes. Use a high-level API instead:
  - **For charts (pie, line, bar, etc.):** use a **chart-generation library** that takes data and produces a complete chart without any manual geometry — labels, legends, axes, centering, and positioning are all handled for you. Currently: **[Vega-Lite](https://vega.github.io/vega-lite/)** (headless Node.js rendering via `vega` at build time). The chart figure JSON under `src/content/figures/` is the declarative input; `render-svg.js` compiles it into full SVG.
  - **For curved connectors / arrows:** D3 `linkVertical` / `linkHorizontal` / `line().curve(curveNatural)` + SVG `<marker>` with `orient="auto"`. Define arrows declaratively as `{ source: [x,y], target: [x,y] }`.
  - **For one-off geometric figures:** D3 shape generators (`d3.arc`, `d3.area`, `d3.symbol`, etc.) or data joins (`d3.selectAll('circle').data(points).join('circle')`) are acceptable for small decorative elements. Preprocess data into declarative coordinate arrays and let the generators produce the SVG output.
  
  > ⚠️ D3 shape primitives (`pie()`, `arc()`, `scaleLinear()`, etc.) are **not** a chart-generation library. Building a complete chart (labels, legends, axes, tooltip layout, centering) with D3 primitives counts as hand-crafted SVG — use Vega-Lite instead.

### Allowed with justification (opt-in, per-page)
- ✅ **GSAP + ScrollTrigger** — for pinned sections, scrub animations, staggered timelines where vanilla JS would require 3x+ the code.
- ✅ **D3.js** — for client-side interactive SVG data joins and transitions (bump charts, choropleths, population pyramids). Not for chart generation — use Vega-Lite for static charts.
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
