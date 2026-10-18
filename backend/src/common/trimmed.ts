/** A request body field as a trimmed string; anything that isn't a string counts as empty. */
export function trimmed(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}
