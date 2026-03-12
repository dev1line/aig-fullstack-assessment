import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Reviews API (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true }),
    );
    await app.init();

    prisma = app.get<PrismaService>(PrismaService);
  }, 120_000);

  beforeEach(async () => {
    await prisma.review.deleteMany({});
  });

  afterAll(async () => {
    if (prisma) await prisma.review.deleteMany({});
    if (app) await app.close();
  });

  describe('POST /analyze', () => {
    it('should analyze positive review', async () => {
      const { body } = await request(app.getHttpServer())
        .post('/analyze')
        .send({
          text: 'Amazing pizza! Great service and fast delivery. Highly recommend!',
        })
        .expect(201);

      expect(body.sentiment).toBe('POSITIVE');
      expect(body.confidence).toBeGreaterThan(0.8);
      expect(body.scores).toHaveProperty('positive');
      expect(body.scores).toHaveProperty('negative');
      expect(body.scores).toHaveProperty('neutral');
      expect(body.id).toBeDefined();
    });

    it('should analyze negative review', async () => {
      const { body } = await request(app.getHttpServer())
        .post('/analyze')
        .send({
          text: 'Terrible coffee, rude staff, and overpriced. Never going back.',
        })
        .expect(201);

      expect(body.sentiment).toBe('NEGATIVE');
      expect(body.confidence).toBeGreaterThan(0.7);
    });

    it('should analyze neutral review', async () => {
      const { body } = await request(app.getHttpServer())
        .post('/analyze')
        .send({
          text: 'Food was okay, nothing special. Service was average.',
        })
        .expect(201);

      expect(body.sentiment).toBe('NEUTRAL');
      expect(body.confidence).toBeGreaterThan(0.6);
    });

    it('should return valid output shape', async () => {
      const { body } = await request(app.getHttpServer())
        .post('/analyze')
        .send({ text: 'Good product.' })
        .expect(201);

      expect(['POSITIVE', 'NEGATIVE', 'NEUTRAL']).toContain(body.sentiment);
      expect(typeof body.confidence).toBe('number');
      expect(body.confidence).toBeGreaterThanOrEqual(0);
      expect(body.confidence).toBeLessThanOrEqual(1);
      expect(body.scores.positive).toBeGreaterThanOrEqual(0);
      expect(typeof body.id).toBe('string');
      expect(typeof body.createdAt).toBe('string');
    });

    it('should reject empty text', async () => {
      await request(app.getHttpServer())
        .post('/analyze')
        .send({ text: '' })
        .expect(400);
    });

    it('should reject text over 500 chars', async () => {
      await request(app.getHttpServer())
        .post('/analyze')
        .send({ text: 'a'.repeat(501) })
        .expect(400);
    });

    it('should reject missing body', async () => {
      await request(app.getHttpServer())
        .post('/analyze')
        .send(undefined)
        .expect(400);
    });

    it('should reject null text', async () => {
      await request(app.getHttpServer())
        .post('/analyze')
        .send({ text: null })
        .expect(400);
    });

    it('should reject text as number', async () => {
      await request(app.getHttpServer())
        .post('/analyze')
        .send({ text: 123 })
        .expect(400);
    });

    it('should reject text as array', async () => {
      await request(app.getHttpServer())
        .post('/analyze')
        .send({ text: ['hello'] })
        .expect(400);
    });

    it('should reject whitespace-only text', async () => {
      await request(app.getHttpServer())
        .post('/analyze')
        .send({ text: '   \n\t  ' })
        .expect(400);
    });

    it('should return 429 when analyze rate limit is exceeded', async () => {
      const originalNodeEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      try {
        for (let attempt = 0; attempt < 10; attempt += 1) {
          await request(app.getHttpServer())
            .post('/analyze')
            .send({ text: `Rate limit check ${attempt}` })
            .expect(201);
        }

        await request(app.getHttpServer())
          .post('/analyze')
          .send({ text: 'Rate limit should block this request' })
          .expect(429);
      } finally {
        process.env.NODE_ENV = originalNodeEnv;
      }
    });
  });

  describe('GET /reviews', () => {
    it('should return paginated shape with empty items initially', async () => {
      const { body } = await request(app.getHttpServer())
        .get('/reviews')
        .expect(200);

      expect(body).toHaveProperty('items');
      expect(body).toHaveProperty('nextCursor');
      expect(body).toHaveProperty('hasMore');
      expect(Array.isArray(body.items)).toBe(true);
      expect(body.items).toHaveLength(0);
      expect(body.hasMore).toBe(false);
      expect(body.nextCursor).toBeNull();
    });

    it('should return each review with valid shape in items', async () => {
      await request(app.getHttpServer())
        .post('/analyze')
        .send({ text: 'Great food!' })
        .expect(201);

      const { body } = await request(app.getHttpServer())
        .get('/reviews')
        .expect(200);

      expect(body.items).toHaveLength(1);
      const review = body.items[0];
      expect(typeof review.id).toBe('string');
      expect(review.text).toBe('Great food!');
      expect(['POSITIVE', 'NEGATIVE', 'NEUTRAL']).toContain(review.sentiment);
      expect(typeof review.confidence).toBe('number');
      expect(review.scores).toEqual(
        expect.objectContaining({
          positive: expect.any(Number),
          negative: expect.any(Number),
          neutral: expect.any(Number),
        }),
      );
      expect(typeof review.createdAt).toBe('string');
    });

    it('should persist review and return it (round-trip)', async () => {
      const text = 'Round-trip test review.';
      const { body: created } = await request(app.getHttpServer())
        .post('/analyze')
        .send({ text })
        .expect(201);

      const { body: list } = await request(app.getHttpServer())
        .get('/reviews')
        .expect(200);

      expect(list.items).toHaveLength(1);
      expect(list.items[0].id).toBe(created.id);
      expect(list.items[0].text).toBe(text);
    });

    it('should return reviews in descending createdAt order', async () => {
      await request(app.getHttpServer())
        .post('/analyze')
        .send({ text: 'First' })
        .expect(201);

      await new Promise((r) => setTimeout(r, 50));

      await request(app.getHttpServer())
        .post('/analyze')
        .send({ text: 'Second' })
        .expect(201);

      const { body } = await request(app.getHttpServer())
        .get('/reviews')
        .expect(200);

      expect(body.items).toHaveLength(2);
      expect(body.items[0].text).toBe('Second');
      expect(body.items[1].text).toBe('First');
    });

    it('should support cursor and limit query params', async () => {
      await request(app.getHttpServer())
        .post('/analyze')
        .send({ text: 'One review for limit test' })
        .expect(201);

      const { body: first } = await request(app.getHttpServer())
        .get('/reviews')
        .query({ limit: 1 })
        .expect(200);

      expect(first.items).toHaveLength(1);
      expect(first.hasMore).toBe(false);
      expect(first.nextCursor).toBeNull();
    });

    it('should return 404 for POST /reviews', async () => {
      await request(app.getHttpServer())
        .post('/reviews')
        .send({})
        .expect(404);
    });
  });

  describe('GET /health', () => {
    it('should return ok', async () => {
      const { body } = await request(app.getHttpServer())
        .get('/health')
        .expect(200);

      expect(body.status).toBe('ok');
    });
  });
});
