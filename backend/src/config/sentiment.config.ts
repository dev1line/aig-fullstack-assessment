import { registerAs } from '@nestjs/config';

export default registerAs('sentiment', () => ({
  ngramSize: parseInt(process.env.SENTIMENT_NGRAM_SIZE || '2', 10),
  maxCsvTrainingRows: parseInt(
    process.env.SENTIMENT_MAX_CSV_TRAINING_ROWS || '5000',
    10,
  ),
  confidenceBoost: parseFloat(
    process.env.SENTIMENT_CONFIDENCE_BOOST || '1.2',
  ),
  emptyInputConfidence: parseFloat(
    process.env.SENTIMENT_EMPTY_INPUT_CONFIDENCE || '0.5',
  ),
  knowledgeMinConfidenceFloor: parseFloat(
    process.env.SENTIMENT_KNOWLEDGE_MIN_CONFIDENCE_FLOOR || '0.85',
  ),
}));
