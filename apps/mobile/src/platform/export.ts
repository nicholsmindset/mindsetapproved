import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

/** Writes the CSV to the cache folder and opens the share sheet (Files, Mail, Drive…). */
export async function exportCsv(csv: string, filename: string): Promise<void> {
  const file = new File(Paths.cache, filename);
  file.create({ overwrite: true });
  file.write(csv);
  await Sharing.shareAsync(file.uri, { mimeType: 'text/csv', UTI: 'public.comma-separated-values-text', dialogTitle: 'Export history' });
}
