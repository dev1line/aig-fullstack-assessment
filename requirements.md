# Customer Review Sentiment Analyzer - Fullstack Assessment

Create a customer review sentiment analysis service using Typescript (and/or Python) for sentiment analysis AI integration. Focus on API design, database modeling, and AI service consumption for business review classification.

## Requirements

### Core Features

**1. Backend API**

- `POST /analyze` - Submit customer review for sentiment analysis
- `GET /reviews` - Get analyzed reviews.

**2. Frontend Interface (Next.js)**

- Review submission form with review text (max 500 chars)
- Display sentiment results (Positive/Negative/Neutral + confidence score)

### Sentiment Analysis Specification

**Input**: Customer review text (string)

**Output**:

```typescript
interface SentimentResult {
  sentiment: "POSITIVE" | "NEGATIVE" | "NEUTRAL";
  confidence: number; // 0.0 to 1.0
  scores: {
    positive: number;
    negative: number;
    neutral: number;
  };
}
```

### Suggested Technology Stack

- **Frontend**: Next.js 14+ with TypeScript
- **Backend**: NestJS/FastAPI
- **Database**: SQLite with Prisma ORM
- **Testing**: Jest/Vitest for API tests (Optional: Playwright for E2E)

### Testing Requirements

**Backend Tests (Jest/Vitest)**:

- POST `/analyze` endpoint with valid/invalid inputs/outputs
- GET `/reviews` endpoint with valid/invalid inputs/outputs
- Database operations and data validation
- Error handling for service failures

**Minimum Coverage**: 80% for backend logic

## Sentiment Analysis Test Cases

### Test Case 1: Positive Review

**Input:** "Amazing pizza! Great service and fast delivery. Highly recommend!"

**Expected:** Sentiment: "POSITIVE", Confidence: >0.8.

### Test Case 2: Negative Review

**Input:** "Terrible coffee, rude staff, and overpriced. Never going back."

**Expected:** Sentiment: "NEGATIVE", Confidence: >0.7.

### Test Case 3: Neutral Review

**Input:** "Restaurant ABC", Review: "Food was okay, nothing special. Service was average."

**Expected:** Sentiment: "NEUTRAL", Confidence: >0.6.

Notes: Feel free to add more test cases.

---
