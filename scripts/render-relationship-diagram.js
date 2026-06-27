/**
 * render-relationship-diagram.js — Build-time SVG renderer for relationship diagrams
 * using D3 hierarchy tree layout (DOM-free).
 *
 * Usage: node scripts/render-relationship-diagram.js
 */

import { writeFileSync, existsSync, mkdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { stratify, tree } from 'd3-hierarchy';

const __dirname = dirname(fileURLToPath(import.meta.url));
const MEDIA_DIR = resolve(__dirname, '../src/content/media');

// ── Relationship diagram spec ──
// Node format: { id, parentId, label, sublabel, highlight }
const DIAGRAMS = [
  {
    id: 'dynasties-francaises',
    alt: 'Schéma des relations entre les dynasties royales françaises, des Mérovingiens aux Bourbons',
    caption: 'Relations entre les principales dynasties ayant régné sur la France du Ve au XVIe siècle.',
    sourceId: 'britannica-france-medieval',
    nodes: [
      // Virtual root
      { id: 'root', parentId: null, label: '', sublabel: '' },

      // Mérovingiens
      { id: 'merovingiens', parentId: 'root', label: 'Mérovingiens', sublabel: '481–751', highlight: true },
      { id: 'clovis', parentId: 'merovingiens', label: 'Clovis Ier', sublabel: 'r. 481–511' },
      { id: 'fils-clovis', parentId: 'clovis', label: 'Fils de Clovis', sublabel: 'r. 511–639' },
      { id: 'rois-faineants', parentId: 'fils-clovis', label: 'Rois fainéants', sublabel: 'r. 639–751', dash: true },

      // Carolingiens
      { id: 'carolingiens', parentId: 'root', label: 'Carolingiens', sublabel: '751–987', highlight: true },
      { id: 'pippin', parentId: 'carolingiens', label: 'Pippin le Bref', sublabel: 'r. 751–768' },
      { id: 'charlemagne', parentId: 'pippin', label: 'Charlemagne', sublabel: 'r. 768–814', highlight: true },
      { id: 'louis-pieux', parentId: 'charlemagne', label: 'Louis le Pieux', sublabel: 'r. 814–840' },
      { id: 'traite-verdun', parentId: 'louis-pieux', label: 'Traité de Verdun', sublabel: '843' },
      { id: 'charles-chauve', parentId: 'traite-verdun', label: 'Charles le Chauve', sublabel: 'Francie occ.' },
      { id: 'derniers-caros', parentId: 'charles-chauve', label: 'Derniers Carolingiens', sublabel: '877–987', dash: true },

      // Capétiens
      { id: 'capetiens', parentId: 'root', label: 'Capétiens', sublabel: '987–1792', highlight: true },
      { id: 'hugues-capet', parentId: 'capetiens', label: 'Hugues Capet', sublabel: 'r. 987–996', highlight: true },
      { id: 'capetiens-directs', parentId: 'hugues-capet', label: 'Capétiens directs', sublabel: '987–1328' },
      { id: 'valois', parentId: 'capetiens-directs', label: 'Valois', sublabel: '1328–1589' },
      { id: 'bourbons', parentId: 'valois', label: 'Bourbons', sublabel: '1589–1792' },
    ],
    // Transitions between dynasties (displayed as edge labels)
    transitions: [
      { from: 'rois-faineants', to: 'pippin', label: '751', sublabel: 'Usurpation' },
      { from: 'derniers-caros', to: 'hugues-capet', label: '987', sublabel: 'Élection' },
    ],
  },
];

function renderRelationshipDiagram(spec) {
  const { nodes, transitions = [] } = spec;
  const width = 760;
  const height = 560;
  const margin = { top: 50, right: 40, bottom: 50, left: 40 };
  const innerW = width - margin.left - margin.right;
  const innerH = height - margin.top - margin.bottom;

  // Build hierarchy (stratify handles the virtual root)
  const root = stratify()
    .id((d) => d.id)
    .parentId((d) => d.parentId)(nodes);

  // Tree layout
  const treeLayout = tree()
    .size([innerW, innerH])
    .separation((a, b) => (a.parent === b.parent ? 2 : 4));

  treeLayout(root);

  // Color palette
  const colors = {
    merovingiens: { fill: '#1a5276', stroke: '#2980b9' },
    carolingiens: { fill: '#922b21', stroke: '#e74c3c' },
    capetiens: { fill: '#1e8449', stroke: '#27ae60' },
  };
  const defaultColor = { fill: '#2c3e50', stroke: '#4a5568' };

  function getColor(nodeId) {
    const path = nodeId.split('/');
    if (path.some(p => p.startsWith('merov') || p === 'clovis' || p === 'fils-clovis' || p === 'rois-faineants')) return colors.merovingiens;
    if (path.some(p => p.startsWith('carol') || p === 'pippin' || p === 'charlemagne' || p === 'louis-pieux' || p === 'traite-verdun' || p === 'charles-chauve' || p === 'derniers-caros')) return colors.carolingiens;
    if (path.some(p => p.startsWith('capet') || p === 'hugues-capet' || p === 'capetiens-directs' || p === 'valois' || p === 'bourbons')) return colors.capetiens;
    return defaultColor;
  }

  const parts = [];

  // Title
  parts.push(`<text x="${width / 2}" y="20" fill="#e2e8f0" font-size="15" font-weight="600" text-anchor="middle" font-family="system-ui, sans-serif">Relations entre les dynasties royales françaises</text>`);

  // Build id->node map for quick lookup
  const nodeMap = {};
  root.descendants().forEach((d) => { nodeMap[d.id] = d; });

  // Draw parent-child edges
  root.links().forEach((link) => {
    const source = link.source;
    const target = link.target;
    if (source.id === 'root' || target.id === 'root') return; // skip virtual root edges

    const sx = source.x + margin.left;
    const sy = source.y + margin.top;
    const tx = target.x + margin.left;
    const ty = target.y + margin.top;

    const isDashed = target.data.dash;
    const dashAttr = isDashed ? ' stroke-dasharray="6,4"' : '';

    parts.push(`<line x1="${sx}" y1="${sy}" x2="${tx}" y2="${ty}" stroke="#4a5568" stroke-width="1.5"${dashAttr}/>`);
  });

  // Draw transitions (edges between non-parent-child nodes)
  transitions.forEach((t) => {
    const source = nodeMap[t.from];
    const target = nodeMap[t.to];
    if (!source || !target) return;

    const sx = source.x + margin.left;
    const sy = source.y + margin.top;
    const tx = target.x + margin.left;
    const ty = target.y + margin.top;

    // Dashed curved line
    const midX = (sx + tx) / 2;
    const midY = (sy + ty) / 2;
    const ctrlY = Math.min(sy, ty) - 30;
    parts.push(`<path d="M${sx} ${sy} Q${midX} ${ctrlY} ${tx} ${ty}" fill="none" stroke="#b7950b" stroke-width="1.5" stroke-dasharray="5,4"/>`);

    // Transition label
    parts.push(`<rect x="${midX - 22}" y="${ctrlY - 12}" width="44" height="24" rx="12" fill="#1a1a2e" stroke="#b7950b" stroke-width="1"/>`);
    parts.push(`<text x="${midX}" y="${ctrlY + 2}" fill="#f4d03f" font-size="11" font-weight="600" text-anchor="middle" font-family="system-ui, sans-serif">${t.label}</text>`);
    parts.push(`<text x="${midX}" y="${ctrlY + 13}" fill="#cbd5e1" font-size="9" text-anchor="middle" font-family="system-ui, sans-serif">${t.sublabel}</text>`);
  });

  // Draw nodes
  root.descendants().forEach((d) => {
    if (d.id === 'root') return; // skip virtual root

    const x = d.x + margin.left;
    const y = d.y + margin.top;
    const color = getColor(d.id);
    const isHighlight = d.data.highlight;
    const nodeW = 130;
    const nodeH = d.data.sublabel ? 40 : 28;
    const rx = 6;

    // Shadow for highlight nodes
    if (isHighlight) {
      parts.push(`<rect x="${x - nodeW / 2 + 2}" y="${y - nodeH / 2 + 2}" width="${nodeW}" height="${nodeH}" rx="${rx}" fill="#000" opacity="0.3"/>`);
    }

    // Node background
    parts.push(`<rect x="${x - nodeW / 2}" y="${y - nodeH / 2}" width="${nodeW}" height="${nodeH}" rx="${rx}" fill="${color.fill}" stroke="${color.stroke}" stroke-width="${isHighlight ? 2.5 : 1.5}"/>`);

    // Label
    const labelY = d.data.sublabel ? y - 3 : y + 4;
    parts.push(`<text x="${x}" y="${labelY}" fill="#fff" font-size="12" font-weight="${isHighlight ? '600' : '400'}" text-anchor="middle" font-family="system-ui, sans-serif">${d.data.label}</text>`);

    // Sublabel
    if (d.data.sublabel) {
      parts.push(`<text x="${x}" y="${y + 14}" fill="#94a3b8" font-size="9" text-anchor="middle" font-family="system-ui, sans-serif">${d.data.sublabel}</text>`);
    }
  });

  // Legend
  const legendItems = [
    { label: 'Mérovingiens', color: colors.merovingiens.fill },
    { label: 'Carolingiens', color: colors.carolingiens.fill },
    { label: 'Capétiens', color: colors.capetiens.fill },
  ];
  let legendX = width / 2 - ((legendItems.length * 130) - 10) / 2;
  const legendY = height - 12;

  legendItems.forEach((item) => {
    parts.push(`<rect x="${legendX}" y="${legendY - 7}" width="12" height="12" rx="2" fill="${item.color}"/>`);
    parts.push(`<text x="${legendX + 18}" y="${legendY + 3}" fill="#94a3b8" font-size="10" font-family="system-ui, sans-serif">${item.label}</text>`);
    legendX += 130;
  });

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" role="img" aria-label="${spec.alt}">
  <rect width="${width}" height="${height}" fill="#1a1a2e" rx="8"/>
  ${parts.join('\n  ')}
</svg>`;
}

// ── Main ──
for (const spec of DIAGRAMS) {
  console.log(`Rendering relationship diagram: ${spec.id}...`);
  const svg = renderRelationshipDiagram(spec);
  const svgPath = resolve(MEDIA_DIR, `${spec.id}.svg`);
  writeFileSync(svgPath, svg);
  console.log(`  → Saved SVG (${svg.length} bytes)`);

  const metadata = {
    id: spec.id,
    alt: spec.alt,
    caption: spec.caption,
    credit: 'Généré avec D3 hierarchy',
    license: 'CC BY-SA 4.0',
    licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/',
    sourceId: spec.sourceId,
  };
  const jsonPath = resolve(MEDIA_DIR, `${spec.id}.json`);
  writeFileSync(jsonPath, JSON.stringify(metadata, null, 2) + '\n');
  console.log(`  → Saved metadata`);
}

console.log('Done!');
