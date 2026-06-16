/** Metadata entry for a media asset in src/media/ */
export interface MediaEntry {
  /** Unique ID — must match the file stem in src/media/ */
  id: string;
  /** Required for accessibility (alt text) */
  alt: string;
  /** Visible caption below/over the media */
  caption?: string;
  /** Photographer/illustrator/origin credit line */
  credit?: string;
  /** License identifier (e.g. "CC BY-SA 4.0", "Domaine public") */
  license?: string;
  /** Link to source in src/sources/ CSL-JSON */
  sourceId?: string;
}

/** Resolved media entry paired with its imported file metadata */
export interface ResolvedMedia extends MediaEntry {
  /** Imported image metadata (src, width, height, format) */
  src: string;
  width: number;
  height: number;
  format: string;
}
