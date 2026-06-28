/**
 * render-feudal-pyramid.js — Build-time SVG renderer for the feudal hierarchy pyramid.
 * Uses D3 for all geometry (tier widths, arrow curves).
 *
 * Arrow direction rule: arrow flows from `source` → `target`.
 * marker-end is always at `target`. Never hand-write <path d="...">.
 *
 * Usage: node scripts/render-feudal-pyramid.js
 */

import { writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { line, curveNatural } from 'd3-shape';

const __dirname = dirname(fileURLToPath(import.meta.url));
const MEDIA_DIR = resolve(__dirname, '../src/content/media');

const WIDTH = 660;
const HEIGHT = 340;
const CX = WIDTH / 2;

const TIERS = [
  { label: 'Roi', sublabel: 'Suzerain suprême', pct: null, fill: '#1a5276', stroke: '#2980b9' },
  { label: 'Grands vassaux', sublabel: 'Ducs, comtes', pct: '~1 %', fill: '#2471a3', stroke: '#2980b9' },
  { label: 'Arrière-vassaux', sublabel: 'Vicomtes, barons, châtelains', pct: '~5 %', fill: '#2e86c1', stroke: '#5dade2' },
  { label: 'Chevaliers', sublabel: 'Petits seigneurs, guerriers', pct: '~4 %', fill: '#3498db', stroke: '#5dade2' },
  { label: 'Paysan·nes', sublabel: 'Serfs et vilain·es', pct: '~90 %', fill: '#1e8449', stroke: '#27ae60' },
];

const TOP_FRAC = 0.20;
const BASE_FRAC = 0.80;
const TIER_H = 40;
const TIER_GAP = 3;
const TOP_Y = 42;

/**
 * Generate an SVG path string for a curved arrow from source → target.
 * The path bends outward (away from CX) at the midpoint.
 * marker-end is at target — the arrow always points FROM source TO target.
 */
function arrowCurve(source, target) {
  const [sx, sy] = source;
  const [tx, ty] = target;
  const my = (sy + ty) / 2;
  // Control point curves away from the pyramid center
  const dir = tx > CX ? 1 : -1; // which side of center?
  const cpx = Math.max(sx, tx) + dir * 14;
  const pts = [[sx, sy], [cpx, my], [tx, ty]];

  const ln = line().x(d => d[0]).y(d => d[1]).curve(curveNatural);
  return ln(pts);
}

function renderPyramid() {
  const parts = [];

  // N tiers need N+1 boundary widths
  const hw = Array.from({ length: TIERS.length + 1 }, (_, i) =>
    (TOP_FRAC / 2 + (i / TIERS.length) * ((BASE_FRAC - TOP_FRAC) / 2)) * WIDTH
  );

  const yTierEnd = TOP_Y + TIERS.length * (TIER_H + TIER_GAP) - TIER_GAP;
  const arrowPad = 14;
  const aX = hw[hw.length - 1] + arrowPad;
  const aXTop = hw[0] + arrowPad;
  const aYBot = yTierEnd - 4;
  const aYTop = TOP_Y - 4;
  const midY = (aYBot + aYTop) / 2;

  // ── Arrows defined declaratively: source → target = arrow direction ──
  // Protection et terres flows FROM lord (top) TO vassals (bottom).
  // Service militaire flows FROM vassals (bottom) TO lord (top).
  const arrows = [
    {
      id: 'protection',
      source: [CX + aXTop, aYTop],   // start at top-right
      target: [CX + aX, aYBot],       // end at bottom-right
      label: ['Protection', 'et terres'],
      color: '#b7950b',
      marker: 'arrow-down',
      labelSide: 1,
    },
    {
      id: 'service',
      source: [CX - aX, aYBot],        // start at bottom-left
      target: [CX - aXTop, aYTop],      // end at top-left
      label: ['Service', 'militaire'],
      color: '#6c3483',
      marker: 'arrow-up',
      labelSide: -1,
    },
  ];

  // ── Build SVG ──

  parts.push(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${WIDTH} ${HEIGHT}" width="${WIDTH}" height="${HEIGHT}" role="img" aria-label="Pyramide féodale : hiérarchie du royaume de France">`);
  parts.push(`<defs>
  <marker id="arrow-down" viewBox="0 0 10 10" refX="5" refY="10" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L5,10 L10,0" fill="#6c3483"/></marker>
  <marker id="arrow-up" viewBox="0 0 10 10" refX="5" refY="0" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,10 L5,0 L10,10" fill="#b7950b"/></marker>
</defs>`);
  parts.push(`<rect width="${WIDTH}" height="${HEIGHT}" fill="#1a1a2e" rx="8"/>`);
  parts.push(`<text x="${CX}" y="24" fill="#e2e8f0" font-size="15" font-weight="700" text-anchor="middle" font-family="system-ui, sans-serif">Pyramide féodale</text>`);

  // Tiers
  for (let i = 0; i < TIERS.length; i++) {
    const yT = TOP_Y + i * (TIER_H + TIER_GAP);
    const yB = yT + TIER_H;
    parts.push(`<polygon points="${CX - hw[i]},${yT} ${CX + hw[i]},${yT} ${CX + hw[i + 1]},${yB} ${CX - hw[i + 1]},${yB}" fill="${TIERS[i].fill}" stroke="${TIERS[i].stroke}" stroke-width="1.5"/>`);
  }

  // Tier labels
  TIERS.forEach((tier, i) => {
    const yT = TOP_Y + i * (TIER_H + TIER_GAP);
    const yM = yT + TIER_H / 2;
    parts.push(`<text x="${CX}" y="${yM + 2}" fill="#fff" font-size="13" font-weight="600" text-anchor="middle" font-family="system-ui, sans-serif" dominant-baseline="middle">${esc(tier.label)}</text>`);
    if (tier.sublabel) {
      parts.push(`<text x="${CX}" y="${yM + 17}" fill="#e2e8f0" font-size="10" text-anchor="middle" font-family="system-ui, sans-serif" dominant-baseline="middle">${esc(tier.sublabel)}</text>`);
    }
    if (tier.pct) {
      parts.push(`<text x="${CX + hw[i] - 8}" y="${yT + TIER_H - 6}" fill="#cbd5e1" font-size="9" text-anchor="end" font-family="system-ui, sans-serif">${esc(tier.pct)}</text>`);
    }
  });

  // ── Arrows ──
  for (const a of arrows) {
    const d = arrowCurve(a.source, a.target);
    parts.push(`<path d="${d}" fill="none" stroke="${a.color}" stroke-width="2.5" stroke-dasharray="6,4" marker-end="url(#${a.marker})"/>`);
    const lx = a.labelSide > 0 ? CX + aX - 8 : CX - aX + 8;
    const anchor = a.labelSide > 0 ? 'end' : 'start';
    parts.push(`<text x="${lx}" y="${midY - 6}" fill="${a.color}" font-size="11" font-weight="600" font-family="system-ui, sans-serif" text-anchor="${anchor}">${esc(a.label[0])}</text>`);
    parts.push(`<text x="${lx}" y="${midY + 10}" fill="${a.color}" font-size="11" font-weight="600" font-family="system-ui, sans-serif" text-anchor="${anchor}">${esc(a.label[1])}</text>`);
  }

  parts.push(`<text x="${CX}" y="${HEIGHT - 10}" fill="#4a5568" font-size="8" font-family="system-ui, sans-serif" text-anchor="middle">Source : Encyclopædia Britannica</text>`);
  parts.push(`</svg>`);
  return parts.join('\n');
}

function esc(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

console.log('Rendering feudal pyramid...');
const svg = renderPyramid();
const svgPath = resolve(MEDIA_DIR, 'pyramide-feodale-fr.svg');
writeFileSync(svgPath, svg);
console.log(`  → Saved SVG (${svg.length} bytes)`);
console.log('Done!');
