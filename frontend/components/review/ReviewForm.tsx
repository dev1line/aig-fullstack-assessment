'use client';

import { useState } from 'react';

interface ReviewFormProps {
  onSubmit: (text: string) => Promise<void>;
  disabled?: boolean;
}

export function ReviewForm({ onSubmit, disabled }: ReviewFormProps) {
  const [text, setText] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const isOverLimit = text.length > 500;
  const isDisabled = disabled || loading || isOverLimit;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const trimmed = text.trim();
    if (!trimmed) {
      setError('Review text is required');
      return;
    }

    setLoading(true);
    try {
      await onSubmit(trimmed);
      setText('');
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Something went wrong');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="review-form">
      <label htmlFor="review-text">Review Text</label>
      <textarea
        id="review-text"
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          setError('');
        }}
        placeholder="Enter your review here..."
        className={isOverLimit ? 'input-error' : ''}
        disabled={loading}
      />
      <div className="form-meta">
        <span>{text.length}/500 characters</span>
      </div>
      {isOverLimit && (
        <p role="status" className="error">
          Must be at most 500 characters
        </p>
      )}
      {error && !isOverLimit && (
        <p role="status" className="error">
          {error}
        </p>
      )}
      <button type="submit" disabled={isDisabled}>
        {loading ? 'Analyzing...' : 'Analyze'}
      </button>
    </form>
  );
}
