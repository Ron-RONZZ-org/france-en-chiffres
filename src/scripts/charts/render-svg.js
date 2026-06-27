/**
 * render-svg.js — Build-time chart SVG renderer.
 *
 * Converts ChartFigure data into inline SVG strings using DOM-free D3 modules.
 * Called at Astro build time from remark-figure-embed.js.
 *
 * Only imports D3 modules that don't require a DOM:
 *   - d3-scale (scaleLinear, scalePoint, scaleBand, scaleOrdinal)
 *   - d3-shape (line, curveMonotoneX, area)
 *   - d3-array (extent, max)
 *
 * No d3-selection, d3-axis, d3-transition, d3-zoom — all SVG math is manual.
 */

import { scaleLinear, scalePoint, scaleBand, scaleOrdinal } from 'd3-scale';
import { line, curveMonotoneX, arc, pie } from 'd3-shape';
import { max, extent } from 'd3-array';

// ── Default palette (French tricolor + extended) ──
const DEFAULT_PALETTE = [
  '#1a5276', '#922b21', '#1e8449', '#b7950b',
  '#6c3483', '#117a65', '#d35400', '#2e86c1',
];

// ── SVG helpers ──

function svgTag(attrs = {}) {
  const attrStr = Object.entries(attrs)
    .map(([k, v]) => `${k}="${v}"`)
    .join(' ');
  return `<svg ${attrStr} xmlns="http://www.w3.org/2000/svg" font-family="system-ui, sans-serif">`;
}

function textEl(x, y, content, attrs = {}) {
  const attrStr = Object.entries(attrs)
    .map(([k, v]) => `${k}="${v}"`)
    .join(' ');
  return `<text x="${x}" y="${y}" ${attrStr}>${escapeXml(String(content))}</text>`;
}

function escapeXml(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/**
 * Render a figure to SVG string based on its type.
 * @param {import('../../content/config').ChartFigure} figure
 * @returns {string} Inline SVG markup
 */
export function renderChartSvg(figure) {
  if (!figure || !figure.type) return '';

  switch (figure.type) {
    case 'line':
      return renderLineChart(figure);
    case 'bar':
      return renderBarChart(figure);
    case 'pie':
      return renderPieChart(figure);
    default:
      return renderUnsupported(figure);
  }
}

// ── Line chart renderer ──

function renderLineChart(figure) {
  const { data, config = {}, palette, width = 720, height = 400 } = figure;
  const colors = palette ?? DEFAULT_PALETTE;

  const titleHeight = figure.title ? 28 : 0;
  const hasLegend = config.showLegend !== false && data.series.length > 1;
  const legendHeight = hasLegend ? 30 : 0;
  const margin = { top: 8 + titleHeight, right: 30, bottom: 50, left: 60 };
  const innerW = width - margin.left - margin.right;
  const innerH = height - margin.top - margin.bottom - legendHeight;

  // Collect all x,y values
  const allX = data.series.flatMap((s) => s.values.map((v) => v.x));
  const allY = data.series.flatMap((s) => s.values.map((v) => v.y));

  const [xMin, xMax] = extent(allX);
  const [yMin, yMax] = extent(allY);
  const yAxisMin = config.yAxis?.min ?? Math.min(0, yMin);
  const yAxisMax = config.yAxis?.max ?? (yMax * 1.15);

  // Determine if x is numeric (year) or categorical
  const isNumericX = typeof allX[0] === 'number';
  const xScale = isNumericX
    ? scaleLinear().domain([xMin, xMax]).range([0, innerW])
    : scalePoint().domain(allX.map(String)).range([0, innerW]).padding(0.5);

  const yScale = scaleLinear().domain([yAxisMin, yAxisMax]).range([innerH, 0]);

  // Interpolation
  const curve = config.interpolation === 'monotone' ? curveMonotoneX : undefined;

  // Build SVG parts
  const parts = [];

  // Centered title (above chart)
  if (figure.title) {
    parts.push(textEl(innerW / 2, -8, figure.title, {
      fill: '#e2e8f0', 'font-size': '14', 'font-weight': '600',
      'text-anchor': 'middle',
    }));
  }

  // Grid lines (horizontal)
  const yTicks = 5;
  for (let i = 0; i <= yTicks; i++) {
    const yVal = yAxisMin + ((yAxisMax - yAxisMin) * i) / yTicks;
    const yPos = yScale(yVal);
    parts.push(`<line x1="0" y1="${yPos}" x2="${innerW}" y2="${yPos}" stroke="#2a2a3e" stroke-width="0.5"/>`);
    parts.push(textEl(-8, yPos + 4, formatNum(yVal), { fill: '#94a3b8', 'font-size': '11', 'text-anchor': 'end' }));
  }

  // X axis labels: show all unique x values (all data point years)
  if (isNumericX) {
    const uniqueX = [...new Set(allX.map(Math.round))].sort((a, b) => a - b);
    uniqueX.forEach((xVal) => {
      const xPos = xScale(xVal);
      if (xPos >= 0 && xPos <= innerW) {
        parts.push(textEl(xPos, innerH + 18, formatYear(xVal), {
          fill: '#94a3b8', 'font-size': '11', 'text-anchor': 'middle',
        }));
      }
    });
  } else {
    const uniqueX = [...new Set(allX.map(String))];
    uniqueX.forEach((x) => {
      const xPos = xScale(x);
      parts.push(textEl(xPos, innerH + 18, x, {
        fill: '#94a3b8', 'font-size': '11', 'text-anchor': 'middle',
      }));
    });
  }

  // Axis labels
  if (config.xAxis?.label) {
    parts.push(textEl(innerW / 2, height - 5 - margin.top - legendHeight, config.xAxis.label, {
      fill: '#94a3b8', 'font-size': '12', 'text-anchor': 'middle',
    }));
  }
  if (config.yAxis?.label) {
    parts.push(textEl(0, innerH / 2, config.yAxis.label, {
      fill: '#94a3b8', 'font-size': '12', 'text-anchor': 'middle',
      transform: `rotate(-90, 12, ${innerH / 2})`,
    }));
  }

  // Series lines + data points
  const lineGen = line()
    .x((d) => isNumericX ? xScale(d.x) : xScale(String(d.x)))
    .y((d) => yScale(d.y))
    .curve(curve ?? curveMonotoneX);

  data.series.forEach((series, i) => {
    const color = colors[i % colors.length];
    const d = lineGen(series.values);
    if (d) {
      parts.push(`<path d="${d}" fill="none" stroke="${color}" stroke-width="2.5" stroke-linejoin="round"/>`);
    }

    // Data point circles with tooltip data
    series.values.forEach((point, pi) => {
      const cx = isNumericX ? xScale(point.x) : xScale(String(point.x));
      const cy = yScale(point.y);

      // Compute absolute rate of change (percentage points per year)
      const prev = pi > 0 ? series.values[pi - 1] : null;
      const yPrev = prev ? prev.y : null;
      const xPrev = prev ? prev.x : null;
      let changeStr = '';
      if (prev && yPrev !== null && xPrev !== null) {
        const years = point.x - xPrev;
        if (years > 0) {
          const ppChange = point.y - yPrev;
          const annualRate = ppChange / years;
          changeStr = (annualRate >= 0 ? '+' : '') + annualRate.toFixed(1) + ' pp/an';
        }
      }

      parts.push(`<circle cx="${cx}" cy="${cy}" r="4" fill="${color}" stroke="#1a1a2e" stroke-width="1.5"
        data-series="${escapeXml(series.name)}"
        data-x="${point.x}"
        data-y="${point.y}"
        data-change="${escapeXml(changeStr)}"
        class="chart-datapoint"/>`);
    });
  });

  // Legend
  if (hasLegend) {
    const legendY = innerH + 42;
    let totalWidth = 0;
    const legendItems = data.series.map((s, i) => ({
      name: s.name,
      color: colors[i % colors.length],
      width: s.name.length * 8 + 24,
    }));
    totalWidth = legendItems.reduce((sum, item) => sum + item.width + 12, 0) - 12;
    let legendX = innerW / 2 - totalWidth / 2;

    legendItems.forEach((item) => {
      parts.push(`<rect x="${legendX}" y="${legendY - 8}" width="12" height="12" fill="${item.color}" rx="2"/>`);
      parts.push(textEl(legendX + 18, legendY + 2, item.name, {
        fill: '#cbd5e1', 'font-size': '11',
      }));
      legendX += item.width + 12;
    });
  }

  return wrapSvg(parts.join('\n'), width, height, figure, margin.left, margin.top);
}

// ── Bar chart renderer ──

function renderBarChart(figure) {
  const { data, config = {}, palette, width = 720, height = 400 } = figure;
  const colors = palette ?? DEFAULT_PALETTE;

  const titleHeight = figure.title ? 28 : 0;
  const margin = { top: 8 + titleHeight, right: 30, bottom: 60, left: 60 };
  const innerW = width - margin.left - margin.right;
  const innerH = height - margin.top - margin.bottom;

  const isGrouped = config.orientation === 'grouped';
  const categories = data.values.map((d) => d.category);
  const allGroups = [...new Set(data.values.flatMap((d) => d.groups.map((g) => g.name)))];
  const allValues = data.values.flatMap((d) => d.groups.map((g) => g.value));
  const maxVal = max(allValues) ?? 0;
  const yMax = maxVal * 1.15;

  const xScale = scaleBand().domain(categories).range([0, innerW]).padding(isGrouped ? 0.15 : 0.1);
  const yScale = scaleLinear().domain([0, yMax]).range([innerH, 0]);

  // Sub-scale for grouped bars
  const groupScale = isGrouped
    ? scaleBand().domain(allGroups).range([0, xScale.bandwidth()]).padding(0.1)
    : null;

  const parts = [];

  // Centered title (above chart)
  if (figure.title) {
    parts.push(textEl(innerW / 2, -8, figure.title, {
      fill: '#e2e8f0', 'font-size': '14', 'font-weight': '600',
      'text-anchor': 'middle',
    }));
  }

  // Grid lines
  const yTicks = 5;
  for (let i = 0; i <= yTicks; i++) {
    const yVal = (yMax * i) / yTicks;
    const yPos = yScale(yVal);
    parts.push(`<line x1="0" y1="${yPos}" x2="${innerW}" y2="${yPos}" stroke="#2a2a3e" stroke-width="0.5"/>`);
    parts.push(textEl(-8, yPos + 4, formatNum(yVal), {
      fill: '#94a3b8', 'font-size': '11', 'text-anchor': 'end',
    }));
  }

  // Axis labels
  if (config.yAxis?.label) {
    parts.push(textEl(0, innerH / 2, config.yAxis.label, {
      fill: '#94a3b8', 'font-size': '12', 'text-anchor': 'middle',
      transform: `rotate(-90, 12, ${innerH / 2})`,
    }));
  }

  // Bars with tooltip data
  data.values.forEach((cat) => {
    const catX = xScale(cat.category) ?? 0;
    cat.groups.forEach((g, gi) => {
      const color = colors[gi % colors.length];
      const barW = isGrouped && groupScale ? groupScale.bandwidth() : xScale.bandwidth();
      const barX = isGrouped && groupScale ? catX + (groupScale(g.name) ?? 0) : catX;
      const barH = innerH - yScale(g.value);
      const barY = yScale(g.value);

      parts.push(`<rect x="${barX}" y="${barY}" width="${barW * 0.85}" height="${barH}" fill="${color}" rx="2"
        data-series="${escapeXml(g.name)}"
        data-category="${escapeXml(cat.category)}"
        data-value="${g.value}"
        class="chart-datapoint"/>`);
    });
  });

  // X axis labels
  categories.forEach((cat) => {
    const xPos = (xScale(cat) ?? 0) + xScale.bandwidth() / 2;
    parts.push(textEl(xPos, innerH + 16, cat, {
      fill: '#94a3b8', 'font-size': '10', 'text-anchor': 'end',
      transform: `rotate(-35, ${xPos}, ${innerH + 16})`,
    }));
  });

  // Legend
  if (allGroups.length > 1) {
    const legendY = innerH + 44;
    let totalWidth = 0;
    const legendItems = allGroups.map((name, i) => ({
      name,
      color: colors[i % colors.length],
      width: name.length * 8 + 22,
    }));
    totalWidth = legendItems.reduce((sum, item) => sum + item.width + 12, 0) - 12;
    let legendX = innerW / 2 - totalWidth / 2;

    legendItems.forEach((item) => {
      const x = legendX;
      parts.push(`<rect x="${x}" y="${legendY - 8}" width="12" height="12" fill="${item.color}" rx="2"/>`);
      parts.push(textEl(x + 18, legendY + 2, item.name, {
        fill: '#cbd5e1', 'font-size': '11',
      }));
      legendX += item.width + 12;
    });
  }

  return wrapSvg(parts.join('\n'), width, height, figure, margin.left, margin.top);
}

// ── Pie chart renderer ──

function renderPieChart(figure) {
  const { data, config = {}, palette, width = 720, height = 400 } = figure;
  const colors = palette ?? DEFAULT_PALETTE;

  const titleHeight = figure.title ? 28 : 0;
  const showLegend = config.showLegend !== false && data.values.length > 1;
  const legendWidth = showLegend ? 140 : 0;
  const margin = { top: 8 + titleHeight, right: 10, bottom: 20, left: 10 };
  const chartArea = width - margin.left - margin.right - legendWidth;
  const innerH = height - margin.top - margin.bottom;
  const radius = Math.min(chartArea, innerH) / 2 - 10;
  const cx = margin.left + chartArea / 2;
  const cy = margin.top + innerH / 2;

  const parts = [];

  // Title
  if (figure.title) {
    parts.push(textEl(cx, margin.top - 12, figure.title, {
      fill: '#e2e8f0', 'font-size': '14', 'font-weight': '600',
      'text-anchor': 'middle',
    }));
  }

  // Pie layout
  const pieGen = pie()
    .value((d) => d.value)
    .sort(null);

  const arcGen = arc()
    .innerRadius(config.innerRadius ?? 0)
    .outerRadius(radius);

  const hoverArcGen = arc()
    .innerRadius(config.innerRadius ?? 0)
    .outerRadius(radius + 8);

  const total = data.values.reduce((sum, d) => sum + d.value, 0);
  const slices = pieGen(data.values);

  slices.forEach((slice, i) => {
    const color = colors[i % colors.length];
    const d = arcGen(slice);
    if (!d) return;

    const pct = ((slice.data.value / total) * 100).toFixed(1);
    const midAngle = (slice.startAngle + slice.endAngle) / 2;
    const labelRadius = radius + 22;
    const lx = cx + Math.cos(midAngle) * labelRadius;
    const ly = cy + Math.sin(midAngle) * labelRadius;

    parts.push(`<path d="${d}" fill="${color}" stroke="#1a1a2e" stroke-width="2"
      data-label="${escapeXml(slice.data.label)}"
      data-value="${slice.data.value}"
      data-pct="${pct}"
      class="chart-datapoint"/>`);

    // Percentage label outside the slice
    const isLeft = lx < cx;
    parts.push(textEl(lx + (isLeft ? -6 : 6), ly + 4, `${pct}%`, {
      fill: '#cbd5e1', 'font-size': '11',
      'text-anchor': isLeft ? 'end' : 'start',
    }));
  });

  // Legend
  if (showLegend) {
    const legendX = width - legendWidth + 10;
    let legendY = margin.top + 10;

    data.values.forEach((d, i) => {
      const color = colors[i % colors.length];
      if (legendY + 40 > height) return;

      parts.push(`<rect x="${legendX}" y="${legendY}" width="12" height="12" fill="${color}" rx="2"/>`);
      parts.push(textEl(legendX + 18, legendY + 10, d.label, {
        fill: '#cbd5e1', 'font-size': '10',
      }));
      const pct = ((d.value / total) * 100).toFixed(1);
      parts.push(textEl(legendX + 18, legendY + 22, `${d.value}% (${pct}%)`, {
        fill: '#64748b', 'font-size': '9',
      }));

      legendY += 36;
    });
  }

  return wrapSvg(parts.join('\n'), width, height, figure, 0, 0);
}

// ── Shared helpers ──

function wrapSvg(inner, width, height, figure, tx = 60, ty = 30) {
  return `${svgTag({ viewBox: `0 0 ${width} ${height}`, role: 'img', 'aria-label': figure.title ?? '' })}
  <g transform="translate(${tx}, ${ty})">
    ${inner}
  </g>
</svg>`;
}

function renderUnsupported(figure) {
  const { width = 720, height = 200 } = figure;
  return `${svgTag({ viewBox: `0 0 ${width} ${height}` })}
  <rect width="${width}" height="${height}" fill="#1a1a2e" rx="8"/>
  <text x="${width / 2}" y="${height / 2 - 10}" fill="#94a3b8" font-size="14" text-anchor="middle" font-family="system-ui, sans-serif">
    Graphique « ${escapeXml(figure.title ?? figure.id)} »
  </text>
  <text x="${width / 2}" y="${height / 2 + 16}" fill="#64748b" font-size="11" text-anchor="middle" font-family="system-ui, sans-serif">
    Visualisation de type ${figure.type} (sera disponible prochainement)
  </text>
</svg>`;
}

function formatNum(n) {
  if (Math.abs(n) >= 1e6) return (n / 1e6).toFixed(1) + 'M';
  if (Math.abs(n) >= 1e3) return (n / 1e3).toFixed(0) + 'k';
  return String(Math.round(n));
}

function formatYear(n) {
  if (n < 0) return `${Math.abs(n)} AEC`;
  return String(Math.round(n));
}
