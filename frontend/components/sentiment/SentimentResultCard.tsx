'use client';

import { formatConfidence } from '@/utils/common';

interface SentimentResultCardProps {
  result: {
    sentiment: 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL';
    confidence: number;
    scores: { positive: number; negative: number; neutral: number };
  } | null;
}

export function SentimentResultCard({ result }: SentimentResultCardProps) {
  if (!result) return null;

  const sentimentClass = `sentiment-${result.sentiment.toLowerCase()}`;

  return (
    <div className="sentiment-card">
      <div data-testid="sentiment-badge" className={`sentiment-badge ${sentimentClass}`}>
        {result.sentiment}
      </div>
      <div className="confidence">
        Confidence: <strong>{formatConfidence(result.confidence)}</strong>
      </div>
      <div className="scores">
        <h4>Score Breakdown</h4>
        <div className="score-row">
          <span>Positive</span>
          <div className="score-bar">
            <div
              className="score-fill positive"
              style={{ width: `${result.scores.positive * 100}%` }}
            />
          </div>
          <span>{result.scores.positive.toFixed(2)}</span>
        </div>
        <div className="score-row">
          <span>Negative</span>
          <div className="score-bar">
            <div
              className="score-fill negative"
              style={{ width: `${result.scores.negative * 100}%` }}
            />
          </div>
          <span>{result.scores.negative.toFixed(2)}</span>
        </div>
        <div className="score-row">
          <span>Neutral</span>
          <div className="score-bar">
            <div
              className="score-fill neutral"
              style={{ width: `${result.scores.neutral * 100}%` }}
            />
          </div>
          <span>{result.scores.neutral.toFixed(2)}</span>
        </div>
      </div>
    </div>
  );
}
