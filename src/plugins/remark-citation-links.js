/**
 * remark-citation-links.js
 *
 * Remark plugin that transforms `[source: id]` patterns in Markdown body text
 * into numbered superscript citation links pointing to the bibliography page.
 *
 * Syntax in Markdown:
 *   Some text [source:bnf] and more text [source:insee-2024].
 *
 * Output HTML:
 *   Some text <sup class="citation"><a href="/bibliographie/bnf" data-source-id="bnf">[1]</a></sup>
 *   and more text <sup class="citation"><a href="/bibliographie/insee-2024" data-source-id="insee-2024">[2]</a></sup>
 *
 * Citations are numbered sequentially in order of appearance.
 * This plugin runs at build time — zero client JS required.
 */

import { visit } from 'unist-util-visit';

const CITATION_RE = /\[source:\s*([\w-]+)\]/g;

// Detection regex for bracket groups containing "source:" that DON'T match the canonical pattern.
// Used to warn about malformed citations that would be silently ignored.
const ANY_SOURCE_BRACKET_RE = /\[[^\]]*source:[^\]]*\]/g;
const KNOWN_BROKEN_PATTERNS = [
  /\[source:\s*\{[^}]*\}\]/,      // [source:{...} — curly braces in id
  /\[\{.*?source:\s*[\w-]+\}\]/,   // [{... source:id} — editorial note wrapping
];

/**
 * @returns {import('unified').Plugin}
 */
export default function remarkCitationLinks() {
  /** Sequential counter scoped to one tree traversal */
  let counter = 0;

  return (tree, file) => {
    counter = 0;

    /** Collect (node, index, parent) tuples for text nodes that contain citations */
    const targets = [];

    // ── Warning pass: detect malformed source: patterns that would be silently ignored ──
    visit(tree, 'text', (node) => {
      ANY_SOURCE_BRACKET_RE.lastIndex = 0;
      let bracketMatch;
      while ((bracketMatch = ANY_SOURCE_BRACKET_RE.exec(node.value)) !== null) {
        const bracketText = bracketMatch[0];
        // If it already matches the canonical pattern, it's fine
        CITATION_RE.lastIndex = 0;
        if (CITATION_RE.test(bracketText)) continue;
        // Check if it matches known broken patterns
        for (const broken of KNOWN_BROKEN_PATTERNS) {
          if (broken.test(bracketText)) {
            const filename = file?.path ?? 'unknown';
            console.warn(
              `[remark-citation-links] ⚠ Malformed citation in ${filename}: "${bracketText.substring(0, 80)}"`
            );
            break;
          }
        }
      }
    });

    visit(tree, 'text', (node, index, parent) => {
      CITATION_RE.lastIndex = 0;
      if (CITATION_RE.test(node.value)) {
        targets.push({ node, index, parent });
        CITATION_RE.lastIndex = 0;
        return visit.SKIP;
      }
    });

    // Pass 1: Pre-compute numbered children in document order.
    // Targets are in document order (DFS).  We iterate forward so that
    // `counter` increments in order-of-appearance.
    const replacements = [];
    for (const { node } of targets) {
      const children = [];
      let last = 0;
      let match;

      CITATION_RE.lastIndex = 0;
      while ((match = CITATION_RE.exec(node.value)) !== null) {
        if (match.index > last) {
          children.push({ type: 'text', value: node.value.slice(last, match.index) });
        }
        counter++;
        children.push({
          type: 'html',
          value: `<sup class="citation"><a href="/bibliographie/${match[1]}" data-source-id="${match[1]}" title="Source : ${match[1]}">[${counter}]</a></sup>`,
        });
        last = match.index + match[0].length;
      }
      if (last < node.value.length) {
        children.push({ type: 'text', value: node.value.slice(last) });
      }
      replacements.push(children);
    }

    // Pass 2: Apply replacements in reverse order so that earlier splice()
    // calls do not invalidate the indices of later ones.
    for (let i = targets.length - 1; i >= 0; i--) {
      const { index, parent } = targets[i];
      parent.children.splice(index, 1, ...replacements[i]);
    }
  };
}
