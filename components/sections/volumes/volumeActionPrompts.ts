// volumeActionPrompts.ts

/**
 * Prompts the user for a new size for a volume.
 * @param volumeName The name or ID of the volume being extended.
 * @param currentSize The current size of the volume.
 * @returns The new size if valid input is provided, otherwise null.
 */
export function askNewSize(volumeName: string, currentSize: number): number | null {
  const input = window.prompt(
    `Enter the new total size (GB) for volume "${volumeName}" (current: ${currentSize} GB). Must be larger than current size.`,
    (currentSize + 10).toString() // Suggest adding 10GB or a sensible default
  );
  if (input === null) { // User cancelled
    return null;
  }
  const n = parseInt(input, 10);
  if (isNaN(n) || n <= currentSize) {
    alert(`Invalid size. New size must be a number greater than ${currentSize} GB.`);
    return null;
  }
  return n;
}

/**
 * Prompts the user for a name for a new volume snapshot.
 * @param volumeName The name of the volume being snapshotted, used for a default snapshot name.
 * @returns The snapshot name if provided, otherwise null.
 */
export function askSnapshotName(volumeName: string): string | null {
  const defaultSnapshotName = `snapshot-${volumeName}-${new Date().toISOString().split('T')[0]}`;
  const input = window.prompt(
    `Enter a name for the snapshot of volume "${volumeName}":`,
    defaultSnapshotName
  );
  if (input === null) { // User cancelled
    return null;
  }
  if (input.trim() === '') {
    alert("Snapshot name cannot be empty.");
    return null;
  }
  return input.trim();
}
