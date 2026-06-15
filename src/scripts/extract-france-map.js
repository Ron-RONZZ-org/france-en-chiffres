/**
 * extract-france-map.js — Build-time script to extract SVG path data
 * from France_departements.svg into src/data/france-map-data.json
 *
 * Usage: node src/scripts/extract-france-map.js
 */

const fs = require('fs');
const path = require('path');

const SVG_PATH = path.join(__dirname, '..', '..', 'public', 'France_departements.svg');
const OUTPUT_PATH = path.join(__dirname, '..', 'data', 'france-map-data.json');

function computeBBox(d) {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  let cx = 0, cy = 0;
  const tokens = d.match(/[mlhvcsqtaz][^mlhvcsqtaz]*/gi);
  if (!tokens) return null;
  const update = (x, y) => { minX = Math.min(minX,x); minY = Math.min(minY,y); maxX = Math.max(maxX,x); maxY = Math.max(maxY,y); };
  for (const token of tokens) {
    const cmd = token[0], lcmd = cmd.toLowerCase(), abs = cmd === cmd.toUpperCase();
    const nums = token.slice(1).trim().split(/[\s,]+/).filter(Boolean).map(Number);
    if (nums.length === 0) continue;
    const proc = (x,y) => { const rx=abs?x:cx+x, ry=abs?y:cy+y; cx=rx; cy=ry; update(rx,ry); };
    if (lcmd === 'm' || lcmd === 'l') { for (let i=0;i<nums.length;i+=2) proc(nums[i],nums[i+1]); }
    else if (lcmd === 'h') { for (const n of nums) { cx=abs?n:cx+n; update(cx,cy); } }
    else if (lcmd === 'v') { for (const n of nums) { cy=abs?n:cy+n; update(cx,cy); } }
    else if (lcmd === 'c' && nums.length>=6) { for (let i=0;i<nums.length;i+=6) { update(abs?nums[i]:cx+nums[i],abs?nums[i+1]:cy+nums[i+1]); update(abs?nums[i+2]:cx+nums[i+2],abs?nums[i+3]:cy+nums[i+3]); proc(nums[i+4],nums[i+5]); } }
    else if (lcmd === 's' && nums.length>=4) { for (let i=0;i<nums.length;i+=4) { update(abs?nums[i]:cx+nums[i],abs?nums[i+1]:cy+nums[i+1]); proc(nums[i+2],nums[i+3]); } }
    else if (lcmd === 'q' && nums.length>=4) { for (let i=0;i<nums.length;i+=4) { update(abs?nums[i]:cx+nums[i],abs?nums[i+1]:cy+nums[i+1]); proc(nums[i+2],nums[i+3]); } }
    else if (lcmd === 't' && nums.length>=2) { for (let i=0;i<nums.length;i+=2) proc(nums[i],nums[i+1]); }
    else if (lcmd === 'a' && nums.length>=7) { for (let i=0;i<nums.length;i+=7) proc(nums[i+5],nums[i+6]); }
  }
  return { minX, minY, maxX, maxY };
}

function extractDOMTerritories(svg, domBlock) {
  const terreIds = {
    Guadeloupe: 'Terre_Guadeloupe',
    Martinique: 'Terre_Martinique',
    Guyane: 'Terres_françaises_Guyane',
    Réunion: 'Terre_Réunion',
    Mayotte: 'Terre_Mayotte'
  };
  const labels = {
    Guadeloupe: 'Guadeloupe',
    Martinique: 'Martinique',
    Guyane: 'Guyane',
    Réunion: 'La Réunion',
    Mayotte: 'Mayotte'
  };
  const result = [];
  for (const [name, terreId] of Object.entries(terreIds)) {
    const marker = `id="${terreId}"`;
    const idx = domBlock.indexOf(marker);
    if (idx === -1) { console.warn(`  ${name}: ${terreId} not found`); continue; }
    const after = domBlock.substring(idx);
    let depth = 0, end = 0;
    for (let i = 0; i < after.length; i++) {
      if (after.substring(i, i+3) === '<g ') depth++;
      else if (after.substring(i, i+4) === '</g>') { depth--; if (depth < 0) { end = i+4; break; } }
    }
    if (!end) { console.warn(`  ${name}: no closing tag`); continue; }
    const section = after.substring(0, end);
    const paths = [...section.matchAll(/d="([^"]+)"/g)].map(m => m[1]);
    if (!paths.length) { console.warn(`  ${name}: no paths`); continue; }
    const merged = paths.join(' ');
    const bbox = computeBBox(merged);
    const pad = 15;
    result.push({ id: name, label: labels[name], path: merged, bbox,
      viewBox: bbox ? { x: Math.floor(bbox.minX-pad), y: Math.floor(bbox.minY-pad), width: Math.ceil(bbox.maxX-bbox.minX+2*pad), height: Math.ceil(bbox.maxY-bbox.minY+2*pad) } : null
    });
    console.log(`  ${name}: ${paths.length} paths, ${merged.length} chars`);
  }
  return result;
}

function main() {
  console.log('Extracting France map data...');
  const svg = fs.readFileSync(SVG_PATH, 'utf-8');
  
  // Extract Terres_françaises
  const tfMatch = svg.match(/<path[^>]*id="Terres_françaises"[^>]*d="([^"]+)"/);
  if (!tfMatch) { console.error('Terres_françaises not found!'); process.exit(1); }
  const francePath = tfMatch[1];
  const franceBbox = computeBBox(francePath);
  const pad = 20;
  const franceViewBox = {
    x: Math.floor(franceBbox.minX - pad),
    y: Math.floor(franceBbox.minY - pad),
    width: Math.ceil(franceBbox.maxX - franceBbox.minX + 2*pad),
    height: Math.ceil(franceBbox.maxY - franceBbox.minY + 2*pad)
  };
  console.log(`France: ${francePath.length} chars, viewBox: ${JSON.stringify(franceViewBox)}`);
  
  // Extract DOM-COM
  const domStart = svg.indexOf('<g id="Encarts_DOM-COM"');
  const domEnd = svg.indexOf('<g id="Noms_des_départements"');
  const domBlock = svg.substring(domStart, domEnd);
  const domData = extractDOMTerritories(svg, domBlock);
  console.log(`DOM-COM: ${domData.length} territories`);
  
  const output = { france: { path: francePath, bbox: franceBbox, viewBox: franceViewBox }, dom: domData };
  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(output, null, 2));
  console.log(`Written ${OUTPUT_PATH}`);
}

main();
