'use client';

import { useState } from 'react';
import { ReviewForm } from '@/components/review/ReviewForm';
import { SentimentResultCard } from '@/components/sentiment/SentimentResultCard';
import { analyzeReview } from '@/lib/api';
import { ReviewResponse } from '@/types/sentiment';

export function AnalyzeContainer() {
  const [result, setResult] = useState<ReviewResponse | null>(null);

  const handleSubmit = async (text: string) => {
    const response = await analyzeReview(text);
    setResult(response);
  };

  return (
    <div className="analyze-container">
      <ReviewForm onSubmit={handleSubmit} />
      <SentimentResultCard result={result} />
    </div>
  );
}
