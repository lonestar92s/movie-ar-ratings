export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

const HIT_PADDING = 12;

function distanceToRect(rect: Rect, x: number, y: number): number {
  const dx = x < rect.x ? rect.x - x : x > rect.x + rect.width ? x - (rect.x + rect.width) : 0;
  const dy = y < rect.y ? rect.y - y : y > rect.y + rect.height ? y - (rect.y + rect.height) : 0;
  return Math.hypot(dx, dy);
}

function containsPoint(rect: Rect, x: number, y: number, padding: number): boolean {
  return (
    x >= rect.x - padding &&
    x <= rect.x + rect.width + padding &&
    y >= rect.y - padding &&
    y <= rect.y + rect.height + padding
  );
}

/** Pick the OCR block at the tap, or the nearest block within a distance budget. */
export function pickBlockAtTap<T extends Rect>(
  blocks: T[],
  tapX: number,
  tapY: number,
  imageWidth: number,
  imageHeight: number,
): T | null {
  if (blocks.length === 0) return null;

  const maxDistance = Math.min(imageWidth, imageHeight) * 0.12;
  const hits = blocks.filter(block => containsPoint(block, tapX, tapY, HIT_PADDING));

  if (hits.length > 0) {
    return hits.sort((a, b) => a.width * a.height - b.width * b.height)[0];
  }

  let best: T | null = null;
  let bestDistance = maxDistance;

  for (const block of blocks) {
    const distance = distanceToRect(block, tapX, tapY);
    if (distance < bestDistance) {
      bestDistance = distance;
      best = block;
    }
  }

  return best;
}
