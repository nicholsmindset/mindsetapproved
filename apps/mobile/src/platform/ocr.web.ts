export const ocrAvailable = false;

export async function recognizeLabel(_uri?: string, _script?: string): Promise<{ text: string; confidence: number }> {
  throw new Error('On-device OCR is only available in the iOS and Android app.');
}
