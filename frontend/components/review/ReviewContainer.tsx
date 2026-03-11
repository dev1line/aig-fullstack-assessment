'use client';

import { useEffect, useState } from 'react';
import { getReviews } from '@/lib/api';
import { ReviewResponse } from '@/types/sentiment';
import { formatConfidence, formatDate } from '@/utils/common';

export function ReviewContainer() {
  const [reviews, setReviews] = useState<ReviewResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    getReviews()
      .then(setReviews)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="loading">Loading reviews...</p>;
  if (error) return <p className="error">{error}</p>;
  if (reviews.length === 0) return <p className="empty">No reviews yet.</p>;

  return (
    <div className="reviews-list">
      {reviews.map((review) => (
        <div key={review.id} className="review-card">
          <div className="review-header">
            <span
              className={`sentiment-badge sentiment-${review.sentiment.toLowerCase()}`}
            >
              {review.sentiment}
            </span>
            <span className="confidence">
              {formatConfidence(review.confidence)}
            </span>
            <span className="date">{formatDate(review.createdAt)}</span>
          </div>
          <p className="review-text">{review.text}</p>
          <div className="review-scores">
            <span>P: {review.scores.positive.toFixed(2)}</span>
            <span>N: {review.scores.negative.toFixed(2)}</span>
            <span>Neu: {review.scores.neutral.toFixed(2)}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
