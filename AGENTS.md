# AGENTS.md — France en Chiffres

## Project Overview

**France en Chiffres** is an animated educational website that tells the story of France — its history, culture, geography, and current affairs — through a statistical lens ("history in numbers"). Built with a minimal tech stack for maximum visual impact.

The site uses Astro (static site generator) with Tailwind CSS for styling, and a graduated approach to animation — vanilla JS for simple effects, GSAP for cinematic timelines and scroll-driven narratives, D3 for complex data visualizations.

---

## Language and Naming Conventions

- **Content language**: French (French text, French number formatting)
- **Code language**: English (variable names, comments, commit messages)
- **Filenames**: kebab-case for all files (e.g., `france-map.astro`, `global.css`)
- **CSS**: Tailwind utility classes for layout and styling. Hand-written CSS only for complex animations or component-specific overrides that Tailwind can't express cleanly.

---

## Tech Stack

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| Framework | **Astro 5** | Zero JS by default, multi-page, Markdown content, static output |
| Styling | **Tailwind CSS** | Utility-first, fast iteration, consistent design tokens. Hand-written CSS only for complex animations. |
| Simple animations | **Vanilla JS** | IntersectionObserver, requestAnimationFrame, View Transitions API |
| Cinematic timelines | **GSAP + ScrollTrigger** | Pin sections, scrub animations, staggered reveals — use for the history timeline |
| Complex data viz | **D3.js** | Population pyramids, bump charts, choropleth maps — use for pages where data relationships are non-trivial |
| Deployment | Static host (Netlify/Vercel/GitHub Pages) | `npm run build` → deploy `dist/` |

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
```

---

## Project Structure

```
france-en-chiffres/
├── public/                  # Static assets (images, fonts, favicon, SVGs)
│   └── France_departements.svg  # Source SVG for France territory outlines
├── src/
│   ├── content/             # Astro Content Collections (Zod-validated)
│   │   ├── config.ts        # Zod schemas for all collections
│   │   ├── eras/            # One .json per era (start/end year ranges)
│   │   ├── events/          # One .md per event (frontmatter + Markdown body)
│   │   ├── sources/         # CSL-JSON source files (ISO 690-compatible)
│   │   └── media/           # Media metadata registry (one .json per asset)
│   ├── pages/               # Route pages (index, history, culture, ...)
│   │   ├── bibliography.astro           # Aggregated sources listing
│   │   ├── bibliography/[id].astro      # Per-source page (auto-generated)
│   │   ├── evenements/[slug].astro      # Per-event article page (auto-generated)
│   │   └── geography/
│   │       └── departements-francais.astro  # Interactive department map
│   ├── components/          # Reusable Astro/HTML components
│   │   ├── InteractiveFranceMap.astro  # Department-level interactive map
│   │   ├── Counter.astro
│   │   ├── Timeline.astro
│   │   ├── TimelineEvent.astro
│   │   ├── TimelineEra.astro
│   │   ├── MediaFigure.astro           # <figure> with caption, credit, license
│   │   └── ...
│   ├── media/                # Media files (SVG placeholders + rasters)
│   │   ├── tautavel-crane.svg
│   │   ├── lascaux-peintures.svg
│   │   └── ...
│   ├── layouts/             # Page layout wrappers (Base.astro)
│   ├── data/                # Data utilities + non-content JSON files
│   │   ├── history.ts               # Aggregation layer: loads eras + events, matches by year
│   │   ├── sources.ts               # Async source lookup via getCollection('sources')
│   │   ├── media.ts                 # Async media resolver via getCollection('media') + import.meta.glob
│   │   ├── france.json
│   │   ├── france-map-data.json       # Extracted SVG paths for FranceMap
│   │   └── france-departments.json    # Individual department paths (96 depts)
│   ├── scripts/             # Build-time helper scripts
│   │   └── extract-france-map.js # Parse France_departements.svg → data JSON
│   ├── tests/               # Automated validation tests
│   │   ├── france-map.test.cjs
│   │   ├── sources.test.cjs           # CSL-JSON + era + event validation
│   │   └── media.test.cjs             # Media asset validation
│   └── styles/              # Global CSS
├── AGENTS.md                # This file
├── astro.config.mjs
└── package.json
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
7. **Every image needs caption, credit, and license** — register media in `src/content/media/` as a JSON file with a unique `id`, reference via `mediaId` in data files, render with `<MediaFigure>`. All media files (SVG, jpg, png, etc.) live in `src/media/`.
8. **Responsive before fancy** — layout must work at 320px before adding any animation.
9. **Content Collections** — all content data (eras, events, sources, media) lives in `src/content/` as Astro Content Collections with Zod schemas in `src/content/config.ts`. Data validation happens at build time. Aggregation layers reside in `src/data/*.ts`.
10. **Era–event matching by year range** — events are automatically matched to eras by `start`/`end` year containment (see `src/data/history.ts`). Editors add an event file to `content/events/` without specifying which era it belongs to.

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
