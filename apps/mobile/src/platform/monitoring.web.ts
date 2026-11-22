/** The web preview has no crash reporting. */
export function initMonitoring(): void {}
export function reportError(error: unknown): void {
  console.error(error);
}
