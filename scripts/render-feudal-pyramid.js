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

const WIDTH = 500;
const HEIGHT = 480;

// Tier definitions: [label, sublabel, pct, color]
const TIERS = [
  { label: 'Roi', sublabel: 'Suzerain suprême', pct: null, fill: '#1a5276', stroke: '#2980b9' },
  { label: 'Grands vassaux', sublabel: 'Ducs, comtes', pct: '~1 %', fill: '#2471a3', stroke: '#2980b9' },
  { label: 'Arrière-vassaux', sublabel: 'Vicomtes, barons, châtelains', pct: '~5 %', fill: '#2e86c1', stroke: '#5dade2' },
  { label: 'Chevaliers', sublabel: 'Petits seigneurs, guerriers', pct: '~4 %', fill: '#3498db', stroke: '#5dade2' },
  { label: 'Paysan·nes', sublabel: 'Serfs et vilain·es', pct: '~90 %', fill: '#1e8449', stroke: '#27ae60' },
];

// Proportional widths (as fraction of total width)
const TOP_WIDTH = 0.22;   // King's tier width fraction
const BASE_WIDTH = 0.94;  // Bottom tier width fraction
const HEIGHT_PER_TIER = 44;
const TIER_GAP = 4;
const VERTICAL_START = 48;

function renderPyramid() {
  const cx = WIDTH / 2;
  const parts = [];
  const totalTierH = TIERS.length * HEIGHT_PER_TIER + (TIERS.length - 1) * TIER_GAP;

  // SVG header
  parts.push(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${WIDTH} ${HEIGHT}" width="${WIDTH}" height="${HEIGHT}" role="img" aria-label="Pyramide féodale : hiérarchie du royaume de France">`);
  parts.push(`<defs>`);
  parts.push(`<marker id="arrow-down" viewBox="0 0 10 10" refX="5" refY="10" markerWidth="6" markerHeight="6" orient="auto"><path d="M0,0 L5,10 L10,0" fill="#6c3483"/></marker>`);
  parts.push(`<marker id="arrow-up" viewBox="0 0 10 10" refX="5" refY="0" markerWidth="6" markerHeight="6" orient="auto"><path d="M0,10 L5,0 L10,10" fill="#b7950b"/></marker>`);
  parts.push(`</defs>`);

  // Background
  parts.push(`<rect width="${WIDTH}" height="${HEIGHT}" fill="#1a1a2e" rx="8"/>`);

  // Title
  parts.push(`<text x="${cx}" y="24" fill="#e2e8f0" font-size="15" font-weight="700" text-anchor="middle" font-family="system-ui, sans-serif">Pyramide féodale</text>`);

  // Compute half-widths at each tier boundary
  const halfWidths = TIERS.map((_, i) => {
    const t = i / TIERS.length;
    return ((TOP_WIDTH / 2) + t * ((BASE_WIDTH - TOP_WIDTH) / 2)) * WIDTH;
  });

  // Draw the connecting lines between tiers (reverse trapezoids: wider at bottom)
  for (let i = 0; i < TIERS.length; i++) {
    const yTop = VERTICAL_START + i * (HEIGHT_PER_TIER + TIER_GAP);
    const yBot = yTop + HEIGHT_PER_TIER;
    const hwTop = halfWidths[i];
    const hwBot = halfWidths[i + 1];

    // Trapezoid: top-left, top-right, bottom-right, bottom-left
    parts.push(`<polygon points="${cx - hwTop},${yTop} ${cx + hwTop},${yTop} ${cx + hwBot},${yBot} ${cx - hwBot},${yBot}" fill="${TIERS[i].fill}" stroke="${TIERS[i].stroke}" stroke-width="1.5"/>`);
  }

  // Render labels for each tier
  TIERS.forEach((tier, i) => {
    const yTop = VERTICAL_START + i * (HEIGHT_PER_TIER + TIER_GAP);
    const yMid = yTop + HEIGHT_PER_TIER / 2;

    // Label: primary centered
    parts.push(`<text x="${cx}" y="${yMid + 2}" fill="#fff" font-size="13" font-weight="600" text-anchor="middle" font-family="system-ui, sans-serif" dominant-baseline="middle">${escapeXml(tier.label)}</text>`);
    // Sublabel below
    if (tier.sublabel) {
      parts.push(`<text x="${cx}" y="${yMid + 17}" fill="#e2e8f0" font-size="10" text-anchor="middle" font-family="system-ui, sans-serif" dominant-baseline="middle">${escapeXml(tier.sublabel)}</text>`);
    }
    // Percentage at bottom right of tier
    if (tier.pct) {
      const hw = halfWidths[i];
      parts.push(`<text x="${cx + hw - 10}" y="${yTop + HEIGHT_PER_TIER - 6}" fill="#cbd5e1" font-size="9" text-anchor="end" font-family="system-ui, sans-serif">${escapeXml(tier.pct)}</text>`);
    }
  });

  // —— Arrow paths ——
  // y-range: from just below the bottom tier to just above the top tier
  const arrowYStart = VERTICAL_START + (TIERS.length) * (HEIGHT_PER_TIER + TIER_GAP) - TIER_GAP - 8;
  const arrowYEnd = VERTICAL_START - 6;
  const midY = (arrowYStart + arrowYEnd) / 2;

  // RIGHT SIDE: Service militaire (↓) — vassals provide service upward
  // The arrow goes from bottom-right upward then left toward king
  const rightX = halfWidths[TIERS.length - 1] + 50;
  const rightXTop = halfWidths[0] + 50;

  parts.push(`<path d="M${cx + rightX},${arrowYStart} C${cx + rightX + 20},${arrowYStart + 15} ${cx + rightX + 20},${arrowYEnd} ${cx + rightXTop},${arrowYEnd}" fill="none" stroke="#6c3483" stroke-width="2.5" stroke-dasharray="6,4" marker-end="url(#arrow-down)"/>`);
  parts.push(`<text x="${cx + rightX + 28}" y="${midY - 6}" fill="#a569bd" font-size="11" font-weight="600" font-family="system-ui, sans-serif" text-anchor="start">Service</text>`);
  parts.push(`<text x="${cx + rightX + 28}" y="${midY + 10}" fill="#a569bd" font-size="11" font-weight="600" font-family="system-ui, sans-serif" text-anchor="start">militaire</text>`);

  // LEFT SIDE: Protection et terres (↑) — lord provides protection/land downward
  const leftX = halfWidths[TIERS.length - 1] + 50;
  const leftXTop = halfWidths[0] + 50;

  parts.push(`<path d="M${cx - leftX},${arrowYStart} C${cx - leftX - 20},${arrowYStart + 15} ${cx - leftX - 20},${arrowYEnd} ${cx - leftXTop},${arrowYEnd}" fill="none" stroke="#b7950b" stroke-width="2.5" stroke-dasharray="6,4" marker-end="url(#arrow-up)"/>`);
  parts.push(`<text x="${leftX - 115}" y="${midY - 6}" fill="#f4d03f" font-size="11" font-weight="600" font-family="system-ui, sans-serif" text-anchor="start">Protection</text>`);
  parts.push(`<text x="${leftX - 115}" y="${midY + 10}" fill="#f4d03f" font-size="11" font-weight="600" font-family="system-ui, sans-serif" text-anchor="start">et terres</text>`);

  // Source note
  parts.push(`<text x="${cx}" y="${HEIGHT - 12}" fill="#4a5568" font-size="8" font-family="system-ui, sans-serif" text-anchor="middle">Source : Encyclopædia Britannica</text>`);

  parts.push(`</svg>`);
  return parts.join('\n');
}

function escapeXml(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// ── Main ──
console.log('Rendering feudal pyramid...');
const svg = renderPyramid();
const svgPath = resolve(MEDIA_DIR, 'pyramide-feodale-fr.svg');
writeFileSync(svgPath, svg);
console.log(`  → Saved SVG (${svg.length} bytes)`);

// The JSON metadata already exists, we just update the SVG
console.log('Done!');
