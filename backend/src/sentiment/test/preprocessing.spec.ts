import {
  tokenize,
  removeStopwords,
  generateNgrams,
  preprocess,
} from '../utils/sentiment-preprocess';

describe('Sentiment Preprocessing', () => {
  describe('tokenize', () => {
    it('should tokenize text into lowercase words', () => {
      const tokens = tokenize('Amazing Pizza! Great Service.');
      expect(tokens).toEqual(['amazing', 'pizza', 'great', 'service']);
    });

    it('should return empty array for empty string', () => {
      expect(tokenize('')).toEqual([]);
    });
  });

  describe('removeStopwords', () => {
    it('should remove stopwords from token array', () => {
      const tokens = ['the', 'food', 'is', 'great', 'and', 'fresh'];
      const filtered = removeStopwords(tokens);
      expect(filtered).toEqual(['food', 'great', 'fresh']);
      expect(filtered).not.toContain('the');
      expect(filtered).not.toContain('is');
      expect(filtered).not.toContain('and');
    });
  });

  describe('generateNgrams', () => {
    it('should generate unigrams from tokens', () => {
      const tokens = ['great', 'food'];
      const ngrams = generateNgrams(tokens, 1);
      expect(ngrams).toEqual(['great', 'food']);
    });

    it('should generate unigrams + bigrams', () => {
      const tokens = ['great', 'food', 'fast'];
      const ngrams = generateNgrams(tokens, 2);
      expect(ngrams).toContain('great');
      expect(ngrams).toContain('food');
      expect(ngrams).toContain('fast');
      expect(ngrams).toContain('great_food');
      expect(ngrams).toContain('food_fast');
    });

    it('should generate unigrams + bigrams + trigrams when size=3', () => {
      const tokens = ['great', 'food', 'fast', 'delivery'];
      const ngrams = generateNgrams(tokens, 3);
      expect(ngrams).toContain('great_food_fast');
      expect(ngrams).toContain('food_fast_delivery');
    });
  });

  describe('preprocess', () => {
    it('should preprocess text: tokenize, remove stopwords, generate N-grams', () => {
      const result = preprocess('The food is great and fresh', 2);
      expect(result).toContain('food');
      expect(result).toContain('great');
      expect(result).toContain('fresh');
      expect(result).toContain('food_great');
      expect(result).not.toContain('the');
      expect(result).not.toContain('is');
    });

    it('should return empty array for empty string', () => {
      expect(preprocess('', 2)).toEqual([]);
    });
  });
});
