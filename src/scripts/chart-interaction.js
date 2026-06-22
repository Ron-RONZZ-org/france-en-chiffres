/**
 * chart-interaction.js — Client-side chart interactivity.
 *
 * Adds Tippy.js tooltips to chart data points on hover.
 * For line charts, also shows the rate of change (%/an).
 *
 * Init on DOMContentLoaded and on Astro View Transitions.
 */

import tippy from 'tippy.js';
import 'tippy.js/dist/tippy.css';
import 'tippy.js/animations/shift-away.css';

function initChartTooltips() {
  // Find all chart data point elements
  const points = document.querySelectorAll('.chart-datapoint');
  if (!points.length) return;

  points.forEach((el) => {
    // Skip already-initialized
    if (el.dataset.tippyInit) return;
    el.dataset.tippyInit = 'true';

    const series = el.getAttribute('data-series');
    const value = el.getAttribute('data-value');
    const change = el.getAttribute('data-change');
    const xVal = el.getAttribute('data-x');
    const category = el.getAttribute('data-category');

    // Build tooltip content
    const lines = [];

    if (series) lines.push(`<strong>${escapeHtml(series)}</strong>`);
    if (category) lines.push(`<span class="chart-tt__cat">${escapeHtml(category)}</span>`);

    if (xVal) {
      const yearLabel = parseFloat(xVal) < 0
        ? `${Math.abs(parseFloat(xVal))} AEC`
        : String(Math.round(parseFloat(xVal)));
      lines.push(`<span class="chart-tt__year">${yearLabel}</span>`);
    }

    if (value !== null && value !== '') {
      const formatted = formatTooltipValue(parseFloat(value));
      lines.push(`<span class="chart-tt__value">${formatted}</span>`);
    }

    if (change) {
      const changeClass = change.startsWith('+') ? 'chart-tt__change--pos' : 'chart-tt__change--neg';
      lines.push(`<span class="chart-tt__change ${changeClass}">${escapeHtml(change)}</span>`);
    }

    if (lines.length === 0) return;

    tippy(el, {
      content: `<div class="chart-tt">${lines.join('')}</div>`,
      allowHTML: true,
      theme: 'dark',
      animation: 'shift-away',
      placement: 'top',
      arrow: true,
      delay: [150, 0],
      interactive: false,
      appendTo: document.body,
    });
  });
}

function formatTooltipValue(v) {
  if (Number.isInteger(v)) return v.toLocaleString('fr-FR');
  return v.toLocaleString('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 1 });
}

function escapeHtml(s) {
  if (!s) return '';
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// Init on load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initChartTooltips);
} else {
  initChartTooltips();
}

// Re-init on Astro View Transitions
document.addEventListener('astro:page-load', initChartTooltips);
