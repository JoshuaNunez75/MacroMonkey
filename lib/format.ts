export function formatGrams(value: number) {
  return String(Math.round(value * 10) / 10);
}