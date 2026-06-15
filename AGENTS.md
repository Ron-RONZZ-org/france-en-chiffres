# AGENTS.md — France en Chiffres

## Project Overview

**France en Chiffres** is an animated educational website that tells the story of France — its history, culture, geography, and current affairs — through a statistical lens ("history in numbers"). Built with a minimal tech stack for maximum visual impact.

The site uses Astro (static site generator) with vanilla JavaScript and modern CSS for animations. No heavy frameworks. No build-time complexity.

---

## Language and Naming Conventions

- **Content language**: French (French text, French number formatting)
- **Code language**: English (variable names, comments, commit messages)
- **Filenames**: kebab-case for all files (e.g., `france-map.astro`, `global.css`)
- **CSS classes**: BEM-ish: `.block__element--modifier` or just `.block`

---

## Tech Stack

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| Framework | **Astro 5** | Zero JS by default, multi-page, Markdown content, static output |
| Styling | **Modern CSS** | CSS custom properties, container queries, scroll-driven animations |
| Interactivity | **Vanilla JS** | IntersectionObserver, requestAnimationFrame, View Transitions API |
| Charts/Maps | **Inline SVG** | No charting library — SVG + CSS/JS for all data viz |
| Deployment | Static host (Netlify/Vercel/GitHub Pages) | `npm run build` → deploy `dist/` |

### Core Principle

> **No runtime framework. No charting library. No build-tool complexity.**
> If it can be done in CSS, do it in CSS. If it needs JS, use vanilla.
> D3/GSAP/Three.js are allowed ONLY on a per-page opt-in basis with documented justification.

---

## Project Structure

```
france-en-chiffres/
├── public/                  # Static assets (images, fonts, favicon)
├── src/
│   ├── pages/               # Route pages (index, history, culture, ...)
│   ├── components/          # Reusable Astro/HTML components
│   ├── layouts/             # Page layout wrappers (Base.astro)
│   ├── data/                # JSON data files (statistics, timelines)
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
6. **Every stat must have a source** — add a `data-source` attribute or comment citing the source (INSEE, World Bank, etc.).
7. **Responsive before fancy** — layout must work at 320px before adding any animation.

---

## Animation Patterns (approved)

| Pattern | Implementation |
|---------|---------------|
| Number counters | IntersectionObserver + requestAnimationFrame |
| SVG draw-on-scroll | `stroke-dasharray`/`stroke-dashoffset` animation |
| Scroll reveals | IntersectionObserver adding `.is-visible` class |
| Page transitions | CSS `@view-transition` API (standard, no JS) |
| Chart drawing | SVG `<path>` with animated `stroke-dashoffset` |
| Map highlighting | SVG region fills with CSS transitions on hover |

---

## What to Avoid

- ❌ No React, Vue, Svelte, or any component framework
- ❌ No GSAP, Framer Motion, or animation libraries
- ❌ No D3.js unless a page genuinely needs complex data joins (document why)
- ❌ No Tailwind or CSS frameworks — all styles are hand-written in CSS
- ❌ No TypeScript — plain JS only (.js files, not .ts)
- ❌ No client-side routing — use multi-page Astro with View Transitions
- ❌ No external fonts that slow down first paint (use system font stack or self-host w/ swap)
- ❌ No tracking, analytics, or cookies

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

This project is a single module. If submodules are added later (e.g., a data pipeline or API), create `AGENTS-[module].md` in each submodule directory.

```
Root AGENTS.md (global rules)
    │
    └── (future) src/tools/AGENTS.md (local rules)
```
