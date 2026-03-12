import { describe, it, expect, vi, beforeEach } from 'vitest';
import { analyzeReview, getReviews } from './api';

const mockFetch = vi.fn();
global.fetch = mockFetch;

beforeEach(() => {
  mockFetch.mockReset();
});

describe('analyzeReview', () => {
  it('should POST to /analyze and return result', async () => {
    const mockResponse = {
      sentiment: 'POSITIVE',
      confidence: 0.95,
      scores: { positive: 0.95, negative: 0.03, neutral: 0.02 },
      id: 'abc123',
      createdAt: '2026-01-01T00:00:00Z',
    };
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    });

    const result = await analyzeReview('Great product!');

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/analyze'),
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: 'Great product!' }),
      }),
    );
    expect(result).toEqual(mockResponse);
  });

  it('should throw error when API returns non-ok', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({ message: 'Validation failed' }),
    });

    await expect(analyzeReview('')).rejects.toThrow('Validation failed');
  });

  it('should throw on network failure', async () => {
    mockFetch.mockRejectedValue(new Error('Network error'));

    await expect(analyzeReview('test')).rejects.toThrow('Network error');
  });
});

describe('getReviews', () => {
  it('should GET /reviews and return paginated response', async () => {
    const mockResponse = {
      items: [{ id: '1', text: 'Good', sentiment: 'POSITIVE' }],
      nextCursor: null,
      hasMore: false,
    };
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    });

    const result = await getReviews();

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/reviews'),
    );
    expect(result).toEqual(mockResponse);
    expect(result.items).toHaveLength(1);
    expect(result.nextCursor).toBeNull();
    expect(result.hasMore).toBe(false);
  });

  it('should pass cursor and limit when provided', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({ items: [], nextCursor: null, hasMore: false }),
    });

    await getReviews('2026-01-01T00:00:00.000Z::abc', 10);

    const callUrl = mockFetch.mock.calls[0][0];
    expect(callUrl).toContain('/reviews');
    expect(callUrl).toContain('cursor=');
    expect(callUrl).toContain('limit=10');
  });

  it('should throw error when GET /reviews returns non-ok', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({ message: 'Server error' }),
    });

    await expect(getReviews()).rejects.toThrow('Server error');
  });
});
