/**
 * Lightweight fuzzy search — no external dependencies.
 * Handles accent normalization, word-level matching, and simple typo tolerance.
 */

export function normalize(s: string): string {
  return s.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase()
}

/** Levenshtein distance between two short strings */
function editDistance(a: string, b: string): number {
  if (a === b) return 0
  if (a.length === 0) return b.length
  if (b.length === 0) return a.length
  const row: number[] = Array.from({ length: b.length + 1 }, (_, i) => i)
  for (let i = 1; i <= a.length; i++) {
    let prev = i
    for (let j = 1; j <= b.length; j++) {
      const val = a[i - 1] === b[j - 1] ? row[j - 1] : 1 + Math.min(row[j - 1], row[j], prev)
      row[j - 1] = prev
      prev = val
    }
    row[b.length] = prev
  }
  return row[b.length]
}

/** Max allowed edits for a given word length */
function maxEdits(len: number): number {
  if (len <= 3) return 0
  if (len <= 6) return 1
  return 2
}

/** Returns true if `word` is close enough to any word in `text` */
function wordMatches(word: string, text: string): boolean {
  if (text.includes(word)) return true
  const textWords = text.split(/\W+/).filter(Boolean)
  const limit = maxEdits(word.length)
  return textWords.some((tw) => Math.abs(tw.length - word.length) <= limit + 1 && editDistance(word, tw) <= limit)
}

/**
 * Returns a relevance score ≥ 0 for `item` against `query`.
 * Zero means no match.
 */
export function fuzzyScore(
  fields: (string | null | undefined)[],
  query: string,
): number {
  const q = normalize(query.trim())
  if (!q) return 1

  const haystack = fields
    .filter(Boolean)
    .map((f) => normalize(f!))
    .join(" ")

  if (!haystack) return 0

  // Exact substring match → highest score
  if (haystack.includes(q)) return 3

  // Per-word matching (multi-word query: "juan admin" → both words must match)
  const words = q.split(/\s+/).filter((w) => w.length >= 2)
  if (words.length === 0) return haystack.includes(q[0]) ? 1 : 0

  const matched = words.filter((w) => wordMatches(w, haystack))
  if (matched.length === 0) return 0
  return matched.length / words.length // 0 < score ≤ 1 for partial, 1 for all words
}

/** Filter + sort an array by fuzzy relevance */
export function fuzzyFilter<T>(
  items: T[],
  query: string,
  getFields: (item: T) => (string | null | undefined)[],
): T[] {
  if (!query.trim()) return items
  const scored = items
    .map((item) => ({ item, score: fuzzyScore(getFields(item), query) }))
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)
  return scored.map(({ item }) => item)
}
