/**
 * rehype-citation-links.js
 *
 * Rehype plugin that transforms `[source: id]` patterns in Markdown body text
 * into numbered superscript citation links pointing to the bibliography page.
 *
 * Syntax in Markdown:
 *   Some text [source: bnf] and more text [source: insee-2024].
 *
 * Output HTML:
 *   Some text <sup class="citation"><a href="/bibliography/bnf" data-source-id="bnf">[1]</a></sup>
 *   and more text <sup class="citation"><a href="/bibliography/insee-2024" data-source-id="insee-2024">[2]</a></sup>
 *
 * Citations are numbered sequentially in order of appearance.
 * This plugin runs at build time — zero client JS required.
 */

import { visit } from 'unist-util-visit';

const CITATION_RE = /\[source:\s+([\w-]+)\]/g;

/**
 * @returns {import('unified').Plugin}
 */
export default function rehypeCitationLinks() {
  /** Sequential counter scoped to one tree traversal */
  let counter = 0;

  return (tree) => {
    counter = 0;

    /** Collect (node, index, parent) tuples for text nodes that contain citations */
    const targets = [];

    visit(tree, 'text', (node, _index, _parent) => {
      // Quick check before collecting
      if (CITATION_RE.test(node.value)) {
        targets.push({ node, index: _index, parent: _parent });
        return visit.SKIP;
      }
    });

    // Process in reverse order so that earlier splice() calls do not
    // invalidate the indices of later ones.
    for (const { node, index, parent } of targets.reverse()) {
      const children = [];
      let last = 0;
      let match;

      // Reset lastIndex for this node's iteration
      CITATION_RE.lastIndex = 0;

      while ((match = CITATION_RE.exec(node.value)) !== null) {
        // Text segment before this citation
        if (match.index > last) {
          children.push({ type: 'text', value: node.value.slice(last, match.index) });
        }

        const sourceId = match[1];
        counter++;

        children.push({
          type: 'element',
          tagName: 'sup',
          properties: { className: ['citation'] },
          children: [
            {
              type: 'element',
              tagName: 'a',
              properties: {
                href: `/bibliography/${sourceId}`,
                'data-source-id': sourceId,
                title: `Source : ${sourceId}`,
              },
              children: [{ type: 'text', value: `[${counter}]` }],
            },
          ],
        });

        last = match.index + match[0].length;
      }

      // Trailing text after the last citation
      if (last < node.value.length) {
        children.push({ type: 'text', value: node.value.slice(last) });
      }

      parent.children.splice(index, 1, ...children);
    }
  };
}
