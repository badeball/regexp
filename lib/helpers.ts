export function assert(value: unknown, message: string): asserts value {
  if (value != null) {
    return;
  }

  throw new Error(message);
}

export function ensure<T>(
  value: T,
  message: string
): Exclude<T, false | null | undefined> {
  assert(value, message);
  return value as Exclude<T, false | null | undefined>;
}
