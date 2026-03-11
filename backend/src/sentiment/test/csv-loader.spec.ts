import * as path from 'path';
import { loadCsv } from '../utils/csv-loader';

describe('CSV Loader', () => {
  const csvPath = path.resolve(__dirname, '..', '..', '..', 'datasets', 'data.csv');

  it('should load rows from datasets/data.csv', () => {
    const rows = loadCsv(csvPath, 100);
    expect(rows.length).toBeGreaterThan(0);
    expect(rows.length).toBeLessThanOrEqual(100);
  });

  it('should parse the review column as text', () => {
    const rows = loadCsv(csvPath, 10);
    for (const row of rows) {
      expect(row.text).toBeTruthy();
      expect(typeof row.text).toBe('string');
      expect(row.text.length).toBeGreaterThan(0);
    }
  });

  it('should parse sentiment as positive/negative/neutral', () => {
    const rows = loadCsv(csvPath, 100);
    for (const row of rows) {
      expect(['positive', 'negative', 'neutral']).toContain(row.sentiment);
    }
  });

  it('should handle quoted CSV fields with commas inside', () => {
    const rows = loadCsv(csvPath, 5000);
    const withCommas = rows.filter((r) => r.text.includes(','));
    expect(withCommas.length).toBeGreaterThan(0);
  });

  it('should respect maxRows limit', () => {
    const rows = loadCsv(csvPath, 10);
    expect(rows).toHaveLength(10);
  });

  it('should load up to 5000 rows by default config', () => {
    const rows = loadCsv(csvPath, 5000);
    expect(rows.length).toBe(5000);
  });

  it('should return empty array for non-existent file', () => {
    const rows = loadCsv('/non/existent/path.csv', 100);
    expect(rows).toEqual([]);
  });
});
