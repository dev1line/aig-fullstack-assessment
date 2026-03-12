import { ReviewResponse, PaginatedReviewsResponse } from "@/types/sentiment";
import { API_DEFAULT_BASE_URL, DEFAULT_PAGE_SIZE } from "@/lib/constants";

function getApiBase(): string {
  if (typeof window !== "undefined" && process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL;
  }
  return API_DEFAULT_BASE_URL;
}

export async function analyzeReview(text: string): Promise<ReviewResponse> {
  const res = await fetch(`${getApiBase()}/analyze`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.message || "Failed to analyze review");
  }

  return res.json();
}

export async function getReviews(
  cursor?: string | null,
  limit: number = DEFAULT_PAGE_SIZE,
): Promise<PaginatedReviewsResponse> {
  const params = new URLSearchParams();
  params.set("limit", String(limit));
  if (cursor) params.set("cursor", cursor);
  const query = params.toString();
  const url = `${getApiBase()}/reviews?${query}`;
  const res = await fetch(url);

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.message || "Failed to fetch reviews");
  }

  return res.json();
}
