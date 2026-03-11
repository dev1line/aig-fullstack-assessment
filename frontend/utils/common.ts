export function formatConfidence(confidence: number): string {
  return `${Math.round(confidence * 100)}%`;
}

export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleString();
}
