import { Test, TestingModule } from '@nestjs/testing';
import { ReviewsService } from '../reviews.service';
import { PrismaService } from '../../prisma/prisma.service';
import { SentimentService } from '../../sentiment/sentiment.service';

describe('ReviewsService', () => {
  let service: ReviewsService;

  const mockPrisma = {
    review: {
      create: jest.fn(),
      findMany: jest.fn(),
    },
  };

  const mockSentimentService = {
    analyze: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReviewsService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: SentimentService, useValue: mockSentimentService },
      ],
    }).compile();

    service = module.get<ReviewsService>(ReviewsService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should call sentimentService.analyze and persist result', async () => {
    mockSentimentService.analyze.mockReturnValue({
      sentiment: 'POSITIVE',
      confidence: 0.95,
      scores: { positive: 0.95, negative: 0.03, neutral: 0.02 },
    });
    mockPrisma.review.create.mockResolvedValue({
      id: 'abc',
      text: 'Great product!',
      sentiment: 'POSITIVE',
      confidence: 0.95,
      positive: 0.95,
      negative: 0.03,
      neutral: 0.02,
      createdAt: new Date('2026-01-01'),
      updatedAt: new Date('2026-01-01'),
    });

    const result = await service.analyze('Great product!');

    expect(mockSentimentService.analyze).toHaveBeenCalledWith('Great product!');
    expect(mockPrisma.review.create).toHaveBeenCalled();
    expect(result.sentiment).toBe('POSITIVE');
    expect(result.id).toBe('abc');
  });

  it('should return all reviews ordered by createdAt desc', async () => {
    const mockReview = {
      id: 'r1',
      text: 'Good',
      sentiment: 'POSITIVE',
      confidence: 0.9,
      positive: 0.9,
      negative: 0.05,
      neutral: 0.05,
      createdAt: new Date('2026-01-01'),
      updatedAt: new Date('2026-01-01'),
    };
    mockPrisma.review.findMany.mockResolvedValue([mockReview]);

    const result = await service.findAll();

    expect(mockPrisma.review.findMany).toHaveBeenCalledWith({
      orderBy: { createdAt: 'desc' },
    });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('r1');
  });

  it('should map sentiment scores to review fields', async () => {
    const scores = { positive: 0.8, negative: 0.1, neutral: 0.1 };
    mockSentimentService.analyze.mockReturnValue({
      sentiment: 'POSITIVE',
      confidence: 0.8,
      scores,
    });
    mockPrisma.review.create.mockResolvedValue({
      id: 'x',
      text: 'Good',
      sentiment: 'POSITIVE',
      confidence: 0.8,
      positive: 0.8,
      negative: 0.1,
      neutral: 0.1,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await service.analyze('Good');

    expect(mockPrisma.review.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        positive: 0.8,
        negative: 0.1,
        neutral: 0.1,
      }),
    });
  });
});
