/**
 * render-mermaid.js — Pre-renders Mermaid relationship diagrams to SVG files.
 * Uses linkedom to provide a minimal DOM for Mermaid's Node.js rendering.
 *
 * Usage: node scripts/render-mermaid.js
 */

import { writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { parseHTML } from 'linkedom';

// Provide minimal DOM globals for Mermaid
const { document, window, HTMLElement, customElements } = parseHTML('<!DOCTYPE html><html><body></body></html>');
globalThis.document = document;
globalThis.window = window;
globalThis.HTMLElement = HTMLElement;
globalThis.customElements = customElements;
globalThis.navigator = { userAgent: 'Node.js' };
globalThis.DOMParser = window.DOMParser;
globalThis.MutationObserver = class { observe() {} disconnect() {} };

const __dirname = dirname(fileURLToPath(import.meta.url));
const MEDIA_DIR = resolve(__dirname, '../src/content/media');

// ── Diagram definitions ──
const DIAGRAMS = [
  {
    id: 'dynasties-francaises',
    title: 'Relations entre les dynasties royales françaises',
    caption: 'Schéma des relations entre les principales dynasties ayant régné sur la France du Ve au XVIe siècle.',
    sourceId: 'britannica-france-medieval',
    diagram: `flowchart TB
      subgraph M["Mérovingiens (481–751)"]
        C1["Clovis I<sup>er</sup><br/>481–511"]
        C2["Fils de Clovis<br/>511–639"]
        C3["Rois fainéants<br/>639–751"]
      end
      subgraph CA["Carolingiens (751–987)"]
        C4["Pippin le Bref<br/>751–768"]
        C5["Charlemagne<br/>768–814"]
        C6["Louis le Pieux<br/>814–840"]
        C7["Traité de Verdun<br/>843"]
        C8["Charles le Chauve<br/>Francie occ."]
        C9["Derniers Carolingiens<br/>877–987"]
      end
      subgraph CP["Capétiens (987–1792)"]
        C10["Hugues Capet<br/>987–996"]
        C11["Capétiens directs<br/>987–1328"]
        C12["Valois<br/>1328–1589"]
        C13["Bourbons<br/>1589–1792"]
      end
      C1 --> C2
      C2 --> C3
      C3 -.->|"751"| C4
      C4 --> C5
      C5 --> C6
      C6 --> C7
      C7 --> C8
      C8 --> C9
      C9 -.->|"987"| C10
      C10 --> C11
      C11 -->|"1328"| C12
      C12 -->|"1589"| C13
      style C1 fill:#1a5276,color:#fff
      style C5 fill:#922b21,color:#fff
      style C10 fill:#1e8449,color:#fff`,
  },
];

async function renderDiagrams() {
  const mermaid = await import('mermaid');

  mermaid.default.initialize({
    startOnLoad: false,
    theme: 'dark',
    themeVariables: {
      fontFamily: 'system-ui, sans-serif',
      primaryColor: '#1a5276',
      primaryTextColor: '#e2e8f0',
      primaryBorderColor: '#2980b9',
      lineColor: '#4a5568',
      secondaryColor: '#2471a3',
      tertiaryColor: '#1a1a2e',
      fontSize: '13px',
    },
  });

  for (const def of DIAGRAMS) {
    console.log(`Rendering diagram: ${def.id}...`);

    try {
      const { svg } = await mermaid.default.render(def.id, def.diagram);

      // Save SVG
      const svgPath = resolve(MEDIA_DIR, `${def.id}.svg`);
      writeFileSync(svgPath, svg);
      console.log(`  → Saved SVG (${svg.length} bytes)`);

      // Save JSON metadata
      const jsonPath = resolve(MEDIA_DIR, `${def.id}.json`);
      const metadata = {
        id: def.id,
        alt: def.caption || `Diagramme: ${def.title}`,
        caption: def.caption || def.title,
        credit: 'Généré avec Mermaid.js',
        license: 'CC BY-SA 4.0',
        licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/',
        sourceId: def.sourceId || 'britannica-france-medieval',
      };
      writeFileSync(jsonPath, JSON.stringify(metadata, null, 2) + '\n');
      console.log(`  → Saved metadata`);

    } catch (err) {
      console.error(`  FAILED: ${err.message}`);
      try {
        // Try without subgraph styling
        const simpleDiagram = `flowchart TB
          C1["Mérovingiens<br/>481–751"]
          C2["Carolingiens<br/>751–987"]
          C3["Capétiens<br/>987–1792"]
          C1 --> C2
          C2 --> C3`;
        const { svg } = await mermaid.default.render(def.id + '-simple', simpleDiagram);
        const svgPath = resolve(MEDIA_DIR, `${def.id}.svg`);
        writeFileSync(svgPath, svg);
        console.log(`  → Fallback SVG saved`);
      } catch (e2) {
        console.error(`  Fallback also FAILED: ${e2.message}`);
      }
    }
  }
}

renderDiagrams().catch(console.error);
