/**
 * remark-heading-ids.js
 *
 * Remark plugin that supports custom heading IDs via `{#id}` syntax.
 *
 * In Markdown:
 *   ## Mon titre {#mon-id}
 *
 * Output:
 *   <h2 id="mon-id">Mon titre</h2>
 *
 * The `{#id}` is stripped from the visible text and the heading
 * gets that custom ID instead of an auto-generated slug.
 * If no `{#id}` is present, the heading is left untouched
 * (rehype-slug will auto-generate an ID).
 */

import { visit } from 'unist-util-visit';

const HEADING_ID_RE = /\s*\{#([\w-]+)\}\s*$/;

/**
 * @returns {import('unified').Plugin}
 */
export default function remarkHeadingIds() {
  return (tree) => {
    visit(tree, 'heading', (node) => {
      // Process the last text child of the heading
      const lastChild = node.children[node.children.length - 1];
      if (!lastChild || lastChild.type !== 'text') return;

      const match = HEADING_ID_RE.exec(lastChild.value);
      if (!match) return;

      const customId = match[1];

      // Strip {#id} from the text content
      lastChild.value = lastChild.value.slice(0, match.index);

      // Trim trailing space from the text node
      if (lastChild.value.endsWith(' ')) {
        lastChild.value = lastChild.value.slice(0, -1);
      }

      // Append a raw HTML anchor so the heading gets the custom ID.
      // This ensures the ID is present regardless of rehype-slug behavior.
      node.children.push({
        type: 'html',
        value: `<a id="${customId}" class="heading-anchor"></a>`,
      });
    });
  };
}
