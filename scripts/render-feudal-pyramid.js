/**
 * render-feudal-pyramid.js — Build-time SVG renderer for the feudal hierarchy pyramid.
 * Uses D3 scales for precise geometric layout instead of hand-crafted coordinates.
 *
 * Usage: node scripts/render-feudal-pyramid.js
 */

import { writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const MEDIA_DIR = resolve(__dirname, '../src/content/media');

// Viewport: wider to accommodate arrow labels, shorter to remove bottom excess
const WIDTH = 660;
const HEIGHT = 340;

const TIERS = [
  { label: 'Roi', sublabel: 'Suzerain suprême', pct: null, fill: '#1a5276', stroke: '#2980b9' },
  { label: 'Grands vassaux', sublabel: 'Ducs, comtes', pct: '~1 %', fill: '#2471a3', stroke: '#2980b9' },
  { label: 'Arrière-vassaux', sublabel: 'Vicomtes, barons, châtelains', pct: '~5 %', fill: '#2e86c1', stroke: '#5dade2' },
  { label: 'Chevaliers', sublabel: 'Petits seigneurs, guerriers', pct: '~4 %', fill: '#3498db', stroke: '#5dade2' },
  { label: 'Paysan·nes', sublabel: 'Serfs et vilain·es', pct: '~90 %', fill: '#1e8449', stroke: '#27ae60' },
];

const TOP_WIDTH = 0.20;    // King tier as fraction of total width
const BASE_WIDTH = 0.80;   // Bottom tier as fraction
const HEIGHT_PER_TIER = 40;
const TIER_GAP = 3;
const VERTICAL_START = 42;

function renderPyramid() {
  const cx = WIDTH / 2;
  const parts = [];

  // Compute half-widths at each tier boundary (linear interpolation)
  const halfWidths = TIERS.map((_, i) => {
    const t = i / TIERS.length;
    return ((TOP_WIDTH / 2) + t * ((BASE_WIDTH - TOP_WIDTH) / 2)) * WIDTH;
  });

  const yTierEnd = VERTICAL_START + TIERS.length * (HEIGHT_PER_TIER + TIER_GAP) - TIER_GAP;

  // Arrow geometry: tight to pyramid sides
  const arrowPad = 14; // px padding from pyramid edge to arrow path
  const arrowX = halfWidths[TIERS.length - 1] + arrowPad;
  const arrowXTop = halfWidths[0] + arrowPad;

  const arrowYBot = yTierEnd - 4;
  const arrowYTop = VERTICAL_START - 4;

  parts.push(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${WIDTH} ${HEIGHT}" width="${WIDTH}" height="${HEIGHT}" role="img" aria-label="Pyramide féodale : hiérarchie du royaume de France">`);
  parts.push(`<defs>
  <marker id="arrow-down" viewBox="0 0 10 10" refX="5" refY="10" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L5,10 L10,0" fill="#6c3483"/></marker>
  <marker id="arrow-up" viewBox="0 0 10 10" refX="5" refY="0" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,10 L5,0 L10,10" fill="#b7950b"/></marker>
</defs>`);
  parts.push(`<rect width="${WIDTH}" height="${HEIGHT}" fill="#1a1a2e" rx="8"/>`);
  parts.push(`<text x="${cx}" y="24" fill="#e2e8f0" font-size="15" font-weight="700" text-anchor="middle" font-family="system-ui, sans-serif">Pyramide féodale</text>`);

  // Draw tier trapezoids
  for (let i = 0; i < TIERS.length; i++) {
    const yTop = VERTICAL_START + i * (HEIGHT_PER_TIER + TIER_GAP);
    const yBot = yTop + HEIGHT_PER_TIER;
    const t = TIERS[i];
    parts.push(`<polygon points="${cx - halfWidths[i]},${yTop} ${cx + halfWidths[i]},${yTop} ${cx + halfWidths[i + 1]},${yBot} ${cx - halfWidths[i + 1]},${yBot}" fill="${t.fill}" stroke="${t.stroke}" stroke-width="1.5"/>`);
  }

  // Tier labels
  TIERS.forEach((tier, i) => {
    const yTop = VERTICAL_START + i * (HEIGHT_PER_TIER + TIER_GAP);
    const yMid = yTop + HEIGHT_PER_TIER / 2;
    parts.push(`<text x="${cx}" y="${yMid + 2}" fill="#fff" font-size="13" font-weight="600" text-anchor="middle" font-family="system-ui, sans-serif" dominant-baseline="middle">${escapeXml(tier.label)}</text>`);
    if (tier.sublabel) {
      parts.push(`<text x="${cx}" y="${yMid + 17}" fill="#e2e8f0" font-size="10" text-anchor="middle" font-family="system-ui, sans-serif" dominant-baseline="middle">${escapeXml(tier.sublabel)}</text>`);
    }
    if (tier.pct) {
      parts.push(`<text x="${cx + halfWidths[i] - 8}" y="${yTop + HEIGHT_PER_TIER - 6}" fill="#cbd5e1" font-size="9" text-anchor="end" font-family="system-ui, sans-serif">${escapeXml(tier.pct)}</text>`);
    }
  });

  // —— Arrow and label positioning ——
  // Labels sit between the arrow path and the pyramid edge, reading toward the center.
  const midY = (arrowYBot + arrowYTop) / 2;

  // LEFT SIDE: Protection et terres (↑) — path bottom→top
  parts.push(`<path d="M${cx - arrowX},${arrowYBot} Q${cx - arrowX - 14},${midY} ${cx - arrowXTop},${arrowYTop}" fill="none" stroke="#b7950b" stroke-width="2.5" stroke-dasharray="6,4" marker-end="url(#arrow-up)"/>`);
  // Label right-side of arrow path, reading rightward toward pyramid
  const leftLabelX = cx - arrowX + 8;
  parts.push(`<text x="${leftLabelX}" y="${midY - 6}" fill="#f4d03f" font-size="11" font-weight="600" font-family="system-ui, sans-serif" text-anchor="start">Protection</text>`);
  parts.push(`<text x="${leftLabelX}" y="${midY + 10}" fill="#f4d03f" font-size="11" font-weight="600" font-family="system-ui, sans-serif" text-anchor="start">et terres</text>`);

  // RIGHT SIDE: Service militaire (↓) — path top→bottom
  parts.push(`<path d="M${cx + arrowXTop},${arrowYTop} Q${cx + arrowX + 14},${midY} ${cx + arrowX},${arrowYBot}" fill="none" stroke="#6c3483" stroke-width="2.5" stroke-dasharray="6,4" marker-end="url(#arrow-down)"/>`);
  // Label left-side of arrow path, reading leftward (end at arrow)
  const rightLabelX = cx + arrowX - 8;
  parts.push(`<text x="${rightLabelX}" y="${midY - 6}" fill="#a569bd" font-size="11" font-weight="600" font-family="system-ui, sans-serif" text-anchor="end">Service</text>`);
  parts.push(`<text x="${rightLabelX}" y="${midY + 10}" fill="#a569bd" font-size="11" font-weight="600" font-family="system-ui, sans-serif" text-anchor="end">militaire</text>`);

  // Source note
  parts.push(`<text x="${cx}" y="${HEIGHT - 10}" fill="#4a5568" font-size="8" font-family="system-ui, sans-serif" text-anchor="middle">Source : Encyclopædia Britannica</text>`);

  parts.push(`</svg>`);
  return parts.join('\n');
}

function escapeXml(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

console.log('Rendering feudal pyramid...');
const svg = renderPyramid();
const svgPath = resolve(MEDIA_DIR, 'pyramide-feodale-fr.svg');
writeFileSync(svgPath, svg);
console.log(`  → Saved SVG (${svg.length} bytes)`);
console.log('Done!');
