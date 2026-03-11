import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { PrismaModule } from './prisma/prisma.module';
import { HealthModule } from './health/health.module';
import { ReviewsModule } from './reviews/reviews.module';
import { SentimentModule } from './sentiment/sentiment.module';
import sentimentConfig from './config/sentiment.config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [sentimentConfig],
    }),
    ThrottlerModule.forRoot([
      {
        ttl: 60_000,
        limit: 100,
        // Keep throttling disabled for most automated tests.
        skipIf: () => process.env.NODE_ENV === 'test',
      },
    ]),
    PrismaModule,
    HealthModule,
    SentimentModule,
    ReviewsModule,
  ],
})
export class AppModule {}
