/**
 * render-svg.js — Build-time chart SVG renderer.
 *
 * Converts ChartFigure data into inline SVG strings using Vega-Lite
 * (headless Node.js rendering via vega).  Called at Astro build time
 * from remark-figure-embed.js.
 *
 * Vega-Lite is the "high-level API" mandated by AGENTS.md — it takes
 * declarative data and produces a complete, correctly-centred chart
 * without any manual geometry, arc paths, or label positioning.
 *
 * For chart types Vega-Lite doesn't natively support (sankey),
 * a minimal D3 fallback is kept.
 */

import { compile } from 'vega-lite';
import { parse, View } from 'vega';

// ── Dark theme config shared by all Vega-Lite charts ──

const DARK_CONFIG = {
  background: null,
  view: { stroke: null },
  axis: {
    labelColor: '#cbd5e1',
    tickColor: '#334155',
    gridColor: '#1e293b',
    domainColor: '#334155',
    titleColor: '#cbd5e1',
    labelFontSize: 11,
    titleFontSize: 12,
  },
  legend: {
    labelColor: '#cbd5e1',
    titleColor: '#e2e8f0',
    labelFontSize: 11,
    titleFontSize: 12,
  },
  text: { fill: '#e2e8f0' },
  title: { color: '#e2e8f0', fontSize: 14, fontWeight: 600 },
  mark: { fill: '#cbd5e1', stroke: '#1a1a2e', strokeWidth: 1.5 },
  // Vega-Lite sets pointer-events: none everywhere by default,
  // which blocks mouse events needed for Tippy.js tooltips.
  // Enable pointer events on data marks only (not axes/legends).
  style: {
    'group': { pointerEvents: 'none' },
    'background': { pointerEvents: 'none' },
    'guide-label': { pointerEvents: 'none' },
    'guide-title': { pointerEvents: 'none' },
    'guide-group': { pointerEvents: 'none' },
    'point': { pointerEvents: 'all' },
    'line': { pointerEvents: 'all' },
    'bar': { pointerEvents: 'all' },
    'arc': { pointerEvents: 'all' },
    'symbol': { pointerEvents: 'all' },
  },
};

// ── Default colour palette (French tricolor + extended) ──

const DEFAULT_PALETTE = [
  '#1a5276', '#922b21', '#1e8449', '#b7950b',
  '#6c3483', '#117a65', '#d35400', '#2e86c1',
];

// ── Public API ──

/**
 * Render a figure to an SVG string.
 * @param {import('../../content/config').ChartFigure} figure
 * @returns {Promise<string>} Inline SVG markup
 */
export async function renderChartSvg(figure) {
  if (!figure || !figure.type) return '';

  switch (figure.type) {
    case 'pie':              return await renderPieChart(figure);
    case 'line':             return await renderLineChart(figure);
    case 'bar':              return await renderBarChart(figure);
    case 'population-pyramid': return await renderPyramidChart(figure);
    case 'bump':             return await renderBumpChart(figure);
    case 'choropleth':       return await renderChoroplethChart(figure);
    case 'comparison':       return await renderComparisonChart(figure);
    case 'sankey':           return renderSankeyChart(figure); // synchronous D3
    default:                 return renderUnsupported(figure);
  }
}

// ── Internal helpers ──

/**
 * Compile a Vega-Lite spec and render it to an SVG string.
 * This is the core function that all Vega-Lite chart types call.
 */
async function renderVegaLite(spec, palette = DEFAULT_PALETTE) {
  const fullSpec = {
    $schema: 'https://vega.github.io/schema/vega-lite/v5.json',
    ...spec,
    background: null,
    config: {
      ...DARK_CONFIG,
      range: {
        category: palette,
      },
    },
  };

  const compiled = compile(fullSpec).spec;
  const view = new View(parse(compiled), { renderer: 'svg' });
  const svg = await view.toSVG();
  view.finalize();
  return svg;
}

function escapeXml(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/**
 * Wrap raw SVG content inside a simple <svg> container when the
 * renderer produces a full document.  Vega already returns a complete
 * <svg> element, so `renderVegaLite` returns the string directly.
 */

// ── Pie chart ──

async function renderPieChart(figure) {
  const { data, config = {}, palette, width, height, title } = figure;

  const values = data.values;
  const innerRadius = config.innerRadius ?? 0;
  const showLegend = config.showLegend !== false && values.length > 1;

  return await renderVegaLite({
    title: title ? { text: title, anchor: 'middle', offset: 6 } : undefined,
    width: width ?? 480,
    height: height ?? 320,
    data: { values },
    mark: { type: 'arc', innerRadius },
    encoding: {
      theta: { field: 'value', type: 'quantitative', stack: true },
      color: { field: 'label', type: 'nominal', title: null, legend: showLegend ? {} : null },
      tooltip: [
        { field: 'label', type: 'nominal', title: 'Catégorie' },
        { field: 'value', type: 'quantitative', title: 'Valeur', format: '.0f' },
      ],
    },
  }, palette);
}

// ── Line chart ──

async function renderLineChart(figure) {
  const { data, config = {}, palette, width, height, title } = figure;

  // Convert our { series: [{ name, values: [{x, y}] }] } format to flat table
  const values = [];
  for (const series of data.series) {
    for (const pt of series.values) {
      values.push({
        series: series.name,
        x: pt.x,
        y: pt.y,
      });
    }
  }

  const hasLegend = config.showLegend !== false && data.series.length > 1;
  const xLabel = config.xAxis?.label || 'Année';
  const yLabel = config.yAxis?.label || 'Valeur';

  return await renderVegaLite({
    title: title ? { text: title, anchor: 'middle', offset: 6 } : undefined,
    width: width ?? 600,
    height: height ?? 350,
    data: { values },
    layer: [
      {
        mark: { type: 'line', strokeWidth: 2.5, point: true },
        encoding: {
          x: { field: 'x', type: 'quantitative', axis: { format: 'd', title: xLabel } },
          y: { field: 'y', type: 'quantitative', axis: { title: yLabel } },
          color: { field: 'series', type: 'nominal', legend: hasLegend ? {} : null },
          tooltip: [
            { field: 'x', type: 'quantitative', title: xLabel, format: 'd' },
            { field: 'y', type: 'quantitative', title: yLabel, format: '.1f' },
            { field: 'series', type: 'nominal', title: 'Série' },
          ],
        },
      },
    ],
  }, palette);
}

// ── Bar chart ──

async function renderBarChart(figure) {
  const { data, config = {}, palette, width, height, title } = figure;

  // Convert our { values: [{ category, groups: [{name, value}] }] } format
  const isGrouped = config.orientation === 'grouped';
  const values = [];

  for (const cat of data.values) {
    for (const g of cat.groups) {
      values.push({
        category: cat.category,
        group: g.name,
        value: g.value,
      });
    }
  }

  const hasLegend = values.some((v, i, a) => a.findIndex((x) => x.group !== v.group) !== -1);
  const xLabel = config.xAxis?.label || 'Catégorie';
  const yLabel = config.yAxis?.label || 'Valeur';
  const groupLabel = isGrouped ? 'Groupe' : undefined;

  return await renderVegaLite({
    title: title ? { text: title, anchor: 'middle', offset: 6 } : undefined,
    width: width ?? 600,
    height: height ?? 350,
    data: { values },
    mark: { type: 'bar' },
    encoding: {
      x: { field: 'category', type: 'nominal', axis: { title: xLabel, labelAngle: -35 } },
      y: { field: 'value', type: 'quantitative', axis: { title: yLabel } },
      color: hasLegend
        ? { field: 'group', type: 'nominal', legend: {} }
        : undefined,
      xOffset: isGrouped ? { field: 'group', type: 'nominal' } : undefined,
      tooltip: [
        { field: 'category', type: 'nominal', title: xLabel },
        { field: 'value', type: 'quantitative', title: yLabel, format: '.1f' },
        ...(groupLabel ? [{ field: 'group', type: 'nominal', title: groupLabel }] : []),
      ],
    },
  }, palette);
}

// ── Population pyramid ──

async function renderPyramidChart(figure) {
  const { data, config = {}, palette, width, height, title } = figure;

  const year = config.year;
  const xLabel = config.xLabel ?? 'Population';
  const unit = config.unit ?? 'milliers';

  // Vega-Lite: two bar charts mirrored via negative values for males
  const values = [];
  for (const m of data.male) {
    values.push({ ageGroup: m.ageGroup, population: -m.value, sex: 'Hommes' });
  }
  for (const f of data.female) {
    values.push({ ageGroup: f.ageGroup, population: f.value, sex: 'Femmes' });
  }

  return await renderVegaLite({
    title: title ? { text: title, anchor: 'middle', offset: 6 } : undefined,
    width: width ?? 600,
    height: height ?? 400,
    data: { values },
    mark: { type: 'bar' },
    encoding: {
      y: {
        field: 'ageGroup', type: 'ordinal', axis: { title: 'Groupe d\'âge' },
        sort: data.male.map((m) => m.ageGroup).reverse(),
      },
      x: {
        field: 'population', type: 'quantitative',
        axis: { title: `${xLabel} (${unit})`, format: '.0f' },
      },
      color: { field: 'sex', type: 'nominal', legend: {} },
      tooltip: [
        { field: 'ageGroup', type: 'ordinal', title: 'Groupe d\'âge' },
        { field: 'population', type: 'quantitative', title: `${xLabel} (${unit})`, format: '.1f' },
        { field: 'sex', type: 'nominal', title: 'Sexe' },
      ],
    },
  }, ['#1a5276', '#922b21']); // blue for male, red for female
}

// ── Bump chart ──

async function renderBumpChart(figure) {
  const { data, config = {}, palette, width, height, title } = figure;

  // Convert our { series: [{ name, values: [{x, rank}] }] } format
  const values = [];
  for (const series of data.series) {
    for (const pt of series.values) {
      values.push({
        entity: series.name,
        x: pt.x,
        rank: pt.rank,
      });
    }
  }

  const hasLegend = config.showLegend !== false && data.series.length > 1;

  return await renderVegaLite({
    title: title ? { text: title, anchor: 'middle', offset: 6 } : undefined,
    width: width ?? 600,
    height: height ?? 350,
    data: { values },
    mark: { type: 'line', strokeWidth: 3, point: true },
    encoding: {
      x: { field: 'x', type: 'quantitative', axis: { format: 'd', title: config.xAxis?.label ?? null } },
      y: { field: 'rank', type: 'quantitative', axis: { title: config.yLabel ?? 'Rang', zindex: 1 } },
      color: { field: 'entity', type: 'nominal', legend: hasLegend ? {} : null },
      tooltip: [
        { field: 'entity', type: 'nominal', title: 'Entité' },
        { field: 'x', type: 'quantitative', title: 'Date', format: 'd' },
        { field: 'rank', type: 'quantitative', title: 'Rang', format: 'd' },
      ],
    },
  }, palette);
}

// ── Choropleth ──

async function renderChoroplethChart(figure) {
  // Vega-Lite choropleth needs GeoJSON data baked in.
  // Our format stores pre-digitised { id, value } pairs + a geoLayer reference.
  // For now, render as an informative placeholder since the actual
  // geography is resolved at page level (Leaflet), not in inline charts.
  const { width = 600, height = 300, title, geoLayer } = figure;
  return `<svg viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg" font-family="system-ui, sans-serif">
  <rect width="${width}" height="${height}" fill="#1a1a2e" rx="4"/>
  <text x="${width / 2}" y="${height / 2 - 8}" fill="#94a3b8" font-size="14" text-anchor="middle">
    ${title ? escapeXml(title) : 'Carte choroplèthe'}
  </text>
  <text x="${width / 2}" y="${height / 2 + 14}" fill="#64748b" font-size="11" text-anchor="middle">
    Couche géographique : ${escapeXml(geoLayer ?? '—')}
  </text>
</svg>`;
}

// ── Comparison chart (before / after) ──

async function renderComparisonChart(figure) {
  // Comparison figures reference media IDs for before/after images.
  // This is metadata-linked, not a rendered chart — keep as placeholder.
  const { width = 600, height = 300, title, data: { before, after } } = figure;
  return `<svg viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg" font-family="system-ui, sans-serif">
  <rect width="${width}" height="${height}" fill="#1a1a2e" rx="4"/>
  <text x="${width / 2}" y="${height / 2 - 8}" fill="#94a3b8" font-size="14" text-anchor="middle">
    ${title ? escapeXml(title) : 'Comparaison avant/après'}
  </text>
  <text x="${width / 2}" y="${height / 2 + 8}" fill="#64748b" font-size="11" text-anchor="middle">
    Avant : ${escapeXml(before)}  |  Après : ${escapeXml(after)}
  </text>
</svg>`;
}

// ── Sankey diagram (D3 fallback — Vega-Lite has no sankey mark) ──

function renderSankeyChart(figure) {
  // Minimal placeholder — full Sankey rendering would require d3-sankey.
  const { width = 600, height = 350, title, data } = figure;
  const nodeCount = data?.nodes?.length ?? 0;
  const linkCount = data?.links?.length ?? 0;
  return `<svg viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg" font-family="system-ui, sans-serif">
  <rect width="${width}" height="${height}" fill="#1a1a2e" rx="4"/>
  <text x="${width / 2}" y="${height / 2 - 8}" fill="#94a3b8" font-size="14" text-anchor="middle">
    ${title ? escapeXml(title) : 'Diagramme de Sankey'}
  </text>
  <text x="${width / 2}" y="${height / 2 + 8}" fill="#64748b" font-size="11" text-anchor="middle">
    ${nodeCount} nœuds, ${linkCount} liens
  </text>
</svg>`;
}

// ── Unsupported type fallback ──

function renderUnsupported(figure) {
  const { width = 600, height = 200, id, title, type } = figure;
  return `<svg viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg" font-family="system-ui, sans-serif">
  <rect width="${width}" height="${height}" fill="#1a1a2e" rx="8"/>
  <text x="${width / 2}" y="${height / 2 - 10}" fill="#94a3b8" font-size="14" text-anchor="middle">
    ${escapeXml(title ?? id ?? 'Graphique')}
  </text>
  <text x="${width / 2}" y="${height / 2 + 16}" fill="#64748b" font-size="11" text-anchor="middle">
    Type ${escapeXml(type)} (visualisation disponible prochainement)
  </text>
</svg>`;
}
