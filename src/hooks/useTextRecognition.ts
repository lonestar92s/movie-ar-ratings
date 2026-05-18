import { useState, useCallback } from 'react';
import TextRecognition, { TextBlock } from '@react-native-ml-kit/text-recognition';
import { DetectedTitle } from '../types';
import { normalizeTitleText } from '../utils/titleText';
import { pickBlockAtTap } from '../utils/tapTarget';

interface ParsedBlock {
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

function blockText(block: TextBlock): string {
  const raw =
    block.lines.length > 0
      ? block.lines.map(line => line.text).join(' ')
      : block.text;
  return normalizeTitleText(raw);
}

function parseBlock(block: TextBlock): ParsedBlock {
  return {
    text: blockText(block),
    x: block.frame?.left ?? 0,
    y: block.frame?.top ?? 0,
    width: block.frame?.width ?? 0,
    height: block.frame?.height ?? 0,
  };
}

function horizontalOverlap(a: ParsedBlock, b: ParsedBlock): number {
  const overlap = Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x);
  if (overlap <= 0) return 0;
  return overlap / Math.min(a.width, b.width);
}

/** Merge poster titles split across vertically stacked OCR blocks. */
function mergeStackedBlocks(blocks: ParsedBlock[]): ParsedBlock[] {
  const sorted = [...blocks].sort((a, b) => a.y - b.y);
  const merged: ParsedBlock[] = [];

  for (const block of sorted) {
    const prev = merged[merged.length - 1];
    if (prev) {
      const gap = block.y - (prev.y + prev.height);
      const maxGap = Math.max(prev.height, block.height) * 0.6;
      if (gap >= -2 && gap <= maxGap && horizontalOverlap(prev, block) >= 0.3) {
        const right = Math.max(prev.x + prev.width, block.x + block.width);
        const bottom = Math.max(prev.y + prev.height, block.y + block.height);
        prev.x = Math.min(prev.x, block.x);
        prev.y = Math.min(prev.y, block.y);
        prev.width = right - prev.x;
        prev.height = bottom - prev.y;
        prev.text = normalizeTitleText(`${prev.text} ${block.text}`);
        continue;
      }
    }
    merged.push({ ...block });
  }

  return merged;
}

// Streaming UIs use short, capitalized title text — these filters keep noise out
function isLikelyTitle(text: string): boolean {
  if (text.length < 2 || text.length > 80) return false;
  if (/^\d+$/.test(text)) return false;
  if (/^\d{1,2}:\d{2}/.test(text)) return false;
  return true;
}

export interface TapPoint {
  x: number;
  y: number;
  imageWidth: number;
  imageHeight: number;
}

function toDetectedTitle(block: ParsedBlock): DetectedTitle {
  return {
    text: block.text,
    bounds: {
      x: block.x,
      y: block.y,
      width: block.width,
      height: block.height,
    },
  };
}

export function useTextRecognition() {
  const [titles, setTitles] = useState<DetectedTitle[]>([]);
  const [processing, setProcessing] = useState(false);

  const recognizeFromUri = useCallback(
    async (imageUri: string, tap?: TapPoint): Promise<DetectedTitle[]> => {
      setProcessing(true);
      try {
        const result = await TextRecognition.recognize(imageUri);

        const parsed = result.blocks
          .map(parseBlock)
          .filter(block => isLikelyTitle(block.text));

        const merged = mergeStackedBlocks(parsed);

        if (!tap) {
          const detected = merged.map(toDetectedTitle);
          setTitles(detected);
          return detected;
        }

        const picked = pickBlockAtTap(merged, tap.x, tap.y, tap.imageWidth, tap.imageHeight);
        const detected = picked ? [toDetectedTitle(picked)] : [];
        setTitles(detected);
        return detected;
      } finally {
        setProcessing(false);
      }
    },
    [],
  );

  const clear = useCallback(() => setTitles([]), []);

  return { titles, processing, recognizeFromUri, clear };
}
