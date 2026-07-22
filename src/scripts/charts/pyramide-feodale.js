/**
 * Generate the feudal pyramid SVG using D3.
 * This replaces the hand-crafted SVG whose arrows were misaligned.
 * Uses d3-scale, d3-shape, and d3-selection (via jsdom) for proper positioning.
 *
 * Usage: node src/scripts/charts/pyramide-feodale.js
 * Output: overwrites src/content/media/pyramide-feodale-fr.svg
 */

import { JSDOM } from 'jsdom';
import { select } from 'd3-selection';
import { scaleLinear, scaleOrdinal } from 'd3-scale';
import { line, curveNatural } from 'd3-shape';
import { writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const WIDTH = 660;
const HEIGHT = 340;
const MARGIN_LEFT = 50;
const MARGIN_RIGHT = 50;
const TOP_Y = 40;
const BOTTOM_Y = 260;
const PYRAMID_CENTER = WIDTH / 2;
const MAX_HALF_WIDTH = (WIDTH - MARGIN_LEFT - MARGIN_RIGHT) / 2;
const MIN_HALF_WIDTH = 30; // top level half-width

const levels = [
  { label: 'Roi', sublabel: 'Suzerain suprême', percent: '', color: '#1a5276', stroke: '#2980b9' },
  { label: 'Grands vassaux', sublabel: 'Ducs, comtes', percent: '~1 %', color: '#2471a3', stroke: '#2980b9' },
  { label: 'Arrière-vassaux', sublabel: 'Vicomtes, barons, châtelains', percent: '~5 %', color: '#2e86c1', stroke: '#5dade2' },
  { label: 'Chevaliers', sublabel: 'Petits seigneurs, guerriers', percent: '~4 %', color: '#3498db', stroke: '#5dade2' },
  { label: 'Paysan·nes', sublabel: 'Serfs et vilain·es', percent: '~90 %', color: '#1e8449', stroke: '#27ae60' },
];

// Y positions: evenly distribute levels
const yScale = scaleLinear()
  .domain([0, levels.length])
  .range([TOP_Y, BOTTOM_Y]);

// Width scale: wider at bottom
const halfWidthScale = scaleLinear()
  .domain([0, levels.length])
  .range([MIN_HALF_WIDTH, MAX_HALF_WIDTH]);

function buildTrapezoid(levelIndex) {
  const y0 = yScale(levelIndex);
  const y1 = yScale(levelIndex + 1);
  const hw0 = halfWidthScale(levelIndex);
  const hw1 = halfWidthScale(levelIndex + 1);
  return {
    x0: PYRAMID_CENTER - hw0, y0,
    x1: PYRAMID_CENTER + hw0,
    x2: PYRAMID_CENTER + hw1, y1,
    x3: PYRAMID_CENTER - hw1,
    centerY: (y0 + y1) / 2,
  };
}

function generateSVG() {
  const dom = new JSDOM('<!DOCTYPE html><svg xmlns="http://www.w3.org/2000/svg"></svg>');
  const svg = select(dom.window.document.querySelector('svg'))
    .attr('viewBox', `0 0 ${WIDTH} ${HEIGHT}`)
    .attr('width', WIDTH)
    .attr('height', HEIGHT)
    .attr('role', 'img')
    .attr('aria-label', 'Pyramide féodale : hiérarchie du royaume de France');

  // Background
  svg.append('rect')
    .attr('width', WIDTH)
    .attr('height', HEIGHT)
    .attr('fill', '#1a1a2e')
    .attr('rx', 8);

  // Title
  svg.append('text')
    .attr('x', PYRAMID_CENTER)
    .attr('y', 24)
    .attr('fill', '#e2e8f0')
    .attr('font-size', 15)
    .attr('font-weight', 700)
    .attr('text-anchor', 'middle')
    .attr('font-family', 'system-ui, sans-serif')
    .text('Pyramide féodale');

  // Arrow marker definitions
  const defs = svg.append('defs');
  defs.append('marker')
    .attr('id', 'arrow-down')
    .attr('viewBox', '0 0 10 10')
    .attr('refX', 5)
    .attr('refY', 10)
    .attr('markerWidth', 7)
    .attr('markerHeight', 7)
    .attr('orient', 'auto')
    .append('path')
    .attr('d', 'M0,0 L5,10 L10,0')
    .attr('fill', '#b7950b');

  defs.append('marker')
    .attr('id', 'arrow-up')
    .attr('viewBox', '0 0 10 10')
    .attr('refX', 5)
    .attr('refY', 0)
    .attr('markerWidth', 7)
    .attr('markerHeight', 7)
    .attr('orient', 'auto')
    .append('path')
    .attr('d', 'M0,10 L5,0 L10,10')
    .attr('fill', '#6c3483');

  // Draw each level
  const trapezoids = levels.map((level, i) => ({ level, i, trap: buildTrapezoid(i) }));

  trapezoids.forEach(({ level, i, trap }) => {
    const { x0, y0, x1, x2, y2, x3, centerY } = trap;
    const y1c = yScale(i + 1);

    // Polygon for the level
    svg.append('polygon')
      .attr('points', `${x0},${y0} ${x1},${y0} ${x2},${y1c} ${x3},${y1c}`)
      .attr('fill', level.color)
      .attr('stroke', level.stroke)
      .attr('stroke-width', 1.5);

    // Main label
    svg.append('text')
      .attr('x', PYRAMID_CENTER)
      .attr('y', centerY - 6)
      .attr('fill', '#fff')
      .attr('font-size', 13)
      .attr('font-weight', 600)
      .attr('text-anchor', 'middle')
      .attr('font-family', 'system-ui, sans-serif')
      .attr('dominant-baseline', 'middle')
      .text(level.label);

    // Sub-label
    svg.append('text')
      .attr('x', PYRAMID_CENTER)
      .attr('y', centerY + 9)
      .attr('fill', '#e2e8f0')
      .attr('font-size', 10)
      .attr('text-anchor', 'middle')
      .attr('font-family', 'system-ui, sans-serif')
      .attr('dominant-baseline', 'middle')
      .text(level.sublabel);

    // Percentage text on the right
    if (level.percent) {
      const percentX = x2 + 8;
      svg.append('text')
        .attr('x', percentX)
        .attr('y', centerY)
        .attr('fill', '#cbd5e1')
        .attr('font-size', 9)
        .attr('text-anchor', 'start')
        .attr('font-family', 'system-ui, sans-serif')
        .attr('dominant-baseline', 'middle')
        .text(level.percent);
    }
  });

  // ── Arrows using d3-shape line with curveNatural ──
  const curvedLine = line().curve(curveNatural);

  // Protection arrow (DOWN the right side): from Roi-level right edge toward bottom-right
  const topR = trapezoids[0].trap;
  const bottomR = trapezoids[trapezoids.length - 1].trap;
  const arrowDownPoints = [
    [topR.x1 + 5, topR.y0 + 6],                     // start: just outside top-right of Roi level
    [topR.x1 + 60, (topR.y0 + bottomR.y1) / 2 - 30], // control point
    [bottomR.x2 + 5, bottomR.y1 - 6],                 // end: just outside bottom-right of Paysan level
  ];

  svg.append('path')
    .attr('d', curvedLine(arrowDownPoints))
    .attr('fill', 'none')
    .attr('stroke', '#b7950b')
    .attr('stroke-width', 2.5)
    .attr('stroke-dasharray', '6,4')
    .attr('marker-end', 'url(#arrow-down)');

  // Protection label
  const midDownY = (arrowDownPoints[0][1] + arrowDownPoints[2][1]) / 2;
  svg.append('text')
    .attr('x', arrowDownPoints[1][0] + 20)
    .attr('y', midDownY - 8)
    .attr('fill', '#b7950b')
    .attr('font-size', 11)
    .attr('font-weight', 600)
    .attr('font-family', 'system-ui, sans-serif')
    .attr('text-anchor', 'end')
    .text('Protection');
  svg.append('text')
    .attr('x', arrowDownPoints[1][0] + 20)
    .attr('y', midDownY + 8)
    .attr('fill', '#b7950b')
    .attr('font-size', 11)
    .attr('font-weight', 600)
    .attr('font-family', 'system-ui, sans-serif')
    .attr('text-anchor', 'end')
    .text('et terres');

  // Service arrow (UP the left side): from bottom-left toward top-left
  const arrowUpPoints = [
    [bottomR.x3 - 5, bottomR.y1 - 6],                 // start: bottom-left of Paysan level
    [bottomR.x3 - 60, (topR.y0 + bottomR.y1) / 2 + 30], // control point
    [topR.x0 - 5, topR.y0 + 6],                       // end: top-left of Roi level
  ];

  svg.append('path')
    .attr('d', curvedLine(arrowUpPoints))
    .attr('fill', 'none')
    .attr('stroke', '#6c3483')
    .attr('stroke-width', 2.5)
    .attr('stroke-dasharray', '6,4')
    .attr('marker-end', 'url(#arrow-up)');

  // Service label
  const midUpY = (arrowUpPoints[0][1] + arrowUpPoints[2][1]) / 2;
  svg.append('text')
    .attr('x', arrowUpPoints[1][0] - 20)
    .attr('y', midUpY - 8)
    .attr('fill', '#6c3483')
    .attr('font-size', 11)
    .attr('font-weight', 600)
    .attr('font-family', 'system-ui, sans-serif')
    .attr('text-anchor', 'start')
    .text('Service');
  svg.append('text')
    .attr('x', arrowUpPoints[1][0] - 20)
    .attr('y', midUpY + 8)
    .attr('fill', '#6c3483')
    .attr('font-size', 11)
    .attr('font-weight', 600)
    .attr('font-family', 'system-ui, sans-serif')
    .attr('text-anchor', 'start')
    .text('militaire');

  // Source footer
  svg.append('text')
    .attr('x', PYRAMID_CENTER)
    .attr('y', HEIGHT - 10)
    .attr('fill', '#4a5568')
    .attr('font-size', 8)
    .attr('font-family', 'system-ui, sans-serif')
    .attr('text-anchor', 'middle')
    .text('Source : Encyclopædia Britannica');

  return dom.window.document.querySelector('svg').outerHTML;
}

// Run
const svgContent = generateSVG();
const outPath = resolve(__dirname, '../../content/media/pyramide-feodale-fr.svg');
writeFileSync(outPath, svgContent, 'utf-8');
console.log(`✅ Feudal pyramid SVG written to ${outPath}`);
