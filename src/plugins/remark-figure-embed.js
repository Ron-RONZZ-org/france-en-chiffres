/**
 * remark-figure-embed.js
 *
 * Remark plugin that transforms `[media:id]`, `[chart:id]`, `[map:id]`,
 * and `[widget:id]` patterns in Markdown body text into fully rendered
 * HTML at build time.
 *
 * For [chart:id]: reads the figure JSON, calls the D3 SVG renderer,
 *   and outputs a <figure class="chart-figure"> with inline SVG + caption.
 *
 * For [media:id]: reads the media metadata and resolves the file.
 *   All media is inlined as data URIs (SVGs → base64, rasters → base64).
 *
 * For [map:id]: looks up the MAP_REGISTRY in src/data/maps.ts and generates
 *   a Leaflet map container (MapShell HTML or custom container for special cases).
 *   The corresponding Leaflet initialization scripts are shipped by the page template.
 *
 * For [widget:id]: generates placeholder or full HTML for non-map interactive widgets.
 */

import { visit } from 'unist-util-visit';
import { readFileSync, existsSync } from 'node:fs';
import { resolve, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { renderChartSvg } from '../scripts/charts/render-svg.js';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const PROJECT_ROOT = resolve(__dirname, '../..');
const MEDIA_DIR = resolve(PROJECT_ROOT, 'src/content/media');
const PUBLIC_MEDIA = resolve(PROJECT_ROOT, 'public/media');
const FIGURES_DIR = resolve(PROJECT_ROOT, 'src/content/figures');

const MEDIA_RE = /\[media:\s*([\w-]+)\]/g;
const CHART_RE = /\[chart:\s*([\w-]+)\]/g;
const MAP_RE = /\[map:\s*([\w-]+)\]/g;
const WIDGET_RE = /\[widget:\s*([\w-]+)\]/g;

// ── Map registry (lazy-loaded) ──

let _MAP_REGISTRY = null;

function getMapRegistry() {
  if (!_MAP_REGISTRY) {
    try {
      _MAP_REGISTRY = JSON.parse(
        readFileSync(resolve(PROJECT_ROOT, 'src/data/maps-registry.json'), 'utf-8')
      );
    } catch {
      _MAP_REGISTRY = {};
    }
  }
  return _MAP_REGISTRY;
}

// ── Media file resolution ──
//
// Media files are pre-optimized by scripts/optimize-media.mjs into
// public/media/{id}.jpg + {id}.webp (with dimensions in manifest).
// We reference them via URL path — no base64 inlining (caused OOM).

let _OPTIMIZED_MANIFEST = null;

function getOptimizedManifest() {
  if (!_OPTIMIZED_MANIFEST) {
    const manifestPath = resolve(PUBLIC_MEDIA, '.optimized-manifest.json');
    try {
      _OPTIMIZED_MANIFEST = JSON.parse(readFileSync(manifestPath, 'utf-8'));
    } catch {
      _OPTIMIZED_MANIFEST = {};
    }
  }
  return _OPTIMIZED_MANIFEST;
}

function resolveMediaFile(id) {
  const metaFile = resolve(MEDIA_DIR, `${id}.json`);
  if (!existsSync(metaFile)) return null;

  let meta;
  try { meta = JSON.parse(readFileSync(metaFile, 'utf-8')); }
  catch { return null; }

  const exts = ['.svg', '.png', '.jpg', '.jpeg', '.gif', '.webp', '.avif'];
  let format = null;

  for (const ext of exts) {
    if (existsSync(resolve(MEDIA_DIR, `${id}${ext}`))) {
      format = ext.slice(1);
      break;
    }
  }

  if (!format) return null;

  // Read optimized dimensions from manifest, fall back to metadata
  const manifest = getOptimizedManifest();
  const dims = manifest[id] || {};
  const width = dims.width || meta.width || 800;
  const height = dims.height || meta.height || 600;

  const src = `/media/${id}.${format}`;
  return { src, format, alt: meta.alt || '', width, height, caption: meta.caption, credit: meta.credit, license: meta.license, licenseUrl: meta.licenseUrl, sourceId: meta.sourceId, sourceCode: meta.sourceCode && meta.sourceCode.length > 0 ? meta.sourceCode : undefined };
}

// ── Figure builders ──

function buildMediaFigure(id) {
  const m = resolveMediaFile(id);
  if (!m) return `<p class="figure-warning">M\u00e9dia introuvable : ${id}</p>`;

  // Generate <picture> with WebP source + JPEG fallback
  const ext = m.format;
  const jpgSrc = `/media/${id}.jpg`;
  const webpSrc = `/media/${id}.webp`;
  const isSvg = ext === 'svg';

  const parts = [`<figure class="figure figure--inline media-figure" data-figure-type="media" data-figure-id="${id}">`];

  if (isSvg) {
    parts.push(`<img src="${m.src}" alt="${esc(m.alt)}" class="media-figure__img" loading="lazy" decoding="async">`);
  } else {
    parts.push(`<picture>`);
    parts.push(`<source srcset="${webpSrc}" type="image/webp">`);
    parts.push(`<img src="${jpgSrc}" alt="${esc(m.alt)}" class="media-figure__img" loading="lazy" decoding="async" width="${m.width}" height="${m.height}">`);
    parts.push(`</picture>`);
  }

  const hasMeta = m.caption || m.credit || m.license || m.sourceId;
  if (hasMeta) {
    parts.push('<figcaption class="figure__caption">');
    if (m.caption) parts.push(`<p class="figure__caption-text">${esc(m.caption)}</p>`);
    const items = [];
    if (m.credit) items.push(`<li class="figure__credit">${esc(m.credit)}</li>`);
    if (m.license) {
      const l = m.licenseUrl ? `<a href="${esc(m.licenseUrl)}" target="_blank" rel="license">${esc(m.license)}</a>` : esc(m.license);
      items.push(`<li class="figure__license">${l}</li>`);
    }
    if (m.sourceCode) items.push(`<li><a href="/media/${id}/code" class="figure__source-code">Code source \u2192</a></li>`);
    if (m.sourceId) items.push(`<li><a href="/bibliographie/${m.sourceId}" class="figure__source">Source</a></li>`);
    if (items.length) parts.push(`<ul class="figure__meta">${items.join('')}</ul>`);
    parts.push('</figcaption>');
  }
  parts.push('</figure>');
  return parts.join('\n');
}

function formatSourceLabel(sid) {
  const srcFile = resolve(PROJECT_ROOT, 'src/content/sources', `${sid}.json`);
  if (!existsSync(srcFile)) return sid;
  try {
    const src = JSON.parse(readFileSync(srcFile, 'utf-8'));
    if (src.publisher) {
      const year = src.issued?.['date-parts']?.[0]?.[0];
      return year ? `${src.publisher}, ${year}` : src.publisher;
    }
    if (src.author?.length) {
      const name = src.author[0]?.literal ?? src.author[0]?.family ?? '';
      if (name) return name;
    }
    return src.title ?? sid;
  } catch {
    return sid;
  }
}

async function buildChartFigure(id) {
  const figFile = resolve(FIGURES_DIR, `${id}.json`);
  if (!existsSync(figFile)) return `<p class="figure-warning">Graphique introuvable : ${id}</p>`;

  let figure;
  try { figure = JSON.parse(readFileSync(figFile, 'utf-8')); }
  catch { return `<p class="figure-warning">Erreur de lecture : ${id}</p>`; }

  let svg;
  try {
    svg = await renderChartSvg(figure);
  } catch (e) {
    console.warn(`[remark-figure-embed] \u26a0 Failed to render chart "${id}": ${e.message}`);
    const { width = 720, height = 200 } = figure;
    svg = `<svg viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
      <rect width="${width}" height="${height}" fill="#1a1a2e" rx="4"/>
      <text x="${width / 2}" y="${height / 2}" fill="#94a3b8" font-size="14" text-anchor="middle" font-family="system-ui, sans-serif">${esc(figure.title || id)}</text>
    </svg>`;
  }

  const parts = [`<figure class="figure figure--inline chart-figure chart-figure--${figure.type}" data-figure-type="chart" data-figure-id="${id}">`];
  parts.push(`<div class="chart-figure__container" data-chart-id="${id}" data-chart-type="${figure.type}">${svg}</div>`);

  const hasMeta = figure.caption || figure.credit || (figure.sourceIds?.length);
  if (hasMeta) {
    parts.push('<figcaption class="figure__caption">');
    if (figure.caption) parts.push(`<p class="figure__caption-text">${esc(figure.caption)}</p>`);
    const items = [];
    if (figure.credit) items.push(`<li class="figure__credit">${esc(figure.credit)}</li>`);
    if (figure.license) {
      const l = figure.licenseUrl ? `<a href="${esc(figure.licenseUrl)}" target="_blank" rel="license">${esc(figure.license)}</a>` : esc(figure.license);
      items.push(`<li class="figure__license">${l}</li>`);
    }
    if (figure.sourceIds) {
      for (const sid of figure.sourceIds) {
        const label = formatSourceLabel(sid);
        items.push(`<li><a href="/bibliographie/${sid}" class="figure__source">${esc(label)}</a></li>`);
      }
    }
    if (items.length) parts.push(`<ul class="figure__meta">${items.join('')}</ul>`);
    parts.push('</figcaption>');
  }
  parts.push('</figure>');
  return parts.join('\n');
}

// ── Map figure (generic MapShell + custom containers) ──

function buildMapFigure(id) {
  const registry = getMapRegistry();
  const entry = registry[id];
  if (!entry) return `<p class="figure-warning">Carte introuvable : ${id}</p>`;

  if (entry.customHtml) {
    return buildCustomMapFigure(id);
  }

  // Generic MapShell HTML
  const parts = [];
  parts.push('<section class="map-shell">');
  parts.push(`<div id="${esc(id)}-map" class="map-shell__map" role="application" aria-label="${esc(entry.label)}" style="height:${entry.height || 400}px">`);
  parts.push('<noscript><div class="map-shell__noscript"><p>La carte interactive n\u00e9cessite JavaScript.</p></div></noscript>');
  parts.push('</div>');
  parts.push(`<div id="${esc(id)}-legend" class="map-shell__legend">`);
  parts.push(`<p class="map-shell__legend-title">${esc(entry.title)}</p>`);
  if (entry.hint) {
    parts.push(`<p class="map-shell__legend-hint">${esc(entry.hint)}</p>`);
  }
  parts.push(`<div id="${esc(id)}-legend-content" class="map-shell__legend-content">`);
  parts.push('<p class="map-shell__legend-placeholder">Survolez un \u00e9l\u00e9ment sur la carte.</p>');
  parts.push('</div></div></section>');
  return parts.join('\n');
}

/**
 * Custom HTML containers for Pattern C maps (non-MapShell layouts).
 * Each case mirrors the HTML structure from the original .astro component.
 */
function buildCustomMapFigure(id) {
  switch (id) {
    case 'migration':
      return `<section class="migration-map-section">
  <div id="migration-map" class="migration-map" role="application" aria-label="Carte interactive des migrations des Homo sapiens et N\u00e9andertaliens">
    <noscript><div class="migration-map__noscript"><p>La carte interactive n\u00e9cessite JavaScript. Veuillez activer JavaScript pour voir la carte.</p></div></noscript>
  </div>
  <div id="migration-legend" class="migration-map__legend">
    <p class="migration-map__legend-title">Migrations et territoires</p>
    <p class="migration-map__legend-hint">Survolez les routes ou les sites pour plus d'informations.</p>
    <div class="migration-map__legend-content" id="migration-legend-content">
      <p class="migration-map__legend-placeholder">Survolez un \u00e9l\u00e9ment sur la carte.</p>
    </div>
    <div class="migration-map__legend-layers">
      <span class="migration-map__legend-line migration-map__legend-line--sapiens">\u2014</span>
      <span class="migration-map__legend-label">Homo sapiens</span>
      <span class="migration-map__legend-line migration-map__legend-line--neanderthal">\u2014</span>
      <span class="migration-map__legend-label">N\u00e9andertaliens</span>
      <span class="migration-map__legend-line migration-map__legend-line--neronian">\u2014</span>
      <span class="migration-map__legend-label">Incursion n\u00e9ronienne (Mandrin)</span>
    </div>
  </div>
</section>`;

    case 'resources':
      return `<section class="resource-map-section">
  <div id="resource-map" class="resource-map" role="application" aria-label="Carte des sources de cuivre et d'\u00e9tain en Europe">
    <noscript><div class="resource-map__noscript"><p>La carte interactive n\u00e9cessite JavaScript. Veuillez activer JavaScript pour voir la carte.</p></div></noscript>
  </div>
  <div id="resource-legend" class="resource-map__legend">
    <p class="resource-map__legend-title">Sources de m\u00e9taux \u00e0 l'\u00c2ge du bronze</p>
    <div class="resource-map__legend-items">
      <div class="resource-map__legend-item">
        <span class="resource-map__legend-marker resource-map__legend-marker--copper"></span>
        <span>Cuivre</span>
      </div>
      <div class="resource-map__legend-item">
        <span class="resource-map__legend-marker resource-map__legend-marker--tin"></span>
        <span>\u00c9tain</span>
      </div>
    </div>
    <p class="resource-map__legend-hint">Survolez un marqueur pour plus d'informations.</p>
    <div id="resource-legend-content" class="resource-map__legend-content">
      <p class="resource-map__legend-placeholder">Survolez un site sur la carte.</p>
    </div>
  </div>
</section>`;

    case 'first-colonial-empire':
      return `<section class="colonial-map-section">
  <div id="first-colonial-empire-map" class="colonial-map" role="application" aria-label="Carte du premier empire colonial fran\u00e7ais">
    <noscript><div class="colonial-map__noscript"><p>La carte interactive n\u00e9cessite JavaScript.</p></div></noscript>
  </div>
</section>`;

    case 'second-colonial-empire':
      return `<section class="colonial-map-section">
  <div id="second-colonial-empire-map" class="colonial-map" role="application" aria-label="Carte du second empire colonial fran\u00e7ais (1914)">
    <noscript><div class="colonial-map__noscript"><p>La carte interactive n\u00e9cessite JavaScript.</p></div></noscript>
  </div>
</section>`;

    case 'french-algeria':
      return `<section class="algeria-map-section">
  <div id="french-algeria-map" class="algeria-map" role="application" aria-label="Carte des d\u00e9partements de l'Alg\u00e9rie fran\u00e7aise en 1954">
    <noscript><div class="algeria-map__noscript"><p>La carte interactive n\u00e9cessite JavaScript. Veuillez activer JavaScript pour voir la carte.</p></div></noscript>
  </div>
</section>`;

    default:
      return `<p class="figure-warning">Carte introuvable : ${id}</p>`;
  }
}

// ── Widget figure (non-map interactive embeds) ──

function buildWidgetFigure(id) {
  // For now, generate a placeholder div that can be replaced by the template.
  // As the widget registry grows, individual widget builders can be added here.
  return `<div data-widget-slot="${esc(id)}" class="widget-slot widget-slot--${esc(id)}"></div>`;
}

function esc(s) {
  if (!s) return '';
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// ── Plugin ──

export default function remarkFigureEmbed() {
  return async (tree, file) => {
    const targets = [];

    visit(tree, 'text', (node, index, parent) => {
      MEDIA_RE.lastIndex = 0;
      CHART_RE.lastIndex = 0;
      MAP_RE.lastIndex = 0;
      WIDGET_RE.lastIndex = 0;
      if (MEDIA_RE.test(node.value) || CHART_RE.test(node.value) || MAP_RE.test(node.value) || WIDGET_RE.test(node.value)) {
        targets.push({ node, index, parent });
        return visit.SKIP;
      }
    });

    const dispatchBuild = async (match) => {
      switch (match.type) {
        case 'media': return buildMediaFigure(match.id);
        case 'chart': return await buildChartFigure(match.id);
        case 'map':   return buildMapFigure(match.id);
        case 'widget': return buildWidgetFigure(match.id);
        default: return '';
      }
    };

    // Apply replacements in reverse order (preserves parent index ordering)
    for (let i = targets.length - 1; i >= 0; i--) {
      const { node, index, parent } = targets[i];
      const matches = [];
      let m;

      MEDIA_RE.lastIndex = 0;
      while ((m = MEDIA_RE.exec(node.value)) !== null) {
        matches.push({ type: 'media', id: m[1], index: m.index, end: m.index + m[0].length });
      }
      CHART_RE.lastIndex = 0;
      while ((m = CHART_RE.exec(node.value)) !== null) {
        matches.push({ type: 'chart', id: m[1], index: m.index, end: m.index + m[0].length });
      }
      MAP_RE.lastIndex = 0;
      while ((m = MAP_RE.exec(node.value)) !== null) {
        matches.push({ type: 'map', id: m[1], index: m.index, end: m.index + m[0].length });
      }
      WIDGET_RE.lastIndex = 0;
      while ((m = WIDGET_RE.exec(node.value)) !== null) {
        matches.push({ type: 'widget', id: m[1], index: m.index, end: m.index + m[0].length });
      }
      matches.sort((a, b) => a.index - b.index);

      if (matches.length === 0) continue;

      const children = [];
      let lastIdx = 0;

      for (const match of matches) {
        if (match.index > lastIdx) {
          children.push({ type: 'text', value: node.value.slice(lastIdx, match.index) });
        }
        children.push({ type: 'html', value: await dispatchBuild(match) });
        lastIdx = match.end;
      }
      if (lastIdx < node.value.length) {
        children.push({ type: 'text', value: node.value.slice(lastIdx) });
      }

      parent.children.splice(index, 1, ...children);
    }
  };
}
