'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { getReviews } from '@/lib/api';
import { DEFAULT_PAGE_SIZE } from '@/lib/constants';
import { ReviewResponse } from '@/types/sentiment';
import { formatConfidence, formatDate } from '@/utils/common';

export function ReviewContainer() {
  const [reviews, setReviews] = useState<ReviewResponse[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');
  const initialFetchStartedRef = useRef(false);

  const loadFirstPage = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await getReviews(null, DEFAULT_PAGE_SIZE);
      setReviews(data.items);
      setNextCursor(data.nextCursor);
      setHasMore(data.hasMore);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load reviews');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (initialFetchStartedRef.current) return;
    initialFetchStartedRef.current = true;
    loadFirstPage();
  }, [loadFirstPage]);

  const loadMore = useCallback(async () => {
    if (!nextCursor || loadingMore || !hasMore) return;
    setLoadingMore(true);
    setError('');
    try {
      const data = await getReviews(nextCursor, DEFAULT_PAGE_SIZE);
      setReviews((prev) => [...prev, ...data.items]);
      setNextCursor(data.nextCursor);
      setHasMore(data.hasMore);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load more');
    } finally {
      setLoadingMore(false);
    }
  }, [nextCursor, loadingMore, hasMore]);

  if (loading) return <p className="loading">Loading reviews...</p>;
  if (error && reviews.length === 0) return <p className="error">{error}</p>;
  if (reviews.length === 0) return <p className="empty">No reviews yet.</p>;

  return (
    <div className="reviews-frame">
      <div className="reviews-list" role="list" aria-label="Reviews">
        {reviews.map((review) => (
          <div key={review.id} className="review-card" role="listitem">
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
      {error && reviews.length > 0 && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      {hasMore && (
        <div className="load-more">
          <button
            type="button"
            onClick={loadMore}
            disabled={loadingMore}
            className="load-more-btn"
          >
            {loadingMore ? 'Loading...' : 'Load more'}
          </button>
        </div>
      )}
    </div>
  );
}
