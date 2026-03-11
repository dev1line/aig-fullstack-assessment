import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SentimentService } from '../sentiment/sentiment.service';

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

  async findAll() {
    const reviews = await this.prisma.review.findMany({
      orderBy: { createdAt: 'desc' },
    });

    return reviews.map((r) => ({
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
  }
}
