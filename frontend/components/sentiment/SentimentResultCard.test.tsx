import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SentimentResultCard } from './SentimentResultCard';

const mockResult = {
  sentiment: 'POSITIVE' as const,
  confidence: 0.95,
  scores: { positive: 0.95, negative: 0.03, neutral: 0.02 },
};

describe('SentimentResultCard', () => {
  it('renders the sentiment label', () => {
    render(<SentimentResultCard result={mockResult} />);
    const badge = screen.getByTestId('sentiment-badge');
    expect(badge).toHaveTextContent('POSITIVE');
  });

  it('renders confidence as percentage', () => {
    render(<SentimentResultCard result={mockResult} />);
    expect(screen.getByText(/95%/)).toBeInTheDocument();
  });

  it('renders all three score values', () => {
    render(<SentimentResultCard result={mockResult} />);
    expect(screen.getByText(/0\.95/)).toBeInTheDocument();
    expect(screen.getByText(/0\.03/)).toBeInTheDocument();
    expect(screen.getByText(/0\.02/)).toBeInTheDocument();
  });

  it('applies green styling for POSITIVE sentiment', () => {
    render(<SentimentResultCard result={mockResult} />);
    const badge = screen.getByTestId('sentiment-badge');
    expect(badge).toHaveClass('sentiment-positive');
  });

  it('applies red styling for NEGATIVE sentiment', () => {
    const negativeResult = { ...mockResult, sentiment: 'NEGATIVE' as const };
    render(<SentimentResultCard result={negativeResult} />);
    const badge = screen.getByTestId('sentiment-badge');
    expect(badge).toHaveClass('sentiment-negative');
  });

  it('applies gray styling for NEUTRAL sentiment', () => {
    const neutralResult = { ...mockResult, sentiment: 'NEUTRAL' as const };
    render(<SentimentResultCard result={neutralResult} />);
    const badge = screen.getByTestId('sentiment-badge');
    expect(badge).toHaveClass('sentiment-neutral');
  });

  it('renders nothing when result is null', () => {
    const { container } = render(<SentimentResultCard result={null} />);
    expect(container.firstChild).toBeNull();
  });
});
