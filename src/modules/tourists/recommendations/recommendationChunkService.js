const CHUNK_SIZE = 1000;
const CHUNK_OVERLAP = 200;

export const splitTextIntoChunks = (text) => {
  const normalizedText = String(text || "").replace(/\s+/g, " ").trim();
  if (!normalizedText) return [];

  if (normalizedText.length <= CHUNK_SIZE) return [normalizedText];

  const chunks = [];
  let start = 0;

  while (start < normalizedText.length) {
    const end = Math.min(start + CHUNK_SIZE, normalizedText.length);
    let chunk = normalizedText.slice(start, end);

    if (end < normalizedText.length) {
      const lastSentence = Math.max(
        chunk.lastIndexOf(". "),
        chunk.lastIndexOf("? "),
        chunk.lastIndexOf("! "),
        chunk.lastIndexOf("; "),
      );
      const lastSpace = chunk.lastIndexOf(" ");
      const splitAt = lastSentence > CHUNK_SIZE * 0.6 ? lastSentence + 1 : lastSpace;

      if (splitAt > CHUNK_SIZE * 0.5) {
        chunk = chunk.slice(0, splitAt).trim();
      }
    }

    if (chunk) chunks.push(chunk);
    start += Math.max(chunk.length - CHUNK_OVERLAP, 1);
  }

  return chunks;
};
