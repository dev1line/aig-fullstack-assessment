export interface SentimentScores {
  positive: number;
  negative: number;
  neutral: number;
}

export interface SentimentResult {
  sentiment: 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL';
  confidence: number;
  scores: SentimentScores;
}

export interface ReviewResponse extends SentimentResult {
  id: string;
  text: string;
  createdAt: string;
}
