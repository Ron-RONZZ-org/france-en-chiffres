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

function applyMatrixToPath(d, matrix) {
  // matrix = [a, b, c, d, e, f]  →  x' = a*x + c*y + e,  y' = b*x + d*y + f
  const [a, b, c, dd, e, f] = matrix;
  const tokens = d.match(/[mlhvcsqtaz][^mlhvcsqtaz]*/gi);
  if (!tokens) return d;
  const result = [];
  const numRegex = /-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?/g;
  let isFirst = true;

  for (const token of tokens) {
    const cmd = token[0], lcmd = cmd.toLowerCase(), abs = cmd === cmd.toUpperCase();
    if (lcmd === 'z') { result.push('z'); isFirst = true; continue; }
    const nums = []; let m;
    while ((m = numRegex.exec(token)) !== null) nums.push(parseFloat(m[0]));
    if (nums.length === 0) { result.push(cmd); continue; }

    const t = [];
    const sX = (x) => a * x;
    const sY = (y) => dd * y;
    const aT = (x, y) => [a*x + c*y + e, b*x + dd*y + f];
    const F = (n) => { if (isNaN(n)||!isFinite(n)) return '0'; return Number(n.toFixed(4)).toString(); };

    if (lcmd === 'm') {
      for (let i = 0; i < nums.length; i += 2) {
        if (isFirst && i === 0) { const [nx,ny] = aT(nums[i],nums[i+1]); t.push(F(nx),F(ny)); isFirst = false; }
        else { t.push(F(sX(nums[i])),F(sY(nums[i+1]))); }
      }
      result.push('M' + t.join(' '));
    } else {
      if (lcmd === 'l' || lcmd === 't') {
        for (let i = 0; i < nums.length; i += 2) {
          if (abs) { const [nx,ny] = aT(nums[i],nums[i+1]); t.push(F(nx),F(ny)); }
          else { t.push(F(sX(nums[i])),F(sY(nums[i+1]))); }
        }
      } else if (lcmd === 'h') { for (const n of nums) t.push(F(abs ? a*n+e : sX(n)));
      } else if (lcmd === 'v') { for (const n of nums) t.push(F(abs ? dd*n+f : sY(n)));
      } else if (lcmd === 'c') {
        for (let i = 0; i < nums.length; i += 6) {
          for (let j = 0; j < 6; j += 2) {
            if (abs) { const [nx,ny] = aT(nums[i+j],nums[i+j+1]); t.push(F(nx),F(ny)); }
            else { t.push(F(sX(nums[i+j])),F(sY(nums[i+j+1]))); }
          }
        }
      } else if (lcmd === 's' || lcmd === 'q') {
        for (let i = 0; i < nums.length; i += 4) {
          for (let j = 0; j < 4; j += 2) {
            if (abs) { const [nx,ny] = aT(nums[i+j],nums[i+j+1]); t.push(F(nx),F(ny)); }
            else { t.push(F(sX(nums[i+j])),F(sY(nums[i+j+1]))); }
          }
        }
      } else if (lcmd === 'a') {
        for (let i = 0; i < nums.length; i += 7) {
          t.push(F(sX(nums[i])),F(sY(nums[i+1])),F(nums[i+2]),F(nums[i+3]),F(nums[i+4]));
          if (abs) { const [nx,ny] = aT(nums[i+5],nums[i+6]); t.push(F(nx),F(ny)); }
          else { t.push(F(sX(nums[i+5])),F(sY(nums[i+6]))); }
        }
      }
      result.push(cmd + t.join(' '));
    }
  }
  return result.join('');
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
    // Only capture d attributes on <path> elements (avoid false matches)
    const paths = [...section.matchAll(/<path[^>]*d="([^"]+)"/g)].map(m => m[1]);
    if (!paths.length) { console.warn(`  ${name}: no paths`); continue; }
    let merged = paths.join(' ');
    // Check if this territory has a matrix transform (like Mayotte)
    const transformMatch = section.match(/transform="matrix\(([^)]+)\)"/);
    if (transformMatch) {
      const matrix = transformMatch[1].split(',').map(Number);
      if (matrix.length === 6 && (matrix[0] !== 1 || matrix[3] !== 1)) {
        // Non-identity matrix found — apply it to path coordinates
        merged = applyMatrixToPath(merged, matrix);
        console.log(`  ${name}: applied matrix transform [${matrix.map(n => n.toFixed(4))}]`);
      }
    }
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
  
  // Extract metropolitan departments
  console.log('Extracting departments...');
  const deptStart = svg.indexOf('id="Départements_Métropolitains"');
  let gStart = deptStart;
  while (gStart > 0 && svg.substring(gStart, gStart+3) !== '<g ') gStart--;
  // Find the DEPARTMENTS_JSON_PATH for output
  const DEPARTMENTS_JSON_PATH = path.join(__dirname, '..', 'data', 'france-departments.json');
  
  // Get the department group transform
  const deptOpeningTag = svg.substring(gStart, gStart + 200);
  const deptTransformMatch = deptOpeningTag.match(/transform="([^"]+)"/);
  const deptTransform = deptTransformMatch ? deptTransformMatch[1] : '';
  
  // Find the matching closing tag of the department group
  let depth = 1;
  let gEnd = gStart;
  for (let i = gStart + 3; i < svg.length; i++) {
    if (svg.substring(i, i+3) === '<g ') depth++;
    else if (svg.substring(i, i+4) === '</g>') { depth--; if (depth === 0) { gEnd = i + 4; break; } }
  }
  const deptBlock = svg.substring(gStart, gEnd);
  const deptPathRegex = /<path[^>]*id="Dep(\d*[A-Z]?\d*)_([^"]+)"[^>]*d="([^"]+)"/g;
  const departments = [];
  let dm;
  while ((dm = deptPathRegex.exec(deptBlock)) !== null) {
    const num = dm[1], rawName = dm[2], d = dm[3];
    if (!num || rawName === 'Reg_bound') continue;
    departments.push({ num, name: rawName, path: d });
  }
  console.log(`Departments: ${departments.length} extracted`);
  
  // Apply matrix transforms to any department that needs it (check transform on parent groups)
  const deptOutput = { transform: deptTransform, departments };
  fs.writeFileSync(DEPARTMENTS_JSON_PATH, JSON.stringify(deptOutput, null, 2));
  console.log(`Written ${DEPARTMENTS_JSON_PATH}`);
  
  const output = { france: { path: francePath, bbox: franceBbox, viewBox: franceViewBox }, dom: domData };
  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(output, null, 2));
  console.log(`Written ${OUTPUT_PATH}`);
}

main();
