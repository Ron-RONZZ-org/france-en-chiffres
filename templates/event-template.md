---
id:
title:
start:
end:
description:
mediaId:               # (optional) single hero media — kept for backward compat
mediaIds:              # (optional) array of media IDs — preferred for multiple
  -                    # first entry = hero image
  -
departmentId:
timeline:              # (optional) mini-timeline Gantt at top of article
  - id:                # kebab-case ID, used as anchor link target
    title:             # short display title
    start:             # start year (number)
    end:               # end year (number, same as start for point events)
    sectionId:         # (optional) heading anchor to scroll to; defaults to id
  # - id: example
  #   title: Exemple d'événement
  #   start: 1789
  #   end: 1799
  #   sectionId: section-example
  #
  # Add {#section-id} to the corresponding heading in the body:
  #   ## Mon titre {#section-example}
---

<!--
  Cite sources inline with [source:source-id] after each factual claim.
  IMPORTANT: leave a space before the bracket (e.g., "texte [source:id]" not "texte[source:id]").
  Source files live in src/content/sources/ — use existing IDs or add a new CSL-JSON file.

  Embed media inline with [media:media-id] in the body text.
  Register new media via: npm run new:media -- <source-file>
  Embed charts with [chart:figure-id].
  See AGENTS.md → Content Writing Guidelines for details.
-->
