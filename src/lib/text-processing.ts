export function chunkText(text: string, chunkSize: number = 800, overlap: number = 200): Array<{ content: string; page: number }> {
  const chunks: Array<{ content: string; page: number }> = [];
  const pages = text.split(/\n\n+/);
  let currentChunk = '';
  let currentPage = 1;

  for (const page of pages) {
    const lines = page.split('\n');
    for (const line of lines) {
      if (currentChunk.length + line.length > chunkSize && currentChunk.length > 0) {
        chunks.push({ content: currentChunk.trim(), page: currentPage });
        const overlapText = currentChunk.slice(-overlap);
        currentChunk = overlapText + '\n' + line;
        currentPage++;
      } else {
        currentChunk += (currentChunk ? '\n' : '') + line;
      }
    }
    if (currentChunk.trim()) {
      currentPage++;
    }
  }

  if (currentChunk.trim()) {
    chunks.push({ content: currentChunk.trim(), page: currentPage });
  }

  return chunks.length > 0 ? chunks : [{ content: text.slice(0, chunkSize), page: 1 }];
}

export function keywordSearch(query: string, documents: Array<{ content: string; page: number; bookTitle: string }>, limit: number = 5): Array<{ content: string; page: number; bookTitle: string; score: number }> {
  const queryLower = query.toLowerCase();
  const queryTerms = queryLower.split(/\s+/).filter(t => t.length > 2);

  const scored = documents.map(doc => {
    const contentLower = doc.content.toLowerCase();
    let score = 0;
    for (const term of queryTerms) {
      const regex = new RegExp(term, 'gi');
      const matches = contentLower.match(regex);
      if (matches) score += matches.length;
    }
    return { ...doc, score };
  });

  return scored.filter(s => s.score > 0).sort((a, b) => b.score - a.score).slice(0, limit);
}
