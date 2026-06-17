## Task: generate or complete event md file(s) in src/content/events

## requirements

- correct schema
- treat existing events files as writing style examples
- do
  - use inclusive language
    - in French, use point median for gender-depdendent nouns and adjectives: chercheur·e, agriculteur·euse, heureux·euse
    - in English, use singular they
  - tell a story
- do not 
  - mechanically copy the text structure in examples
  - simply list generic, boring historical facts
- reference facts 
  - procedure
    1. create sources in src/content/sources with valid CSL-JSON schema
      - prioritise academic journals and reliable scientific sites
      - avoid unverified, low quality content
      - must not invent fictive sources: use web search 
    2. cite them inline with `[source:{source-id}]`
