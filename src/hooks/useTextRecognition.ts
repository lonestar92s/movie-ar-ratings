import { useState, useCallback } from 'react';
import TextRecognition from '@react-native-ml-kit/text-recognition';
import { DetectedTitle } from '../types';

// Streaming UIs use short, capitalized title text — these filters keep noise out
function isLikelyTitle(text: string): boolean {
  const trimmed = text.trim();
  if (trimmed.length < 2 || trimmed.length > 80) return false;
  // Exclude pure numbers, timestamps, UI chrome like "Continue Watching"
  if (/^\d+$/.test(trimmed)) return false;
  if (/^\d{1,2}:\d{2}/.test(trimmed)) return false;
  return true;
}

export function useTextRecognition() {
  const [titles, setTitles] = useState<DetectedTitle[]>([]);
  const [processing, setProcessing] = useState(false);

  const recognizeFromUri = useCallback(async (imageUri: string): Promise<DetectedTitle[]> => {
    setProcessing(true);
    try {
      const result = await TextRecognition.recognize(imageUri);

      const detected: DetectedTitle[] = result.blocks
        .filter(block => isLikelyTitle(block.text))
        .map(block => ({
          text: block.text.trim(),
          bounds: {
            x: block.frame?.left ?? 0,
            y: block.frame?.top ?? 0,
            width: block.frame?.width ?? 0,
            height: block.frame?.height ?? 0,
          },
        }));

      setTitles(detected);
      return detected;
    } finally {
      setProcessing(false);
    }
  }, []);

  const clear = useCallback(() => setTitles([]), []);

  return { titles, processing, recognizeFromUri, clear };
}
