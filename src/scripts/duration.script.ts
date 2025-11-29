export const printDuration = (duration: number): string => {
  if (duration > 1000) {
    return `in ${(duration / 1000).toFixed(2)} s`;
  } else {
    const ms = parseFloat(duration.toFixed(3));
    return `in ${ms} ms`;
  }
}
