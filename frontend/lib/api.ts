import { ReviewResponse } from '@/types/sentiment';

function getApiBase(): string {
  if (typeof window !== 'undefined' && process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL;
  }
  return 'http://localhost:3001';
}

export async function analyzeReview(text: string): Promise<ReviewResponse> {
  const res = await fetch(`${getApiBase()}/analyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.message || 'Failed to analyze review');
  }

  return res.json();
}

export async function getReviews(): Promise<ReviewResponse[]> {
  const res = await fetch(`${getApiBase()}/reviews`);

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.message || 'Failed to fetch reviews');
  }

  return res.json();
}
