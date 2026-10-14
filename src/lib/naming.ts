export type NameContext = {
  /** Original file name without its extension. */
  name: string;
  width: number;
  height: number;
  /** Output extension without the dot, e.g. `webp`. */
  format: string;
  quality: number | null;
  index: number;
};

export const NAME_TOKENS = ['{name}', '{width}', '{height}', '{format}', '{quality}', '{index}'] as const;

// Characters that are invalid in file names on at least one major OS.
const UNSAFE = /[\\/:*?"<>|\u0000-\u001f]/g;

export function baseName(fileName: string) {
  const dot = fileName.lastIndexOf('.');
  return dot > 0 ? fileName.slice(0, dot) : fileName;
}

/** Expands tokens in `pattern` and returns a safe file name with the output extension. */
export function applyNamePattern(pattern: string, context: NameContext) {
  const values: Record<string, string> = {
    name: context.name,
    width: String(context.width),
    height: String(context.height),
    format: context.format,
    quality: context.quality === null ? '' : String(context.quality),
    index: String(context.index),
  };
  const expanded = pattern.replace(/\{(\w+)\}/g, (token, key: string) => values[key] ?? token);
  const cleaned = expanded
    .replace(UNSAFE, '-')
    .replace(/\s+/g, ' ')
    .replace(/^[\s.]+|[\s.]+$/g, '');
  return `${cleaned || context.name || 'image'}.${context.format}`;
}

/** Suffixes repeated names (`a.webp`, `a-2.webp`, …) so ZIP entries never overwrite each other. */
export function uniqueNames(names: string[]) {
  const used = new Set<string>();
  return names.map((name) => {
    const dot = name.lastIndexOf('.');
    const stem = dot > 0 ? name.slice(0, dot) : name;
    const ext = dot > 0 ? name.slice(dot) : '';
    let candidate = name;
    for (let n = 2; used.has(candidate.toLowerCase()); n++) candidate = `${stem}-${n}${ext}`;
    used.add(candidate.toLowerCase());
    return candidate;
  });
}
