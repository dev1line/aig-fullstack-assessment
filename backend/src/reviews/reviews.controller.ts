import { Controller, Post, Get, Body, Query, UseGuards } from '@nestjs/common';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { ReviewsService } from './reviews.service';
import { AnalyzeDto } from './dto/analyze.dto';
import { ReviewsQueryDto, getLimit } from './dto/reviews-query.dto';

@Controller()
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Post('analyze')
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  async analyze(@Body() dto: AnalyzeDto) {
    return this.reviewsService.analyze(dto.text);
  }

  /** GET /reviews?limit=10&cursor=... — cursor optional (first page when omitted), limit optional (default 10). */
  @Get('reviews')
  async getReviews(@Query() query: ReviewsQueryDto) {
    const limit = getLimit(query.limit);
    return this.reviewsService.findPage(query.cursor, limit);
  }
}
