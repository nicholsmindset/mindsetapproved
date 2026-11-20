export type ScanMode = 'barcode' | 'label';

export interface ScannerProps {
  mode: ScanMode;
  /** False while busy or when the tab isn't focused: pauses the camera. */
  active: boolean;
  onBarcode(code: string): void;
  /** Label photo captured (file:// URI). */
  onPhoto(uri: string): void;
  /** Web/dev fallback: label text typed or pasted. */
  onLabelText(text: string): void;
}
