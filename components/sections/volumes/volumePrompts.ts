// volumePrompts.ts

/**
 * Prompts the user for a new volume size, ensuring it's a number greater than the current size.
 * @param volumeId The ID of the volume for display in the prompt.
 * @param currentSize The current size of the volume in GB.
 * @returns The new size as a number, or null if the input is invalid or cancelled.
 */
export function askNewSize(volumeId: string, currentSize: number): number | null {
  const input = window.prompt(
    `Enter new total size for ${volumeId} (current: ${currentSize} GB):`,
    (currentSize + 1).toString()
  );
  if (!input) { // User cancelled or entered empty string
      return null;
  }
  const n = parseInt(input, 10);
  // Check if it's a valid number and greater than current size
  return isNaN(n) || n <= currentSize ? null : n;
}

/**
 * Prompts the user for a snapshot name.
 * @param defaultName A suggested default name for the snapshot.
 * @returns The entered snapshot name, or null if the user cancelled.
 */
export function askSnapshotName(defaultName: string): string | null {
  return window.prompt(`Name for snapshot of "${defaultName}":`, defaultName);
}