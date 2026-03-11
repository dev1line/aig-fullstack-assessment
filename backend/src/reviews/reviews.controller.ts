import { Controller, Post, Get, Body, UseGuards } from '@nestjs/common';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { ReviewsService } from './reviews.service';
import { AnalyzeDto } from './dto/analyze.dto';

@Controller()
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Post('analyze')
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  async analyze(@Body() dto: AnalyzeDto) {
    return this.reviewsService.analyze(dto.text);
  }

  @Get('reviews')
  async findAll() {
    return this.reviewsService.findAll();
  }
}
