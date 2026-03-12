import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ReviewContainer } from "./ReviewContainer";
import { getReviews } from "@/lib/api";
import { PaginatedReviewsResponse } from "@/types/sentiment";
import { DEFAULT_PAGE_SIZE } from "@/lib/constants";

vi.mock("@/lib/api", () => ({
  getReviews: vi.fn(),
}));

describe("ReviewContainer", () => {
  const mockReview = (
    id: string,
    text: string,
    sentiment: "POSITIVE" | "NEGATIVE" | "NEUTRAL" = "POSITIVE",
  ) => ({
    id,
    text,
    sentiment,
    confidence: 0.9,
    scores: { positive: 0.9, negative: 0.05, neutral: 0.05 },
    createdAt: "2026-01-01T00:00:00Z",
  });

  beforeEach(() => {
    vi.mocked(getReviews).mockReset();
  });

  it("shows loading then first page of reviews", async () => {
    vi.mocked(getReviews).mockResolvedValue({
      items: [mockReview("1", "First review")],
      nextCursor: null,
      hasMore: false,
    });

    render(<ReviewContainer />);

    expect(screen.getByText(/Loading reviews/)).toBeInTheDocument();
    expect(await screen.findByText("First review")).toBeInTheDocument();
    expect(getReviews).toHaveBeenCalledTimes(1);
    expect(getReviews).toHaveBeenCalledWith(null, DEFAULT_PAGE_SIZE);
  });

  it("renders reviews inside a fixed frame (reviews-frame)", async () => {
    vi.mocked(getReviews).mockResolvedValue({
      items: [mockReview("1", "In frame")],
      nextCursor: null,
      hasMore: false,
    });

    render(<ReviewContainer />);
    await screen.findByText("In frame");

    const frame = document.querySelector(".reviews-frame");
    expect(frame).toBeInTheDocument();
    const list = screen.getByRole("list", { name: /Reviews/i });
    expect(list).toHaveClass("reviews-list");
    expect(frame).toContainElement(list);
  });

  it("shows Load more button when hasMore is true", async () => {
    vi.mocked(getReviews).mockResolvedValue({
      items: [mockReview("1", "First")],
      nextCursor: "2026-01-01T00:00:00.000Z::1",
      hasMore: true,
    });

    render(<ReviewContainer />);

    await screen.findByText("First");
    const loadMoreBtn = screen.getByRole("button", { name: /Load more/i });
    expect(loadMoreBtn).toBeInTheDocument();
  });

  it("does not show Load more when hasMore is false", async () => {
    vi.mocked(getReviews).mockResolvedValue({
      items: [mockReview("1", "Only one")],
      nextCursor: null,
      hasMore: false,
    });

    render(<ReviewContainer />);
    await screen.findByText("Only one");

    expect(
      screen.queryByRole("button", { name: /Load more/i }),
    ).not.toBeInTheDocument();
  });

  it("appends next page when Load more is clicked", async () => {
    const user = userEvent.setup();
    vi.mocked(getReviews)
      .mockResolvedValueOnce({
        items: [mockReview("1", "First")],
        nextCursor: "2026-01-01T00:00:00.000Z::1",
        hasMore: true,
      })
      .mockResolvedValueOnce({
        items: [mockReview("2", "Second")],
        nextCursor: null,
        hasMore: false,
      });

    render(<ReviewContainer />);

    await screen.findByText("First");
    const loadMoreBtn = screen.getByRole("button", { name: /Load more/i });
    await user.click(loadMoreBtn);

    expect(await screen.findByText("Second")).toBeInTheDocument();
    expect(screen.getByText("First")).toBeInTheDocument();
    expect(getReviews).toHaveBeenCalledTimes(2);
    expect(getReviews).toHaveBeenNthCalledWith(
      2,
      "2026-01-01T00:00:00.000Z::1",
      DEFAULT_PAGE_SIZE,
    );
    expect(
      screen.queryByRole("button", { name: /Load more/i }),
    ).not.toBeInTheDocument();
  });

  it("disables Load more while loading next page", async () => {
    const user = userEvent.setup();
    let resolveSecond: (v: unknown) => void;
    const secondCall = new Promise((resolve) => {
      resolveSecond = resolve;
    });
    vi.mocked(getReviews)
      .mockResolvedValueOnce({
        items: [mockReview("1", "First")],
        nextCursor: "cursor1",
        hasMore: true,
      })
      .mockReturnValueOnce(secondCall as Promise<PaginatedReviewsResponse>);

    render(<ReviewContainer />);
    await screen.findByText("First");
    const loadMoreBtn = screen.getByRole("button", { name: /Load more/i });
    await user.click(loadMoreBtn);

    expect(loadMoreBtn).toHaveTextContent(/Loading/);
    expect(loadMoreBtn).toBeDisabled();
    resolveSecond!({
      items: [mockReview("2", "Second")],
      nextCursor: null,
      hasMore: false,
    });
    await screen.findByText("Second");
  });

  it("shows sentiment badge with enum value", async () => {
    vi.mocked(getReviews).mockResolvedValue({
      items: [mockReview("1", "Good", "NEGATIVE")],
      nextCursor: null,
      hasMore: false,
    });

    render(<ReviewContainer />);

    await screen.findByText("Good");
    const badge = screen.getByText("NEGATIVE");
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveClass("sentiment-negative");
  });

  it("shows error when first page fetch fails", async () => {
    vi.mocked(getReviews).mockRejectedValue(new Error("Network error"));

    render(<ReviewContainer />);

    expect(await screen.findByText("Network error")).toBeInTheDocument();
  });

  it("shows empty state when first page has no items", async () => {
    vi.mocked(getReviews).mockResolvedValue({
      items: [],
      nextCursor: null,
      hasMore: false,
    });

    render(<ReviewContainer />);

    expect(await screen.findByText(/No reviews yet/)).toBeInTheDocument();
  });
});
