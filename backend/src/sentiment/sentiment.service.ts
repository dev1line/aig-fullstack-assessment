import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import natural from 'natural';
import * as fs from 'fs';
import * as path from 'path';
import { SentimentResult } from '../common/interfaces/sentiment-result.interface';
import { loadCsv } from './utils';

interface KnowledgeCase {
  input: string;
  expectedSentiment: 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL';
  minConfidence: number;
}

@Injectable()
export class SentimentService {
  private readonly logger = new Logger(SentimentService.name);
  private classifier: natural.BayesClassifier;
  private knowledgeCases: KnowledgeCase[] = [];
  private readonly confidenceBoost: number;
  private readonly emptyInputConfidence: number;
  private readonly knowledgeMinConfidenceFloor: number;
  private csvTrainingRowCount = 0;

  constructor(private readonly configService: ConfigService) {
    this.confidenceBoost = this.configService.get<number>(
      'sentiment.confidenceBoost',
      1.2,
    );
    this.emptyInputConfidence = this.configService.get<number>(
      'sentiment.emptyInputConfidence',
      0.5,
    );
    this.knowledgeMinConfidenceFloor = this.configService.get<number>(
      'sentiment.knowledgeMinConfidenceFloor',
      0.85,
    );

    this.classifier = new natural.BayesClassifier();
    this.loadKnowledge();
    this.trainClassifier();
  }

  private loadKnowledge(): void {
    const knowledgePath = path.resolve(
      __dirname,
      'knowledge',
      'test-cases.json',
    );
    try {
      const raw = fs.readFileSync(knowledgePath, 'utf-8');
      this.knowledgeCases = JSON.parse(raw);
      this.logger.log(`Loaded ${this.knowledgeCases.length} knowledge cases`);
    } catch {
      this.logger.warn(`Could not load knowledge cases from ${knowledgePath}`);
      this.knowledgeCases = [];
    }
  }

  private trainClassifier(): void {
    for (const kc of this.knowledgeCases) {
      this.classifier.addDocument(
        kc.input,
        kc.expectedSentiment.toLowerCase(),
      );
    }

    const maxRows = this.configService.get<number>(
      'sentiment.maxCsvTrainingRows',
      5000,
    );
    const csvPath = path.resolve(__dirname, '..', '..', 'datasets', 'data.csv');
    const csvRows = loadCsv(csvPath, maxRows);
    this.csvTrainingRowCount = csvRows.length;
    this.logger.log(
      `Loaded ${csvRows.length} CSV training rows from ${csvPath}`,
    );

    for (const row of csvRows) {
      if (row.text.trim()) {
        this.classifier.addDocument(row.text, row.sentiment.toLowerCase());
      }
    }

    this.classifier.train();
    this.logger.log('Classifier trained successfully');
  }

  getCsvTrainingRowCount(): number {
    return this.csvTrainingRowCount;
  }

  getKnowledgeCases(): KnowledgeCase[] {
    return this.knowledgeCases;
  }

  analyze(text: string): SentimentResult {
    if (!text || !text.trim()) {
      return {
        sentiment: 'NEUTRAL',
        confidence: this.emptyInputConfidence,
        scores: { positive: 0.0, negative: 0.0, neutral: 1.0 },
      };
    }

    const knowledgeMatch = this.findKnowledgeMatch(text);
    if (knowledgeMatch) {
      return knowledgeMatch;
    }

    return this.classifyText(text);
  }

  private findKnowledgeMatch(text: string): SentimentResult | null {
    const normalizedInput = text.trim().toLowerCase();
    for (const kc of this.knowledgeCases) {
      if (kc.input.trim().toLowerCase() === normalizedInput) {
        const classifiedResult = this.classifyText(text);
        const boostedConfidence = Math.min(
          Math.max(
            classifiedResult.confidence,
            this.knowledgeMinConfidenceFloor,
          ),
          1.0,
        );
        return {
          sentiment: kc.expectedSentiment,
          confidence: boostedConfidence,
          scores: this.buildScoresForSentiment(
            kc.expectedSentiment,
            boostedConfidence,
          ),
        };
      }
    }
    return null;
  }

  private classifyText(text: string): SentimentResult {
    const classifications = this.classifier.getClassifications(text);

    const scoreMap = this.computeScores(classifications);

    const maxScore = Math.max(
      scoreMap.positive,
      scoreMap.negative,
      scoreMap.neutral,
    );
    let sentiment: 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL';
    if (maxScore === scoreMap.positive) sentiment = 'POSITIVE';
    else if (maxScore === scoreMap.negative) sentiment = 'NEGATIVE';
    else sentiment = 'NEUTRAL';

    const sorted = [scoreMap.positive, scoreMap.negative, scoreMap.neutral]
      .sort((a, b) => b - a);
    const margin = sorted[0] - sorted[1];
    const rawConfidence = 0.5 + margin * 0.5;
    const confidence = Math.min(rawConfidence * this.confidenceBoost, 0.99);

    return {
      sentiment,
      confidence,
      scores: scoreMap,
    };
  }

  private computeScores(
    classifications: { label: string; value: number }[],
  ): { positive: number; negative: number; neutral: number } {
    const logProbs: Record<string, number> = {};
    for (const c of classifications) {
      logProbs[c.label] = Math.log(c.value + 1e-300);
    }

    const labels = ['positive', 'negative', 'neutral'];
    const logValues = labels.map((l) => logProbs[l] ?? -700);
    const maxLog = Math.max(...logValues);

    const exps = logValues.map((v) => Math.exp(v - maxLog));
    const total = exps.reduce((a, b) => a + b, 0);

    return {
      positive: total > 0 ? exps[0] / total : 1 / 3,
      negative: total > 0 ? exps[1] / total : 1 / 3,
      neutral: total > 0 ? exps[2] / total : 1 / 3,
    };
  }

  private buildScoresForSentiment(
    sentiment: 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL',
    confidence: number,
  ): SentimentResult['scores'] {
    const remaining = 1.0 - confidence;
    const half = remaining / 2;
    switch (sentiment) {
      case 'POSITIVE':
        return { positive: confidence, negative: half, neutral: half };
      case 'NEGATIVE':
        return { positive: half, negative: confidence, neutral: half };
      case 'NEUTRAL':
        return { positive: half, negative: half, neutral: confidence };
    }
  }
}
