/**
 * shared-map.js — Shared utilities for Leaflet map components
 *
 * Provides common map initialization (OSM base layer, center/zoom),
 * container guard clause, and Astro View Transition handling.
 *
 * Usage in Astro <script>:
 *   import { initMap } from '../../scripts/maps/shared-map';
 *   const map = initMap('my-map-id', { center: [46, 2], zoom: 6 });
 *   if (!map) return;
 *   // ... add your data layers, markers, etc.
 */

import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

/**
 * Initialise une carte Leaflet avec fond OSM.
 *
 * @param {string} containerId - id du <div> conteneur
 * @param {object} [opts]
 * @param {[number,number]} [opts.center=[46.5, 2.5]] - centre initial
 * @param {number} [opts.zoom=6] - zoom initial
 * @param {number} [opts.minZoom]
 * @param {number} [opts.maxZoom]
 * @param {object} [opts.mapOptions] - options supplémentaires passées à L.map()
 * @returns {L.Map|null} l'instance Leaflet, ou null si le conteneur n'existe pas
 */
export function initMap(containerId, opts = {}) {
  const mapEl = document.getElementById(containerId);
  if (!mapEl) return null;

  const map = L.map(mapEl, {
    center: opts.center ?? [46.5, 2.5],
    zoom: opts.zoom ?? 6,
    minZoom: opts.minZoom ?? 5,
    maxZoom: opts.maxZoom ?? 10,
    zoomControl: true,
    attributionControl: true,
    ...opts.mapOptions,
  });

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    maxZoom: 19,
  }).addTo(map);

  return map;
}

/**
 * Enregistre un handler pour invalider la carte lors d'une transition Astro.
 * À appeler une fois la carte initialisée.
 *
 * @param {L.Map} map
 */
export function onViewTransition(map) {
  document.addEventListener('astro:after-swap', () => {
    setTimeout(() => map.invalidateSize(), 200);
  });
}
