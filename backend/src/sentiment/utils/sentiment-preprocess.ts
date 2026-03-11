import natural from 'natural';

const stopwords = new Set(natural.stopwords);

export function tokenize(text: string): string[] {
  const tokenizer = new natural.WordTokenizer();
  return tokenizer.tokenize(text.toLowerCase()) || [];
}

export function removeStopwords(tokens: string[]): string[] {
  return tokens.filter((t) => !stopwords.has(t));
}

export function generateNgrams(tokens: string[], maxN: number): string[] {
  const result: string[] = [...tokens];
  for (let n = 2; n <= maxN; n++) {
    for (let i = 0; i <= tokens.length - n; i++) {
      result.push(tokens.slice(i, i + n).join('_'));
    }
  }
  return result;
}

export function preprocess(text: string, ngramSize: number): string[] {
  if (!text.trim()) return [];
  const tokens = tokenize(text);
  const filtered = removeStopwords(tokens);
  return generateNgrams(filtered, ngramSize);
}
