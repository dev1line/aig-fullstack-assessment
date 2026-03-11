export interface SentimentResult {
  sentiment: 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL';
  confidence: number;
  scores: {
    positive: number;
    negative: number;
    neutral: number;
  };
}
