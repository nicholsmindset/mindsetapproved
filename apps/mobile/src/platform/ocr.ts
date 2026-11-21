import TextRecognition, { TextRecognitionScript } from '@react-native-ml-kit/text-recognition';
import { ocrToText } from '@/core/ocr-text';
import type { LabelScript } from '@/core/store';

export const ocrAvailable = true;

const SCRIPT: Record<LabelScript, TextRecognitionScript> = {
  latin: TextRecognitionScript.LATIN,
  chinese: TextRecognitionScript.CHINESE,
  japanese: TextRecognitionScript.JAPANESE,
  korean: TextRecognitionScript.KOREAN,
};

/** On-device OCR (ML Kit text recognition v2). Works offline; the Chinese, Japanese and Korean models also read Latin text. */
export async function recognizeLabel(imageUri: string, script: LabelScript = 'latin'): Promise<{ text: string; confidence: number }> {
  const result = await TextRecognition.recognize(imageUri, SCRIPT[script]);
  return ocrToText(result);
}
