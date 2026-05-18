/** Collapse line breaks and repeated whitespace into a single-line search string. */
export function normalizeTitleText(text: string): string {
  return text
    .replace(/\s*[\r\n]+\s*/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}
