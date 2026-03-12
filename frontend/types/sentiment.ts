export type SentimentValue = 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL';

export interface SentimentScores {
  positive: number;
  negative: number;
  neutral: number;
}

export interface SentimentResult {
  sentiment: SentimentValue;
  confidence: number;
  scores: SentimentScores;
}

export interface ReviewResponse extends SentimentResult {
  id: string;
  text: string;
  createdAt: string;
}

export interface PaginatedReviewsResponse {
  items: ReviewResponse[];
  nextCursor: string | null;
  hasMore: boolean;
}
