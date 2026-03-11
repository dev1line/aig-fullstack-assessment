import * as fs from 'fs';
import * as path from 'path';

export interface CsvRow {
  text: string;
  sentiment: string;
}

function parseCsvLine(line: string): string[] {
  const fields: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === ',' && !inQuotes) {
      fields.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  fields.push(current.trim());
  return fields;
}

const TEXT_COLUMN_NAMES = ['text', 'review', 'content', 'comment'];

export function loadCsv(filePath: string, maxRows: number): CsvRow[] {
  const absolutePath = path.isAbsolute(filePath)
    ? filePath
    : path.resolve(__dirname, '..', '..', '..', filePath);

  if (!fs.existsSync(absolutePath)) {
    return [];
  }

  const content = fs.readFileSync(absolutePath, 'utf-8');
  const lines = content.split('\n').filter((l) => l.trim());

  if (lines.length < 2) return [];

  const headerFields = parseCsvLine(lines[0]).map((h) => h.toLowerCase());
  const textIdx = headerFields.findIndex((h) => TEXT_COLUMN_NAMES.includes(h));
  const sentIdx = headerFields.findIndex((h) => h === 'sentiment');

  if (textIdx === -1 || sentIdx === -1) return [];

  const rows: CsvRow[] = [];
  for (let i = 1; i < lines.length && rows.length < maxRows; i++) {
    const cols = parseCsvLine(lines[i]);
    const text = cols[textIdx];
    const sentiment = cols[sentIdx]?.toLowerCase();
    if (text && sentiment && ['positive', 'negative', 'neutral'].includes(sentiment)) {
      rows.push({ text, sentiment });
    }
  }
  return rows;
}
