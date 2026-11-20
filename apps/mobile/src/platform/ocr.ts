import TextRecognition, { TextRecognitionScript } from '@react-native-ml-kit/text-recognition';
import { ocrToText } from '@/core/ocr-text';

export const ocrAvailable = true;

/** On-device OCR (ML Kit text recognition v2, Latin script). Works offline. */
export async function recognizeLabel(imageUri: string): Promise<{ text: string; confidence: number }> {
  const result = await TextRecognition.recognize(imageUri, TextRecognitionScript.LATIN);
  return ocrToText(result);
}
