import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SentimentService } from '../sentiment/sentiment.service';
import { getLimit } from './dto/reviews-query.dto';
import { CURSOR_SEPARATOR } from './constants';

export interface ReviewItem {
  id: string;
  text: string;
  sentiment: string;
  confidence: number;
  scores: { positive: number; negative: number; neutral: number };
  createdAt: string;
}

export interface PaginatedReviewsResult {
  items: ReviewItem[];
  nextCursor: string | null;
  hasMore: boolean;
}

/** Parse cursor "createdAt::id" into { createdAt, id }. Returns null if invalid. */
function parseCursor(cursor: string): { createdAt: Date; id: string } | null {
  const idx = cursor.indexOf(CURSOR_SEPARATOR);
  if (idx === -1) return null;
  const createdAtStr = cursor.slice(0, idx);
  const id = cursor.slice(idx + CURSOR_SEPARATOR.length);
  const createdAt = new Date(createdAtStr);
  if (Number.isNaN(createdAt.getTime()) || !id) return null;
  return { createdAt, id };
}

/** Build cursor from last item for next page. */
function buildCursor(createdAt: Date, id: string): string {
  return `${createdAt.toISOString()}${CURSOR_SEPARATOR}${id}`;
}

@Injectable()
export class ReviewsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly sentimentService: SentimentService,
  ) {}

  async analyze(text: string) {
    const result = this.sentimentService.analyze(text);

    const review = await this.prisma.review.create({
      data: {
        text,
        sentiment: result.sentiment,
        confidence: result.confidence,
        positive: result.scores.positive,
        negative: result.scores.negative,
        neutral: result.scores.neutral,
      },
    });

    return {
      id: review.id,
      text: review.text,
      sentiment: review.sentiment,
      confidence: review.confidence,
      scores: {
        positive: review.positive,
        negative: review.negative,
        neutral: review.neutral,
      },
      createdAt: review.createdAt.toISOString(),
    };
  }

  async findPage(cursor: string | undefined, limit: number): Promise<PaginatedReviewsResult> {
    const pageSize = getLimit(limit);
    const take = pageSize + 1;
    const orderBy = [{ createdAt: 'desc' as const }, { id: 'desc' as const }];

    const parsed = cursor?.trim() ? parseCursor(cursor) : null;
    const where =
      parsed != null
        ? {
            OR: [
              { createdAt: { lt: parsed.createdAt } },
              { createdAt: parsed.createdAt, id: { lt: parsed.id } },
            ],
          }
        : undefined;

    const rows = await this.prisma.review.findMany({
      where,
      orderBy,
      take,
    });

    const hasMore = rows.length > pageSize;
    const items = (hasMore ? rows.slice(0, pageSize) : rows).map((r) => ({
      id: r.id,
      text: r.text,
      sentiment: r.sentiment,
      confidence: r.confidence,
      scores: {
        positive: r.positive,
        negative: r.negative,
        neutral: r.neutral,
      },
      createdAt: r.createdAt.toISOString(),
    }));

    const last = hasMore ? rows[pageSize - 1] : rows[rows.length - 1];
    const nextCursor =
      last != null && hasMore ? buildCursor(last.createdAt, last.id) : null;

    return { items, nextCursor, hasMore };
  }
}
