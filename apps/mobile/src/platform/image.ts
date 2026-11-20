import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';

/** Shrinks a label photo for the AI re-check: max 1600px on the long side, JPEG, base64. */
export async function prepareForAi(uri: string): Promise<string> {
  const ctx = ImageManipulator.manipulate(uri);
  ctx.resize({ width: 1600 });
  const img = await ctx.renderAsync();
  const out = await img.saveAsync({ format: SaveFormat.JPEG, compress: 0.8, base64: true });
  if (!out.base64) throw new Error('could not encode the photo');
  return out.base64;
}
