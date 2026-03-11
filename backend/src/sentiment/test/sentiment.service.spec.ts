import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { SentimentService } from '../sentiment.service';
import sentimentConfig from '../../config/sentiment.config';

describe('SentimentService', () => {
  let service: SentimentService;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          load: [sentimentConfig],
        }),
      ],
      providers: [SentimentService],
    }).compile();

    service = module.get<SentimentService>(SentimentService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should return POSITIVE with confidence > 0.8 for positive text', () => {
    const result = service.analyze(
      'Amazing pizza! Great service and fast delivery. Highly recommend!',
    );
    expect(result.sentiment).toBe('POSITIVE');
    expect(result.confidence).toBeGreaterThan(0.8);
  });

  it('should return NEGATIVE with confidence > 0.7 for negative text', () => {
    const result = service.analyze(
      'Terrible coffee, rude staff, and overpriced. Never going back.',
    );
    expect(result.sentiment).toBe('NEGATIVE');
    expect(result.confidence).toBeGreaterThan(0.7);
  });

  it('should return NEUTRAL with confidence > 0.6 for neutral text', () => {
    const result = service.analyze(
      'Food was okay, nothing special. Service was average.',
    );
    expect(result.sentiment).toBe('NEUTRAL');
    expect(result.confidence).toBeGreaterThan(0.6);
  });

  it('should return scores that sum to approximately 1', () => {
    const result = service.analyze('Good product');
    const sum =
      result.scores.positive + result.scores.negative + result.scores.neutral;
    expect(Math.abs(sum - 1)).toBeLessThan(0.01);
  });

  it('should return NEUTRAL for empty string', () => {
    const result = service.analyze('');
    expect(result.sentiment).toBe('NEUTRAL');
    expect(result.confidence).toBe(0.5);
  });

  it('should return valid result for unknown text', () => {
    const result = service.analyze('Random text about something.');
    expect(['POSITIVE', 'NEGATIVE', 'NEUTRAL']).toContain(result.sentiment);
    expect(result.confidence).toBeGreaterThanOrEqual(0);
    expect(result.confidence).toBeLessThanOrEqual(1);
  });

  it('should return at least 3 knowledge cases', () => {
    const cases = service.getKnowledgeCases();
    expect(cases.length).toBeGreaterThanOrEqual(3);
    expect(cases[0]).toHaveProperty('input');
    expect(cases[0]).toHaveProperty('expectedSentiment');
  });

  it('should meet minConfidence for each knowledge case', () => {
    const cases = service.getKnowledgeCases();
    for (const tc of cases) {
      const result = service.analyze(tc.input);
      expect(result.sentiment).toBe(tc.expectedSentiment);
      expect(result.confidence).toBeGreaterThan(tc.minConfidence);
    }
  });

  it('should enforce knowledgeMinConfidenceFloor for matched cases', () => {
    const result = service.analyze(
      'Amazing pizza! Great service and fast delivery. Highly recommend!',
    );
    expect(result.confidence).toBeGreaterThanOrEqual(0.85);
  });

  it('should have loaded CSV training data (> 0 rows)', () => {
    const count = service.getCsvTrainingRowCount();
    expect(count).toBeGreaterThan(0);
  });

  it('should correctly classify novel positive text (not in knowledge cases)', () => {
    const result = service.analyze('This product is wonderful and I love it so much');
    expect(result.sentiment).toBe('POSITIVE');
  });

  it('should correctly classify novel negative text (not in knowledge cases)', () => {
    const result = service.analyze('Horrible experience, worst purchase ever, total garbage');
    expect(result.sentiment).toBe('NEGATIVE');
  });
});
