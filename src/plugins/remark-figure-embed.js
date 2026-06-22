/**
 * remark-figure-embed.js
 *
 * Remark plugin that transforms `[media:id]` and `[chart:id]` patterns
 * in Markdown body text into fully rendered figure HTML at build time.
 *
 * For [chart:id]: reads the figure JSON, calls the D3 SVG renderer,
 *   and outputs a <figure class="chart-figure"> with inline SVG + caption.
 *
 * For [media:id]: reads the media metadata and resolves the file.
 *   All media is inlined as data URIs (SVGs → base64, rasters → base64).
 *
 * This approach avoids Astro's <Content components={...}> override
 * limitation with raw HTML from remark plugins by generating the
 * complete figure HTML at the remark plugin stage.
 */

import { visit } from 'unist-util-visit';
import { readFileSync, existsSync } from 'node:fs';
import { resolve, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { renderChartSvg } from '../scripts/charts/render-svg.js';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const PROJECT_ROOT = resolve(__dirname, '../..');
const MEDIA_DIR = resolve(PROJECT_ROOT, 'src/content/media');
const FIGURES_DIR = resolve(PROJECT_ROOT, 'src/content/figures');

const MEDIA_RE = /\[media:\s*([\w-]+)\]/g;
const CHART_RE = /\[chart:\s*([\w-]+)\]/g;

// ── Media file resolution ──

function resolveMediaFile(id) {
  const metaFile = resolve(MEDIA_DIR, `${id}.json`);
  if (!existsSync(metaFile)) return null;

  let meta;
  try { meta = JSON.parse(readFileSync(metaFile, 'utf-8')); }
  catch { return null; }

  const exts = ['.svg', '.png', '.jpg', '.jpeg', '.gif', '.webp', '.avif'];
  let srcPath = null;
  let format = null;

  for (const ext of exts) {
    const candidate = resolve(MEDIA_DIR, `${id}${ext}`);
    if (existsSync(candidate)) {
      srcPath = candidate;
      format = ext.slice(1);
      break;
    }
  }

  if (!srcPath) return null;

  const fileContent = readFileSync(srcPath);
  const b64 = fileContent.toString('base64');
  const mime = format === 'svg' ? 'image/svg+xml' : `image/${format}`;
  const src = `data:${mime};base64,${b64}`;

  return { src, format, alt: meta.alt || '', caption: meta.caption, credit: meta.credit, license: meta.license, licenseUrl: meta.licenseUrl, sourceId: meta.sourceId };
}

// ── Figure builders ──

function buildMediaFigure(id) {
  const m = resolveMediaFile(id);
  if (!m) return `<p class="figure-warning">Média introuvable : ${id}</p>`;

  const parts = [`<figure class="figure figure--inline media-figure" data-figure-type="media" data-figure-id="${id}">`];
  parts.push(`<img src="${m.src}" alt="${esc(m.alt)}" class="media-figure__img" loading="lazy" decoding="async">`);

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

function buildChartFigure(id) {
  const figFile = resolve(FIGURES_DIR, `${id}.json`);
  if (!existsSync(figFile)) return `<p class="figure-warning">Graphique introuvable : ${id}</p>`;

  let figure;
  try { figure = JSON.parse(readFileSync(figFile, 'utf-8')); }
  catch { return `<p class="figure-warning">Erreur de lecture : ${id}</p>`; }

  let svg;
  try {
    svg = renderChartSvg(figure);
  } catch (e) {
    console.warn(`[remark-figure-embed] ⚠ Failed to render chart "${id}": ${e.message}`);
    // Fallback: generate a simple placeholder SVG
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

function esc(s) {
  if (!s) return '';
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// ── Plugin ──

export default function remarkFigureEmbed() {
  return (tree, file) => {
    const targets = [];

    visit(tree, 'text', (node, index, parent) => {
      MEDIA_RE.lastIndex = 0;
      CHART_RE.lastIndex = 0;
      if (MEDIA_RE.test(node.value) || CHART_RE.test(node.value)) {
        targets.push({ node, index, parent });
        return visit.SKIP;
      }
    });

    for (const { node } of targets) {
      // Collect all matches in document order
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
      matches.sort((a, b) => a.index - b.index);

      if (matches.length === 0) continue;

      const children = [];
      let lastIdx = 0;

      for (const match of matches) {
        if (match.index > lastIdx) {
          children.push({ type: 'text', value: node.value.slice(lastIdx, match.index) });
        }
        const html = match.type === 'media' ? buildMediaFigure(match.id) : buildChartFigure(match.id);
        children.push({ type: 'html', value: html });
        lastIdx = match.end;
      }
      if (lastIdx < node.value.length) {
        children.push({ type: 'text', value: node.value.slice(lastIdx) });
      }

      // Replace in-place (we track the original node reference)
      node.type = 'paragraph'; // will be replaced below
    }

    // Apply replacements in reverse order
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
      matches.sort((a, b) => a.index - b.index);

      const children = [];
      let lastIdx = 0;

      for (const match of matches) {
        if (match.index > lastIdx) {
          children.push({ type: 'text', value: node.value.slice(lastIdx, match.index) });
        }
        const html = match.type === 'media' ? buildMediaFigure(match.id) : buildChartFigure(match.id);
        children.push({ type: 'html', value: html });
        lastIdx = match.end;
      }
      if (lastIdx < node.value.length) {
        children.push({ type: 'text', value: node.value.slice(lastIdx) });
      }

      parent.children.splice(index, 1, ...children);
    }
  };
}
