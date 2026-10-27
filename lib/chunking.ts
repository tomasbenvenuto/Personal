// Rough token estimate (English/Spanish prose averages ~4 chars/token).
// Good enough for routing decisions, not meant to be exact.
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

export const SINGLE_CALL_TOKEN_THRESHOLD = 15_000;

/**
 * Splits text into chunks of roughly `maxTokensPerChunk` tokens, preferring
 * to break on paragraph boundaries so we don't cut a sentence in half. Used
 * for the map-reduce path on long documents (see lib/ai/*.ts).
 */
export function chunkText(text: string, maxTokensPerChunk = 8_000): string[] {
  const maxChars = maxTokensPerChunk * 4;
  const paragraphs = text.split(/\n\s*\n/);
  const chunks: string[] = [];
  let current = "";

  const flush = () => {
    if (current.trim()) chunks.push(current.trim());
    current = "";
  };

  for (const paragraph of paragraphs) {
    const candidate = current ? `${current}\n\n${paragraph}` : paragraph;
    if (candidate.length > maxChars && current) {
      flush();
      current = paragraph;
    } else {
      current = candidate;
    }

    // A single paragraph longer than the whole budget: hard-split it.
    while (current.length > maxChars) {
      chunks.push(current.slice(0, maxChars));
      current = current.slice(maxChars);
    }
  }
  flush();

  return chunks;
}
